-- =====================================================================
-- RNF-003 — Firma criptográfica de payloads
-- Almacena la firma EIP-191 (personal_sign) hecha por la wallet del
-- responsable (vet/owner) sobre el JSON canónico antes de anclar.
-- =====================================================================

create table if not exists signatures (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references farms(id) on delete cascade,
  entity_type    text not null,
  entity_id      uuid not null,
  signer_address text not null,
  signer_profile uuid references profiles(id),
  payload_hash   text not null,
  signature      text not null,
  signed_at      timestamptz not null default now(),
  unique (entity_type, entity_id, signer_address)
);
create index if not exists signatures_entity_idx on signatures(entity_type, entity_id);
create index if not exists signatures_farm_idx   on signatures(farm_id, signed_at desc);

alter table signatures enable row level security;
create policy "member read" on signatures for select using (is_farm_member(farm_id));
create policy "operator write" on signatures for all
  using (is_farm_member(farm_id, array['owner','admin','operator','vet']))
  with check (is_farm_member(farm_id, array['owner','admin','operator','vet']));
