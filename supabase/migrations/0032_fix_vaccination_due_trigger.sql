-- Fix: ON CONFLICT must include the partial index predicate to match
-- the partial unique index alerts_source_uniq

CREATE OR REPLACE FUNCTION fn_vaccination_due_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_farm_id  uuid;
  v_tag      text;
  v_name     text;
BEGIN
  IF NEW.next_due_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.farm_id, a.tag, a.name
    INTO v_farm_id, v_tag, v_name
    FROM animals a
   WHERE a.id = NEW.animal_id;

  IF v_farm_id IS NULL THEN
    RETURN NEW;
  END IF;

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
    WHERE source_table IS NOT NULL AND source_id IS NOT NULL
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
