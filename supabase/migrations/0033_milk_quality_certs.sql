-- Tabla para certificados de calidad láctea anclados on-chain
create table if not exists public.milk_quality_certs (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references public.farms(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  fat_pct          numeric(5,2),
  protein_pct      numeric(5,2),
  scc_thousands    integer,
  total_liters     numeric(10,2) not null default 0,
  grade            text not null,          -- 'A', 'B', 'C'
  payload_hash     text,                   -- keccak256 del payload enviado al contrato
  tx_hash          text,                   -- hash de la tx on-chain (null si no se ancló)
  block_timestamp  timestamptz,
  chain_id         integer,
  contract_address text,
  certified_by     uuid references public.profiles(id),
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.milk_quality_certs enable row level security;

-- Solo miembros de la finca pueden leer sus certificados
create policy "farm members can view milk quality certs"
  on public.milk_quality_certs for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = milk_quality_certs.farm_id
        and fm.profile_id = auth.uid()
    )
  );

-- Operadores y superiores pueden insertar
create policy "farm operators can insert milk quality certs"
  on public.milk_quality_certs for insert
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = milk_quality_certs.farm_id
        and fm.profile_id = auth.uid()
        and fm.role in ('owner', 'admin', 'operator')
    )
  );

-- Solo el service role puede actualizar (para escribir tx_hash desde el backend)
create policy "service role can update milk quality certs"
  on public.milk_quality_certs for update
  using (true);
