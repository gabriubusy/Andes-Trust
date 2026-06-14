-- ── Compras de animales ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  seller_name     text NOT NULL,
  purchased_at    date NOT NULL DEFAULT current_date,
  total_amount    numeric(14,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  payment_method  text,                      -- cash | transfer | check | crypto
  status          text NOT NULL DEFAULT 'confirmed', -- draft | confirmed | paid | cancelled
  invoice_number  text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  animal_id       uuid REFERENCES animals(id) ON DELETE SET NULL,
  description     text,                      -- para animales aún no registrados
  quantity        int NOT NULL DEFAULT 1,
  price_per_unit  numeric(14,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm members can manage purchases"
  ON purchases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM farm_members
      WHERE farm_members.farm_id = purchases.farm_id
        AND farm_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "farm members can manage purchase_items"
  ON purchase_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      JOIN farm_members fm ON fm.farm_id = p.farm_id
      WHERE p.id = purchase_items.purchase_id
        AND fm.profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS purchases_farm_id_idx ON purchases(farm_id);
CREATE INDEX IF NOT EXISTS purchases_purchased_at_idx ON purchases(purchased_at DESC);
CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON purchase_items(purchase_id);
