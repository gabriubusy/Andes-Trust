-- Store the on-chain transaction hash for purchases paid with crypto
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS crypto_tx text DEFAULT NULL;

COMMENT ON COLUMN purchases.crypto_tx IS
  'Transaction hash on Polygon Amoy when payment_method = crypto and status = paid';
