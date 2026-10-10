-- =============================================================================
-- VENDORA - Supabase Setup Verification Queries
-- Run these in Supabase SQL Editor to verify your schema is correctly applied
-- =============================================================================

-- 1. CHECK ALL TABLES EXIST
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected 18 tables:
-- audit_logs, categories, commission_config, content_blocks, deliveries,
-- disputes, notifications, orders, payouts, products, profiles,
-- promotions, rider_profiles, reviews, sub_orders, vendor_applications,
-- vendor_profiles, (plus storage.buckets which is in storage schema)

-- 2. VERIFY TABLE STRUCTURES
-- Profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Vendor Profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vendor_profiles'
ORDER BY ordinal_position;

-- Products table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- Orders table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- Sub Orders table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sub_orders'
ORDER BY ordinal_position;

-- 3. CHECK RLS IS ENABLED
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All should show rowsecurity = true

-- 4. CHECK RLS POLICIES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should see policies for all 18 tables

-- 5. CHECK TRIGGERS
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- update_*_updated_at on all tables
-- trigger_update_order_group_status on sub_orders
-- on_auth_user_created on auth.users

-- 6. CHECK FUNCTIONS
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Expected functions:
-- calculate_commission
-- derive_order_group_status
-- update_order_group_status
-- handle_new_user
-- log_audit
-- update_updated_at_column
-- get_user_roles
-- has_role

-- 7. CHECK INDEXES
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. VERIFY SEED DATA - Categories
SELECT id, name, slug, commission_rate_override, sort_order, is_active
FROM public.categories
ORDER BY sort_order;

-- Should see 12 categories, cat-digital with commission_rate_override = 0.15

-- 9. VERIFY COMMISSION CONFIG
SELECT * FROM public.commission_config;

-- Should show: id=1, global_default_rate=0.10, category_overrides={}, vendor_overrides={}

-- 10. CHECK REALTIME PUBLICATION
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Should include: orders, sub_orders, disputes, deliveries, notifications, products, vendor_profiles

-- 11. CHECK EXTENSIONS
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- Should show both extensions

-- 12. TEST HELPER FUNCTIONS
-- Test has_role function (will return false for anonymous)
SELECT public.has_role(gen_random_uuid(), 'admin') as test_has_role;

-- Test calculate_commission function
SELECT * FROM public.calculate_commission(
    '00000000-0000-0000-0000-000000000000'::UUID,  -- platform vendor
    'cat-electronics',
    100.00
);

-- Should return: rate=1.0, amount=100, net_payout=0

-- Test with a vendor UUID
SELECT * FROM public.calculate_commission(
    gen_random_uuid(),
    'cat-digital',
    100.00
);

-- Should return: rate=0.15, amount=15, net_payout=85 (category override)

-- 13. CHECK STORAGE BUCKETS
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('product-images', 'vendor-assets', 'dispute-evidence', 'user-avatars');

-- Should show 4 buckets with correct settings

-- 14. CHECK STORAGE POLICIES
SELECT policyname, bucket_id, definition
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%product%' OR policyname LIKE '%vendor%' OR policyname LIKE '%dispute%' OR policyname LIKE '%avatar%';

-- 15. QUICK END-TO-END TEST (run after creating a test user)
-- This simulates what happens when a user signs up

-- First, check if handle_new_user trigger works
-- (Create a test user in Auth dashboard, then run:)
-- SELECT * FROM public.profiles WHERE email = 'your-test-email@example.com';

-- 16. VERIFY FOREIGN KEY RELATIONSHIPS
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- IF ALL CHECKS PASS, YOUR SUPABASE IS READY!
-- =============================================================================
-- Next steps:
-- 1. Add .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 2. Run: pnpm run dev
-- 3. Test login with demo accounts
-- =============================================================================