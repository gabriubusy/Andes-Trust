-- =====================================================================
-- Equipo de trabajo: invitaciones por email para sumar miembros con
-- un rol específico (owner, admin, operator, vet, viewer).
-- =====================================================================

create type invitation_status as enum ('pending','accepted','expired','revoked');

create table if not exists farm_invitations (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  email        citext not null,
  role         farm_role not null default 'viewer',
  token        text unique not null default encode(gen_random_bytes(16), 'hex'),
  status       invitation_status not null default 'pending',
  created_by   uuid references profiles(id),
  accepted_by  uuid references profiles(id),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  unique (farm_id, email)
);
create index if not exists farm_invitations_token_idx on farm_invitations(token);
create index if not exists farm_invitations_email_idx on farm_invitations(email, status);

alter table farm_invitations enable row level security;

-- Owner/admin de la finca leen y gestionan invitaciones.
create policy "admin manage" on farm_invitations for all
  using (is_farm_member(farm_id, array['owner','admin']))
  with check (is_farm_member(farm_id, array['owner','admin']));

-- El invitado (autenticado, con el email que coincide) puede leer sus invitaciones.
create policy "invitee read own" on farm_invitations for select
  using (
    email = (
      select p.email from profiles p where p.privy_did = current_privy_did()
    )
  );

grant select on farm_invitations to anon, authenticated, service_role;
grant insert, update, delete on farm_invitations to authenticated, service_role;
