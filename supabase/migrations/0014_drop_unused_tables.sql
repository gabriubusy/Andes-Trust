-- 0014_drop_unused_tables.sql
-- Elimina subsistemas definidos en el esquema inicial pero nunca implementados
-- en la aplicación (sin lecturas/escrituras en el código ni en funciones RPC,
-- y fuera del alcance de las 15 historias de usuario).
--
-- Verificado antes de borrar:
--   * Ninguna de estas tablas se consulta vía .from() en src/ (solo aparecían
--     en database.types.ts, el archivo de tipos autogenerado).
--   * Ninguna función/RPC del esquema las usa (las únicas referencias eran
--     políticas RLS sobre las propias tablas eliminadas).
--   * La página dashboard/eventos usa valores de animal_events.type
--     ("insemination", "pregnancy_check"), NO las tablas inseminations/pregnancies.
--
-- NO se eliminan (resultaron estar en uso):
--   * milk_records            -> usado en el código (registro lechero)
--   * symptoms_catalog, diseases_catalog, disease_symptoms, disease_treatments
--                             -> usados por la página "Asistente de Tratamiento"
--                                a través del RPC suggest_treatment().
--
-- Se usa CASCADE para arrastrar índices, políticas RLS y triggers de auditoría
-- asociados a cada tabla. El orden respeta las claves foráneas (dependientes
-- primero) por claridad, aunque CASCADE lo permitiría en cualquier orden.

begin;

-- Subsistema: agrupación de animales
drop table if exists public.animal_group_members cascade;

-- Subsistema: alimentación (feed_logs depende de animal_groups y feed_items)
drop table if exists public.feed_logs cascade;

-- Padres de los subsistemas anteriores
drop table if exists public.animal_groups cascade;
drop table if exists public.feed_items cascade;

-- Subsistema: reproducción (pregnancies depende de inseminations)
drop table if exists public.pregnancies cascade;
drop table if exists public.inseminations cascade;

-- Lechería: solo el reparto/entrega (milk_records SÍ se conserva)
drop table if exists public.milk_deliveries cascade;

-- Proveedores (0 referencias, 0 claves foráneas entrantes)
drop table if exists public.suppliers cascade;

commit;
