-- =====================================================================
-- Fix: purchases / purchase_items tenían RLS habilitado y políticas, pero
-- faltaban los GRANT a nivel de tabla. Sin ellos Postgres rechaza con
-- "42501 permission denied for table purchases" antes de evaluar RLS
-- (incluso desde el endpoint /api/purchases/pay-crypto con service_role).
-- Mismo arreglo que 0034_grant_milk_quality_certs para milk_quality_certs.
-- =====================================================================

grant select, insert, update, delete on public.purchases       to authenticated;
grant select, insert, update, delete on public.purchase_items  to authenticated;

grant all on public.purchases      to service_role;
grant all on public.purchase_items to service_role;
