-- =====================================================================
-- Reproducción: inseminations + pregnancies
-- =====================================================================

-- ── inseminations ────────────────────────────────────────────────────

create table if not exists inseminations (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references farms(id) on delete cascade,
  animal_id       uuid not null references animals(id) on delete cascade,
  sire_id         uuid references animals(id) on delete set null,
  sire_external   text,
  method          text not null default 'IA' check (method in ('IA', 'natural', 'embryo')),
  performed_at    date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

create index on inseminations (farm_id, performed_at desc);
create index on inseminations (animal_id);

alter table inseminations enable row level security;

create policy "farm members can read inseminations"
  on inseminations for select
  using (is_farm_member(farm_id));

create policy "operators and above can insert inseminations"
  on inseminations for insert
  with check (is_farm_member(farm_id, array['owner','admin','operator','vet']));

create policy "operators and above can update inseminations"
  on inseminations for update
  using (is_farm_member(farm_id, array['owner','admin','operator','vet']));

create policy "admins can delete inseminations"
  on inseminations for delete
  using (is_farm_member(farm_id, array['owner','admin']));

-- ── pregnancies ──────────────────────────────────────────────────────

create table if not exists pregnancies (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references farms(id) on delete cascade,
  animal_id           uuid not null references animals(id) on delete cascade,
  insemination_id     uuid references inseminations(id) on delete set null,
  confirmed_at        date,
  expected_due_at     date,
  result              text check (result in ('pregnant', 'empty', 'aborted', 'calved')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on pregnancies (farm_id, expected_due_at asc);
create index on pregnancies (animal_id);
create index on pregnancies (insemination_id);

create trigger set_pregnancies_updated_at
  before update on pregnancies
  for each row execute function set_updated_at();

alter table pregnancies enable row level security;

create policy "farm members can read pregnancies"
  on pregnancies for select
  using (is_farm_member(farm_id));

create policy "operators and above can insert pregnancies"
  on pregnancies for insert
  with check (is_farm_member(farm_id, array['owner','admin','operator','vet']));

create policy "operators and above can update pregnancies"
  on pregnancies for update
  using (is_farm_member(farm_id, array['owner','admin','operator','vet']));

create policy "admins can delete pregnancies"
  on pregnancies for delete
  using (is_farm_member(farm_id, array['owner','admin']));
