-- ============================================================================
-- Vendora 0005: Privileges. RLS decides WHICH rows a role may touch; grants
-- decide whether the role may touch the table at all. Both are required.
-- Runs last so every table, function and sequence created above is covered.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- anon: read-only, and only what the SELECT policies expose (approved products,
-- public vendor/store data, categories, published content blocks, active promos).
grant select on all tables in schema public to anon;

-- authenticated: CRUD subject to RLS. Writes that must go through an RPC
-- (orders, sub_orders, moderation columns) have no INSERT/UPDATE policy, so RLS
-- rejects them regardless of this grant.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- service_role: bypasses RLS (role attribute), used by admin tooling / future Edge Functions.
grant select, insert, update, delete, truncate, references, trigger on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- RPCs are the sanctioned write path for checkout, order state and moderation.
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on all functions in schema public from anon;

-- pgcrypto lives in public here; digest()/encrypt() must stay callable by the RPCs.
grant execute on function public.hash_delivery_code(text) to authenticated, service_role;

-- Keep future migrations covered (Supabase provisions these by default; re-asserted
-- so a fresh project bootstrapped from these migrations alone behaves identically).
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
