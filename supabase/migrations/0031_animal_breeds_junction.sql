-- Replace the single breed_id FK on animals with a junction table
-- so one animal can have multiple breeds (crossbreeds).

CREATE TABLE animal_breeds (
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  breed_id  uuid NOT NULL REFERENCES breeds(id)  ON DELETE CASCADE,
  PRIMARY KEY (animal_id, breed_id)
);

-- Migrate existing single-breed data
INSERT INTO animal_breeds (animal_id, breed_id)
SELECT id, breed_id
FROM animals
WHERE breed_id IS NOT NULL;

-- Drop old column
ALTER TABLE animals DROP COLUMN breed_id;

-- RLS
ALTER TABLE animal_breeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm members read animal_breeds"
  ON animal_breeds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      JOIN farm_members fm ON fm.farm_id = a.farm_id
      WHERE a.id = animal_breeds.animal_id
        AND fm.privy_did = current_privy_did()
    )
  );

CREATE POLICY "farm members write animal_breeds"
  ON animal_breeds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      JOIN farm_members fm ON fm.farm_id = a.farm_id
      WHERE a.id = animal_breeds.animal_id
        AND fm.privy_did = current_privy_did()
        AND fm.role IN ('owner', 'admin', 'vet', 'worker')
    )
  );
