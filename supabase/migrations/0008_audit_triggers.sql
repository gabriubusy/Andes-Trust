-- =====================================================================
-- RF-009 / RNF-006 — Auditoría completa
-- Triggers que escriben en audit_log + tabla regulatory_reports + vista
-- v_animal_full_history para reportes INSAI.
-- =====================================================================

create or replace function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_diff   jsonb;
  v_row    jsonb;
  v_farm   uuid;
  v_entity uuid;
  v_actor  uuid;
begin
  v_action := lower(tg_op);
  v_actor  := current_profile_id();

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_diff := jsonb_build_object('old', v_row);
    v_entity := (v_row->>'id')::uuid;
    v_farm   := nullif(v_row->>'farm_id','')::uuid;
  elsif tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_diff := jsonb_build_object('new', v_row);
    v_entity := (v_row->>'id')::uuid;
    v_farm   := nullif(v_row->>'farm_id','')::uuid;
  else -- UPDATE
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    v_entity := (to_jsonb(new)->>'id')::uuid;
    v_farm   := nullif(to_jsonb(new)->>'farm_id','')::uuid;
  end if;

  insert into audit_log (farm_id, profile_id, action, entity, entity_id, diff)
  values (v_farm, v_actor, v_action, tg_table_name, v_entity, v_diff);

  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'animals','vaccinations','treatments','weighings','sales','sale_items','certifications'
  ] loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$I;', t);
    execute format(
      'create trigger trg_%1$s_audit
         after insert or update or delete on %1$I
         for each row execute function audit_row_change();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Vista historial completo por animal (eventos sanitarios cronológicos)
-- ---------------------------------------------------------------------
create or replace view v_animal_full_history as
select
  a.farm_id, a.id as animal_id, a.tag, a.name,
  'birth'::text as kind,
  a.birth_date::timestamptz as occurred_at,
  jsonb_build_object('birth_weight_kg', a.birth_weight_kg, 'breed_id', a.breed_id) as detail
from animals a where a.birth_date is not null
union all
select w.farm_id, w.animal_id, a.tag, a.name,
  'weighing', w.measured_at,
  jsonb_build_object('weight_kg', w.weight_kg, 'measured_by', w.measured_by)
from weighings w join animals a on a.id = w.animal_id
union all
select v.farm_id, v.animal_id, a.tag, a.name,
  'vaccination', v.applied_at,
  jsonb_build_object('vaccine_id', v.vaccine_id, 'batch_number', v.batch_number, 'next_due_at', v.next_due_at, 'applied_by', v.applied_by)
from vaccinations v join animals a on a.id = v.animal_id
union all
select t.farm_id, t.animal_id, a.tag, a.name,
  'treatment', t.started_at,
  jsonb_build_object('treatment_id', t.treatment_id, 'ended_at', t.ended_at, 'withdrawal_until_meat', t.withdrawal_until_meat, 'withdrawal_until_milk', t.withdrawal_until_milk)
from treatments t join animals a on a.id = t.animal_id
union all
select c.farm_id, c.animal_id, a.tag, a.name,
  'certification', c.issued_at::timestamptz,
  jsonb_build_object('type', c.type, 'issuer', c.issuer, 'valid_until', c.valid_until)
from certifications c join animals a on a.id = c.animal_id where c.animal_id is not null;

-- ---------------------------------------------------------------------
-- Tabla de reportes regulatorios generados
-- ---------------------------------------------------------------------
create table if not exists regulatory_reports (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  kind        text not null default 'insai',
  animal_ids  uuid[] not null default '{}',
  date_from   date,
  date_to     date,
  storage_path text,
  payload_hash text,
  generated_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists regulatory_reports_farm_idx on regulatory_reports(farm_id, created_at desc);

alter table regulatory_reports enable row level security;
create policy "member read" on regulatory_reports for select using (is_farm_member(farm_id));
create policy "admin write" on regulatory_reports for all
  using (is_farm_member(farm_id, array['owner','admin','vet']))
  with check (is_farm_member(farm_id, array['owner','admin','vet']));
