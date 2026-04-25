-- =====================================================================
-- Platform admin (super-admin global del sistema)
--
-- Modelo: la fuente de verdad es la variable de entorno
-- PLATFORM_ADMIN_DIDS (lista de Privy DIDs separados por coma). El
-- endpoint /api/supabase-token sincroniza la columna en cada login,
-- así que añadir/quitar admins se hace en el .env (y reiniciar).
-- =====================================================================

alter table profiles
  add column if not exists is_platform_admin boolean not null default false;

create index if not exists profiles_is_platform_admin_idx
  on profiles(is_platform_admin) where is_platform_admin;

-- Helper: ¿el usuario actual es admin de plataforma?
create or replace function is_platform_admin() returns boolean
language plpgsql stable as $$
declare v boolean;
begin
  select coalesce(p.is_platform_admin, false) into v
  from profiles p
  where p.privy_did = current_privy_did();
  return coalesce(v, false);
end $$;

-- is_farm_member ahora corto-circuita: un platform admin pertenece a
-- toda finca con cualquier rol. Esto hace que TODAS las políticas
-- existentes que usan is_farm_member() abran paso al super-admin sin
-- tener que duplicar cada policy.
create or replace function is_farm_member(_farm uuid, _roles text[] default null) returns boolean
language plpgsql stable as $$
declare v boolean;
begin
  if is_platform_admin() then
    return true;
  end if;
  select exists (
    select 1 from farm_members fm
    where fm.farm_id = _farm
      and fm.profile_id = current_profile_id()
      and (_roles is null or fm.role = any(_roles))
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Profiles: el platform admin lee/edita cualquier profile
-- ---------------------------------------------------------------------
drop policy if exists "self read"   on profiles;
drop policy if exists "self update" on profiles;

create policy "self or admin read" on profiles for select
  using (privy_did = current_privy_did() or is_platform_admin());

create policy "self or admin update" on profiles for update
  using (privy_did = current_privy_did() or is_platform_admin())
  with check (privy_did = current_privy_did() or is_platform_admin());

-- ---------------------------------------------------------------------
-- Catálogos globales: el platform admin puede escribir
-- ---------------------------------------------------------------------
create policy "platform admin write" on breeds             for all
  using (is_platform_admin()) with check (is_platform_admin());
create policy "platform admin write" on vaccines_catalog   for all
  using (is_platform_admin()) with check (is_platform_admin());
create policy "platform admin write" on treatments_catalog for all
  using (is_platform_admin()) with check (is_platform_admin());
create policy "platform admin write" on diseases_catalog   for all
  using (is_platform_admin()) with check (is_platform_admin());
