-- is_any_farm_member and is_platform_admin were missing SECURITY DEFINER + row_security=off,
-- causing RLS to activate on internal table queries and accumulating stack depth.

CREATE OR REPLACE FUNCTION is_any_farm_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM farm_members WHERE profile_id = current_profile_id())
$$;

CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE v boolean;
BEGIN
  SELECT COALESCE(p.is_platform_admin, false) INTO v
  FROM profiles p WHERE p.privy_did = current_privy_did();
  RETURN COALESCE(v, false);
END
$$;
