-- Fix: All "FOR ALL" write policies evaluate their USING clause on SELECT operations too,
-- causing is_farm_member() to be called twice per table per query (once for read policy,
-- once for the write policy's USING on SELECT). With JOINs this stacks up to 54001.
-- Solution: split every FOR ALL write policy into explicit INSERT/UPDATE/DELETE.

-- ===== HELPER: tables with "operator write" FOR ALL =====
-- alerts, animal_events, animals, blockchain_records, buyers, certifications,
-- documents, milk_records, sales, signatures, treatments, vaccinations, weighings

DO $migration$
DECLARE
  t text;
  tables_operator text[] := ARRAY[
    'alerts','animal_events','animals','blockchain_records','buyers',
    'certifications','documents','milk_records','sales','signatures',
    'treatments','vaccinations','weighings'
  ];
  roles_operator text := 'ARRAY[''owner'',''admin'',''operator'',''vet'']';
  roles_admin text := 'ARRAY[''owner'',''admin'']';
BEGIN
  -- Drop and recreate operator write policies
  FOREACH t IN ARRAY tables_operator LOOP
    EXECUTE format('DROP POLICY IF EXISTS "operator write" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "operator insert" ON %I FOR INSERT WITH CHECK (is_farm_member(farm_id, %s))',
      t, roles_operator
    );
    EXECUTE format(
      'CREATE POLICY "operator update" ON %I FOR UPDATE USING (is_farm_member(farm_id, %s)) WITH CHECK (is_farm_member(farm_id, %s))',
      t, roles_operator, roles_operator
    );
    EXECUTE format(
      'CREATE POLICY "operator delete" ON %I FOR DELETE USING (is_farm_member(farm_id, %s))',
      t, roles_operator
    );
  END LOOP;
END $migration$;

-- ===== farms: owner write FOR ALL =====
DROP POLICY IF EXISTS "owner write" ON farms;
CREATE POLICY "owner insert" ON farms
  FOR INSERT WITH CHECK (
    owner_profile_id = current_profile_id() OR is_farm_member(id, ARRAY['owner','admin'])
  );
CREATE POLICY "owner update" ON farms
  FOR UPDATE
  USING (owner_profile_id = current_profile_id() OR is_farm_member(id, ARRAY['owner','admin']))
  WITH CHECK (owner_profile_id = current_profile_id() OR is_farm_member(id, ARRAY['owner','admin']));
CREATE POLICY "owner delete" ON farms
  FOR DELETE
  USING (owner_profile_id = current_profile_id() OR is_farm_member(id, ARRAY['owner','admin']));

-- ===== farm_invitations: admin manage FOR ALL =====
DROP POLICY IF EXISTS "admin manage" ON farm_invitations;
CREATE POLICY "admin invite insert" ON farm_invitations
  FOR INSERT WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin']));
CREATE POLICY "admin invite update" ON farm_invitations
  FOR UPDATE
  USING (is_farm_member(farm_id, ARRAY['owner','admin']))
  WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin']));
CREATE POLICY "admin invite delete" ON farm_invitations
  FOR DELETE USING (is_farm_member(farm_id, ARRAY['owner','admin']));

-- ===== regulatory_reports: admin write FOR ALL =====
DROP POLICY IF EXISTS "admin write" ON regulatory_reports;
CREATE POLICY "admin report insert" ON regulatory_reports
  FOR INSERT WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin','vet']));
CREATE POLICY "admin report update" ON regulatory_reports
  FOR UPDATE
  USING (is_farm_member(farm_id, ARRAY['owner','admin','vet']))
  WITH CHECK (is_farm_member(farm_id, ARRAY['owner','admin','vet']));
CREATE POLICY "admin report delete" ON regulatory_reports
  FOR DELETE USING (is_farm_member(farm_id, ARRAY['owner','admin','vet']));

-- ===== sale_items: operator write FOR ALL =====
DROP POLICY IF EXISTS "operator write" ON sale_items;
CREATE POLICY "operator insert" ON sale_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND is_farm_member(s.farm_id, ARRAY['owner','admin','operator']))
  );
CREATE POLICY "operator update" ON sale_items
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND is_farm_member(s.farm_id, ARRAY['owner','admin','operator'])))
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND is_farm_member(s.farm_id, ARRAY['owner','admin','operator'])));
CREATE POLICY "operator delete" ON sale_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND is_farm_member(s.farm_id, ARRAY['owner','admin','operator']))
  );

-- ===== catalog tables: admin write FOR ALL =====
-- disease_symptoms, disease_treatments, symptoms_catalog
DO $catalog$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['disease_symptoms','disease_treatments','symptoms_catalog'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin write" ON %I', t);
    EXECUTE format('CREATE POLICY "admin insert" ON %I FOR INSERT WITH CHECK (is_platform_admin() OR is_any_farm_member())', t);
    EXECUTE format('CREATE POLICY "admin update" ON %I FOR UPDATE USING (is_platform_admin() OR is_any_farm_member()) WITH CHECK (is_platform_admin() OR is_any_farm_member())', t);
    EXECUTE format('CREATE POLICY "admin delete" ON %I FOR DELETE USING (is_platform_admin() OR is_any_farm_member())', t);
  END LOOP;
END $catalog$;

-- ===== platform admin write FOR ALL on catalog tables =====
DO $padmin$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['breeds','diseases_catalog','treatments_catalog','vaccines_catalog'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "platform admin write" ON %I', t);
    EXECUTE format('CREATE POLICY "platform admin insert" ON %I FOR INSERT WITH CHECK (is_platform_admin())', t);
    EXECUTE format('CREATE POLICY "platform admin update" ON %I FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin())', t);
    EXECUTE format('CREATE POLICY "platform admin delete" ON %I FOR DELETE USING (is_platform_admin())', t);
  END LOOP;
END $padmin$;

-- ===== push_subscriptions: self write FOR ALL =====
DROP POLICY IF EXISTS "self write" ON push_subscriptions;
CREATE POLICY "self insert ps" ON push_subscriptions
  FOR INSERT WITH CHECK (profile_id = current_profile_id());
CREATE POLICY "self update ps" ON push_subscriptions
  FOR UPDATE USING (profile_id = current_profile_id()) WITH CHECK (profile_id = current_profile_id());
CREATE POLICY "self delete ps" ON push_subscriptions
  FOR DELETE USING (profile_id = current_profile_id());

-- ===== profiles: self or admin update FOR ALL? check =====
-- profiles "self or admin update" is already UPDATE only per the policy list — OK.
-- profiles "self upsert" is INSERT only — OK.
