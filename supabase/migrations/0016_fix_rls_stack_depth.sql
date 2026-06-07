-- Fix: is_farm_member and current_profile_id query tables that have RLS,
-- causing infinite recursion (stack depth exceeded).
-- SECURITY DEFINER makes them run as the function owner (postgres), bypassing RLS.

create or replace function current_profile_id() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from profiles where privy_did = current_privy_did();
  return v;
end;
$$;

create or replace function is_farm_member(_farm uuid, _roles text[] default null) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v boolean;
begin
  select exists (
    select 1 from farm_members fm
    where fm.farm_id = _farm
      and fm.profile_id = current_profile_id()
      and (_roles is null or fm.role::text = any(_roles))
  ) into v;
  return v;
end;
$$;
