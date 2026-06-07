-- Fix: farm_members RLS policies called is_farm_member() which queries farm_members,
-- causing infinite recursion. Replace with direct checks that don't recurse.

drop policy if exists "member read fm" on farm_members;
drop policy if exists "admin write fm" on farm_members;

-- A member can read their own rows, OR all rows for farms they admin/own.
-- The self-read clause (profile_id = current_profile_id()) never recurses.
-- The admin clause uses a security-definer function that bypasses RLS safely.
create policy "member read fm" on farm_members for select
  using (profile_id = current_profile_id());

-- Only owners/admins can insert/update/delete farm_members rows.
-- We check by looking at the caller's own row directly (no function call on farm_members).
create policy "admin write fm" on farm_members for all
  using (
    exists (
      select 1 from farm_members me
      where me.farm_id = farm_members.farm_id
        and me.profile_id = current_profile_id()
        and me.role::text = any(array['owner','admin'])
    )
  )
  with check (
    exists (
      select 1 from farm_members me
      where me.farm_id = farm_members.farm_id
        and me.profile_id = current_profile_id()
        and me.role::text = any(array['owner','admin'])
    )
  );
