-- Fix: admin write fm policy was FOR ALL which evaluates USING clause on SELECT too.
-- That means every SELECT on farm_members calls is_farm_member(), which queries farm_members,
-- stacking up recursion depth. Changing to INSERT/UPDATE/DELETE only eliminates this.
-- SELECT is fully covered by "member read fm" (profile_id = current_profile_id()).

DROP POLICY IF EXISTS "admin write fm" ON farm_members;

CREATE POLICY "admin write fm" ON farm_members
  FOR INSERT WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin']));

CREATE POLICY "admin update fm" ON farm_members
  FOR UPDATE USING (is_farm_member(farm_id, ARRAY['owner','admin']))
  WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin']));

CREATE POLICY "admin delete fm" ON farm_members
  FOR DELETE USING (is_farm_member(farm_id, ARRAY['owner','admin']));
