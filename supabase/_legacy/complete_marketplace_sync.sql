-- ==============================================================================
-- VENDORA MARKETPLACE: Complete 18-Table Synchronization & RLS Migration
-- Run this script in the Supabase SQL Editor to grant full access for all 13 modules:
-- Orders, Reviews, Promotions, Payouts, Logistics/Riders, Notifications,
-- Audit Logs, CMS Content, Vendor Applications, Profiles, Cart & Wishlist.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Missing Tables (cart_items, wishlist_items, content_blocks, etc.)
-- ------------------------------------------------------------------------------

-- Cart Items table (cross-device sync for authenticated users)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  variant_id text,
  title text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  max_stock integer DEFAULT 99,
  image text DEFAULT '',
  seller_id text NOT NULL,
  seller_name text NOT NULL,
  seller_type text DEFAULT 'vendor',
  type text DEFAULT 'physical',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Wishlist Items table (cross-device sync for authenticated users)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  title text NOT NULL,
  price numeric NOT NULL,
  compare_at_price numeric,
  image text DEFAULT '',
  category text DEFAULT '',
  brand text DEFAULT '',
  seller_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add metadata column to profiles if not present (for preferences / offline cart)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Grant Permissions & Row Level Security (RLS) for all 18 Tables
-- ------------------------------------------------------------------------------

-- Function to enable RLS and create permissive policies for dev/marketplace mode
DO $$
DECLARE
  t text;
  tables text[] := array[
    'orders', 'sub_orders', 'reviews', 'promotions', 'payouts',
    'deliveries', 'rider_profiles', 'notifications', 'audit_logs',
    'content_blocks', 'vendor_applications', 'disputes', 'profiles',
    'vendor_profiles', 'products', 'categories', 'cart_items', 'wishlist_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Drop existing restrictive policies
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_select_%I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_insert_%I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_update_%I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_delete_%I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public select on %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert on %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update on %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete on %I" ON public.%I;', t, t);

    -- Create public permissive policies
    EXECUTE format('CREATE POLICY "Allow public select on %I" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public insert on %I" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public update on %I" ON public.%I FOR UPDATE USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public delete on %I" ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Seed Realistic Data for All Modules
-- ------------------------------------------------------------------------------

-- Seed Active Promotions & Coupons
INSERT INTO public.promotions (id, title, code, discount_type, description, created_at, updated_at)
VALUES
  ('promo-101', 'Welcome 10% Discount', 'SAVE10', 'percent', '10% off storewide on all orders over $50', now(), now()),
  ('promo-102', 'Tech Fest $20 Off', 'TECH20', 'fixed', '$20 off on electronics and computer accessories', now(), now()),
  ('promo-103', 'Vendora VIP 15% Off', 'VENDORA15', 'percent', '15% exclusive discount for registered members', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Seed Content Blocks (Marketing CMS Banners)
INSERT INTO public.content_blocks (id, title, slug, published, body, created_at, updated_at)
VALUES
  (
    'cb-hero-banner',
    'Main Hero Carousel Banners',
    'hero-banners',
    true,
    '{"headline":"Next-Gen Audio Experience. Up to 40% Off.","subtitle":"Shop verified premium sound systems and noise-cancelling gear.","ctaText":"Explore Collection","ctaLink":"/products?category=electronics","imageUrl":"/images/emox/hero_iphone.jpg"}'::text,
    now(),
    now()
  ),
  (
    'cb-home-deals',
    'Home & Living Seasonal Spotlight',
    'home-deals',
    true,
    '{"headline":"Upgrade Your Home & Kitchen","subtitle":"Air fryers, stand mixers and cookware from verified merchants.","ctaText":"Shop Kitchen","ctaLink":"/products?category=home-kitchen","imageUrl":"/images/bevesi/banner-13.jpg"}'::text,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Notifications
INSERT INTO public.notifications (id, title, type, user_id, metadata, created_at)
VALUES
  (
    'notif-1',
    'System Synchronized with Cloud Database',
    'system',
    null,
    '{"message":"All 18 marketplace tables are now connected and syncing live with Supabase.","linkUrl":"/admin"}'::jsonb,
    now()
  ),
  (
    'notif-2',
    'Live Order Engine Ready',
    'order_status',
    null,
    '{"message":"Orders placed through AccordionCheckout are immediately committed to Supabase tables.","linkUrl":"/orders"}'::jsonb,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Rider Profiles
INSERT INTO public.rider_profiles (id, phone, vehicle_type, status, created_at, updated_at)
VALUES
  ('rider-101', '+1 (555) 345-6789', 'Electric Bike', 'active', now(), now()),
  ('rider-102', '+1 (555) 789-0123', 'Motorcycle', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Audit Logs
INSERT INTO public.audit_logs (id, actor_id, action, entity_id, ip_address, created_at)
VALUES
  ('aud-sys-1', 'system', 'system.database_sync', 'supabase.cloud', '127.0.0.1', now() - interval '1 hour'),
  ('aud-sys-2', 'admin', 'catalog.approve_all', 'products.98', '127.0.0.1', now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Customer Reviews for real products
INSERT INTO public.reviews (id, product_id, author_name, rating, headline, body, verified_purchase, helpful_count, created_at)
VALUES
  (
    'rev-prod-el-4',
    'prod-el-4',
    'Sarah Jenkins',
    5,
    'Outstanding phone with unmatched battery life',
    'The Titanium Gray finish is gorgeous and Galaxy AI tools work flawlessly in daily work tasks.',
    true,
    14,
    now() - interval '2 days'
  ),
  (
    'rev-prod-au-1',
    'prod-au-1',
    'Marcus Vance',
    5,
    'Best ANC headphones on the market',
    'Noise cancellation blocks subway roar completely. Ear cups are soft for 8-hour sessions.',
    true,
    28,
    now() - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;
