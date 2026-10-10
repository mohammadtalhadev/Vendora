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
-- Covers identities, stores, categories and catalog only. Transactional demo data
-- (orders, deliveries, payouts) is created through the RPCs so it stays consistent.
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
  'commit;',
  '',
];

const outPath = path.join(ROOT, 'supabase', 'seed.sql');
writeFileSync(outPath, L.join('\n'), 'utf8');
console.log(
  `wrote supabase/seed.sql: ${SEED_CATEGORIES.length} categories, ${2 + brandStores.length} stores, ${SEED_PRODUCTS.length + brandProducts.length} products, ${DEMO_USERS.length} demo logins`,
);
