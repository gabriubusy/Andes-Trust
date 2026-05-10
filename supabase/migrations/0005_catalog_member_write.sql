-- =====================================================================
-- Catálogos globales: escritura para miembros de finca
--
-- Los catálogos (breeds, vaccines_catalog, treatments_catalog) son
-- globales (sin farm_id). La política previa solo permitía escritura a
-- platform_admin. Se abre escritura a cualquier usuario que pertenezca
-- a al menos una finca (owner / admin / operator / vet).
-- =====================================================================

-- Helper: ¿el usuario actual es miembro de alguna finca?
create or replace function is_any_farm_member() returns boolean
language sql stable as $$
  select exists (
    select 1 from farm_members
    where profile_id = current_profile_id()
  )
$$;

-- breeds
create policy "farm member write" on breeds for insert
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member update" on breeds for update
  using (is_any_farm_member() or is_platform_admin())
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member delete" on breeds for delete
  using (is_any_farm_member() or is_platform_admin());

-- vaccines_catalog
create policy "farm member write" on vaccines_catalog for insert
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member update" on vaccines_catalog for update
  using (is_any_farm_member() or is_platform_admin())
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member delete" on vaccines_catalog for delete
  using (is_any_farm_member() or is_platform_admin());

-- treatments_catalog
create policy "farm member write" on treatments_catalog for insert
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member update" on treatments_catalog for update
  using (is_any_farm_member() or is_platform_admin())
  with check (is_any_farm_member() or is_platform_admin());

create policy "farm member delete" on treatments_catalog for delete
  using (is_any_farm_member() or is_platform_admin());
