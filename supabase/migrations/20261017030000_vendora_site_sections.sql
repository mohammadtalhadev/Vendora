-- ============================================================================
-- Vendora Batch 85: section CMS - homepage sections the console owns.
--
-- Until now the homepage's image blocks were code: the category tiles, the
-- app promo panel and the (unrendered) inspiration mosaic carried their
-- images and copy in TSX, so every banner change was a deploy. This batch
-- moves those blocks into two tables the admin console manages end to end:
--
--   * `site_sections` - one row per homepage section instance: a stable
--     `key`, a renderer `type`, a display `title`, free-form `settings`
--     jsonb for type-specific copy, a `sort_order` and an `is_enabled`
--     switch.
--   * `site_section_items` - the slides/tiles/cards inside a section:
--     image, heading, subtext, CTA label + link, order, active flag.
--     Deleting a section cascades its items.
--
-- A developer adding a NEW section type registers one renderer in
-- src/features/home/sections/registry.ts; from then on admins create,
-- edit, reorder and delete instances of that type with no further code.
--
-- Reads are public but narrow: anonymous and signed-in shoppers see only
-- ENABLED sections and ACTIVE items (an item under a disabled section is
-- hidden by the parent check in its policy). Staff (admin/support) read
-- everything so the console can show drafts; writes are admin-only.
-- Vendors and customers can write nothing.
--
-- The seed converts today's hard-coded blocks with their content carried
-- over verbatim, so the page looks the same the day this lands - with two
-- deliberate exceptions the owner asked for in the same batch: the hero
-- gains his new creatives (below), and the inspiration mosaic is seeded
-- DISABLED because the block is not rendered on the homepage today;
-- enabling it in the console is what puts it on the page.
--
-- Hero banner seeds (content_blocks): the owner's 2026-10-15 creatives.
--   * `homepage_hero_portrait` becomes a rotating rail: HomeNest (Home &
--     Kitchen) and PureGlow (Beauty) publish there, ahead of nothing - the
--     placement had no published rows, the built-in watch banner was a
--     code fallback and still is when the rail is empty.
--   * `homepage_left_promo` is new: the Best Seller creative. When a row
--     is published there the hero row gains a left promo column; with
--     none published the layout is exactly the pre-batch one.
-- Link targets are routes verified in the app: the category catalogue
-- (`/products?category=home-kitchen`, `?category=beauty-personal-care`)
-- and the deals page (`/deals`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  type text not null,
  title text not null default '',
  settings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_site_sections_updated before update on public.site_sections
  for each row execute function public.set_updated_at();

create table public.site_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.site_sections(id) on delete cascade,
  image_url text not null default '',
  heading text not null default '',
  subtext text not null default '',
  cta_label text not null default '',
  cta_link text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_site_section_items_updated before update on public.site_section_items
  for each row execute function public.set_updated_at();

create index site_section_items_section_idx on public.site_section_items (section_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2. Row level security
-- ----------------------------------------------------------------------------
alter table public.site_sections enable row level security;
alter table public.site_section_items enable row level security;

-- Shoppers see enabled sections only (mirrors content_select_published).
drop policy if exists site_sections_select_public on public.site_sections;
create policy site_sections_select_public on public.site_sections
  for select
  using (is_enabled);

drop policy if exists site_sections_select_staff on public.site_sections;
create policy site_sections_select_staff on public.site_sections
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

drop policy if exists site_sections_write_admin on public.site_sections;
create policy site_sections_write_admin on public.site_sections
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- An item is public only when it is active AND its section is enabled.
drop policy if exists site_section_items_select_public on public.site_section_items;
create policy site_section_items_select_public on public.site_section_items
  for select
  using (
    is_active
    and exists (
      select 1 from public.site_sections s
      where s.id = section_id and s.is_enabled
    )
  );

drop policy if exists site_section_items_select_staff on public.site_section_items;
create policy site_section_items_select_staff on public.site_section_items
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

drop policy if exists site_section_items_write_admin on public.site_section_items;
create policy site_section_items_write_admin on public.site_section_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_sections, public.site_section_items to anon;
grant select, insert, update, delete on public.site_sections, public.site_section_items
  to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Seed: the converted sections, content identical to the hard-coded page.
--    Fixed ids keep the mosaic's hotspot map (in its section settings)
--    pointing at the right items; ON CONFLICT keeps re-runs harmless.
-- ----------------------------------------------------------------------------
insert into public.site_sections (id, key, type, title, settings, sort_order, is_enabled)
values (
  'b8500000-0000-4000-8000-000000000001',
  'popular-categories',
  'category-tiles',
  'Explore Popular Categories',
  '{}'::jsonb,
  10,
  true
)
on conflict (key) do nothing;

insert into public.site_section_items (id, section_id, image_url, heading, subtext, cta_label, cta_link, sort_order, is_active)
values
  ('b8500000-0000-4000-8000-000000000101', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_electronics_2k.png', 'Electronics', '', '', '/products?category=electronics', 1, true),
  ('b8500000-0000-4000-8000-000000000102', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_audio_wearables_2k.png', 'Audio & Wearables', '', '', '/products?category=audio-wearables', 2, true),
  ('b8500000-0000-4000-8000-000000000103', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_cameras_photo_2k.png', 'Cameras & Photo', '', '', '/products?category=cameras-photo', 3, true),
  ('b8500000-0000-4000-8000-000000000104', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_fashion_2k.png', 'Fashion', '', '', '/products?category=fashion', 4, true),
  ('b8500000-0000-4000-8000-000000000105', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_shoes_2k.png', 'Shoes', '', '', '/products?category=shoes', 5, true),
  ('b8500000-0000-4000-8000-000000000106', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_bags_luggage_2k.png', 'Bags & Luggage', '', '', '/products?category=bags-luggage', 6, true),
  ('b8500000-0000-4000-8000-000000000107', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_jewelry_watches_2k.png', 'Jewelry & Watches', '', '', '/products?category=jewelry-watches', 7, true),
  ('b8500000-0000-4000-8000-000000000108', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_beauty_personalcare_2k.png', 'Beauty & Personal Care', '', '', '/products?category=beauty-personal-care', 8, true),
  ('b8500000-0000-4000-8000-000000000109', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_home_kitchen_2k.png', 'Home & Kitchen', '', '', '/products?category=home-kitchen', 9, true),
  ('b8500000-0000-4000-8000-000000000110', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_kids_baby_2k.png', 'Kids & Baby', '', '', '/products?category=kids-baby', 10, true),
  ('b8500000-0000-4000-8000-000000000111', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_sports_outdoors_2k.png', 'Sports & Outdoors', '', '', '/products?category=sports-outdoors', 11, true),
  ('b8500000-0000-4000-8000-000000000112', 'b8500000-0000-4000-8000-000000000001', '/images/categories/cat_digital_products_2k.png', 'Digital Products', '', '', '/products?category=digital-products', 12, true)
on conflict (id) do nothing;

-- The inspiration mosaic: seeded disabled (it is not rendered today). Its
-- shop-the-look hotspot pins are type-specific structured data, so they
-- live in the section's settings keyed by item id; the item rows carry
-- the card image/copy, and each item's cta_label carries its tag chip.
insert into public.site_sections (id, key, type, title, settings, sort_order, is_enabled)
values (
  'b8500000-0000-4000-8000-000000000002',
  'inspiration-mosaic',
  'inspiration-mosaic',
  'Inspiration Mosaic & Shop The Look',
  '{
    "hotspotsByItemId": {
      "b8500000-0000-4000-8000-000000000201": [
        {"id": "hs-headphones", "top": "32%", "left": "28%", "title": "Sony WH-1000XM5 Headphones", "price": 298.0, "productUrl": "/products/bs-sony-wh", "image": "/images/bevesi/1-13.jpg"},
        {"id": "hs-lamp", "top": "22%", "left": "74%", "title": "Aura Minimalist Ambient Lamp", "price": 49.5, "productUrl": "/products/rec-glow-lamp", "image": "/images/products/prod_glow_lamp.jpg"}
      ],
      "b8500000-0000-4000-8000-000000000202": [
        {"id": "hs-cream", "top": "48%", "left": "60%", "title": "Coastal Glow Bio-Hydra Cream", "price": 36.0, "productUrl": "/products/bs-lumina-cream", "image": "/images/products/prod_lumina_cream.jpg"}
      ],
      "b8500000-0000-4000-8000-000000000203": [
        {"id": "hs-bag", "top": "45%", "left": "38%", "title": "Artisan Full-Grain Crossbody Satchel", "price": 135.0, "productUrl": "/products/rec-leather-bag", "image": "/images/products/prod_leather_bag.jpg"}
      ],
      "b8500000-0000-4000-8000-000000000204": [
        {"id": "hs-vase", "top": "38%", "left": "65%", "title": "Nordic Fluted Matte Ceramic Vase", "price": 32.0, "productUrl": "/products/rv-pampas-vase", "image": "/images/products/prod_pampas_vase.jpg"}
      ]
    }
  }'::jsonb,
  20,
  false
)
on conflict (key) do nothing;

insert into public.site_section_items (id, section_id, image_url, heading, subtext, cta_label, cta_link, sort_order, is_active)
values
  ('b8500000-0000-4000-8000-000000000201', 'b8500000-0000-4000-8000-000000000002', '/images/bevesi/banner-08.jpg', 'The Focus Studio Setup', 'Ultra-clean wireless workspace with noise isolation and ambient glow', 'TECH & WORKSPACE', '', 1, true),
  ('b8500000-0000-4000-8000-000000000202', 'b8500000-0000-4000-8000-000000000002', '/images/bevesi/beauty_face_full.jpg', 'The Glass Skin Ritual', 'Morning hydration trio for barrier restoration', 'BEAUTY & WELLNESS', '', 2, true),
  ('b8500000-0000-4000-8000-000000000203', 'b8500000-0000-4000-8000-000000000002', '/images/bevesi/banner-07.jpg', 'Minimalist Urban Transit', 'Premium full-grain leather carry and high-mileage sneakers', 'FASHION & ACCESSORIES', '', 3, true),
  ('b8500000-0000-4000-8000-000000000204', 'b8500000-0000-4000-8000-000000000002', '/images/bevesi/banner-16.jpg', 'The Modern Artisan Kitchen', 'Precision countertop appliances and matte ceramic serveware', 'HOME LIVING', '', 4, true)
on conflict (id) do nothing;

-- The app promo panel: a copy-only section (no items). Its text lives in
-- settings so the console edits it without a deploy; the renderer falls
-- back to these same words when no settings are present.
insert into public.site_sections (id, key, type, title, settings, sort_order, is_enabled)
values (
  'b8500000-0000-4000-8000-000000000003',
  'app-promo',
  'promo-banner',
  'Vendora in Your Mobile Browser',
  '{
    "eyebrow": "Vendora in Your Mobile Browser",
    "headingLead": "Shop Faster. Track Live.",
    "headingAccent": "All in Your Pocket.",
    "subtext": "No app to install — Vendora runs right in your phone''s browser. Follow your escrow release and rider tracking in real time, and check out securely wherever you are.",
    "bullets": ["Instant Escrow Alerts", "Secure Escrow Checkout", "One-Tap Re-Order"]
  }'::jsonb,
  30,
  true
)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Hero banner seeds: the owner's new creatives (Part A of this batch).
-- ----------------------------------------------------------------------------
insert into public.content_blocks (slug, title, body, placement, published, sort_order)
values
  (
    'hero-portrait-home-kitchen',
    'Home & Kitchen Made Beautiful',
    '{"headline": "Home & Kitchen Made Beautiful", "subtitle": "Everyday essentials — everything you need to make your space feel like home.", "imageUrl": "/images/home/hero-home-kitchen.png", "ctaText": "Shop Now", "ctaLink": "/products?category=home-kitchen"}'::jsonb,
    'homepage_hero_portrait',
    true,
    10
  ),
  (
    'hero-portrait-beauty',
    'Your Beauty & Self-Care, All in One Place',
    '{"headline": "Your Beauty & Self-Care, All in One Place", "subtitle": "Top brands and trusted sellers for skincare, haircare and personal care.", "imageUrl": "/images/home/hero-beauty.png", "ctaText": "Shop Now", "ctaLink": "/products?category=beauty-personal-care"}'::jsonb,
    'homepage_hero_portrait',
    true,
    20
  ),
  (
    'hero-left-promo-best-seller',
    'Best Seller Category',
    '{"headline": "Best Seller Category", "subtitle": "Top-rated products loved by thousands. Quality, style and value — all in one place.", "imageUrl": "/images/home/hero-left-best-seller.png", "ctaText": "Shop Best Sellers", "ctaLink": "/deals"}'::jsonb,
    'homepage_left_promo',
    true,
    10
  )
on conflict (slug) do nothing;
