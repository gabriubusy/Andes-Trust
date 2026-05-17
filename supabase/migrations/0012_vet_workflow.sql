-- =====================================================================
-- Mejoras al flujo veterinario:
-- - dose_per_kg en treatments_catalog para cálculo automático de dosis.
-- - min_age_days en vaccines_catalog para validación de edad mínima.
-- - Rol 'regulator' (solo lectura para INSAI y entes externos).
-- =====================================================================

alter table treatments_catalog
  add column if not exists dose_per_kg numeric(8,4);

alter table vaccines_catalog
  add column if not exists min_age_days integer;

-- El enum farm_role ya tiene: owner, admin, operator, vet, viewer.
-- Añadimos regulator (lectura de historial sanitario, sin escritura).
alter type farm_role add value if not exists 'regulator';
