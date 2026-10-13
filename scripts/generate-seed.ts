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
  // Two identities that exist to be seller applicants rather than one-click personas:
  // they sign in with the same demo password so BecomeSellerPage can be replayed, and
  // src/lib/demo-accounts.ts (the one-click list) deliberately does not carry them.
  // `vendor_status` here mirrors what review_vendor_application writes: an approval or a
  // rejection lands on the account, a submission or an 'under_review' decision does not.
  { key: 'usr-applicant-2', email: 'omar@demo.test', name: 'Omar Farooque', roles: ['customer'], vendorStatus: 'none' },
  { key: 'usr-applicant-3', email: 'dana@demo.test', name: 'Dana Whitfield', roles: ['customer'], vendorStatus: 'rejected' },
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

// ------------------------------------------------------- governance queue rows
// The admin console reads vendor_applications, disputes, dispute_messages,
// vendor_strikes and audit_logs through admin_* RPCs. Those queues were empty on a
// fresh database, so the seed carries rows in them. A dispute is only meaningful
// against a package that exists, so two demo packages are booked here too - with
// their money columns COMPUTED in SQL by the same expressions checkout_pricing uses
// (subtotal over the lines, shipping per line from each product's own
// shipping_settings, commission through commission_rate_for), never typed twice.
type CatalogRow = { id: string; title: string; price: number; images: string[]; status: string; sellerId: string };
const catalogProduct = (id: string): CatalogRow => {
  const p =
    (SEED_PRODUCTS as unknown as CatalogRow[]).find((x) => x.id === id) ??
    brandProducts.find((x) => x.id === id);
  if (!p) throw new Error(`generate-seed: catalog product ${id} is missing, so the governance rows cannot point at it`);
  return p as CatalogRow;
};
const brandStore = (id: string) => {
  const s = brandStores.find((x) => x.id === id);
  if (!s) throw new Error(`generate-seed: brand store ${id} is missing from the legacy seed`);
  return s;
};

const IEM = catalogProduct('prod-vend-1');
const KEEB = catalogProduct('prod-vend-2');
const UI_KIT = catalogProduct('prod-digi-1');
const CHARGER = catalogProduct('prod-el-7');
const RONIN = brandStore('vendor-ronin');
const APPLE = brandStore('vendor-apple');
const KHAADI = brandStore('vendor-khaadi');
const DIGITAL_CATEGORY = SEED_CATEGORIES.find((c) => c.id === 'cat-digital');
if (!DIGITAL_CATEGORY) throw new Error('generate-seed: cat-digital is missing, so the category override has no row to match');

// Checked here rather than left to SQL, because the package rows below are built by
// joining the catalog: a listing that is missing, unapproved or priced out of the enum
// would make the insert-select yield zero rows and quietly empty the queues again.
// place_order refuses anything but an approved listing, and the moderation row claims
// CHARGER left the queue as 'approved' - so both have to be true of the source rows.
for (const p of [IEM, KEEB, UI_KIT, CHARGER]) {
  if (p.status !== 'approved') {
    throw new Error(`generate-seed: ${p.id} is '${p.status}' but the governance rows book or moderate it as approved`);
  }
  if (p.images.length === 0) throw new Error(`generate-seed: ${p.id} carries no image for the package line`);
}
if (RONIN.status !== 'active') {
  throw new Error('generate-seed: the audit trail ends with Ronin reinstated, so its store row must be active');
}
for (const s of [APPLE, KHAADI]) {
  if (s.commission === null) {
    throw new Error(`generate-seed: ${s.id} has no commission override, but the audit trail records one being set`);
  }
}

/** The tracking entries advance_sub_order_status / place_order append to sub_orders.history. */
const history = (entries: { status: string; age: string; actor: string; note: string }[]) =>
  `jsonb_build_array(${entries
    .map(
      (e) =>
        `jsonb_build_object('status', ${str(e.status)}, 'timestamp', now() - interval ${str(e.age)}, ` +
        `'actor', ${str(e.actor)}, 'note', ${str(e.note)})`,
    )
    .join(', ')})`;

const NOMAD_PITCH = 'Low-profile aluminium desk mats, cable rigs and monitor arms for standing workstations.';
const VOLT_PITCH = 'Refurbished gaming peripherals and 1440p monitors, tested and re-boxed in Lahore before export.';
const SNEAKER_PITCH = 'Wholesale releases and deadstock sneakers at outlet prices, shipped from two warehouses.';
const UNDER_REVIEW_NOTE = 'Supplier invoices came through; the resale certificate arrived as a screenshot. Asked for the original PDF.';
const REJECT_NOTE = 'The resale certificate lists a different legal entity from the bank account on file. Reapply once the names match.';
const IEM_CLAIM = 'Left driver on the in-ears is dead and the keyboard chassis arrived cracked at the corner.';
const LICENCE_CLAIM = 'Paid for the extended commercial licence but only the single-project key was issued.';
const LICENCE_RULING = 'StudioCraft could not issue the second key in time, so the package is refunded in full.';
/** A demo parcel that was already handed over: the code is spent, and only its hash is stored. */
const HANDOVER_CODE = '4317';
const CARD_DETAILS = { brand: 'Visa', last4: '4310' };
const SARAH_ADDRESS = {
  fullName: 'Sarah Customer',
  street: '742 Evergreen Terrace, Apt 4B',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'United States',
  phone: '+1 (555) 234-5678',
};

// ------------------------------------------------------------------------ emit
const L: string[] = [
  `-- ============================================================================
-- Vendora demo seed - GENERATED by scripts/generate-seed.ts, do not edit by hand.
--   node --experimental-strip-types scripts/generate-seed.ts
-- Covers identities, stores, categories, catalog, the store settings the vendor
-- workspace edits and the governance queues the admin console reads (seller
-- applications, disputes and their messages, strikes, the audit trail).
-- Payouts and refunds are deliberately NOT seeded: a refund row asserts money left
-- the platform, so those are left for the console to write through its RPCs. The two
-- demo packages exist only because an arbitration case has to argue about a parcel
-- that was actually booked; their money columns are computed from the catalog rows.
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
  `-- The singleton row is inserted by 20261011000100 (and re-asserted by 20261011001000),
-- so this is an UPDATE, never an INSERT. The two override maps are derived from the rows
-- the pricing function actually reads — admin_set_vendor_commission / admin_set_category_commission
-- keep them mirrored against vendor_profiles.commission_rate_override and
-- categories.commission_rate_override, so a hand-typed subset would be a lie about the
-- rates the platform is charging.
update public.commission_config
   set global_default_rate = 0.100,
       category_overrides = coalesce((select jsonb_object_agg(c.id::text, c.commission_rate_override)
                                        from public.categories c
                                       where c.commission_rate_override is not null), '{}'::jsonb),
       vendor_overrides = coalesce((select jsonb_object_agg(vp.id::text, vp.commission_rate_override)
                                      from public.vendor_profiles vp
                                     where vp.commission_rate_override is not null), '{}'::jsonb);`,
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
  `-- 15. Seller applications — the onboarding queue the merchant page counts.
-- A live submission writes these columns and nothing more: the form validates its terms
-- checkbox and its document picker, but its writer (src/lib/supabase-service.ts
-- submitApplication) sends neither policy_accepted nor a document list, so both stay at
-- their column defaults instead of claiming a certificate no storage bucket holds. The
-- pitch travels as business_address.description because that is the field the form puts
-- it in, and 'under_review' / 'rejected' carry reviewed_by + reviewed_at exactly as
-- review_vendor_application sets them for every decision it records.
insert into public.vendor_applications
  (id, user_id, proposed_store_name, proposed_slug, description, business_type, contact_email,
   contact_phone, business_address, status, review_note, reviewed_by, reviewed_at, created_at, updated_at)
values
  ('${uuid('app-nomad-desk')}', '${uuid('usr-newuser-1')}', 'Nomad Desk Co.', 'nomad-desk-co',
   ${str(NOMAD_PITCH)}, 'computing', 'newuser@demo.test', '+1 (415) 555-0134',
   jsonb_build_object('description', ${str(NOMAD_PITCH)}),
   'pending', null, null, null, now() - interval '3 days', now() - interval '3 days'),
  ('${uuid('app-volt-den')}', '${uuid('usr-applicant-2')}', 'Volt Gaming Den', 'volt-gaming-den',
   ${str(VOLT_PITCH)}, 'electronics', 'omar@demo.test', '+92 (300) 555-0148',
   jsonb_build_object('description', ${str(VOLT_PITCH)}),
   'under_review', ${str(UNDER_REVIEW_NOTE)}, '${uuid('usr-admin-1')}',
   now() - interval '3 days', now() - interval '9 days', now() - interval '3 days'),
  ('${uuid('app-sneaker-outlet')}', '${uuid('usr-applicant-3')}', 'Wholesale Sneaker Outlet', 'wholesale-sneaker-outlet',
   ${str(SNEAKER_PITCH)}, 'apparel', 'dana@demo.test', '+1 (646) 555-0192',
   jsonb_build_object('description', ${str(SNEAKER_PITCH)}),
   'rejected', ${str(REJECT_NOTE)}, '${uuid('usr-admin-1')}',
   now() - interval '2 days', now() - interval '12 days', now() - interval '2 days')
on conflict (id) do update set
  user_id = excluded.user_id,
  proposed_store_name = excluded.proposed_store_name,
  proposed_slug = excluded.proposed_slug,
  description = excluded.description,
  business_type = excluded.business_type,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  business_address = excluded.business_address,
  status = excluded.status,
  review_note = excluded.review_note,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
  '',
  `-- review_vendor_application also stamps the rejection on the account, which is what
-- BecomeSellerPage reads back instead of showing the form again. vendor_status itself is
-- already set with the persona above; only the reason needs writing.
update public.profiles set rejection_reason = ${str(REJECT_NOTE)}
 where id = '${uuid('usr-applicant-3')}';`,
  '',
  `-- 16. Two demo packages, booked the way checkout would have booked them.
-- They exist because an arbitration case has to argue about something: a dispute with no
-- package behind it has no gross, no status and no ceiling on what the platform may rule
-- back. customer_email comes from the buyer's own profile row, and the money columns below
-- are computed by the same expressions checkout_pricing uses — subtotal over the lines,
-- shipping per line from each product's own shipping_settings, commission through
-- commission_rate_for(seller, null) — so no figure here is typed twice and none can drift
-- from the catalog. Stock on the listings is the current on-hand number (already net of
-- these sales), so nothing is decremented a second time.
insert into public.orders (id, customer_id, customer_email, shipping_address, payment_method, payment_details, payment_status, created_at)
select v.id, v.cid, pr.email, v.addr, 'card', ${json(CARD_DETAILS)}::jsonb, 'succeeded', v.at
from (values
  ('${uuid('ord-desk-audio')}'::uuid, '${uuid('usr-customer-1')}'::uuid,
   ${json(SARAH_ADDRESS)}::jsonb, now() - interval '9 days'),
  ('${uuid('ord-glass-licence')}', '${uuid('usr-newuser-1')}',
   -- A digital-only order books an empty address object: there is nothing to ship to.
   '{}'::jsonb, now() - interval '21 days')
) as v(id, cid, addr, at)
join public.profiles pr on pr.id = v.cid
on conflict (id) do update set
  customer_id = excluded.customer_id,
  customer_email = excluded.customer_email,
  shipping_address = excluded.shipping_address,
  payment_method = excluded.payment_method,
  payment_details = excluded.payment_details,
  payment_status = excluded.payment_status,
  created_at = excluded.created_at;`,
  '',
  `-- 16a. SoundWave parcel: two listings from one store, standard delivery, collected by
-- the seeded rider and handed over against the code. history carries the entries
-- place_order and advance_sub_order_status append, with the actor each one records.
insert into public.sub_orders
  (id, order_group_id, seller_id, type, items, subtotal, shipping_fee, delivery_option,
   commission_rate, commission_amount, net_payout, status, rider_id, delivery_code_hash,
   history, created_at, updated_at)
select '${uuid('pkg-desk-audio')}', o.id, l.seller_id,
       case when l.has_physical then 'physical' else 'digital' end::public.product_type,
       l.items, l.subtotal, l.shipping, 'standard',
       public.commission_rate_for(l.seller_id, null),
       round(l.subtotal * public.commission_rate_for(l.seller_id, null), 2),
       round(l.subtotal - round(l.subtotal * public.commission_rate_for(l.seller_id, null), 2), 2),
       'delivered'::public.sub_order_status, '${uuid('rider-sam-1')}',
       public.hash_delivery_code(${str(HANDOVER_CODE)}),
       ${history([
         { status: 'placed', age: '9 days', actor: 'Customer', note: 'Order placed via checkout' },
         { status: 'confirmed', age: '8 days', actor: 'Vendor', note: 'Confirmed against the warehouse count' },
         { status: 'packed', age: '8 days', actor: 'Vendor', note: 'Packed at SoundWave Primary Fulfillment Center' },
         { status: 'ready_for_pickup', age: '7 days', actor: 'Vendor', note: 'Handed to the Vendora Express manifest' },
         { status: 'shipped', age: '6 days', actor: 'Rider', note: 'Collected by the assigned rider' },
         { status: 'out_for_delivery', age: '5 days', actor: 'Rider', note: 'On the van for the Manhattan drop' },
         { status: 'delivered', age: '5 days', actor: 'Rider', note: 'Delivered, handover code verified' },
       ])},
       now() - interval '9 days', now() - interval '5 days'
from public.orders o
cross join (
  select
    (array_agg(p.seller_id))[1] as seller_id,
    bool_or(p.type = 'physical') as has_physical,
    round(sum(p.price * x.qty), 2) as subtotal,
    round(sum(case
                when p.type = 'digital' then 0
                when coalesce((p.shipping_settings ->> 'freeShipping')::boolean, false) then 0
                else coalesce((p.shipping_settings ->> 'standardFee')::numeric, 0)
              end), 2) as shipping,
    jsonb_agg(jsonb_build_object(
      'productId', p.id, 'variantId', null, 'title', p.title, 'price', p.price,
      'quantity', x.qty, 'image', p.images[1], 'sellerId', p.seller_id,
      'sellerName', vp.store_name) order by p.title) as items
  from (values
    ('${uuid('prod-vend-1')}'::uuid, 1),
    ('${uuid('prod-vend-2')}', 2)
  ) as x(pid, qty)
  join public.products p on p.id = x.pid
  join public.vendor_profiles vp on vp.id = p.seller_id
  having count(distinct p.seller_id) = 1
) l
where o.id = '${uuid('ord-desk-audio')}'
on conflict (id) do update set
  order_group_id = excluded.order_group_id,
  seller_id = excluded.seller_id,
  type = excluded.type,
  items = excluded.items,
  subtotal = excluded.subtotal,
  shipping_fee = excluded.shipping_fee,
  delivery_option = excluded.delivery_option,
  commission_rate = excluded.commission_rate,
  commission_amount = excluded.commission_amount,
  net_payout = excluded.net_payout,
  status = excluded.status,
  rider_id = excluded.rider_id,
  delivery_code_hash = excluded.delivery_code_hash,
  history = excluded.history,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
  '',
  `-- 16b. The licence Alex Potential Vendor bought after asking about tiers in the seeded
-- Q&A (qa-6): digital, so it is booked 'available' with a licence key and never a delivery.
-- The case against it was ruled a refund, and resolve_dispute is what booked that — it
-- writes the ruling onto the dispute, flips the package to 'refunded' and appends the
-- Support entry below. It does NOT touch refunds or orders.payment_status, so this row is
-- the whole of that path's paper trail; see the note in the generated report.
insert into public.sub_orders
  (id, order_group_id, seller_id, type, items, subtotal, shipping_fee, delivery_option,
   commission_rate, commission_amount, net_payout, status, license_key,
   history, created_at, updated_at)
select '${uuid('pkg-glass-licence')}', o.id, l.seller_id,
       case when l.has_physical then 'physical' else 'digital' end::public.product_type,
       l.items, l.subtotal, l.shipping, 'standard',
       public.commission_rate_for(l.seller_id, null),
       round(l.subtotal * public.commission_rate_for(l.seller_id, null), 2),
       round(l.subtotal - round(l.subtotal * public.commission_rate_for(l.seller_id, null), 2), 2),
       'refunded'::public.sub_order_status, 'VEND-7C41F9B2D8A3',
       ${history([
         { status: 'available', age: '21 days', actor: 'Customer', note: 'Order placed via checkout' },
         { status: 'refunded', age: '15 days', actor: 'Support', note: LICENCE_RULING },
       ])},
       now() - interval '21 days', now() - interval '15 days'
from public.orders o
cross join (
  select
    (array_agg(p.seller_id))[1] as seller_id,
    bool_or(p.type = 'physical') as has_physical,
    round(sum(p.price * x.qty), 2) as subtotal,
    round(sum(case
                when p.type = 'digital' then 0
                when coalesce((p.shipping_settings ->> 'freeShipping')::boolean, false) then 0
                else coalesce((p.shipping_settings ->> 'standardFee')::numeric, 0)
              end), 2) as shipping,
    jsonb_agg(jsonb_build_object(
      'productId', p.id, 'variantId', null, 'title', p.title, 'price', p.price,
      'quantity', x.qty, 'image', p.images[1], 'sellerId', p.seller_id,
      'sellerName', vp.store_name) order by p.title) as items
  from (values
    ('vendora-glass-ui-kit'::text, 1)
  ) as x(slug, qty)
  join public.products p on p.slug = x.slug
  join public.vendor_profiles vp on vp.id = p.seller_id
  having count(distinct p.seller_id) = 1
) l
where o.id = '${uuid('ord-glass-licence')}'
on conflict (id) do update set
  order_group_id = excluded.order_group_id,
  seller_id = excluded.seller_id,
  type = excluded.type,
  items = excluded.items,
  subtotal = excluded.subtotal,
  shipping_fee = excluded.shipping_fee,
  delivery_option = excluded.delivery_option,
  commission_rate = excluded.commission_rate,
  commission_amount = excluded.commission_amount,
  net_payout = excluded.net_payout,
  status = excluded.status,
  license_key = excluded.license_key,
  history = excluded.history,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
  '',
  `-- 16c. The delivery the parcel rode on, in the state advance_sub_order_status and
-- verify_delivery leave behind: picked_up_at from 'shipped', delivered_at and the
-- proof-of-delivery from the code check. dropoff_details is the order's own address row.
insert into public.deliveries
  (id, sub_order_id, rider_id, status, pickup_details, dropoff_details, handover_code_hash,
   proof_of_delivery, assigned_at, picked_up_at, delivered_at)
select '${uuid('delivery-desk-audio')}', so.id, '${uuid('rider-sam-1')}',
       'delivered'::public.delivery_status,
       jsonb_build_object('seller_id', so.seller_id), o.shipping_address,
       public.hash_delivery_code(${str(HANDOVER_CODE)}),
       jsonb_build_object('verified_by', '${uuid('usr-rider-1')}', 'at', now() - interval '5 days'),
       now() - interval '6 days', now() - interval '6 days', now() - interval '5 days'
from public.sub_orders so
join public.orders o on o.id = so.order_group_id
where so.id = '${uuid('pkg-desk-audio')}'
on conflict (sub_order_id) do update set
  rider_id = excluded.rider_id,
  status = excluded.status,
  pickup_details = excluded.pickup_details,
  dropoff_details = excluded.dropoff_details,
  handover_code_hash = excluded.handover_code_hash,
  proof_of_delivery = excluded.proof_of_delivery,
  assigned_at = excluded.assigned_at,
  picked_up_at = excluded.picked_up_at,
  delivered_at = excluded.delivered_at;`,
  '',
  `-- 17. Arbitration. Names are read from the buyer's profile and the store row rather than
-- typed, so a dispute can never disagree with the party it names. assigned_agent_id stays
-- null on both cases: the only writer of that column is admin_escalate_dispute, which also
-- marks the case escalated, and neither case has been.
insert into public.disputes
  (id, sub_order_id, order_group_id, customer_id, customer_name, vendor_id, vendor_name,
   reason, status, urgency, evidence_photos, created_at, updated_at)
select '${uuid('dsp-desk-audio')}', so.id, so.order_group_id, o.customer_id, pr.name,
       vp.id, vp.store_name,
       ${str(IEM_CLAIM)}, 'open'::public.dispute_status, 'urgent'::public.dispute_urgency,
       array[${str(IEM.images[0])}, ${str(KEEB.images[0])}]::text[],
       now() - interval '2 days', now() - interval '2 days'
from public.sub_orders so
join public.orders o on o.id = so.order_group_id
join public.profiles pr on pr.id = o.customer_id
join public.vendor_profiles vp on vp.id = so.seller_id
where so.id = '${uuid('pkg-desk-audio')}'
on conflict (id) do update set
  sub_order_id = excluded.sub_order_id,
  order_group_id = excluded.order_group_id,
  customer_id = excluded.customer_id,
  customer_name = excluded.customer_name,
  vendor_id = excluded.vendor_id,
  vendor_name = excluded.vendor_name,
  reason = excluded.reason,
  status = excluded.status,
  urgency = excluded.urgency,
  evidence_photos = excluded.evidence_photos,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
  '',
  `-- The ruled case. resolution_amount is the package's own subtotal + shipping, taken from
-- the row, so it cannot exceed what the buyer was charged by construction.
insert into public.disputes
  (id, sub_order_id, order_group_id, customer_id, customer_name, vendor_id, vendor_name,
   reason, status, urgency, evidence_photos, resolution_note, resolution_amount,
   created_at, updated_at)
select '${uuid('dsp-glass-licence')}', so.id, so.order_group_id, o.customer_id, pr.name,
       vp.id, vp.store_name,
       ${str(LICENCE_CLAIM)}, 'resolved_refund'::public.dispute_status,
       'standard'::public.dispute_urgency, '{}'::text[],
       ${str(LICENCE_RULING)}, so.subtotal + so.shipping_fee,
       now() - interval '18 days', now() - interval '15 days'
from public.sub_orders so
join public.orders o on o.id = so.order_group_id
join public.profiles pr on pr.id = o.customer_id
join public.vendor_profiles vp on vp.id = so.seller_id
where so.id = '${uuid('pkg-glass-licence')}'
on conflict (id) do update set
  sub_order_id = excluded.sub_order_id,
  order_group_id = excluded.order_group_id,
  customer_id = excluded.customer_id,
  customer_name = excluded.customer_name,
  vendor_id = excluded.vendor_id,
  vendor_name = excluded.vendor_name,
  reason = excluded.reason,
  status = excluded.status,
  urgency = excluded.urgency,
  evidence_photos = excluded.evidence_photos,
  resolution_note = excluded.resolution_note,
  resolution_amount = excluded.resolution_amount,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
  '',
  `-- One message per case, and each from the party that would have written it: the buyer's
-- opening claim on the open case, and the ruling note resolve_dispute copies onto the
-- closed one. sender_role is the enum's own value for that person, and sender_name is read
-- from their profile. The evidence is the listings' own photos from the seeded catalog —
-- the only images a database with no uploaded files can point at.
insert into public.dispute_messages (id, dispute_id, sender_id, sender_role, sender_name, content, is_internal_note, attachments, created_at)
select m.id, m.dispute_id, m.sender_id, m.sender_role::public.message_sender_role, pr.name,
       m.content, m.internal, m.attachments, m.at
from (values
  ('${uuid('dspmsg-desk-audio')}'::uuid, '${uuid('dsp-desk-audio')}'::uuid,
   '${uuid('usr-customer-1')}'::uuid, 'customer'::text,
   ${str(`Unboxed them at the desk and the left side is silent — the cable seats fine. The corner of the keyboard case is cracked through, not dented. Photos attached; I want a replacement, not a refund.`)}::text,
   false, array[${str(IEM.images[0])}, ${str(KEEB.images[0])}]::text[], now() - interval '2 days'),
  ('${uuid('dspmsg-glass-licence')}', '${uuid('dsp-glass-licence')}',
   '${uuid('usr-support-1')}', 'support',
   ${str(LICENCE_RULING)}, false, '{}'::text[], now() - interval '15 days')
) as m(id, dispute_id, sender_id, sender_role, content, internal, attachments, at)
join public.profiles pr on pr.id = m.sender_id
on conflict (id) do update set
  dispute_id = excluded.dispute_id,
  sender_id = excluded.sender_id,
  sender_role = excluded.sender_role,
  sender_name = excluded.sender_name,
  content = excluded.content,
  is_internal_note = excluded.is_internal_note,
  attachments = excluded.attachments,
  created_at = excluded.created_at;`,
  '',
  `-- 18. One strike, so the merchant dossier has a record to show and the vendor queue's
-- strike count is a number from a row. Ronin Official Store is the subject because the
-- audit trail below describes freezing it over missing certifications and reinstating it
-- against this strike; the store row itself is 'active', which is where that trail ends.
-- admin_issue_strike stores the trimmed reason, the note and the actor, and nothing else.
insert into public.vendor_strikes (id, vendor_id, reason, note, issued_by, created_at)
values
  ('${uuid('strike-ronin-1')}', '${uuid('vendor-ronin')}', 'Uncertified goods',
   'Reinstated with one strike while the last certificate is collected.',
   '${uuid('usr-admin-1')}', now() - interval '10 days')
on conflict (id) do update set
  vendor_id = excluded.vendor_id,
  reason = excluded.reason,
  note = excluded.note,
  issued_by = excluded.issued_by,
  created_at = excluded.created_at;`,
  '',
  `-- 19. Platform settings, changed once by the console's own settings action.
-- admin_save_platform_settings writes updated_by + updated_at and then audits the whole
-- row on both sides of the change, which is what the two audit statements below do.
update public.platform_settings
   set min_payout_floor = 25.00,
       sla_ceiling_hours = 36,
       updated_by = '${uuid('usr-admin-1')}',
       updated_at = now() - interval '4 days'
 where id = true;`,
  '',
  `-- The listing that came back through moderation on the same day the freeze lifted:
-- admin_moderate_products attributes the decision to the actor, then audits the pair.
update public.products
   set moderated_by = '${uuid('usr-admin-1')}',
       moderated_at = now() - interval '10 days'
 where id = '${uuid(CHARGER.id)}';`,
  '',
  `-- 20. The audit trail the console writes. Only three things matter here: the actor must
-- be a real staff account (admin_audit resolves actor_role from the actor's own roles and
-- the queue resolves the name through profiles), the action must be one an RPC actually
-- writes, and entity_id must name a row this seed creates. ip_address is left out of every
-- list below so it carries the column default — nothing in this project observes a request
-- IP, so inventing one would be the fakest column in the table.
insert into public.audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, created_at)
values
  -- admin_set_vendor_status, and the same action reinstating the store two days later:
  -- before_data is the status the row had at the time, which is why the pair reads in order.
  ('${uuid('audit-ronin-frozen')}', '${uuid('usr-admin-1')}', 'Admin', 'vendor.suspended', 'vendor',
   '${uuid('vendor-ronin')}',
   ${json({ status: 'active', storeName: RONIN.storeName })},
   ${json({ status: 'suspended', note: 'Three buyers reported GaN chargers with no certification label. Listings frozen pending documents.' })},
   now() - interval '11 days'),
  ('${uuid('audit-ronin-strike')}', '${uuid('usr-admin-1')}', 'Admin', 'vendor.strike', 'vendor',
   '${uuid('vendor-ronin')}', null,
   ${json({ reason: 'Uncertified goods', note: 'Reinstated with one strike while the last certificate is collected.', total: 1 })},
   now() - interval '10 days'),
  ('${uuid('audit-ronin-reinstated')}', '${uuid('usr-admin-1')}', 'Admin', 'vendor.active', 'vendor',
   '${uuid('vendor-ronin')}',
   ${json({ status: 'suspended', storeName: RONIN.storeName })},
   ${json({ status: 'active', note: 'Two of three certificates supplied; the third is a paperwork lag, not a shipment risk.' })},
   now() - interval '10 days'),
  -- admin_moderate_products: the listing left the queue on the platform's decision.
  ('${uuid('audit-charger-approved')}', '${uuid('usr-admin-1')}', 'Admin', 'product.approved', 'product',
   '${uuid(CHARGER.id)}',
   ${json({ status: 'pending_review' })},
   ${json({ status: CHARGER.status, reason: null })},
   now() - interval '10 days'),
  -- The two rate decisions commission_config and the store/category rows both carry.
  ('${uuid('audit-apple-rate')}', '${uuid('usr-admin-1')}', 'Admin', 'commission.vendor.set', 'vendor',
   '${uuid(APPLE.id)}',
   ${json({ rate: null })},
   ${json({ rate: APPLE.commission, storeName: APPLE.storeName })},
   now() - interval '25 days'),
  ('${uuid('audit-khaadi-rate')}', '${uuid('usr-admin-1')}', 'Admin', 'commission.vendor.set', 'vendor',
   '${uuid(KHAADI.id)}',
   ${json({ rate: null })},
   ${json({ rate: KHAADI.commission, storeName: KHAADI.storeName })},
   now() - interval '24 days'),
  ('${uuid('audit-digital-category-rate')}', '${uuid('usr-admin-1')}', 'Admin', 'commission.category.set', 'category',
   '${uuid(DIGITAL_CATEGORY.id)}',
   ${json({ rate: null })},
   ${json({ rate: (DIGITAL_CATEGORY as { commissionRateOverride?: number }).commissionRateOverride ?? null, name: DIGITAL_CATEGORY.name })},
   now() - interval '24 days'),
  -- assign_rider: the dispatch decision behind the delivered parcel above.
  ('${uuid('audit-rider-assigned')}', '${uuid('usr-admin-1')}', 'Admin', 'delivery.rider_assigned', 'sub_order',
   '${uuid('pkg-desk-audio')}', null,
   ${json({ rider_id: uuid('rider-sam-1') })},
   now() - interval '6 days'),
  -- review_vendor_application records its decisions under the role that function writes.
  ('${uuid('audit-volt-under-review')}', '${uuid('usr-admin-1')}', 'Super Admin', 'application.under_review', 'vendor_application',
   '${uuid('app-volt-den')}', null, null, now() - interval '3 days'),
  ('${uuid('audit-sneaker-rejected')}', '${uuid('usr-admin-1')}', 'Super Admin', 'application.rejected', 'vendor_application',
   '${uuid('app-sneaker-outlet')}', null, null, now() - interval '2 days')
on conflict (id) do update set
  actor_id = excluded.actor_id,
  actor_role = excluded.actor_role,
  action = excluded.action,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  before_data = excluded.before_data,
  after_data = excluded.after_data,
  created_at = excluded.created_at;`,
  '',
  `-- admin_save_platform_settings snapshots the whole settings row on both sides of the
-- change, so both columns here are read from the row itself. before_data is that snapshot
-- with the two keys the platform changed put back to the values the migration created; the
-- row's updated_at cannot pre-date its own write, so the snapshot carries it as-is.
insert into public.audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, created_at)
select '${uuid('audit-settings-update')}', '${uuid('usr-admin-1')}', 'Admin', 'settings.update',
       'platform_settings', 'global',
       to_jsonb(ps) || jsonb_build_object('min_payout_floor', 50, 'sla_ceiling_hours', 48, 'updated_by', null),
       to_jsonb(ps), now() - interval '4 days'
from public.platform_settings ps
where ps.id = true
on conflict (id) do update set
  before_data = excluded.before_data,
  after_data = excluded.after_data,
  created_at = excluded.created_at;`,
  '',
  `-- resolve_dispute records the ruling with the amount it moved; the amount is read from
-- the dispute so the two can never disagree.
insert into public.audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, after_data, created_at)
select '${uuid('audit-licence-refund')}', '${uuid('usr-support-1')}', 'Support', 'dispute.resolved_refund',
       'dispute', '${uuid('dsp-glass-licence')}',
       jsonb_build_object('amount', d.resolution_amount), now() - interval '15 days'
from public.disputes d
where d.id = '${uuid('dsp-glass-licence')}'
on conflict (id) do update set
  actor_id = excluded.actor_id,
  actor_role = excluded.actor_role,
  action = excluded.action,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  after_data = excluded.after_data,
  created_at = excluded.created_at;`,
  '',
  'commit;',
  '',
];

const outPath = path.join(ROOT, 'supabase', 'seed.sql');
writeFileSync(outPath, L.join('\n'), 'utf8');
console.log(
  `wrote supabase/seed.sql: ${SEED_CATEGORIES.length} categories, ${2 + brandStores.length} stores, ` +
    `${SEED_PRODUCTS.length + brandProducts.length} products, ${DEMO_USERS.length} auth users ` +
    `(7 one-click personas + ${DEMO_USERS.length - 7} seller applicants), ` +
    `plus the admin queues: 3 applications, 2 packages, 2 disputes, 1 strike, 12 audit rows`,
);
