-- =====================================================================
-- Fix: animal_breeds (creada en 0031_animal_breeds_junction) tenía RLS
-- habilitado y políticas, pero faltaban los GRANT a nivel de tabla. Sin
-- ellos Postgres rechaza con "42501 permission denied for table
-- animal_breeds" ANTES de evaluar RLS — incluso con service_role.
--
-- Síntoma: la ficha pública /t/[slug] devolvía 404 porque el embed
-- animals -> animal_breeds(breeds(name)) fallaba con 42501 (error tragado
-- por la página). Mismo arreglo que 0034/0035.
-- =====================================================================

grant select, insert, update, delete on public.animal_breeds to authenticated;

grant all on public.animal_breeds to service_role;
