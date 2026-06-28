-- =====================================================================
-- Fix: milk_quality_certs tenía RLS habilitado y políticas, pero faltaban
-- los GRANT a nivel de tabla. Sin ellos Postgres rechaza con
-- "42501 permission denied for table" antes de evaluar RLS.
-- =====================================================================

grant select, insert, update on public.milk_quality_certs to authenticated;
grant all on public.milk_quality_certs to service_role;
