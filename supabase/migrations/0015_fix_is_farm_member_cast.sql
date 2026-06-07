-- Fix: fm.role is farm_role enum, _roles is text[] — add explicit cast to avoid
-- "operator does not exist: farm_role = text" error in RLS policies.
create or replace function is_farm_member(_farm uuid, _roles text[] default null) returns boolean
language plpgsql stable as $$
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
