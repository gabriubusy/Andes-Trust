DROP POLICY IF EXISTS "operator write" ON traceability_tokens;
CREATE POLICY "operator insert" ON traceability_tokens
  FOR INSERT WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin','operator','vet']));
CREATE POLICY "operator update" ON traceability_tokens
  FOR UPDATE
  USING (is_farm_member(farm_id, ARRAY['owner','admin','operator','vet']))
  WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin','operator','vet']));
CREATE POLICY "operator delete" ON traceability_tokens
  FOR DELETE USING (is_farm_member(farm_id, ARRAY['owner','admin','operator','vet']));
