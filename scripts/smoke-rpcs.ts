// Functional smoke test for the Vendora migrations: applies every migration to a
// throwaway PGlite instance, then exercises RLS + RPCs under impersonated roles.
// Usage: node --experimental-strip-types scripts/smoke-rpcs.ts
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const db = new PGlite({ extensions: { pgcrypto } });

const CU = '11111111-1111-4111-8111-111111111111';
const CU2 = '22222222-2222-4222-8222-222222222222';
const VENDOR = '33333333-3333-4333-8333-333333333333';
const ADMIN = '44444444-4444-4444-8444-444444444444';
const RIDER = '55555555-5555-4555-8555-555555555555';
const STORE = '66666666-6666-4666-8666-666666666666';
const PLATFORM = '77777777-7777-4777-8777-777777777777';
const CAT = '88888888-8888-4888-8888-888888888888';
const P_PHYS = '99999999-9999-4999-8999-999999999999';
const P_DIG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RPID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
    process.exitCode = 1;
  }
}
async function expectThrow(name: string, fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    ok(name, false, '(expected rejection, none happened)');
  } catch (err: any) {
    const msg = String(err.message ?? err);
    ok(name, msg.toLowerCase().includes(needle.toLowerCase()), `(got: ${msg.split('\n')[0]})`);
  }
}
const q = async (sql: string, params?: any[]) =>
  (await db.query(sql, params)).rows as any[];

// -- apply stubs + migrations --------------------------------------------------
await db.exec(readFileSync(path.join(ROOT, 'scripts/pglite-stubs.sql'), 'utf8'));
const migDir = path.join(ROOT, 'supabase/migrations');
for (const f of readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
}

// -- identity switching --------------------------------------------------------
async function as(role: 'postgres' | 'anon' | 'authenticated', uid?: string) {
  if (role === 'postgres') {
    await db.exec('reset role');
    await q("select set_config('request.jwt.claim.sub', '', false)");
    return;
  }
  await db.exec(`set role ${role}`);
  await q('select set_config($1, $2, false)', ['request.jwt.claim.sub', uid ?? '']);
}

console.log('\n[setup] seed users, stores, catalog');
await as('postgres');
await q(
  `insert into auth.users (id, email, raw_user_meta_data) values
     ($1,'customer@demo.test','{}'),($2,'customer2@demo.test','{}'),
     ($3,'vendor@demo.test','{}'),($4,'admin@demo.test','{}'),($5,'rider@demo.test','{}')`,
  [CU, CU2, VENDOR, ADMIN, RIDER],
);
ok('handle_new_user created profiles', (await q('select count(*)::int c from profiles'))[0].c === 5);
await q(`update profiles set roles = array['admin','customer']::user_role[] where id = $1`, [ADMIN]);
await q(`update profiles set roles = array['vendor','customer']::user_role[] where id = $1`, [VENDOR]);
await q(`update profiles set roles = array['rider']::user_role[] where id = $1`, [RIDER]);
await q(
  `insert into vendor_profiles (id, user_id, store_name, slug, commission_rate_override) values
     ($1,$2,'Tech Store','tech-store',null),($3,null,'Vendora','vendora',0.000)`,
  [STORE, VENDOR, PLATFORM],
);
await q(`insert into categories (id, name, slug) values ($1,'Electronics','electronics')`, [CAT]);
await q(
  `insert into products (id, title, slug, category_id, brand, images, price, type, seller_id,
    variants, stock, shipping_settings, status) values
     ($1,'Acme Phone','acme-phone',$2,'Acme','{img.jpg}',100,'physical',$3,
      '[{"id":"v-black","price":120}]'::jsonb,10,'{"freeShipping":false,"standardFee":5}'::jsonb,'approved'),
     ($4,'Acme License','acme-license',$2,'Acme','{img.jpg}',20,'digital',$5,'[]'::jsonb,
      99,'{}'::jsonb,'approved')`,
  [P_PHYS, CAT, STORE, P_DIG, PLATFORM],
);
await q(`insert into rider_profiles (id, user_id, full_name) values ($1,$2,'Rider One')`, [RPID, RIDER]);
await q(
  `insert into promotions (code, title, discount_type, discount_value, minimum_order, usage_limit)
   values ('SAVE10','Welcome 10%','percentage',10,50,100)`,
);

console.log('\n[rls] read + write boundaries');
await as('anon');
ok('anon sees approved products', (await q('select count(*)::int c from products where status=$1', ['approved']))[0].c === 2);
ok('anon sees no orders rows', (await q('select count(*)::int c from orders'))[0].c === 0);
await expectThrow('anon cannot insert', () => q(`insert into categories (name, slug) values ('x','x')`), 'permission denied');

await as('authenticated', CU2);
ok('customer2 sees only own orders (0)', (await q('select count(*)::int c from orders'))[0].c === 0);
await expectThrow(
  'vendor cannot self-approve a product',
  () =>
    q(
      `insert into products (title, slug, category_id, price, seller_id, status)
       values ('X','x-sku',$1,1,$2,'approved')`,
      [CAT, STORE],
    ),
  'row-level security',
);
await as('authenticated', VENDOR);
await q(
  `insert into products (title, slug, category_id, price, seller_id, status)
   values ('Pending Widget','pending-widget',$1,9,$2,'pending_review')`,
  [CAT, STORE],
);
ok('vendor can list a product as pending_review', true);
await expectThrow(
  'vendor cannot approve own product via UPDATE',
  () => q(`update products set status='approved' where slug='pending-widget'`),
  'row-level security',
);
await as('authenticated', ADMIN);
await q(`select moderate_product(id, 'approved') from products where slug='pending-widget'`);
ok('admin moderate_product approves', (await q(`select status from products where slug='pending-widget'`))[0].status === 'approved');

console.log('\n[checkout] place_order');
await as('authenticated', CU);
await q(
  `insert into cart_items (user_id, product_id, variant_id, quantity) values
     ($1,$2,'v-black',2),($1,$3,'',1)`,
  [CU, P_PHYS, P_DIG],
);
ok('guest cart is scoped to owner', (await q('select count(*)::int c from cart_items'))[0].c === 2);
await as('authenticated', CU2);
ok('another user sees no rows from my cart', (await q('select count(*)::int c from cart_items'))[0].c === 0);
await expectThrow(
  'another user cannot write into my cart',
  () => q(`insert into cart_items (user_id, product_id, quantity) values ($1,$2,1)`, [CU, P_DIG]),
  'row-level security',
);
await as('authenticated', CU);
await expectThrow(
  'the same no-variant line cannot be added twice',
  () => q(`insert into cart_items (user_id, product_id, quantity) values ($1,$2,1)`, [CU, P_DIG]),
  'duplicate key',
);
const placed = (
  await q(
    `select place_order($1::jsonb,'card','express','SAVE10','leave at door') as r`,
    [{ street: '1 Main St', city: 'Karachi', country: 'PK' }],
  )
)[0].r;
const phys = placed.subOrders.find((s: any) => s.type === 'physical');
const digi = placed.subOrders.find((s: any) => s.type === 'digital');
ok('two seller groups -> two sub-orders', placed.subOrders.length === 2);
ok('variant price used, not client price', Number(phys.subtotal) === 216, `(got ${phys.subtotal}, expected 120*2 - 10% = 216)`);
ok('coupon discounted once (promo consumed)', (await q(`select usage_count::int c from promotions where code='SAVE10'`))[0].c === 1);
ok('commission computed server-side', Number(phys.commissionAmount) === 21.6, `(got ${phys.commissionAmount})`);
ok('net payout = subtotal - commission', Number(phys.netPayout) === 194.4);
ok('digital group priced at 20, platform commission 0', Number(digi.subtotal) === 20 && Number(digi.commissionAmount) === 0);
ok('digital sub-order is instantly available with license', digi.status === 'available' && /^VEND-[0-9A-F]{12}$/.test(digi.licenseKey));
ok('physical sub-order starts at placed', phys.status === 'placed');
ok('delivery code returned as 4 digits', /^\d{4}$/.test(phys.deliveryCode), `(got ${phys.deliveryCode})`);
ok('express shipping added', Number(phys.shippingFee) === 20, `(got ${phys.shippingFee})`);
ok('stock decremented 10 -> 8', (await q(`select stock::int s from products where id=$1`, [P_PHYS]))[0].s === 8);
ok('cart cleared after checkout', (await q('select count(*)::int c from cart_items'))[0].c === 0);
ok('order notification created', (await q(`select count(*)::int c from notifications where user_id=$1`, [CU]))[0].c === 1);
ok('code stored hashed, plaintext not persisted', (await q(`select delivery_code_hash from sub_orders where id=$1`, [phys.id]))[0].delivery_code_hash.length === 64);
await q(`update sub_orders set status='delivered' where id=$1`, [phys.id]);
ok('sub_orders is RPC-only (direct UPDATE writes nothing)', (await q(`select status from sub_orders where id=$1`, [phys.id]))[0].status === 'placed');
await expectThrow(
  'empty cart cannot checkout',
  () => q(`select place_order('{}'::jsonb,'card','standard')`),
  'cart is empty',
);

console.log('\n[order state machine] advance_sub_order_status');
await as('authenticated', CU);
await expectThrow('customer cannot confirm', () => q(`select advance_sub_order_status($1,'confirmed')`, [phys.id]), 'not authorized');
await as('authenticated', VENDOR);
await expectThrow('vendor cannot skip to shipped', () => q(`select advance_sub_order_status($1,'shipped')`, [phys.id]), 'invalid state transition');
for (const next of ['confirmed', 'packed', 'ready_for_pickup']) {
  await q(`select advance_sub_order_status($1,$2)`, [phys.id, next]);
}
ok('vendor walked placed -> confirmed -> packed -> ready_for_pickup', true);
await expectThrow('vendor cannot mark shipped (rider step)', () => q(`select advance_sub_order_status($1,'shipped')`, [phys.id]), 'not authorized');
await as('authenticated', ADMIN);
await expectThrow('assign_rider rejects an unknown rider', () => q(`select assign_rider($1,$2)`, [phys.id, '00000000-0000-4000-8000-000000000000']), 'rider not found');
await q(`select assign_rider($1,$2)`, [phys.id, RPID]);
const delivery = (await q(`select id from deliveries where sub_order_id=$1`, [phys.id]))[0].id;
await as('authenticated', RIDER);
await q(`select advance_sub_order_status($1,'shipped')`, [phys.id]);
await q(`select advance_sub_order_status($1,'out_for_delivery')`, [phys.id]);
ok('rider walked ready_for_pickup -> shipped -> out_for_delivery', (await q(`select status from sub_orders where id=$1`, [phys.id]))[0].status === 'out_for_delivery');
await expectThrow('wrong handover code rejected', () => q(`select verify_delivery($1,'0000')`, [delivery]), 'invalid handover code');
await q(`select verify_delivery($1,$2)`, [delivery, phys.deliveryCode]);
ok('verify_delivery with correct code delivered sub-order', (await q(`select status from sub_orders where id=$1`, [phys.id]))[0].status === 'delivered');
await expectThrow('delivered cannot re-deliver', () => q(`select advance_sub_order_status($1,'delivered')`, [phys.id]), 'already in this status');

console.log('\n[payouts + reviews]');
await as('authenticated', VENDOR);
await expectThrow('payout above accrued balance rejected', () => q(`select request_payout(5000)`), 'exceeds available balance');
const payout = (await q(`select request_payout(100) as r`))[0].r;
ok('payout created for accrued net', Number(payout.amount) === 100 && /^FAST-\d{8}$/.test(payout.reference));
await as('authenticated', CU);
await q(`insert into reviews (product_id, author_id, author_name, rating, headline, body) values ($1,$2,'Sarah',5,'Great','Loved it')`, [P_PHYS, CU]);
ok(
  'the buyer who actually received the product is marked verified',
  (await q(`select verified_purchase from reviews where author_id=$1`, [CU]))[0].verified_purchase === true,
);
await as('authenticated', CU2);
await expectThrow('cannot post a review as someone else', () => q(`insert into reviews (product_id, author_id, author_name, rating) values ($1,$2,'Sarah',4)`, [P_PHYS, CU]), 'row-level security');
await q(
  `insert into reviews (product_id, author_id, author_name, rating, headline, body, verified_purchase) values ($1,$2,'Ali',1,'Bad','Broke',true)`,
  [P_PHYS, CU2],
);
ok('rating rollup recomputed by trigger', Number((await q(`select rating from products where id=$1`, [P_PHYS]))[0].rating) === 3);
ok(
  'a browser cannot stamp its own review as a verified purchase',
  (await q(`select verified_purchase from reviews where author_id=$1 and product_id=$2`, [CU2, P_PHYS]))[0].verified_purchase === false,
);
await as('authenticated', CU);
await expectThrow('cannot review the same product twice', () => q(`insert into reviews (product_id, author_id, author_name, rating) values ($1,$2,'Sarah again',4)`, [P_PHYS, CU]), 'duplicate key');
await as('authenticated', CU2);
await expectThrow('cannot edit another user review', () => q(`update reviews set rating=1 where author_id=$1`, [CU]), 'row-level security');
await q(`update reviews set helpful_count = helpful_count + 1 where author_id=$1`, [CU]);
ok('but anyone may bump helpful_count', Number((await q(`select helpful_count::int h from reviews where author_id=$1`, [CU]))[0].h) === 1);
await expectThrow(
  'a helpful vote cannot rewrite verified_purchase',
  () => q(`update reviews set verified_purchase=true where author_id=$1`, [CU2]),
  'row-level security',
);
await q(`insert into reviews (product_id, author_id, author_name, rating, body) values ($1,$2,'Zoe',5,'Licence works')`, [P_DIG, CU2]);
ok(
  'a licence the reviewer never bought stays unverified',
  (await q(`select verified_purchase from reviews where author_id=$1 and product_id=$2`, [CU2, P_DIG]))[0].verified_purchase === false,
);
await as('authenticated', VENDOR);
await q(`select reply_to_review(id, 'Thanks for the feedback') from reviews where author_id=$1`, [CU]);
ok('vendor reply stored', (await q(`select seller_reply->>'body' b from reviews where author_id=$1`, [CU]))[0].b === 'Thanks for the feedback');
await expectThrow('vendor cannot reply to another store review', () => q(`select reply_to_review(id,'x') from reviews where product_id=(select id from products where slug='acme-license')`), 'does not belong');

console.log(`\n${passed} passed, ${failed} failed`);
await db.close();
if (failed) process.exitCode = 1;
