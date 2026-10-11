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
  `insert into vendor_profiles (id, user_id, store_name, slug, commission_rate_override, seller_type) values
     ($1,$2,'Tech Store','tech-store',null,'vendor'),($3,null,'Vendora','vendora',0.000,'platform')`,
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
    `select place_order($1::jsonb,'card','express','SAVE10','leave at door',null,'Visa','1119') as r`,
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

console.log('\n[checkout pricing] the quote is the bill');
await as('postgres');
await q(
  `insert into promotions (vendor_id, code, title, discount_type, discount_value, minimum_order, usage_limit)
   values ($1,'PLATFORM12','Vendora 12%','percentage',12,10,100)`,
  [PLATFORM],
);
await as('authenticated', CU2);
await q(
  `insert into cart_items (user_id, product_id, variant_id, quantity) values
     ($1,$2,'v-black',1),($1,$3,'',1)`,
  [CU2, P_PHYS, P_DIG],
);
await expectThrow(
  'a card order missing its last four digits is rejected',
  () => q(`select place_order($1::jsonb,'card','standard',null,null,null,'Mastercard',null)`, [{ street: '1 Main St' }]),
  'last four digits',
);

const quoteOpts = { [STORE]: 'express' };
const quote = (await q(`select checkout_quote($1::jsonb, 'SAVE10') as q`, [quoteOpts]))[0].q;
const usageBefore = (await q(`select usage_count::int c from promotions where code='SAVE10'`))[0].c;
const quoteAgain = (await q(`select checkout_quote($1::jsonb, 'SAVE10') as q`, [quoteOpts]))[0].q;
ok(
  'quoting twice changes nothing: cart intact, promotion unspent',
  JSON.stringify(quote) === JSON.stringify(quoteAgain) &&
    (await q('select count(*)::int c from cart_items'))[0].c === 2 &&
    (await q(`select usage_count::int c from promotions where code='SAVE10'`))[0].c === usageBefore,
);
ok('the express surcharge is a server number', Number(quote.expressFee) === 15, `(got ${quote.expressFee})`);

const qPhys = quote.groups.find((x: any) => x.hasPhysical);
const qDigi = quote.groups.find((x: any) => !x.hasPhysical);
ok('the store name and kind reach the checkout screen', qPhys.sellerName === 'Tech Store' && qPhys.sellerType === 'vendor' && qDigi.sellerType === 'platform');
ok('shipping is priced from the product, express adds the flat surcharge', Number(qPhys.shippingStandard) === 5 && Number(qPhys.shippingExpress) === 20 && Number(qPhys.shippingFee) === 20, `(got ${qPhys.shippingStandard}/${qPhys.shippingExpress}/${qPhys.shippingFee})`);
ok('a digital package never pays an express surcharge', Number(qDigi.shippingFee) === 0 && Number(qDigi.shippingExpress) === 0);
ok('the quoted grand total adds up', Number(quote.grandTotal) === Number(quote.subtotal) - Number(quote.discountTotal) + Number(quote.shippingTotal), `(got ${quote.grandTotal})`);

const scoped = (await q(`select checkout_quote('{}'::jsonb, 'PLATFORM12') as q`))[0].q;
ok(
  'a vendor-scoped promotion only ever discounts that vendor',
  Number(scoped.groups.find((x: any) => x.hasPhysical).discount) === 0 &&
    Number(scoped.groups.find((x: any) => !x.hasPhysical).discount) === 2.4,
);
await expectThrow(
  'an unknown coupon is refused at the quote, not at payment',
  () => q(`select checkout_quote('{}'::jsonb, 'NOPE99')`),
  'invalid or expired coupon',
);

const booked = (
  await q(
    `select place_order($1::jsonb,'card','standard','SAVE10','leave at door',$2::jsonb,'Mastercard','5454') as r`,
    [{ street: '1 Main St', city: 'Karachi', country: 'PK' }, quoteOpts],
  )
)[0].r;
const bPhys = booked.subOrders.find((s: any) => s.type === 'physical');
const bDigi = booked.subOrders.find((s: any) => s.type === 'digital');
const written = await q(
  `select id, subtotal, shipping_fee, commission_amount, net_payout, delivery_option
   from sub_orders where order_group_id = $1`,
  [booked.orderId],
);
ok(
  'every booked package matches its quoted money, line for line',
  [bPhys, bDigi].every((line: any) => {
    const row = written.find((r: any) => r.id === line.id);
    const src = quote.groups.find((x: any) => x.sellerId === line.sellerId);
    return (
      !!row &&
      Number(row.subtotal) === Number(src.netSubtotal) &&
      Number(row.shipping_fee) === Number(src.shippingFee) &&
      Number(row.commission_amount) === Number(src.commissionAmount) &&
      Number(row.net_payout) === Number(src.netPayout) &&
      row.delivery_option === src.deliveryOption
    );
  }),
);
ok('the order books the grand total the quote showed', Number(booked.grandTotal) === Number(quote.grandTotal), `(quoted ${quote.grandTotal}, booked ${booked.grandTotal})`);
ok('the service chosen per package is stored', bPhys.deliveryOption === 'express' && bDigi.deliveryOption === 'standard');
const cardOrder = (await q(`select payment_details, payment_status from orders where id=$1`, [booked.orderId]))[0];
ok(
  'the card the customer typed is what the order records, and nothing more',
  cardOrder.payment_details.brand === 'Mastercard' && cardOrder.payment_details.last4 === '5454' && Object.keys(cardOrder.payment_details).length === 2,
);
ok('no order in this database carries the invented 4242 card', (await q(`select count(*)::int c from orders where payment_details->>'last4'='4242'`))[0].c === 0);
ok('stock dropped again for the second buyer', (await q(`select stock::int s from products where id=$1`, [P_PHYS]))[0].s === 7);

console.log('\n[cash on delivery]');
await as('authenticated', CU2);
await q(`insert into cart_items (user_id, product_id, variant_id, quantity) values ($1,$2,'',1)`, [CU2, P_DIG]);
const codOrder = (await q(`select place_order($1::jsonb,'cod') as r`, [{ street: '1 Main St' }]))[0].r;
const codRow = (await q(`select payment_details, payment_status from orders where id=$1`, [codOrder.orderId]))[0];
ok('a cash order is booked pending, not paid', codRow.payment_status === 'pending');
ok('a cash order records cash, not a card', codRow.payment_details.method === 'cod');
ok('a cash order creates no delivery job', (await q(`select count(*)::int c from deliveries d join sub_orders so on so.id = d.sub_order_id where so.order_group_id = $1`, [codOrder.orderId]))[0].c === 0);

console.log('\n[handover codes] re-issue, never read back');
await as('authenticated', CU2);
const reissued = (await q(`select issue_delivery_code($1) as r`, [bPhys.id]))[0].r;
const storedHash = (await q(`select delivery_code_hash h from sub_orders where id=$1`, [bPhys.id]))[0].h;
ok('the buyer gets a fresh 4-digit handover code', /^\d{4}$/.test(reissued.code), `(got ${reissued.code})`);
ok('the hash now matches the new code, not the one shown at checkout', storedHash === (await q(`select hash_delivery_code($1) h`, [reissued.code]))[0].h && storedHash !== (await q(`select hash_delivery_code($1) h`, [bPhys.deliveryCode]))[0].h);
await as('authenticated', CU);
await expectThrow(
  'a stranger cannot issue someone else handover code',
  () => q(`select issue_delivery_code($1)`, [bPhys.id]),
  'can issue this code',
);
await as('authenticated', CU2);
await expectThrow(
  'a digital package has no handover code',
  () => q(`select issue_delivery_code($1)`, [codOrder.subOrders[0].id]),
  'no handover code',
);
await as('authenticated', ADMIN);
await q(`select assign_rider($1,$2)`, [bPhys.id, RPID]);
const bDelivery = (await q(`select id from deliveries where sub_order_id=$1`, [bPhys.id]))[0].id;
await as('authenticated', VENDOR);
for (const next of ['confirmed', 'packed', 'ready_for_pickup']) {
  await q(`select advance_sub_order_status($1,$2)`, [bPhys.id, next]);
}
await as('authenticated', RIDER);
for (const next of ['shipped', 'out_for_delivery']) {
  await q(`select advance_sub_order_status($1,$2)`, [bPhys.id, next]);
}
await expectThrow('the code shown at checkout is spent once re-issued', () => q(`select verify_delivery($1,$2)`, [bDelivery, bPhys.deliveryCode]), 'invalid handover code');
await q(`select verify_delivery($1,$2)`, [bDelivery, reissued.code]);
ok('the re-issued code completes the delivery', (await q(`select status from sub_orders where id=$1`, [bPhys.id]))[0].status === 'delivered');
await as('authenticated', CU2);
await expectThrow('a closed delivery cannot be re-coded', () => q(`select issue_delivery_code($1)`, [bPhys.id]), 'already closed');

console.log('\n[vendor workspace] money, returns and listings are decided in SQL');
await as('authenticated', VENDOR);

// -- dashboard: the tiles the seller sees, aggregated by Postgres --------------
const dash = (await q(`select vendor_dashboard(5) as d`))[0].d;
ok('the dashboard is the acting store, not the whole marketplace', dash.store.id === STORE);
ok(
  'net paid out = booked gross - frozen commission',
  Math.abs(
    Number(dash.kpis.netPayout) - (Number(dash.kpis.grossBooked) - Number(dash.kpis.commission)),
  ) < 0.01,
  `(gross ${dash.kpis.grossBooked}, fees ${dash.kpis.commission}, net ${dash.kpis.netPayout})`,
);
ok(
  'physical + digital sales are the booked gross',
  Math.abs(Number(dash.kpis.physicalSales) + Number(dash.kpis.digitalSales) - Number(dash.kpis.grossBooked)) < 0.01,
);
{
  await as('postgres');
  const placedCount = (
    await q(`select count(*)::int c from sub_orders where seller_id = $1 and status = 'placed'`, [STORE])
  )[0].c;
  await as('authenticated', VENDOR);
  ok('stage counts match the rows the store actually has', Number(dash.stages.placed) === placedCount, `(placed ${dash.stages.placed})`);
}
ok(
  'recent packages name the buyer (orders are readable through the vendor policy)',
  dash.recentPackages.length > 0 && dash.recentPackages.every((p: any) => /@demo\.test$/.test(p.buyerEmail)),
);
ok(
  'the catalog counts only this store\'s listings',
  (await q(`select count(*)::int c from products where seller_id=$1 and status='approved'`, [STORE]))[0].c === Number(dash.catalog.approved),
);

await as('authenticated', CU);
await expectThrow('a customer calling vendor_dashboard is turned away', () => q(`select vendor_dashboard()`), 'No vendor store');

// -- balance: earned, paid, reserved ------------------------------------------
await as('authenticated', VENDOR);
const balanceFree = (await q(`select vendor_balance() as b`))[0].b;
ok(
  'available = earned - paid - reserve, with no reserve configured',
  Math.abs(Number(balanceFree.available) - (Number(balanceFree.lifetimeNet) - Number(balanceFree.paidOut))) < 0.01,
  `(available ${balanceFree.available})`,
);
await as('postgres');
await q(`update vendor_profiles set payout_reserve_pct = 0.2 where id = $1`, [STORE]);
await q(`insert into payouts (vendor_id, amount, status) values ($1, 50, 'failed')`, [STORE]);
await as('authenticated', VENDOR);
const balanceReserve = (await q(`select vendor_balance() as b`))[0].b;
ok(
  'a rolling reserve holds back exactly its percentage of earnings',
  Math.abs(Number(balanceReserve.reserve) - Number(balanceReserve.lifetimeNet) * 0.2) < 0.01,
  `(reserve ${balanceReserve.reserve} of ${balanceReserve.lifetimeNet})`,
);
ok(
  'a failed payout returns the money to the balance',
  Number(balanceReserve.paidOut) === Number(balanceFree.paidOut),
  `(paidOut ${balanceReserve.paidOut}, was ${balanceFree.paidOut})`,
);
const instant = (await q(`select request_payout(10) as r`))[0].r;
ok(
  'the instant transfer fee is recorded, not implied',
  Number(instant.fee) === 0.15 && Number(instant.deposit) === 9.85,
  `(fee ${instant.fee}, deposit ${instant.deposit})`,
);
await expectThrow(
  'you cannot withdraw the reserve',
  () => q(`select request_payout($1)`, [String(Number(instant.deposit) + Number(balanceReserve.available))]),
  'exceeds available balance',
);

// -- earnings ledger -----------------------------------------------------------
const earnings = (await q(`select vendor_earnings(6) as e`))[0].e;
ok(
  'what the buyer paid splits into goods and freight',
  Math.abs(
    Number(earnings.totals.subtotal) + Number(earnings.totals.shipping) - Number(earnings.totals.gross),
  ) < 0.01,
  `(gross ${earnings.totals.gross}, goods ${earnings.totals.subtotal}, freight ${earnings.totals.shipping})`,
);
ok(
  'ledger totals are internally consistent (goods - fees = net)',
  Math.abs(
    Number(earnings.totals.subtotal) - Number(earnings.totals.fees) - Number(earnings.totals.net),
  ) < 0.01,
  `(goods ${earnings.totals.subtotal}, fees ${earnings.totals.fees}, net ${earnings.totals.net})`,
);
ok('the chart has one point per month, even for empty months', earnings.months.length === 6);
ok(
  'every ledger row is settled from the fee frozen at booking',
  earnings.ledger.every(
    (r: any) =>
      Math.abs(Number(r.subtotal) - Number(r.fees) - Number(r.net)) < 0.01 &&
      Math.abs(Number(r.subtotal) + Number(r.shipping) - Number(r.gross)) < 0.01,
  ),
);

// -- tracking: sellers have no UPDATE policy on sub_orders ---------------------
await as('authenticated', CU);
await expectThrow('the buyer cannot attach a tracking number', () => q(`select update_sub_order_tracking($1,'DHL','DHL123')`, [phys.id]), 'not yours');
await as('authenticated', VENDOR);
await expectThrow('a digital package has nothing to track', () => q(`select update_sub_order_tracking($1,'DHL','DHL123')`, [digi.id]), 'nothing to track');
await expectThrow('an empty tracking number is rejected', () => q(`select update_sub_order_tracking($1,'DHL','  ')`, [phys.id]), 'tracking number is required');
const tracked = (await q(`select update_sub_order_tracking($1,'DHL','DHL-445566') as r`, [phys.id]))[0].r;
ok('carrier and tracking number land on the package', tracked.trackingNumber === 'DHL-445566');
ok(
  'the tracking write is appended to the history trail',
  (await q(`select history from sub_orders where id=$1`, [phys.id]))[0].history.some((h: any) => /DHL-445566/.test(h.note)),
);
// RLS on UPDATE filters the row instead of raising: the browser statement
// succeeds and changes nothing, which is exactly why tracking goes through the RPC.
const hacked = await q(`update sub_orders set carrier_name='Hacked' where id=$1`, [phys.id]);
ok(
  'sub_orders is still not writable straight from the browser',
  hacked.length === 0 &&
    (await q(`select carrier_name from sub_orders where id=$1`, [phys.id]))[0].carrier_name === 'DHL',
);

// -- returns: decide, then restock ---------------------------------------------
await as('authenticated', CU2);
await q(`select advance_sub_order_status($1,'return_requested')`, [bPhys.id]);
await as('authenticated', VENDOR);
await expectThrow('a decline without a reason is not allowed', () => q(`select decide_return($1,'decline')`, [bPhys.id]), 'why the return was declined');
const declined = (await q(`select decide_return($1,'decline',null,'Outside the 30-day window') as r`, [bPhys.id]))[0].r;
ok('declining records the reason and closes the request', declined.status === 'return_rejected');
ok(
  'the buyer sees the reason on the package',
  (await q(`select return_reject_reason r from sub_orders where id=$1`, [bPhys.id]))[0].r === 'Outside the 30-day window',
);
await expectThrow('a decided return cannot be decided twice', () => q(`select decide_return($1,'approve')`, [bPhys.id]), 'Nothing to decide');

await as('authenticated', CU);
await q(`select advance_sub_order_status($1,'return_requested')`, [phys.id]);
await as('authenticated', VENDOR);
await expectThrow(
  'another store cannot decide a return that is not theirs',
  () => q(`select decide_return($1,'approve')`, [digi.id]),
  'not yours to decide',
);
const approved = (await q(`select decide_return($1,'approve',100) as r`, [phys.id]))[0].r;
ok('approving mints an RMA the buyer can quote', /^RMA-[0-9A-F]{8}$/.test(approved.rmaCode), `(got ${approved.rmaCode})`);
ok('the refund amount is stored on the package', Number(approved.refundAmount) === 100);
await as('postgres');
const units = (
  await q(
    `select coalesce(sum((i->>'quantity')::int),0)::int u
     from sub_orders so, jsonb_array_elements(so.items) i where so.id=$1`,
    [phys.id],
  )
)[0].u;
const stockBefore = (await q(`select stock::int s from products where id=$1`, [P_PHYS]))[0].s;
await as('authenticated', VENDOR);
const restocked = (await q(`select complete_return($1) as r`, [phys.id]))[0].r;
ok(
  'restocking puts exactly the returned units back on the shelf',
  (await q(`select stock::int s from products where id=$1`, [P_PHYS]))[0].s === stockBefore + units,
  `(was ${stockBefore}, returned ${units})`,
);
ok('the package is marked returned', restocked.status === 'returned');
await expectThrow('an already restocked return cannot be restocked again', () => q(`select complete_return($1)`, [phys.id]), 'Only an approved return');
await as('authenticated', ADMIN);
await q(`select advance_sub_order_status($1,'refunded')`, [phys.id]);
ok('a returned package can be refunded', (await q(`select status from sub_orders where id=$1`, [phys.id]))[0].status === 'refunded');

// -- listings: submit and withdraw, never self-approve -------------------------
await as('authenticated', VENDOR);
const draftId = (
  await q(
    `insert into products (title, slug, category_id, price, seller_id, status)
     values ('Draft Gadget','draft-gadget',$1,15,$2,'draft') returning id`,
    [CAT, STORE],
  )
)[0].id;
const submitted = (await q(`select set_vendor_product_listing($1,'submit') as r`, [draftId]))[0].r;
ok('a draft goes up for review only through the RPC', submitted.status === 'pending_review');
await as('authenticated', ADMIN);
await q(`select moderate_product($1,'rejected','Photos do not match the item')`, [draftId]);
await as('authenticated', VENDOR);
const resubmitted = (await q(`select set_vendor_product_listing($1,'submit') as r`, [draftId]))[0].r;
ok(
  'resubmitting clears the rejection the seller just answered',
  resubmitted.status === 'pending_review' &&
    (await q(`select rejection_reason from products where id=$1`, [draftId]))[0].rejection_reason === null,
);
await as('authenticated', ADMIN);
await q(`select moderate_product($1,'approved')`, [draftId]);
await as('authenticated', VENDOR);
await expectThrow('an approved listing is withdrawn by the platform, not the seller', () => q(`select set_vendor_product_listing($1,'withdraw')`, [draftId]), 'withdrawn by the platform');
await expectThrow('a live listing is not resubmitted', () => q(`select set_vendor_product_listing($1,'submit')`, [draftId]), 'does not need to be submitted');
await as('authenticated', CU);
await expectThrow('someone else cannot move the listing', () => q(`select set_vendor_product_listing($1,'withdraw')`, [draftId]), 'not yours');

// -- the redemption counter belongs to the platform -----------------------------
await as('authenticated', VENDOR);
const promoId = (
  await q(
    `insert into promotions (vendor_id, code, title, discount_type, discount_value, usage_limit)
     values ($1,'MYSTORE5','My store 5%','percentage',5,10) returning id`,
    [STORE],
  )
)[0].id;
await q(`update promotions set active = false where id = $1`, [promoId]);
ok('a seller can switch their own campaign off', (await q(`select active from promotions where id=$1`, [promoId]))[0].active === false);
await expectThrow(
  'a seller cannot rewrite how many times the code was claimed',
  () => q(`update promotions set usage_count = 99 where id=$1`, [promoId]),
  'row-level security',
);

// -- settings, media and Q&A ----------------------------------------------------
await q(
  `insert into vendor_shipping_settings (vendor_id, street, city, sla_window, standard_rate)
   values ($1,'1 Warehouse Rd','Karachi','24h',6)
   on conflict (vendor_id) do update set street = excluded.street`,
  [STORE],
);
ok('the store saves its own shipping profile', (await q(`select street from vendor_shipping_settings where vendor_id=$1`, [STORE]))[0].street === '1 Warehouse Rd');
await as('authenticated', CU);
await expectThrow('a customer cannot write a vendor shipping profile', () => q(`insert into vendor_shipping_settings (vendor_id, street) values ($1,'x')`, [STORE]), 'row-level security');

await as('authenticated', VENDOR);
await expectThrow(
  'an upload cannot approve itself into the media library',
  () => q(`insert into media_items (vendor_id, name, status) values ($1,'hero.jpg','approved')`, [STORE]),
  'row-level security',
);
const mediaId = (await q(`insert into media_items (vendor_id, name, status) values ($1,'hero.jpg','pending') returning id`, [STORE]))[0].id;
await q(`update media_items set name='hero-shot.jpg' where id=$1`, [mediaId]);
ok('a seller renames their own asset', (await q(`select name from media_items where id=$1`, [mediaId]))[0].name === 'hero-shot.jpg');
await expectThrow('a seller cannot moderate their own asset', () => q(`update media_items set status='approved' where id=$1`, [mediaId]), 'row-level security');
await as('authenticated', ADMIN);
await q(`update media_items set status='flagged' where id=$1`, [mediaId]);
ok('the platform can flag it', (await q(`select status from media_items where id=$1`, [mediaId]))[0].status === 'flagged');

await as('authenticated', CU);
const questionId = (
  await q(
    `insert into product_qa (product_id, vendor_id, customer_id, customer_name, question)
     values ($1,$2,$3,'Sarah','Does it fit a 3.5mm jack?') returning id`,
    [P_PHYS, STORE, CU],
  )
)[0].id;
await as('authenticated', CU2);
ok('an unanswered question is not public yet', (await q('select count(*)::int c from product_qa where id=$1', [questionId]))[0].c === 0);
await as('authenticated', VENDOR);
await q(`update product_qa set answer='Yes, with the included adapter', answered_at=now(), published=true where id=$1`, [questionId]);
ok('the seller answers and publishes', (await q('select published from product_qa where id=$1', [questionId]))[0].published === true);
await expectThrow(
  'the seller cannot edit the question itself',
  () => q(`update product_qa set question='Rewritten' where id=$1`, [questionId]),
  'row-level security',
);
await as('anon');
ok('an anonymous visitor sees the published answer only', (await q('select count(*)::int c from product_qa'))[0].c === 1);

console.log(`\n${passed} passed, ${failed} failed`);
await db.close();
if (failed) process.exitCode = 1;
