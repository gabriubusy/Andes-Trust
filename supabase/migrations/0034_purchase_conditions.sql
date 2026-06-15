-- Add conditions JSONB column to purchases table
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT NULL;

COMMENT ON COLUMN purchases.conditions IS
  'Array of {id, description, reduction_type, reduction_value} objects defined at purchase time';
