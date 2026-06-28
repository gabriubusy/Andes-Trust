-- =====================================================================
-- Fix de 0028: el trigger de alertas de retiro sanitario no funcionaba.
--   1. Referenciaba NEW.catalog_id (columna inexistente; es treatment_id).
--   2. ON CONFLICT (source_table, source_id) no coincide con la única
--      restricción única de alerts: (farm_id, type, source_table, source_id).
-- Ambos errores abortaban el INSERT del tratamiento.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_treatment_withdrawal_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_farm_id  uuid;
  v_tag      text;
  v_name     text;
  v_cat_name text;
BEGIN
  -- Obtener farm_id y datos del animal
  SELECT a.farm_id, a.tag, a.name
    INTO v_farm_id, v_tag, v_name
    FROM animals a
   WHERE a.id = NEW.animal_id;

  IF v_farm_id IS NULL THEN RETURN NEW; END IF;

  -- Obtener nombre del tratamiento del catálogo (columna correcta: treatment_id)
  SELECT name INTO v_cat_name
    FROM treatments_catalog
   WHERE id = NEW.treatment_id;

  -- ── Alerta retiro carne ─────────────────────────────────────────
  IF NEW.withdrawal_until_meat IS NOT NULL THEN
    INSERT INTO alerts (
      farm_id, animal_id, type, due_at, status, source_table, source_id, payload
    ) VALUES (
      v_farm_id,
      NEW.animal_id,
      'treatment_withdrawal',
      NEW.withdrawal_until_meat,
      'open',
      'treatments',
      NEW.id,
      jsonb_build_object(
        'treatment_id',   NEW.id,
        'animal_tag',     v_tag,
        'animal_name',    v_name,
        'treatment_name', COALESCE(v_cat_name, 'Tratamiento'),
        'withdrawal_type','meat',
        'started_at',     NEW.started_at
      )
    )
    ON CONFLICT (farm_id, type, source_table, source_id) DO UPDATE SET
      due_at  = EXCLUDED.due_at,
      status  = CASE WHEN alerts.status = 'resolved' THEN 'open' ELSE alerts.status END,
      payload = EXCLUDED.payload,
      updated_at = now();
  END IF;

  -- ── Alerta retiro leche ─────────────────────────────────────────
  -- Se usa source_table = 'treatments_milk' para distinguirla del retiro
  -- de carne (mismo source_id, distinta fila gracias a la única de 4 cols).
  IF NEW.withdrawal_until_milk IS NOT NULL THEN
    INSERT INTO alerts (
      farm_id, animal_id, type, due_at, status, source_table, source_id, payload
    ) VALUES (
      v_farm_id,
      NEW.animal_id,
      'treatment_withdrawal',
      NEW.withdrawal_until_milk,
      'open',
      'treatments_milk',
      NEW.id,
      jsonb_build_object(
        'treatment_id',   NEW.id,
        'animal_tag',     v_tag,
        'animal_name',    v_name,
        'treatment_name', COALESCE(v_cat_name, 'Tratamiento'),
        'withdrawal_type','milk',
        'started_at',     NEW.started_at
      )
    )
    ON CONFLICT (farm_id, type, source_table, source_id) DO UPDATE SET
      due_at  = EXCLUDED.due_at,
      status  = CASE WHEN alerts.status = 'resolved' THEN 'open' ELSE alerts.status END,
      payload = EXCLUDED.payload,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_treatment_withdrawal_alert ON treatments;

CREATE TRIGGER trg_treatment_withdrawal_alert
  AFTER INSERT OR UPDATE OF withdrawal_until_meat, withdrawal_until_milk
  ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION fn_treatment_withdrawal_alert();

-- Backfill: genera las alertas de tratamientos ya existentes cuyo retiro
-- siga vigente (la función de la vista ya las contempla).
SELECT generate_alerts();
