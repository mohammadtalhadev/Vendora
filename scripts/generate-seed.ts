// Generates supabase/seed.sql for the UUID-based Vendora schema.
//
// Sources of truth (all still used by the MSW test seeds):
//   - src/mocks/seed/catalog.ts   -> demo categories, stores, first-party products
//   - supabase/seed_products.sql  -> 98 brand-store products + 11 brand stores
//   - src/lib/demo-accounts.ts    -> the six one-click demo personas
//
// Legacy text ids (cat-audio, vendor-apple, prod-el-1, ...) are mapped to
// deterministic UUIDs so the seed is stable across resets.
//
// Usage: node --experimental-strip-types scripts/generate-seed.ts
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_VENDORS } from '../src/mocks/seed/catalog.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Deterministic v4-shaped UUID from a legacy text id. */
function uuid(key: string): string {
  const h = createHash('md5').update(`vendora:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const str = (v: string) => `'${v.replace(/'/g, "''")}'`;
/** Strip the SQL quoting a copied-over field carries from the legacy seed file. */
const unq = (v: string) =>
  /^'/.test(v) && /'$/.test(v) ? v.slice(1, -1).replace(/''/g, "'") : v;
const num = (v: number | null | undefined) => (v == null ? 'null' : String(v));
const json = (v: unknown) => `${str(JSON.stringify(v ?? {}))}::jsonb`;
const textArr = (v: string[]) => (v.length === 0 ? `'{}'::text[]` : `array[${v.map(str).join(', ')}]::text[]`);

// ---------------------------------------------------------------- demo personas
const DEMO_USERS = [
  { key: 'usr-customer-1', email: 'customer@demo.test', name: 'Sarah Customer', roles: ['customer'], vendorStatus: 'none' },
  { key: 'usr-newuser-1', email: 'newuser@demo.test', name: 'Alex Potential Vendor', roles: ['customer'], vendorStatus: 'none' },
  { key: 'usr-vendor-1', email: 'vendor@demo.test', name: 'Marcus Tech Seller', roles: ['customer', 'vendor'], vendorStatus: 'approved' },
  { key: 'usr-vendor-2', email: 'vendor2@demo.test', name: 'Priya Design Seller', roles: ['customer', 'vendor'], vendorStatus: 'approved' },
  { key: 'usr-admin-1', email: 'admin@demo.test', name: 'Elena Administrator', roles: ['admin', 'customer'], vendorStatus: 'none' },
  { key: 'usr-support-1', email: 'support@demo.test', name: 'Jordan Support Lead', roles: ['support'], vendorStatus: 'none' },
  { key: 'usr-rider-1', email: 'rider@demo.test', name: 'Sam Express Rider', roles: ['rider'], vendorStatus: 'none' },
];
const DEMO_PASSWORD = 'demo1234';

// ------------------------------------------------------------- legacy bulk seed
const legacy = readFileSync(path.join(ROOT, 'supabase/seed_products.sql'), 'utf8');

const vendorBlock = legacy.slice(
  legacy.indexOf('insert into public.vendor_profiles'),
  legacy.indexOf('on conflict', legacy.indexOf('insert into public.vendor_profiles')),
);
const brandStores = [...vendorBlock.matchAll(/^\s*\('(vendor-[a-z0-9-]+)', (.*?)\),?\s*$/gm)].map((m) => {
  const [id, rest] = [m[1], m[2]];
  // store_name, slug, description, logo, banner, rating, review_count, commission, status
  const fields = splitRow(rest);
  return {
    id,
    storeName: unq(fields[0]),
    slug: unq(fields[1]),
    description: unq(fields[2]),
    logo: unq(fields[3]),
    banner: unq(fields[4]),
    rating: Number(fields[5]),
    reviewCount: Number(fields[6]),
    commission: fields[7] === 'null' ? null : Number(fields[7]),
    status: unq(fields[8]),
  };
});

const productBlock = legacy.slice(
  legacy.indexOf('insert into public.products'),
  legacy.indexOf('on conflict', legacy.indexOf('insert into public.products')),
);
const brandProducts = [...productBlock.matchAll(/^\s*\('(prod-[a-z0-9-]+)', (.*?),?\s*$/gm)].map((m) => {
  const fields = splitRow(m[2]);
  const [title, slug, description, categoryId, brand, imagesSql, price, compareAt, type, sellerId, sellerName, sellerType, variants, stock, shipping, digital, rating, reviewCount, status] = fields;
  void sellerName;
  const resolvedSeller =
    unq(sellerType) === 'platform'
      ? unq(brand) === 'StudioCraft'
        ? 'vendor-design-1'
        : 'platform'
      : unq(sellerId);
  return {
    id: m[1],
    title: unq(title),
    slug: unq(slug),
    description: unq(description),
    categoryId: unq(categoryId),
    brand: unq(brand),
    images: [...imagesSql.matchAll(/'(https?:[^']+)'/g)].map((u) => u[1]),
    price: Number(price),
    compareAtPrice: compareAt === 'null' ? null : Number(compareAt),
    type: unq(type),
    sellerId: resolvedSeller,
    variants: unq(variants.replace(/::jsonb$/, '')),
    stock: Number(stock),
    shipping: unq(shipping.replace(/::jsonb$/, '')),
    digital: unq(digital.replace(/::jsonb$/, '')),
    rating: Number(rating),
    reviewCount: Number(reviewCount),
    status: unq(status),
  };
});

/** Split a trailing SQL field list, respecting quotes and $$-style nesting. */
function splitRow(row: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inStr) {
      cur += ch;
      if (ch === "'" && row[i + 1] === "'") {
        cur += "'";
        i++;
      } else if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      cur += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim().replace(/\)$/, ''));
  return out;
}

// ------------------------------------------------------------------------ emit
const L: string[] = [
  `-- ============================================================================
-- Vendora demo seed - GENERATED by scripts/generate-seed.ts, do not edit by hand.
--   node --experimental-strip-types scripts/generate-seed.ts
-- Covers identities, stores, categories, catalog and the store settings the vendor
-- workspace edits. Transactional demo data (orders, deliveries, payouts) is created
-- through the RPCs so it stays consistent with the money columns.
-- ============================================================================

begin;`,
  '',
  '-- 1. Auth users for the one-click demo personas (password: demo1234).',
  `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values`,
  DEMO_USERS.map((u) =>
    `  ('${uuid(u.key)}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${str(u.email)}, ` +
      `extensions.crypt(${str(DEMO_PASSWORD)}, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, ` +
      `jsonb_build_object('name', ${str(u.name)}, 'full_name', ${str(u.name)}), now(), now())`,
  ).join(',\n') +
    `
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = now();`,
  '',
  `-- GoTrue reads these fields into non-nullable Go strings, so a NULL left behind by a
  -- raw INSERT makes every password login for that user fail with HTTP 500
  -- "Database error querying schema". Write the same empty strings GoTrue itself writes.
update auth.users
   set confirmation_token = coalesce(confirmation_token, ''),
       recovery_token = coalesce(recovery_token, ''),
       reauthentication_token = coalesce(reauthentication_token, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       email_change = coalesce(email_change, ''),
       phone_change = coalesce(phone_change, ''),
       phone_change_token = coalesce(phone_change_token, '');`,
  '',
  `-- An email login needs its identity row; GoTrue creates it alongside the user.
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select extensions.gen_random_uuid(),
       u.id::text,
       u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email',
       now(),
       now(),
       now()
  from auth.users u
 where not exists (select 1 from auth.identities i where i.provider_id = u.id::text and i.provider = 'email');`,
  '',
  '-- handle_new_user() created the profiles; grant each persona its roles.',
  ...DEMO_USERS.map(
    (u) =>
      `update public.profiles set roles = array[${u.roles.map((r) => `'${r}'::public.user_role`).join(', ')}]::public.user_role[], vendor_status = '${u.vendorStatus}'::public.vendor_status where id = '${uuid(u.key)}';`,
  ),
  '',
  '-- 2. Categories',
  `insert into public.categories (id, name, slug, image, commission_rate_override) values`,
  SEED_CATEGORIES.map(
    (c) =>
      `  ('${uuid(c.id)}', ${str(c.name)}, ${str(c.slug)}, ${str((c as { image?: string }).image ?? '')}, ${num((c as { commissionRateOverride?: number }).commissionRateOverride ?? null)})`,
  ).join(',\n') +
    `\non conflict (id) do update set name = excluded.name, slug = excluded.slug, image = excluded.image, commission_rate_override = excluded.commission_rate_override;`,
  '',
  '-- 3. Stores: the synthetic platform seller, the two demo vendor stores, then the brand stores.',
  `insert into public.vendor_profiles (id, user_id, store_name, slug, description, logo, banner, rating, review_count, commission_rate_override, status) values`,
  [
    `  ('${uuid('platform')}', null, 'Vendora', 'vendora', 'First-party Vendora storefront. Curated hardware and accessories sold and shipped by the marketplace itself.', '', '', 4.9, 1200, 0.000, 'active')`,
    ...SEED_VENDORS.map(
      (v) =>
        `  ('${uuid(v.id)}', '${uuid(v.userId)}', ${str(v.storeName)}, ${str(v.slug)}, ${str(v.description)}, ${str(v.logo)}, ${str(v.banner)}, ${num(v.rating)}, ${num(v.reviewCount)}, ${num(v.commissionRateOverride ?? null)}, '${v.status}')`,
    ),
    ...brandStores.map(
      (s) =>
        `  ('${uuid(s.id)}', null, ${str(s.storeName)}, ${str(s.slug)}, ${str(s.description)}, ${str(s.logo)}, ${str(s.banner)}, ${num(s.rating)}, ${num(s.reviewCount)}, ${num(s.commission)}, '${s.status}')`,
    ),
  ].join(',\n') +
    `
on conflict (id) do update set
  store_name = excluded.store_name,
  description = excluded.description,
  logo = excluded.logo,
  banner = excluded.banner,
  rating = excluded.rating,
  review_count = excluded.review_count;`,
  '',
  `-- The first-party store is the only 'platform' seller; every other row is a vendor.
update public.vendor_profiles set seller_type = 'platform' where slug = 'vendora';`,
  '',
  '-- 4. Products. seller_id resolves the legacy seller_name/seller_type columns.',
  `insert into public.products (id, title, slug, description, category_id, brand, images, price, compare_at_price, type, seller_id, variants, stock, shipping_settings, digital_asset_info, rating, review_count, status, created_at) values`,
  [
    ...SEED_PRODUCTS.map((p) => {
      const pp = p as unknown as Record<string, any>;
      return `  ('${uuid(pp.id)}', ${str(pp.title)}, ${str(pp.slug)}, ${str(pp.description)}, '${uuid(pp.category)}', ${str(pp.brand)}, ${textArr(pp.images)}, ${num(pp.price)}, ${num(pp.compareAtPrice ?? null)}, '${pp.type}', '${uuid(pp.sellerId)}', ${json(pp.variants ?? [])}, ${num(pp.stock)}, ${json(pp.shippingSettings ?? {})}, ${json(pp.digitalAssetInfo ?? {})}, ${num(pp.rating)}, ${num(pp.reviewCount)}, '${pp.status}', ${str(pp.createdAt)})`;
    }),
    ...brandProducts.map((p) => {
      return `  ('${uuid(p.id)}', ${str(p.title)}, ${str(p.slug)}, ${str(p.description)}, '${uuid(p.categoryId)}', ${str(p.brand)}, ${textArr(p.images)}, ${num(p.price)}, ${num(p.compareAtPrice)}, '${p.type}', '${uuid(p.sellerId)}', ${str(p.variants)}::jsonb, ${num(p.stock)}, ${str(p.shipping)}::jsonb, ${str(p.digital)}::jsonb, ${num(p.rating)}, ${num(p.reviewCount)}, '${p.status}', now())`;
    }),
  ].join(',\n') +
    `
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category_id = excluded.category_id,
  brand = excluded.brand,
  images = excluded.images,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  type = excluded.type,
  seller_id = excluded.seller_id,
  variants = excluded.variants,
  stock = excluded.stock,
  shipping_settings = excluded.shipping_settings,
  digital_asset_info = excluded.digital_asset_info,
  rating = excluded.rating,
  review_count = excluded.review_count,
  status = excluded.status;`,
  '',
  '-- 5. Promotions (platform-wide plus one store offer).',
  `insert into public.promotions (id, vendor_id, code, title, description, discount_type, discount_value, minimum_order, max_discount, usage_limit, active) values
  ('${uuid('promo-save10')}', null, 'SAVE10', 'Welcome 10% Discount', '10% off storewide on orders over $50.', 'percentage', 10, 50, 50, 1000, true),
  ('${uuid('promo-vip15')}',   null, 'VENDORA15', 'Vendora VIP 15% Off', '15% for registered members on orders over $120.', 'percentage', 15, 120, 120, 500, true),
  ('${uuid('promo-flat20')}',  null, 'TECH20', 'Tech Fest $20 Off', '$20 off electronics and accessories over $150.', 'fixed', 20, 150, 20, 300, true),
  ('${uuid('promo-wave12')}',  '${uuid('vendor-tech-1')}', 'WAVE12', 'SoundWave Direct 12%', '12% off studio audio at SoundWave Direct, max $60.', 'percentage', 12, 80, 60, 200, true)
on conflict (code) do update set title = excluded.title, description = excluded.description, discount_value = excluded.discount_value;`,
  '',
  '-- 6. Rider fleet.',
  `insert into public.rider_profiles (id, user_id, full_name, phone, vehicle_type, status) values
  ('${uuid('rider-sam-1')}', '${uuid('usr-rider-1')}', 'Sam Express Rider', '+1 (555) 345-6789', 'Motorcycle', 'available'),
  ('${uuid('rider-2')}', null, 'Nadia Volt', '+1 (555) 789-0123', 'Electric Bike', 'available'),
  ('${uuid('rider-3')}', null, 'Bilal Cargo Van', '+1 (555) 222-3344', 'Van', 'busy')
on conflict (id) do update set full_name = excluded.full_name, status = excluded.status;`,
  '',
  '-- 7. Marketing content blocks (home hero + spotlight carousels).',
  `insert into public.content_blocks (id, title, slug, published, body) values
  ('${uuid('cb-hero')}', 'Main Hero Carousel', 'hero-banners', true,
   jsonb_build_array(jsonb_build_object('headline','Own Your Everyday.','subtitle','Verified flagship stores, one checkout, 24/7 concierge support.','ctaText','Shop the edit','ctaLink','/products','imageUrl','https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80'))),
  ('${uuid('cb-deals')}', 'Seasonal Spotlight', 'spotlight', true,
   jsonb_build_array(jsonb_build_object('headline','Studio & Sound Week.','subtitle','Curated audio gear from SoundWave Direct.','ctaText','Explore audio','ctaLink','/products?category=audio-wearables','imageUrl','https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1600&q=80')))
on conflict (id) do update set title = excluded.title, body = excluded.body, published = excluded.published;`,
  '',
  '-- 8. Commission config (the single source of the default take rate).',
  `update public.commission_config
   set global_default_rate = 0.100,
       category_overrides = jsonb_build_object('${uuid('cat-digital')}', 0.150),
       vendor_overrides = jsonb_build_object('${uuid('vendor-apple')}', 0.050, '${uuid('vendor-khaadi')}', 0.090);`,
  '',
  `-- 9. Store settings — the fields the vendor Settings page reads and writes.
update public.vendor_profiles set
  tagline = 'Artisan acoustics and studio monitoring, shipped from our own warehouse.',
  support_email = 'support@soundwave.demo',
  support_phone = '+1 (510) 555-8921',
  free_shipping_threshold = 100.00,
  return_window_days = 30,
  restocking_fee = 0,
  return_shipping_payer = 'seller',
  warranty_period = '1 Year Full Manufacturer Replacement',
  auto_approve_returns = true,
  payout_schedule = 'weekly',
  payout_reserve_pct = 0.050,
  carriers = '{"fedex":true,"ups":true,"dhl":false,"vendoraExpress":true}'::jsonb
where slug = 'soundwave-direct';

update public.vendor_profiles set
  tagline = 'Design systems, 3D icon sets and commercial templates for product teams.',
  support_email = 'hello@studiocraft.demo',
  support_phone = '+1 (415) 555-2210',
  return_window_days = 0,
  auto_approve_returns = false,
  payout_schedule = 'biweekly'
where slug = 'studiocraft-assets';`,
  '',
  `-- 10. Shipping origin per store. Product-level shipping_settings still price the
-- customer's order; this is where the parcel leaves and how fast it leaves.
insert into public.vendor_shipping_settings
  (vendor_id, free_shipping_enabled, free_shipping_threshold, standard_rate, express_rate,
   warehouse_name, street, city, state, zip_code, phone, operating_hours, gate_code, sla_window)
values
  ('${uuid('vendor-tech-1')}', true, 100.00, 8.50, 15.00,
   'SoundWave Primary Fulfillment Center (WH-1)', '120 Industrial Parkway, Suite 400',
   'San Leandro', 'CA', '94577', '+1 (510) 555-8921',
   'Mon - Sat: 8:00 AM - 6:00 PM PST', '#4921 (Bay 4)', '24h'),
  ('${uuid('vendor-design-1')}', false, 0, 0, 0,
   'StudioCraft Delivery Region', '600 2nd Street, Floor 3',
   'San Francisco', 'CA', '94107', '+1 (415) 555-2210',
   'Always open — licences are issued at checkout', 'n/a', 'custom')
on conflict (vendor_id) do update set
  free_shipping_enabled = excluded.free_shipping_enabled,
  free_shipping_threshold = excluded.free_shipping_threshold,
  standard_rate = excluded.standard_rate,
  express_rate = excluded.express_rate,
  warehouse_name = excluded.warehouse_name,
  street = excluded.street,
  city = excluded.city,
  state = excluded.state,
  zip_code = excluded.zip_code,
  phone = excluded.phone,
  operating_hours = excluded.operating_hours,
  gate_code = excluded.gate_code,
  sla_window = excluded.sla_window;`,
  '',
  `-- 11. Notification switches (a bag of keys, not something SQL reasons about).
insert into public.vendor_notification_prefs (vendor_id, prefs)
values
  ('${uuid('vendor-tech-1')}',
   '{"smsDispatch":true,"lowInventoryAlert":true,"rmaPushAlert":true,"dailyDigest":true}'::jsonb),
  ('${uuid('vendor-design-1')}',
   '{"smsDispatch":false,"lowInventoryAlert":true,"rmaPushAlert":true,"dailyDigest":false}'::jsonb)
on conflict (vendor_id) do update set prefs = excluded.prefs;`,
  '',
  `-- 12. Payout destinations. Only masked digits are stored — a seeded database
-- must not contain a full account or routing number either.
insert into public.bank_accounts (id, vendor_id, holder_name, bank_name, masked_account, masked_routing, account_type, is_default) values
  ('${uuid('bank-1')}', '${uuid('vendor-tech-1')}', 'SoundWave Direct LLC', 'JPMorgan Chase Bank, N.A.', '4821', '***0021', 'checking', true),
  ('${uuid('bank-2')}', '${uuid('vendor-tech-1')}', 'SoundWave Holdings LLC', 'Silicon Valley Bank / First Rep.', '9102', '***0399', 'savings', false),
  ('${uuid('bank-3')}', '${uuid('vendor-design-1')}', 'StudioCraft Assets LLC', 'Merchants Bank Commercial', '7721', '***0088', 'checking', true)
on conflict (vendor_id, masked_account) do update set
  holder_name = excluded.holder_name,
  bank_name = excluded.bank_name,
  masked_routing = excluded.masked_routing,
  account_type = excluded.account_type,
  is_default = excluded.is_default;`,
  '',
  `-- 13. Media library. Everything the seed inserts is approved except one asset, so
-- the moderation queue has something in it on a fresh database.
insert into public.media_items (id, vendor_id, name, folder, object_path, cdn_url, mime_type, size_bytes, width, height, status) values
  ('${uuid('media-1')}', '${uuid('vendor-tech-1')}', 'SPKR-009-hero.webp', 'products', 'vendors/soundwave-direct/products/SPKR-009-hero.webp', 'https://cdn.vendora.io/vendors/soundwave-direct/products/SPKR-009-hero.webp', 'image/webp', 1488976, 2400, 2400, 'approved'),
  ('${uuid('media-2')}', '${uuid('vendor-tech-1')}', 'SPKR-012-angle1.png', 'products', 'vendors/soundwave-direct/products/SPKR-012-angle1.png', 'https://cdn.vendora.io/vendors/soundwave-direct/products/SPKR-012-angle1.png', 'image/png', 2202009, 3200, 3200, 'approved'),
  ('${uuid('media-3')}', '${uuid('vendor-tech-1')}', 'KYBRD-011-black.webp', 'products', 'vendors/soundwave-direct/products/KYBRD-011-black.webp', 'https://cdn.vendora.io/vendors/soundwave-direct/products/KYBRD-011-black.webp', 'image/webp', 911360, 1920, 1080, 'approved'),
  ('${uuid('media-4')}', '${uuid('vendor-tech-1')}', 'banner-holiday-v2.jpg', 'banners', 'vendors/soundwave-direct/banners/banner-holiday-v2.jpg', 'https://cdn.vendora.io/vendors/soundwave-direct/banners/banner-holiday-v2.jpg', 'image/jpeg', 3984588, 3840, 1200, 'approved'),
  ('${uuid('media-5')}', '${uuid('vendor-tech-1')}', 'reseller-license-2026.pdf', 'compliance', 'vendors/soundwave-direct/compliance/reseller-license-2026.pdf', 'https://cdn.vendora.io/vendors/soundwave-direct/compliance/reseller-license-2026.pdf', 'application/pdf', 4404019, null, null, 'pending'),
  ('${uuid('media-6')}', '${uuid('vendor-design-1')}', 'glass-ui-cover.webp', 'products', 'vendors/studiocraft-assets/products/glass-ui-cover.webp', 'https://cdn.vendora.io/vendors/studiocraft-assets/products/glass-ui-cover.webp', 'image/webp', 737280, 1600, 1600, 'approved'),
  ('${uuid('media-7')}', '${uuid('vendor-design-1')}', '3d-icon-pack-sheet.png', 'products', 'vendors/studiocraft-assets/products/3d-icon-pack-sheet.png', 'https://cdn.vendora.io/vendors/studiocraft-assets/products/3d-icon-pack-sheet.png', 'image/png', 1153433, 2048, 2048, 'approved')
on conflict (id) do update set
  name = excluded.name,
  folder = excluded.folder,
  cdn_url = excluded.cdn_url,
  size_bytes = excluded.size_bytes,
  status = excluded.status;`,
  '',
  `-- 14. Product Q&A. vendor_id is taken from the product's own seller so a question can
-- never be attached to the wrong store. Unanswered rows stay hidden from shoppers.
insert into public.product_qa (id, product_id, vendor_id, customer_id, customer_name, question, answer, published, created_at, answered_at)
select q.id, p.id, p.seller_id, q.cid, q.cname, q.question, q.answer, q.published, q.asked, q.answered
from (values
  ('${uuid('qa-1')}'::uuid, 'aura-studio-iem-earphones'::text, '${uuid('usr-customer-1')}'::uuid, '@mech_enthusiast88'::text,
   'Does the IEM cable detach for a balanced 4.4mm source?'::text, null::text, false, now() - interval '3 days', null::timestamptz),
  ('${uuid('qa-2')}', 'keebcraft-pro-75-keyboard', '${uuid('usr-newuser-1')}', '@nomad_coder',
   'Is the chassis CNC-machined aluminium or cast?', null, false, now() - interval '2 days', null),
  ('${uuid('qa-3')}', 'hype-air-velocity-sneakers', '${uuid('usr-customer-1')}', '@tech_reviewer_dan',
   'Will the outsole hold on wet pavement?', null, false, now() - interval '1 day', null),
  ('${uuid('qa-4')}', 'keebcraft-pro-75-keyboard', '${uuid('usr-newuser-1')}', '@minimal_desk',
   'What polling rate does the board report at?',
   '1000 Hz over the 2.4 GHz dongle and 125 Hz over Bluetooth 5.2.', true, now() - interval '9 days', now() - interval '8 days'),
  ('${uuid('qa-5')}', 'aura-studio-iem-earphones', '${uuid('usr-customer-1')}', '@audio_hui',
   'Does it ship with a travel case?',
   'Yes — every pair includes the ABS case and three bore sizes of silicone tips.', true, now() - interval '12 days', now() - interval '11 days'),
  ('${uuid('qa-6')}', 'vendora-glass-ui-kit', '${uuid('usr-newuser-1')}', '@brand_team',
   'Does the single-project license cover a client shipment?',
   'One end product per license. For an agency workflow pick the Extended Commercial tier.', true, now() - interval '15 days', now() - interval '14 days')
) as q(id, slug, cid, cname, question, answer, published, asked, answered)
join public.products p on p.slug = q.slug
on conflict (id) do update set
  question = excluded.question,
  answer = excluded.answer,
  published = excluded.published,
  answered_at = excluded.answered_at;`,
  '',
  'commit;',
  '',
];

const outPath = path.join(ROOT, 'supabase', 'seed.sql');
writeFileSync(outPath, L.join('\n'), 'utf8');
console.log(
  `wrote supabase/seed.sql: ${SEED_CATEGORIES.length} categories, ${2 + brandStores.length} stores, ${SEED_PRODUCTS.length + brandProducts.length} products, ${DEMO_USERS.length} demo logins`,
);
