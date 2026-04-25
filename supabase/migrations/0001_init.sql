-- =====================================================================
-- Finca El Progreso — initial schema
-- Multi-tenant trazabilidad ganadera + producción de leche + ventas.
-- Auth: Privy (DID en JWT custom claim `privy_did`).
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function current_privy_did() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'privy_did','')
$$;

create or replace function current_profile_id() returns uuid
language plpgsql stable as $$
declare v uuid;
begin
  select id into v from profiles where privy_did = current_privy_did();
  return v;
end $$;

create or replace function is_farm_member(_farm uuid, _roles text[] default null) returns boolean
language plpgsql stable as $$
declare v boolean;
begin
  select exists (
    select 1 from farm_members fm
    where fm.farm_id = _farm
      and fm.profile_id = current_profile_id()
      and (_roles is null or fm.role = any(_roles))
  ) into v;
  return v;
end $$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type farm_role       as enum ('owner','admin','operator','vet','viewer');
create type animal_sex      as enum ('male','female');
create type animal_status   as enum ('active','sold','dead','lost','slaughtered');
create type animal_purpose  as enum ('dairy','beef','dual','breeding');
create type event_type      as enum (
  'birth','weighing','vaccination','treatment','deworming','insemination',
  'pregnancy_check','calving','transfer','sale','death','slaughter','note'
);
create type sale_status     as enum ('draft','confirmed','paid','cancelled');
create type cert_type       as enum ('origin','health','organic','welfare','export','other');
create type milk_shift      as enum ('am','pm','midday');
create type chain_network   as enum ('polygon','ethereum','base','arbitrum','other');

-- ---------------------------------------------------------------------
-- Identidad / tenancy
-- ---------------------------------------------------------------------
create table profiles (
  id               uuid primary key default gen_random_uuid(),
  privy_did        text unique not null,
  email            citext unique,
  full_name        text,
  wallet_address   text,
  phone            text,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table farms (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  legal_id         text,
  country          text,
  region           text,
  address          text,
  location         jsonb,          -- {lat,lng}
  logo_url         text,
  owner_profile_id uuid not null references profiles(id) on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_farms_updated before update on farms
  for each row execute function set_updated_at();

create table farm_members (
  farm_id          uuid not null references farms(id) on delete cascade,
  profile_id       uuid not null references profiles(id) on delete cascade,
  role             farm_role not null default 'viewer',
  created_at       timestamptz not null default now(),
  primary key (farm_id, profile_id)
);
create index on farm_members(profile_id);

-- ---------------------------------------------------------------------
-- Catálogos (globales; editables por admins del sistema)
-- ---------------------------------------------------------------------
create table breeds (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  species     text not null default 'bovine',
  purpose     animal_purpose
);

create table vaccines_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text unique not null,
  manufacturer     text,
  disease          text,
  dose_ml          numeric(6,2),
  route            text,           -- IM, SC, oral...
  booster_days     integer,
  withdrawal_days  integer,        -- carne/leche
  notes            text
);

create table treatments_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text unique not null,
  active_ingredient text,
  kind             text,           -- antibiótico, antiparasitario...
  dose             text,
  route            text,
  withdrawal_meat_days  integer,
  withdrawal_milk_days  integer,
  notes            text
);

create table diseases_catalog (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null,
  icd   text
);

-- ---------------------------------------------------------------------
-- Ganado
-- ---------------------------------------------------------------------
create table animals (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references farms(id) on delete cascade,
  tag              text not null,              -- arete / identificador
  name             text,
  breed_id         uuid references breeds(id),
  sex              animal_sex not null,
  purpose          animal_purpose,
  birth_date       date,
  birth_weight_kg  numeric(6,2),
  current_weight_kg numeric(6,2),
  color            text,
  mother_id        uuid references animals(id) on delete set null,
  father_id        uuid references animals(id) on delete set null,
  origin           text,                       -- nacido en finca / comprado
  status           animal_status not null default 'active',
  acquired_at      date,
  removed_at       date,
  photo_url        text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (farm_id, tag)
);
create index on animals(farm_id);
create index on animals(status);
create index on animals(mother_id);
create trigger trg_animals_updated before update on animals
  for each row execute function set_updated_at();

create table animal_groups (
  id         uuid primary key default gen_random_uuid(),
  farm_id    uuid not null references farms(id) on delete cascade,
  name       text not null,
  kind       text,                  -- potrero, corral, lote de manejo
  notes      text,
  created_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table animal_group_members (
  group_id  uuid not null references animal_groups(id) on delete cascade,
  animal_id uuid not null references animals(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at   timestamptz,
  primary key (group_id, animal_id)
);

-- ---------------------------------------------------------------------
-- Eventos (timeline polimórfico)
-- ---------------------------------------------------------------------
create table animal_events (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  animal_id    uuid not null references animals(id) on delete cascade,
  type         event_type not null,
  occurred_at  timestamptz not null default now(),
  performed_by uuid references profiles(id),
  payload      jsonb not null default '{}'::jsonb,
  notes        text,
  created_at   timestamptz not null default now()
);
create index on animal_events(animal_id, occurred_at desc);
create index on animal_events(farm_id, type, occurred_at desc);

create table weighings (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid not null references animals(id) on delete cascade,
  farm_id     uuid not null references farms(id) on delete cascade,
  weight_kg   numeric(6,2) not null,
  measured_at timestamptz not null default now(),
  measured_by uuid references profiles(id),
  notes       text
);
create index on weighings(animal_id, measured_at desc);

create table vaccinations (
  id            uuid primary key default gen_random_uuid(),
  animal_id     uuid not null references animals(id) on delete cascade,
  farm_id       uuid not null references farms(id) on delete cascade,
  vaccine_id    uuid references vaccines_catalog(id),
  applied_at    timestamptz not null default now(),
  dose_ml       numeric(6,2),
  batch_number  text,
  applied_by    uuid references profiles(id),
  next_due_at   date,
  notes         text
);
create index on vaccinations(animal_id, applied_at desc);

create table treatments (
  id             uuid primary key default gen_random_uuid(),
  animal_id      uuid not null references animals(id) on delete cascade,
  farm_id        uuid not null references farms(id) on delete cascade,
  treatment_id   uuid references treatments_catalog(id),
  disease_id     uuid references diseases_catalog(id),
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  dose           text,
  prescribed_by  uuid references profiles(id),
  withdrawal_until_meat date,
  withdrawal_until_milk date,
  notes          text
);
create index on treatments(animal_id, started_at desc);

-- Reproducción
create table inseminations (
  id            uuid primary key default gen_random_uuid(),
  animal_id     uuid not null references animals(id) on delete cascade,  -- madre
  farm_id       uuid not null references farms(id) on delete cascade,
  sire_id       uuid references animals(id),                             -- padre interno
  sire_external text,                                                    -- o semen externo
  method        text,                                                    -- IA, monta natural, embrión
  performed_at  timestamptz not null default now(),
  performed_by  uuid references profiles(id),
  notes         text
);

create table pregnancies (
  id               uuid primary key default gen_random_uuid(),
  animal_id        uuid not null references animals(id) on delete cascade,
  farm_id          uuid not null references farms(id) on delete cascade,
  insemination_id  uuid references inseminations(id),
  confirmed_at     date,
  expected_due_at  date,
  result           text,            -- pregnant, empty, aborted, calved
  calving_event_id uuid references animal_events(id),
  notes            text
);

-- ---------------------------------------------------------------------
-- Producción de leche
-- ---------------------------------------------------------------------
create table milk_records (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farms(id) on delete cascade,
  animal_id     uuid references animals(id) on delete set null, -- null = total finca
  recorded_on   date not null,
  shift         milk_shift not null,
  liters        numeric(7,2) not null check (liters >= 0),
  fat_pct       numeric(4,2),
  protein_pct   numeric(4,2),
  scc           integer,            -- somatic cell count
  temperature_c numeric(4,1),
  recorded_by   uuid references profiles(id),
  notes         text,
  created_at    timestamptz not null default now(),
  unique (farm_id, animal_id, recorded_on, shift)
);
create index on milk_records(farm_id, recorded_on desc);
create index on milk_records(animal_id, recorded_on desc);

create table milk_deliveries (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farms(id) on delete cascade,
  buyer_id      uuid,                -- ref buyers; fk abajo
  delivered_at  timestamptz not null default now(),
  liters        numeric(9,2) not null,
  price_per_liter numeric(10,4),
  currency      text default 'USD',
  invoice_number text,
  notes         text
);

-- ---------------------------------------------------------------------
-- Alimentación (opcional pero típico)
-- ---------------------------------------------------------------------
create table feed_items (
  id        uuid primary key default gen_random_uuid(),
  farm_id   uuid not null references farms(id) on delete cascade,
  name      text not null,
  kind      text,              -- concentrado, forraje, sal mineral
  unit      text default 'kg',
  unique (farm_id, name)
);

create table feed_logs (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  animal_id   uuid references animals(id) on delete set null,
  group_id    uuid references animal_groups(id) on delete set null,
  feed_id     uuid references feed_items(id),
  quantity    numeric(10,3) not null,
  fed_at      timestamptz not null default now(),
  recorded_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------
-- Comercial
-- ---------------------------------------------------------------------
create table buyers (
  id         uuid primary key default gen_random_uuid(),
  farm_id    uuid not null references farms(id) on delete cascade,
  name       text not null,
  legal_id   text,
  contact    text,
  email      citext,
  phone      text,
  address    text,
  notes      text,
  created_at timestamptz not null default now()
);
create index on buyers(farm_id);

alter table milk_deliveries
  add constraint milk_deliveries_buyer_fk
  foreign key (buyer_id) references buyers(id) on delete set null;

create table suppliers (
  id         uuid primary key default gen_random_uuid(),
  farm_id    uuid not null references farms(id) on delete cascade,
  name       text not null,
  kind       text,                 -- vet, insumos, transporte, genética
  contact    text,
  email      citext,
  phone      text,
  notes      text
);

create table sales (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references farms(id) on delete cascade,
  buyer_id       uuid references buyers(id) on delete set null,
  status         sale_status not null default 'draft',
  sold_at        timestamptz not null default now(),
  total_amount   numeric(12,2) not null default 0,
  currency       text not null default 'USD',
  payment_method text,
  invoice_number text,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on sales(farm_id, sold_at desc);
create trigger trg_sales_updated before update on sales
  for each row execute function set_updated_at();

create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  animal_id   uuid references animals(id) on delete set null,
  description text,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  weight_kg   numeric(8,2),
  subtotal    numeric(12,2) generated always as (quantity * unit_price) stored
);
create index on sale_items(sale_id);
create index on sale_items(animal_id);

-- ---------------------------------------------------------------------
-- Trazabilidad / blockchain / certificaciones
-- ---------------------------------------------------------------------
create table certifications (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farms(id) on delete cascade,
  animal_id     uuid references animals(id) on delete cascade,
  type          cert_type not null,
  issuer        text,
  issued_at     date,
  valid_until   date,
  document_url  text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index on certifications(animal_id);
create index on certifications(farm_id, type);

create table documents (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  entity_type  text not null,       -- 'animal','sale','treatment'...
  entity_id    uuid,
  storage_path text not null,       -- path en Supabase Storage
  filename     text,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index on documents(entity_type, entity_id);

create table blockchain_records (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references farms(id) on delete cascade,
  entity_type      text not null,   -- 'animal','sale','certification','event'
  entity_id        uuid not null,
  network          chain_network not null,
  contract_address text,
  tx_hash          text not null,
  block_number     bigint,
  payload_hash     text not null,   -- hash del payload anclado
  anchored_at      timestamptz not null default now(),
  created_by       uuid references profiles(id),
  unique (network, tx_hash)
);
create index on blockchain_records(entity_type, entity_id);

-- Tokens públicos para consumidor final (QR)
create table traceability_tokens (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  entity_type  text not null,      -- 'animal' | 'sale'
  entity_id    uuid not null,
  slug         text unique not null default encode(gen_random_bytes(8),'hex'),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create table audit_log (
  id         bigserial primary key,
  farm_id    uuid,
  profile_id uuid,
  action     text not null,
  entity     text,
  entity_id  uuid,
  diff       jsonb,
  at         timestamptz not null default now()
);
create index on audit_log(farm_id, at desc);

-- =====================================================================
-- RLS
-- =====================================================================
alter table profiles            enable row level security;
alter table farms                enable row level security;
alter table farm_members         enable row level security;
alter table animals              enable row level security;
alter table animal_groups        enable row level security;
alter table animal_group_members enable row level security;
alter table animal_events        enable row level security;
alter table weighings            enable row level security;
alter table vaccinations         enable row level security;
alter table treatments           enable row level security;
alter table inseminations        enable row level security;
alter table pregnancies          enable row level security;
alter table milk_records         enable row level security;
alter table milk_deliveries      enable row level security;
alter table feed_items           enable row level security;
alter table feed_logs            enable row level security;
alter table buyers               enable row level security;
alter table suppliers            enable row level security;
alter table sales                enable row level security;
alter table sale_items           enable row level security;
alter table certifications       enable row level security;
alter table documents            enable row level security;
alter table blockchain_records   enable row level security;
alter table traceability_tokens  enable row level security;
alter table audit_log            enable row level security;

-- profiles: el usuario sólo se ve/edita a sí mismo
create policy "self read"   on profiles for select using (privy_did = current_privy_did());
create policy "self upsert" on profiles for insert with check (privy_did = current_privy_did());
create policy "self update" on profiles for update using (privy_did = current_privy_did());

-- farms: visibles si eres miembro; admin/owner pueden modificar
create policy "member read" on farms for select using (is_farm_member(id));
create policy "owner write" on farms for all
  using (owner_profile_id = current_profile_id() or is_farm_member(id, array['owner','admin']))
  with check (owner_profile_id = current_profile_id() or is_farm_member(id, array['owner','admin']));

-- farm_members
create policy "member read fm" on farm_members for select using (is_farm_member(farm_id));
create policy "admin write fm" on farm_members for all
  using (is_farm_member(farm_id, array['owner','admin']))
  with check (is_farm_member(farm_id, array['owner','admin']));

-- Helper macro: cualquier tabla tenant-scoped sigue este patrón
do $$
declare t text;
begin
  foreach t in array array[
    'animals','animal_groups','animal_events','weighings','vaccinations',
    'treatments','inseminations','pregnancies','milk_records','milk_deliveries',
    'feed_items','feed_logs','buyers','suppliers','sales','certifications',
    'documents','blockchain_records','traceability_tokens'
  ] loop
    execute format($f$
      create policy "member read" on %1$I for select using (is_farm_member(farm_id));
      create policy "operator write" on %1$I for all
        using (is_farm_member(farm_id, array['owner','admin','operator','vet']))
        with check (is_farm_member(farm_id, array['owner','admin','operator','vet']));
    $f$, t);
  end loop;
end $$;

-- Tablas hijo sin farm_id directo
create policy "member read" on animal_group_members for select using (
  exists (select 1 from animal_groups g where g.id = group_id and is_farm_member(g.farm_id))
);
create policy "operator write" on animal_group_members for all using (
  exists (select 1 from animal_groups g where g.id = group_id
          and is_farm_member(g.farm_id, array['owner','admin','operator']))
) with check (
  exists (select 1 from animal_groups g where g.id = group_id
          and is_farm_member(g.farm_id, array['owner','admin','operator']))
);

create policy "member read" on sale_items for select using (
  exists (select 1 from sales s where s.id = sale_id and is_farm_member(s.farm_id))
);
create policy "operator write" on sale_items for all using (
  exists (select 1 from sales s where s.id = sale_id
          and is_farm_member(s.farm_id, array['owner','admin','operator']))
) with check (
  exists (select 1 from sales s where s.id = sale_id
          and is_farm_member(s.farm_id, array['owner','admin','operator']))
);

-- audit_log: sólo lectura por admins de la finca
create policy "admin read audit" on audit_log for select
  using (farm_id is null or is_farm_member(farm_id, array['owner','admin']));

-- Catálogos globales: lectura pública autenticada
alter table breeds             enable row level security;
alter table vaccines_catalog   enable row level security;
alter table treatments_catalog enable row level security;
alter table diseases_catalog   enable row level security;
create policy "auth read" on breeds             for select using (current_privy_did() is not null);
create policy "auth read" on vaccines_catalog   for select using (current_privy_did() is not null);
create policy "auth read" on treatments_catalog for select using (current_privy_did() is not null);
create policy "auth read" on diseases_catalog   for select using (current_privy_did() is not null);
