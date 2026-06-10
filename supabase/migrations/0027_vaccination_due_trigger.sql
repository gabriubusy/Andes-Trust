-- =====================================================================
-- Trigger: crea/actualiza alerta vaccination_due al insertar o actualizar
-- una vacunación con next_due_at definido.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_vaccination_due_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_farm_id  uuid;
  v_tag      text;
  v_name     text;
BEGIN
  -- Solo actuar cuando hay fecha de próxima dosis
  IF NEW.next_due_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener farm_id y datos del animal
  SELECT a.farm_id, a.tag, a.name
    INTO v_farm_id, v_tag, v_name
    FROM animals a
   WHERE a.id = NEW.animal_id;

  IF v_farm_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert: si ya existe una alerta para esta vacunación, actualizarla;
  -- si no, crearla. Usamos source_table + un payload con el id para
  -- identificar unicidad mediante ON CONFLICT en source_id.
  INSERT INTO alerts (
    farm_id,
    animal_id,
    type,
    due_at,
    status,
    source_table,
    source_id,
    payload
  ) VALUES (
    v_farm_id,
    NEW.animal_id,
    'vaccination_due',
    NEW.next_due_at,
    'open',
    'vaccinations',
    NEW.id,
    jsonb_build_object(
      'vaccination_id',  NEW.id,
      'animal_tag',      v_tag,
      'animal_name',     v_name,
      'last_applied_at', NEW.applied_at
    )
  )
  ON CONFLICT (source_table, source_id)
  DO UPDATE SET
    due_at  = EXCLUDED.due_at,
    status  = CASE
                WHEN alerts.status = 'resolved' THEN 'open'
                ELSE alerts.status
              END,
    payload = EXCLUDED.payload;

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trg_vaccination_due_alert ON vaccinations;

CREATE TRIGGER trg_vaccination_due_alert
  AFTER INSERT OR UPDATE OF next_due_at
  ON vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION fn_vaccination_due_alert();

-- ── Columna source_id en alerts (si no existe) ──────────────────────
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Índice único para el upsert
CREATE UNIQUE INDEX IF NOT EXISTS alerts_source_uniq
  ON alerts (source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;
