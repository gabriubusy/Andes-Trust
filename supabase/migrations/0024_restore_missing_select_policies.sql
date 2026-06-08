-- Migration 0022 split FOR ALL policies into INSERT/UPDATE/DELETE but lost the
-- SELECT side for admin-readable tables. Restore missing SELECT policies.

-- farm_invitations: admins need to read all invitations for their farm
DROP POLICY IF EXISTS "admin invite read" ON farm_invitations;
CREATE POLICY "admin invite read" ON farm_invitations
  FOR SELECT USING (is_farm_member(farm_id, ARRAY['owner','admin']));
