-- Migration: 0026_milk_quality_certs
-- Tabla para certificaciones de calidad láctea emitidas on-chain.

create type public.milk_quality_grade as enum ('A', 'B', 'C');

create table public.milk_quality_certs (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references public.farms(id) on delete cascade,

  -- Período certificado
  period_start     date not null,
  period_end       date not null,

  -- Parámetros promedio del período
  fat_pct          numeric(5,2),
  protein_pct      numeric(5,2),
  scc_thousands    integer,          -- SCC promedio en miles cél/mL
  total_liters     numeric(10,2),

  -- Resultado COVENIN 903 evaluado on-chain
  grade            public.milk_quality_grade not null,

  -- Blockchain
  payload_hash     text not null,    -- keccak256 del JSON canónico
  tx_hash          text,             -- hash de la transacción on-chain
  chain_id         integer,
  contract_address text,
  block_timestamp  timestamptz,

  -- Metadatos
  certified_by     uuid references public.profiles(id),
  notes            text,
  created_at       timestamptz not null default now()
);

-- Índices
create index on public.milk_quality_certs (farm_id, period_start desc);
create index on public.milk_quality_certs (grade);

-- RLS
alter table public.milk_quality_certs enable row level security;

create policy "farm members can view milk quality certs"
  on public.milk_quality_certs for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = milk_quality_certs.farm_id
        and fm.profile_id = auth.uid()
    )
  );

create policy "farm admins can insert milk quality certs"
  on public.milk_quality_certs for insert
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = milk_quality_certs.farm_id
        and fm.profile_id = auth.uid()
        and fm.role in ('owner', 'admin')
    )
  );

create policy "service role full access milk quality certs"
  on public.milk_quality_certs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
