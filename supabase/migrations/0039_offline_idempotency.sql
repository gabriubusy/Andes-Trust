-- ── Idempotencia para mutaciones encoladas offline ───────────────────────────
--
-- La cola offline (IndexedDB) reintenta inserts cuando vuelve la conectividad.
-- Si un insert llegó a Supabase pero la respuesta se perdió en el camino —el
-- caso típico al reconectar en campo— el reintento creaba un duplicado.
--
-- `client_uuid` lo genera el cliente ANTES de intentar el insert, así que
-- sobrevive al reintento y permite hacer upsert en vez de insert.
--
-- El índice es parcial (WHERE client_uuid IS NOT NULL) para no romper las
-- filas históricas ni los inserts que no vienen de la cola offline.

ALTER TABLE weighings     ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE vaccinations  ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE treatments    ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE milk_records  ADD COLUMN IF NOT EXISTS client_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS weighings_client_uuid_key
  ON weighings (client_uuid) WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vaccinations_client_uuid_key
  ON vaccinations (client_uuid) WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS treatments_client_uuid_key
  ON treatments (client_uuid) WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS milk_records_client_uuid_key
  ON milk_records (client_uuid) WHERE client_uuid IS NOT NULL;

-- ── current_weight_kg derivado del pesaje más reciente ───────────────────────
--
-- Antes lo actualizaba el cliente con un segundo write tras el insert. Ese
-- write no existía en el camino offline, así que un pesaje encolado sincronizaba
-- sin actualizar nunca el peso del animal. Al moverlo a un trigger, ambos
-- caminos quedan consistentes y desaparece el write extra.
--
-- Sólo pisa el valor si el pesaje entrante es el más reciente del animal: así
-- drenar la cola en desorden no revive un peso viejo.

CREATE OR REPLACE FUNCTION sync_animal_current_weight()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE animals a
     SET current_weight_kg = NEW.weight_kg
   WHERE a.id = NEW.animal_id
     AND NOT EXISTS (
       SELECT 1 FROM weighings w
        WHERE w.animal_id = NEW.animal_id
          AND w.measured_at > NEW.measured_at
     );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_animal_current_weight ON weighings;
CREATE TRIGGER trg_sync_animal_current_weight
  AFTER INSERT OR UPDATE OF weight_kg, measured_at ON weighings
  FOR EACH ROW
  EXECUTE FUNCTION sync_animal_current_weight();
