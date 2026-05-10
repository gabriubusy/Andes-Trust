-- =====================================================================
-- RF-005 — Alertas automáticas (vacunación, desparasitación, pesaje)
-- =====================================================================

create type alert_type   as enum ('vaccination_due','treatment_withdrawal','weighing_due','custom');
create type alert_status as enum ('open','acknowledged','dismissed','resolved');
create type alert_channel as enum ('email','push','in_app');

create table alerts (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  animal_id   uuid references animals(id) on delete cascade,
  type        alert_type not null,
  due_at      timestamptz not null,
  status      alert_status not null default 'open',
  payload     jsonb not null default '{}'::jsonb,
  source_table text,
  source_id   uuid,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (farm_id, type, source_table, source_id)
);
create index on alerts(farm_id, status, due_at);
create index on alerts(animal_id, due_at);
create trigger trg_alerts_updated before update on alerts
  for each row execute function set_updated_at();

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  unique (profile_id, endpoint)
);
create index on push_subscriptions(profile_id);

-- ---------------------------------------------------------------------
-- Vista de pendientes: deriva alertas de vacunas, tratamientos y pesos
-- ---------------------------------------------------------------------
create or replace view v_pending_alerts as
-- Vacunas próximas o vencidas (next_due_at no nulo, ventana de 30 días)
select
  v.farm_id,
  v.animal_id,
  'vaccination_due'::alert_type as type,
  (v.next_due_at::timestamptz)  as due_at,
  jsonb_build_object(
    'vaccine_id', v.vaccine_id,
    'last_applied_at', v.applied_at,
    'animal_tag', a.tag
  ) as payload,
  'vaccinations' as source_table,
  v.id as source_id
from vaccinations v
join animals a on a.id = v.animal_id
where v.next_due_at is not null
  and v.next_due_at <= (current_date + interval '30 days')
  and a.status = 'active'

union all
-- Retiro de carne/leche: avisar mientras esté vigente
select
  t.farm_id,
  t.animal_id,
  'treatment_withdrawal'::alert_type,
  greatest(coalesce(t.withdrawal_until_meat, t.withdrawal_until_milk),
           coalesce(t.withdrawal_until_milk, t.withdrawal_until_meat))::timestamptz,
  jsonb_build_object(
    'treatment_id', t.treatment_id,
    'withdrawal_until_meat', t.withdrawal_until_meat,
    'withdrawal_until_milk', t.withdrawal_until_milk,
    'animal_tag', a.tag
  ),
  'treatments',
  t.id
from treatments t
join animals a on a.id = t.animal_id
where (t.withdrawal_until_meat is not null or t.withdrawal_until_milk is not null)
  and greatest(coalesce(t.withdrawal_until_meat, t.withdrawal_until_milk),
               coalesce(t.withdrawal_until_milk, t.withdrawal_until_meat)) >= current_date
  and a.status = 'active'

union all
-- Pesaje mensual: animales activos sin pesaje en los últimos 30 días
select
  a.farm_id,
  a.id as animal_id,
  'weighing_due'::alert_type,
  (coalesce(lw.last_at, a.created_at) + interval '30 days')::timestamptz,
  jsonb_build_object(
    'animal_tag', a.tag,
    'last_weighing_at', lw.last_at
  ),
  'weighings',
  null::uuid
from animals a
left join lateral (
  select max(measured_at) as last_at from weighings w where w.animal_id = a.id
) lw on true
where a.status = 'active'
  and coalesce(lw.last_at, a.created_at) <= now() - interval '30 days';

-- ---------------------------------------------------------------------
-- Función generadora: upsert idempotente desde la vista
-- ---------------------------------------------------------------------
create or replace function generate_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  with up as (
    insert into alerts (farm_id, animal_id, type, due_at, payload, source_table, source_id)
    select farm_id, animal_id, type, due_at, payload, source_table, source_id
    from v_pending_alerts
    on conflict (farm_id, type, source_table, source_id) do update
      set due_at = excluded.due_at,
          payload = excluded.payload,
          status = case when alerts.status in ('dismissed','resolved')
                        then alerts.status else 'open' end,
          updated_at = now()
    returning 1
  )
  select count(*) into inserted_count from up;
  return inserted_count;
end $$;

-- Cierra alertas cuya causa ya no aplica (vacunas con next_due_at futuro distante,
-- tratamientos cuyo retiro ya pasó, pesajes recientes).
create or replace function close_stale_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update alerts a
  set status = 'resolved', updated_at = now()
  where a.status = 'open'
    and not exists (
      select 1 from v_pending_alerts p
      where p.farm_id = a.farm_id
        and p.type = a.type
        and p.source_table = a.source_table
        and p.source_id is not distinct from a.source_id
    );
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table alerts enable row level security;
alter table push_subscriptions enable row level security;

create policy "member read" on alerts for select using (is_farm_member(farm_id));
create policy "operator write" on alerts for all
  using (is_farm_member(farm_id, array['owner','admin','operator','vet']))
  with check (is_farm_member(farm_id, array['owner','admin','operator','vet']));

create policy "self read"   on push_subscriptions for select using (profile_id = current_profile_id());
create policy "self write"  on push_subscriptions for all
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

-- pg_cron: ejecuta cada 6h si la extensión está disponible (Supabase la habilita).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'generate_alerts_every_6h',
      '0 */6 * * *',
      $cron$ select public.generate_alerts(); select public.close_stale_alerts(); $cron$
    );
  end if;
end $$;
