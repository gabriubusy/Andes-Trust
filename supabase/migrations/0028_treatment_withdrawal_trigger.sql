-- =====================================================================
-- Trigger: crea/actualiza alertas de retiro sanitario al insertar o
-- actualizar un tratamiento con withdrawal_until_meat o
-- withdrawal_until_milk definidos.
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

  -- Obtener nombre del tratamiento del catálogo
  SELECT name INTO v_cat_name
    FROM treatments_catalog
   WHERE id = NEW.catalog_id;

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
    ON CONFLICT (source_table, source_id) DO UPDATE SET
      due_at  = EXCLUDED.due_at,
      status  = CASE WHEN alerts.status = 'resolved' THEN 'open' ELSE alerts.status END,
      payload = EXCLUDED.payload;
  END IF;

  -- ── Alerta retiro leche ─────────────────────────────────────────
  -- Usamos source_id compuesto (id + sufijo) representado como texto
  -- almacenado en payload para distinguirlo del retiro de carne.
  -- Como source_id es uuid, creamos una segunda fila usando un uuid
  -- derivado (XOR del id con un namespace fijo).
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
    ON CONFLICT (source_table, source_id) DO UPDATE SET
      due_at  = EXCLUDED.due_at,
      status  = CASE WHEN alerts.status = 'resolved' THEN 'open' ELSE alerts.status END,
      payload = EXCLUDED.payload;
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
