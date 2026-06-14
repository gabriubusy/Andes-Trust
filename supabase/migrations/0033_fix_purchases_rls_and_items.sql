-- ══════════════════════════════════════════════════════════════════
-- Fix 1: RLS policies use auth.uid() — must use current_profile_id()
-- ══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "farm members can manage purchases"    ON purchases;
DROP POLICY IF EXISTS "farm members can manage purchase_items" ON purchase_items;

CREATE POLICY "farm members can manage purchases"
  ON purchases FOR ALL
  USING  (is_farm_member(farm_id))
  WITH CHECK (is_farm_member(farm_id));

CREATE POLICY "farm members can manage purchase_items"
  ON purchase_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id
        AND is_farm_member(p.farm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id
        AND is_farm_member(p.farm_id)
    )
  );

-- ══════════════════════════════════════════════════════════════════
-- Fix 2: Auto-payment trigger
-- When ALL purchase_items have been received (quantity accounted for)
-- and the purchase status is 'confirmed', auto-set to 'paid'.
-- Also triggered when a purchase is manually set to 'paid'.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_auto_pay_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_items   int;
  v_linked_items  int;
  v_purchase_status text;
BEGIN
  -- Only run when an item is inserted/updated with an animal_id
  IF NEW.animal_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_purchase_status
    FROM purchases WHERE id = NEW.purchase_id;

  IF v_purchase_status NOT IN ('confirmed', 'draft') THEN
    RETURN NEW;
  END IF;

  -- Count total items vs items that have a linked animal (fulfilled)
  SELECT COUNT(*),
         COUNT(animal_id)
    INTO v_total_items, v_linked_items
    FROM purchase_items
   WHERE purchase_id = NEW.purchase_id;

  -- Auto-pay if every item has been linked to a real animal
  IF v_total_items > 0 AND v_total_items = v_linked_items THEN
    UPDATE purchases
       SET status = 'paid'
     WHERE id = NEW.purchase_id
       AND status IN ('confirmed', 'draft');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_pay_purchase ON purchase_items;

CREATE TRIGGER trg_auto_pay_purchase
  AFTER INSERT OR UPDATE OF animal_id
  ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_pay_purchase();

-- ══════════════════════════════════════════════════════════════════
-- Fix 3: When a purchase_item links an animal, set animal status
-- to 'active' (it just arrived at the farm).
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_purchase_item_link_animal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL AND (OLD IS NULL OR OLD.animal_id IS DISTINCT FROM NEW.animal_id) THEN
    UPDATE animals
       SET status = 'active'
     WHERE id = NEW.animal_id
       AND status IN ('sold', 'inactive');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_item_link_animal ON purchase_items;

CREATE TRIGGER trg_purchase_item_link_animal
  AFTER INSERT OR UPDATE OF animal_id
  ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_purchase_item_link_animal();
