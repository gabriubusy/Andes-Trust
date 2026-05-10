-- =====================================================================
-- Hace público el bucket animal-photos para servir fotos vía CDN.
-- Las políticas de escritura/eliminación permanecen (solo miembros).
-- Las fotos de animales no son datos sensibles; la URL pública está
-- protegida por la estructura opaca del path: <farm_id>/<animal_id>/<uuid>.ext
-- =====================================================================

update storage.buckets
set public = true
where id = 'animal-photos';

-- Eliminar política de lectura anterior (solo para miembros) —
-- el bucket público ya no requiere política de SELECT explícita,
-- pero la mantenemos por si acaso se revierte a privado.
drop policy if exists "animal-photos read" on storage.objects;
