-- Fix: admin write fm policy used an inline subquery on farm_members inside a
-- farm_members policy → still recurses. Use is_farm_member() (SECURITY DEFINER)
-- for the write policy so it bypasses RLS internally.

drop policy if exists "admin write fm" on farm_members;

create policy "admin write fm" on farm_members for all
  using    (is_farm_member(farm_id, array['owner','admin']))
  with check (is_farm_member(farm_id, array['owner','admin']));
