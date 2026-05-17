-- =====================================================================
-- Asistente de diagnóstico y tratamiento
-- - symptoms_catalog: síntomas observables en campo.
-- - disease_symptoms: peso de cada síntoma en cada enfermedad (1..3).
-- - disease_treatments: tratamientos sugeridos por enfermedad con prioridad.
-- - suggest_treatment(symptom_ids[]): RPC que rankea diagnósticos.
-- =====================================================================

create table if not exists symptoms_catalog (
  id              uuid primary key default gen_random_uuid(),
  name            text unique not null,
  body_system     text,           -- digestivo / respiratorio / ubre / piel / locomotor / sistémico / reproductivo
  severity_default smallint default 2 check (severity_default between 1 and 3),
  notes           text
);

create table if not exists disease_symptoms (
  disease_id  uuid not null references diseases_catalog(id) on delete cascade,
  symptom_id  uuid not null references symptoms_catalog(id) on delete cascade,
  weight      smallint not null default 1 check (weight between 1 and 3),
  primary key (disease_id, symptom_id)
);

create table if not exists disease_treatments (
  disease_id   uuid not null references diseases_catalog(id) on delete cascade,
  treatment_id uuid not null references treatments_catalog(id) on delete cascade,
  priority     smallint not null default 1,
  dose_hint    text,
  primary key (disease_id, treatment_id)
);

alter table symptoms_catalog   enable row level security;
alter table disease_symptoms   enable row level security;
alter table disease_treatments enable row level security;

create policy "auth read" on symptoms_catalog   for select using (current_privy_did() is not null);
create policy "auth read" on disease_symptoms   for select using (current_privy_did() is not null);
create policy "auth read" on disease_treatments for select using (current_privy_did() is not null);

create policy "admin write" on symptoms_catalog   for all
  using (is_platform_admin() or is_any_farm_member())
  with check (is_platform_admin() or is_any_farm_member());
create policy "admin write" on disease_symptoms   for all
  using (is_platform_admin() or is_any_farm_member())
  with check (is_platform_admin() or is_any_farm_member());
create policy "admin write" on disease_treatments for all
  using (is_platform_admin() or is_any_farm_member())
  with check (is_platform_admin() or is_any_farm_member());

grant select on symptoms_catalog, disease_symptoms, disease_treatments to anon, authenticated, service_role;
grant insert, update, delete on symptoms_catalog, disease_symptoms, disease_treatments to authenticated, service_role;

-- RPC: dado un array de symptom_ids, devuelve top N enfermedades con score
-- (suma de pesos de síntomas coincidentes) y los tratamientos sugeridos.
create or replace function suggest_treatment(symptom_ids uuid[])
returns table (
  disease_id      uuid,
  disease_name    text,
  match_count     bigint,
  total_symptoms  bigint,
  score           numeric,
  treatments      jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with matches as (
    select ds.disease_id, sum(ds.weight)::numeric as raw_score, count(*) as match_count
    from disease_symptoms ds
    where ds.symptom_id = any(symptom_ids)
    group by ds.disease_id
  ),
  totals as (
    select ds.disease_id, sum(ds.weight)::numeric as total_score, count(*) as total_symptoms
    from disease_symptoms ds
    group by ds.disease_id
  )
  select
    d.id as disease_id,
    d.name as disease_name,
    m.match_count,
    t.total_symptoms,
    round((m.raw_score / nullif(t.total_score, 0)) * 100, 1) as score,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'treatment_id', tc.id,
        'name', tc.name,
        'kind', tc.kind,
        'route', tc.route,
        'dose_hint', dt.dose_hint,
        'withdrawal_meat_days', tc.withdrawal_meat_days,
        'withdrawal_milk_days', tc.withdrawal_milk_days,
        'priority', dt.priority
      ) order by dt.priority)
      from disease_treatments dt
      join treatments_catalog tc on tc.id = dt.treatment_id
      where dt.disease_id = d.id
    ), '[]'::jsonb) as treatments
  from matches m
  join diseases_catalog d on d.id = m.disease_id
  join totals t on t.disease_id = d.id
  order by score desc nulls last, m.match_count desc
  limit 10
$$;

grant execute on function suggest_treatment(uuid[]) to authenticated, service_role;
