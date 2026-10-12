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

console.log('\n[admin] the console reads, decides and records through RPCs');
await as('postgres');
const aStore = (await q(`select id from vendor_profiles where slug='tech-store'`))[0].id;
const aOrder = (await q(
  `insert into orders (customer_id, customer_email) values ($1::uuid,'customer@demo.test') returning id`,
  [CU],
))[0].id;
const aPkg = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, commission_amount, net_payout, status)
   values ($1,$2,100,5,10,95,'delivered') returning id`,
  [aOrder, aStore],
))[0].id;
const aDispute = (await q(
  `insert into disputes (sub_order_id, order_group_id, customer_id, customer_name, vendor_id, vendor_name, reason, status, urgency)
   values ($1,$2,$3,'Sarah Customer',$4,'Tech Store','Package never arrived','open','urgent') returning id`,
  [aPkg, aOrder, CU, aStore],
))[0].id;
const aDraft = (await q(
  `insert into products (title, slug, category_id, price, seller_id, status)
   values ('Queued Listing','queued-listing',$1::uuid,42,$2::uuid,'pending_review') returning id`,
  [CAT, aStore],
))[0].id;
const adApplicant = (await q(
  `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(),'applicant@demo.test','{}') returning id`,
))[0].id;
await q(
  `insert into vendor_applications (user_id, proposed_store_name, proposed_slug, status)
   values ($1::uuid,'Atlas Gadgets','atlas-gadgets','pending')`, [adApplicant],
);
await q(`update profiles set vendor_status='pending' where id=$1`, [adApplicant]);

await as('authenticated', CU);
await expectThrow('a customer cannot read the platform overview', () => q('select admin_dashboard(30)'), 'only the platform team');
await expectThrow('a customer cannot list merchants', () => q('select admin_vendor_queue()'), 'only the platform team');
await expectThrow('a customer cannot refund a package', () => q(`select admin_refund_sub_order($1,5,'x')`, [aPkg]), 'only the platform team');

await as('authenticated', VENDOR);
await expectThrow('a seller cannot suspend their own store', () => q(`select admin_set_vendor_status($1,'suspended','')`, [aStore]), 'only the platform team');
await expectThrow('a seller cannot set their own commission', () => q(`select admin_set_vendor_commission($1,0.01)`, [aStore]), 'only the platform team');
await expectThrow('a seller cannot read the moderation queue', () => q('select admin_moderation_queue()'), 'only the platform team');

await as('authenticated', ADMIN);
const adDash = (await q('select admin_dashboard(30) d'))[0].d;
ok('the overview counts the delivered package from the rows', Number(adDash.kpis.packages) >= 1 && Number(adDash.kpis.gmvBooked) >= 105);
ok('the overview reports the urgent dispute it can see', Number(adDash.trust.escalatedDisputes + adDash.trust.openDisputes) >= 1);
ok('the overview counts the pending application', Number(adDash.sellers.awaitingReview) >= 1);

const adVendors = (await q(`select admin_vendor_queue('all','tech') r`))[0].r;
ok('the merchant queue finds the store by name only', adVendors.rows.length === 1 && adVendors.rows[0].storeName === 'Tech Store');
ok('the merchant queue settles its own money', Number(adVendors.rows[0].gross) >= 105 && Number(adVendors.rows[0].net) >= 95);
ok('the merchant queue counts the pending application separately', Number(adVendors.pending) >= 1);

const adVendor = (await q(`select admin_vendor_detail($1) d`, [aStore]))[0].d;
ok('the merchant dossier carries the package that earned the payout', adVendor.packages.length >= 1);
ok('and the dispute filed against the store', adVendor.disputes.length === 1);

await q(`select admin_set_vendor_status($1,'suspended','Counterfeit goods')`, [aStore]);
ok('suspending flips the store row', (await q(`select status from vendor_profiles where id=$1`, [aStore]))[0].status === 'suspended');
ok('suspending flips the owning account too', (await q(`select vendor_status from profiles where id=$1`, [VENDOR]))[0].vendor_status === 'suspended');
ok('the suspension is written once to the audit trail',
  (await q(`select count(*)::int c from audit_logs where action='vendor.suspended' and entity_id=$1`, [aStore]))[0].c === 1);
await q(`select admin_set_vendor_status($1,'active')`, [aStore]);

const adStrike = (await q(`select admin_issue_strike($1,'Counterfeit goods','Second occurrence') s`, [aStore]))[0].s;
ok('a strike is recorded and counted', Number(adStrike.strikes) === 1);
await expectThrow('a strike needs a reason', () => q(`select admin_issue_strike($1,'   ')`, [aStore]), 'needs a reason');
await as('authenticated', VENDOR);
ok('the accused store can read its own strikes', (await q('select count(*)::int c from vendor_strikes'))[0].c === 1);
await as('authenticated', CU);
ok('a customer cannot read another store’s strikes', (await q('select count(*)::int c from vendor_strikes'))[0].c === 0);

await as('authenticated', ADMIN);
await q(`select admin_set_global_commission(0.08)`);
ok('the global rate lands where pricing reads it',
  Number((await q('select global_default_rate from commission_config where id'))[0].global_default_rate) === 0.08);
await expectThrow('a rate above 50% is refused', () => q(`select admin_set_global_commission(0.9)`), 'between 0');
await q(`select admin_set_vendor_commission($1,0.05)`, [aStore]);
ok('a vendor override is stored on the row',
  Number((await q(`select commission_rate_override from vendor_profiles where id=$1`, [aStore]))[0].commission_rate_override) === 0.05);
ok('and mirrored in the commission config map',
  Object.keys((await q('select vendor_overrides as o from commission_config where id'))[0].o).includes(aStore));
await q(`select admin_set_category_commission($1,0.12)`, [CAT]);
ok('a category override is recorded',
  Number((await q(`select commission_rate_override from categories where id=$1`, [CAT]))[0].commission_rate_override) === 0.12);

const adBatch = (await q(`select admin_moderate_products(array[$1]::uuid[],'approved') r`, [aDraft]))[0].r;
ok('moderation decides the row and attributes the decision',
  Number(adBatch.decided) === 1 && (await q(`select moderated_by::text m from products where id=$1`, [aDraft]))[0].m === ADMIN);
ok('deciding the same thing again changes nothing',
  Number((await q(`select admin_moderate_products(array[$1]::uuid[],'approved') r`, [aDraft]))[0].r.decided) === 0);
await expectThrow('a rejection needs a reason the seller can read',
  () => q(`select admin_moderate_products(array[$1]::uuid[],'rejected',null)`, [aDraft]), 'needs a reason');
await expectThrow('a customer cannot be given moderation work',
  () => q(`select admin_assign_moderator($1,$2)`, [aDraft, CU]), 'not staff');
await q(`select admin_assign_moderator($1,$2)`, [aDraft, ADMIN]);
ok('a listing can be assigned to a staff account',
  (await q(`select assigned_moderator_id::text m from products where id=$1`, [aDraft]))[0].m === ADMIN);

const adOneP = (await q(
  `select admin_create_product_1p(jsonb_build_object('title','Vendora Studio Cable','price',19.5,'status','approved','categoryId',$1::text)) r`, [CAT],
))[0].r;
ok('a first-party listing belongs to the platform store', adOneP.sellerId === PLATFORM);
ok('and is audited as created',
  (await q(`select count(*)::int c from audit_logs where action='product.create_1p' and entity_id=$1`, [adOneP.id]))[0].c === 1);
await expectThrow('a listing cannot be invented without a price',
  () => q(`select admin_create_product_1p('{\"title\":\"No Price\"}'::jsonb)`), 'price above zero');

await q(`select admin_set_user_status($1,'suspended','Chargeback pattern')`, [CU2]);
ok('an account can be suspended with the reason kept',
  (await q(`select account_status from profiles where id=$1`, [CU2]))[0].account_status === 'suspended'
  && (await q(`select account_status_reason from profiles where id=$1`, [CU2]))[0].account_status_reason === 'Chargeback pattern');
await expectThrow('an admin cannot suspend their own account',
  () => q(`select admin_set_user_status($1,'banned','')`, [ADMIN]), 'your own account');
await q(`select admin_set_user_roles($1,array['customer','support'])`, [CU2]);
ok('roles are replaced from the console',
  (await q(`select roles::text from profiles where id=$1`, [CU2]))[0].roles.includes('support'));
await expectThrow('an admin cannot rewrite their own roles',
  () => q(`select admin_set_user_roles($1,array['customer'])`, [ADMIN]), 'your own roles');
await expectThrow('an unknown role is refused rather than stored',
  () => q(`select admin_set_user_roles($1,array['wizard'])`, [CU2]), 'unknown role');

const adRefund = (await q(`select admin_refund_sub_order($1,105,'Damaged in transit') r`, [aPkg]))[0].r;
ok('a refund records the amount and the reason', Number(adRefund.amount) === 105 && adRefund.reason === 'Damaged in transit');
ok('the package reads refunded and says why in its history',
  (await q(`select status from sub_orders where id=$1`, [aPkg]))[0].status === 'refunded'
  && JSON.stringify((await q(`select history from sub_orders where id=$1`, [aPkg]))[0].history).includes('Damaged in transit'));
ok('the order is only marked refunded once nothing is unrefunded',
  (await q(`select payment_status from orders where id=$1`, [aOrder]))[0].payment_status === 'refunded');
await expectThrow('a package is not refunded twice',
  () => q(`select admin_refund_sub_order($1,10,'again')`, [aPkg]), 'already been refunded');
// `sub_orders` has no INSERT policy for anyone: the platform creates a package
// only through checkout, so the smoke test seeds this one as the table owner.
await as('postgres');
const aPkg2 = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, status)
   values ($1,$2,40,5,'delivered') returning id`, [aOrder, aStore],
))[0].id;
await as('authenticated', ADMIN);
await expectThrow('more than the buyer was charged cannot be refunded',
  () => q(`select admin_refund_sub_order($1,9999,'greed')`, [aPkg2]), 'more than the buyer was charged');
await as('authenticated', CU);
ok('the buyer can read the refund on their own order', (await q(`select count(*)::int c from refunds where order_group_id=$1`, [aOrder]))[0].c === 1);
// CU2 was given the support role by the role test above, so it now reads the refund ledger the
// way staff do. An account that is only a customer must still read nothing.
const OUTSIDER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
await as('postgres');
await q(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'outsider@demo.test','{}')`, [OUTSIDER]);
await as('authenticated', CU2);
ok('a support agent reads the refund ledger', (await q('select count(*)::int c from refunds'))[0].c === 1);
await as('authenticated', OUTSIDER);
ok('another account reads no refunds at all', (await q('select count(*)::int c from refunds'))[0].c === 0);

await as('authenticated', ADMIN);
await q(`select admin_escalate_dispute($1,'Needs a second pair of eyes')`, [aDispute]);
ok('escalation assigns the case to the actor',
  (await q(`select assigned_agent_id::text a from disputes where id=$1`, [aDispute]))[0].a === ADMIN);
ok('the escalation note lands on the case as an internal note',
  (await q(`select is_internal_note from dispute_messages where dispute_id=$1 order by created_at desc limit 1`, [aDispute]))[0].is_internal_note === true);
await q(`select resolve_dispute($1,'resolved_refund','Refunded in full',105)`, [aDispute]);
ok('resolving records the ruling and the amount',
  (await q(`select status from disputes where id=$1`, [aDispute]))[0].status === 'resolved_refund'
  && Number((await q(`select resolution_amount from disputes where id=$1`, [aDispute]))[0].resolution_amount) === 105);

const adUsers = (await q(`select admin_user_queue('all','all','') r`))[0].r;
ok('the account queue totals and role counts come from rows', Number(adUsers.total) >= 6 && Number(adUsers.counts.admins) >= 1);
ok('the account queue shows the suspension it just made', adUsers.rows.some((r: any) => r.accountStatus === 'suspended'));
const adAudit = (await q(`select admin_audit_queue('all','vendor') r`))[0].r;
ok('the audit queue finds the suspension with its state diff',
  adAudit.rows.some((r: any) => r.action === 'vendor.suspended' && r.before?.status === 'active'));
const adReport = (await q(`select admin_report_summary(30,'day') r`))[0].r;
ok('the report totals include the freight the buyer paid', Number(adReport.totals.gross) >= 105 && Number(adReport.totals.freight) >= 5);
ok('the report buckets money by the period the rows fall in', Array.isArray(adReport.series) && adReport.series.length >= 1);
const adTree = (await q(`select admin_category_tree() r`))[0].r;
ok('the category adTree counts the listings under each root', adTree.roots.some((r: any) => Number(r.products) >= 2));
const adCommission = (await q(`select admin_commission_overview(30) r`))[0].r;
ok('the commission ledger reports the rate the platform chose', Number(adCommission.globalDefaultRate) === 0.08);
ok('and lists the changes it recorded', Number(adCommission.changes.length) >= 3);
const adLogi = (await q(`select admin_logistics_board() r`))[0].r;
ok('the dispatch board lists the fleet and the delivered count',
  Number(adLogi.fleet.length) === 1 && Number(adLogi.counts.delivered) >= 1);

const adCat = (await q(`select admin_create_category('Audio','audio-6') r`))[0].r;
await expectThrow('a category cannot be its own parent',
  () => q(`select admin_update_category($1::uuid, null, null, $1::uuid)`, [adCat.id]), 'its own parent');
await q(`select admin_assign_product_category($1,$2)`, [aDraft, adCat.id]);
ok('a listing can be moved between categories',
  (await q(`select category_id from products where id=$1`, [aDraft]))[0].category_id === adCat.id);
await expectThrow('a category still holding listings cannot be deleted',
  () => q(`select admin_delete_category($1)`, [CAT]), 'still has');
await q(`select admin_assign_product_category($1,$2)`, [aDraft, CAT]);
await q(`select admin_delete_category($1)`, [adCat.id]);
ok('an empty category can be deleted', (await q('select count(*)::int c from categories where slug=$1', ['audio-6']))[0].c === 0);

await q(`select admin_save_platform_settings('{\"payoutSchedule\":\"Weekly on Friday\",\"minPayoutFloor\":75}'::jsonb)`);
ok('platform settings persist where the console can read them back',
  (await q('select payout_schedule from platform_settings where id'))[0].payout_schedule === 'Weekly on Friday');
ok('and the change is audited with its before state',
  JSON.stringify((await q(`select before_data from audit_logs where action='settings.update' order by created_at desc limit 1`))[0].before_data).includes('Bi-weekly'));
await as('authenticated', CU);
await expectThrow('a customer cannot change platform settings',
  () => q(`select admin_save_platform_settings('{}'::jsonb)`), 'only the platform team');
await as('anon');
ok('the storefront can read the settlement cadence it quotes',
  (await q('select payout_schedule from platform_settings'))[0].payout_schedule === 'Weekly on Friday');
ok('anon reads no merchant strikes', (await q('select count(*)::int c from vendor_strikes'))[0].c === 0);

console.log('\n[support] staff triage writes through RPCs, not localStorage');
const SUPPORT = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const SUPPORT2 = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';
await as('postgres');
await q(
  `insert into auth.users (id, email, raw_user_meta_data) values
     ($1,'support@demo.test','{}'),($2,'support2@demo.test','{}')
   on conflict (id) do nothing`,
  [SUPPORT, SUPPORT2],
);
await q(`update profiles set roles = array['support']::user_role[] where id = any($1::uuid[])`, [
  [SUPPORT, SUPPORT2],
]);
const sOrder = (await q(
  `insert into orders (customer_id, customer_email) values ($1,'customer@demo.test') returning id`, [CU],
))[0].id;
const sPkg = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, status)
   values ($1,$2,80,10,'delivered') returning id`, [sOrder, STORE],
))[0].id;
const sCase = (await q(
  `insert into disputes (sub_order_id, order_group_id, customer_id, customer_name, vendor_id, vendor_name, reason, status)
   values ($1,$2,$3,'Sarah Customer',$4,'Tech Store','Wrong item delivered','open') returning id`,
  [sPkg, sOrder, CU, STORE],
))[0].id;

await as('authenticated', CU);
await expectThrow('a customer cannot open the dispute queue',
  () => q('select support_dispute_queue()'), 'only staff can');
await as('authenticated', SUPPORT);
const sQueue = (await q(`select support_dispute_queue('all','',1,50) r`))[0].r;
ok('support reads the queue the platform console reads',
  sQueue.rows.some((r: any) => r.id === sCase) && sQueue.counts.open >= 1);
const directory = (await q('select support_staff_directory() r'))[0].r;
ok('the agent directory lists support accounts and marks the caller',
  directory.agents.length >= 2 &&
  directory.agents.filter((a: any) => a.isMe).length === 1 &&
  directory.agents.every((a: any) => !!a.name && !!a.email) &&
  !directory.agents.some((a: any) => a.id === VENDOR));
const assigned = (await q(`select assign_dispute($1,$2) r`, [sCase, SUPPORT2]))[0].r;
ok('support can hand a case to another agent', assigned.assignedAgentId === SUPPORT2);
ok('and the load the directory quotes moves with the case',
  (await q('select support_staff_directory() r'))[0].r.agents
    .find((a: any) => a.id === SUPPORT2).openCases === 1);
const s2Pool = (await q(`select support_dispute_queue('all','',1,50,false,$1) r`, [SUPPORT2]))[0].r;
ok('the queue filters to one agent’s pool in SQL',
  s2Pool.rows.length >= 1 && s2Pool.rows.every((r: any) => r.agentName));
const openPool = (await q(`select support_dispute_queue('all','',1,50,true,null) r`))[0].r;
ok('and to the pool with nobody on it',
  openPool.rows.every((r: any) => r.agentName === null) && openPool.counts.unassigned >= 0);
const closedPool = (await q(`select support_dispute_queue('resolved','',1,50,false,null) r`))[0].r;
ok('and to the cases already closed',
  closedPool.rows.length >= 1 && closedPool.rows.every((r: any) => String(r.status).startsWith('resolved')));
await expectThrow('support cannot hand a case to themselves',
  () => q(`select assign_dispute($1,$2)`, [sCase, SUPPORT]), 'yourself');
await expectThrow('a case cannot be handed to a non-staff account',
  () => q(`select assign_dispute($1,$2)`, [sCase, VENDOR]), 'support access');
const msgId = (await q(
  `select add_dispute_message($1,'Please send a photo of the label you received.') r`, [sCase],
))[0].r;
ok('support can reply on the case as staff',
  (await q(`select sender_role from dispute_messages where id=$1`, [msgId]))[0].sender_role === 'support');
await as('authenticated', CU);
ok('the buyer reads the staff reply on their own case',
  (await q(`select count(*)::int c from dispute_messages where dispute_id=$1`, [sCase]))[0].c === 1);
await expectThrow('the buyer cannot post as staff',
  () => q(`select add_dispute_message($1,'forged')`, [sCase]), 'only staff can post');
await as('authenticated', SUPPORT);
const noteId = (await q(
  `select add_dispute_message($1,$2,true) r`, [sCase, 'Seller shipping label mismatch - flagged for audit'],
))[0].r;
ok('an internal note is stored as a note',
  (await q(`select is_internal_note from dispute_messages where id=$1`, [noteId]))[0].is_internal_note === true);
const esc = (await q(`select escalate_to_support($1,'Needs senior review') r`, [sCase]))[0].r;
const escRow = (await q(`select status, urgency, assigned_agent_id::text a from disputes where id=$1`, [sCase]))[0];
ok('escalation raises urgency and takes ownership',
  esc.status === 'escalated' && escRow.urgency === 'urgent' && escRow.a === SUPPORT);
ok('the escalation reason is kept on the case as a note',
  (await q(`select content from dispute_messages where dispute_id=$1 and is_internal_note order by created_at desc limit 1`, [sCase]))[0].content === 'Needs senior review');
await q(`select resolve_dispute($1,'resolved_denied','No evidence supplied')`, [sCase]);
await expectThrow('a resolved case cannot be escalated',
  () => q(`select escalate_to_support($1,'too late')`, [sCase]), 'resolved disputes cannot be escalated');

// Packages are booked by checkout, never by a signed-in role, so this row is seeded as the owner.
await as('postgres');
const sPkg2 = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, status)
   values ($1,$2,80,10,'delivered') returning id`, [sOrder, STORE],
))[0].id;
await as('authenticated', SUPPORT);
const part = (await q(`select support_refund_sub_order($1,45,'Partial goodwill refund','Support') r`, [sPkg2]))[0].r;
ok('support can refund part of what the buyer paid', Number(part.amount) === 45 && Number(part.remainingGross) === 45);
ok('the refund is recorded as its own row with the reason',
  (await q(`select amount::text a, reason from refunds where sub_order_id=$1`, [sPkg2]))[0].reason === 'Partial goodwill refund');
await expectThrow('support cannot refund more than the buyer was charged',
  () => q(`select support_refund_sub_order($1,999,'greed','Support')`, [sPkg2]), 'more than the buyer was charged');
await expectThrow('a refund needs an amount above zero',
  () => q(`select support_refund_sub_order($1,0,'nothing','Support')`, [sPkg2]), 'above zero');
const rest = (await q(`select support_refund_sub_order($1,45,'Balance refunded','Support') r`, [sPkg2]))[0].r;
ok('the second refund closes the remaining gross and the package',
  Number(rest.remainingGross) === 0 &&
  (await q(`select status from sub_orders where id=$1`, [sPkg2]))[0].status === 'refunded');
await expectThrow('a closed package cannot be refunded again',
  () => q(`select support_refund_sub_order($1,5,'again','Support')`, [sPkg2]), 'already been fully refunded');
ok('every staff refund is audited',
  (await q(`select count(*)::int c from audit_logs where action='order.refund' and entity_id=$1`, [sPkg2]))[0].c === 2);

const notified = (await q(
  `select send_support_notification($1,'Your return was approved','Reply in this thread to add evidence.') r`, [CU],
))[0].r;
ok('support can notify a buyer', !!notified);
await as('authenticated', CU);
ok('the buyer reads the notice addressed to them',
  (await q(`select count(*)::int c from notifications where title=$1`, ['Your return was approved']))[0].c === 1);
await as('authenticated', SUPPORT);
const found = (await q(`select support_lookup_orders('customer@demo.test', 30) r`))[0].r;
ok('support can look up a buyer’s orders by email', Array.isArray(found) && found.length >= 1);

const tmpl = (await q(
  `insert into canned_responses (agent_id, subject, body, category)
   values ($1,'Late delivery apology','We are sorry...','delivery') returning id`, [SUPPORT],
))[0].id;
ok('an agent can save their own template', !!tmpl);
await as('authenticated', SUPPORT2);
ok('another agent can read the shared template',
  (await q(`select count(*)::int c from canned_responses where subject='Late delivery apology'`))[0].c === 1);
await q(`update canned_responses set subject='hijacked' where id=$1`, [tmpl]);
ok('but cannot overwrite it',
  (await q(`select subject from canned_responses where id=$1`, [tmpl]))[0].subject === 'Late delivery apology');
await q(`delete from canned_responses where id=$1`, [tmpl]);
ok('and cannot delete it',
  (await q(`select count(*)::int c from canned_responses where id=$1`, [tmpl]))[0].c === 1);
await as('authenticated', VENDOR);
ok('a seller reads no staff template at all',
  (await q('select count(*)::int c from canned_responses'))[0].c === 0);
await expectThrow('and cannot add one',
  () => q(`insert into canned_responses (agent_id, subject) values ($1,'forged')`, [VENDOR]), 'row-level security');

console.log('\n[rider] the rider works their own parcels, and the handover code is the only way to close one');
await as('postgres');
const riderOrder = (await q(
  `insert into orders (customer_id, customer_email, shipping_address)
   values ($1,'nia.buyer@demo.test',
     '{"fullName":"Nia Buyer","street":"18 Harbour Road","city":"Boston","state":"MA","zipCode":"02110"}'::jsonb)
   returning id`, [CU],
))[0].id;
const riderPkg = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, status)
   values ($1,$2,30,4,'ready_for_pickup') returning id`, [riderOrder, STORE],
))[0].id;
const drop = (await q(
  `insert into deliveries (sub_order_id, rider_id, status, handover_code_hash)
   values ($1,$2,'assigned',public.hash_delivery_code('4821')) returning id`, [riderPkg, RPID],
))[0].id;
const strayPkg = (await q(
  `insert into sub_orders (order_group_id, seller_id, subtotal, shipping_fee, status)
   values ($1,$2,20,3,'ready_for_pickup') returning id`, [riderOrder, STORE],
))[0].id;
await as('authenticated', ADMIN);
await q(`select assign_rider($1,$2)`, [riderPkg, RPID]);

await as('authenticated', RIDER);
const board = (await q('select rider_delivery_board() r'))[0].r;
ok('the board lists only this rider’s open parcels',
  board.rider?.id === RPID && board.deliveries.length >= 1 &&
  board.deliveries.every((d: any) => d.status !== 'delivered'));
ok('the rider sees the drop-off address and that a code is needed',
  board.deliveries.some((d: any) => d.needsHandoverCode === true && d.address?.street === '18 Harbour Road'));
ok('and the load counts come from the rows', board.counts.assigned >= 1);
await as('authenticated', CU);
await expectThrow('a customer cannot read a rider board',
  () => q('select rider_delivery_board()'), 'not a rider');
await as('authenticated', RIDER);
await expectThrow('a rider cannot move a parcel nobody assigned to them',
  () => q(`select advance_sub_order_status($1,'shipped')`, [strayPkg]), 'not authorized');
ok('the rider collects the parcel, and the delivery row follows',
  (await q(`select advance_sub_order_status($1,'shipped') r`, [riderPkg]))[0].r.status === 'shipped' &&
  (await q(`select status from deliveries where id=$1`, [drop]))[0].status === 'picked_up' &&
  !!((await q(`select picked_up_at from deliveries where id=$1`, [drop]))[0].picked_up_at));
ok('and takes it out for delivery',
  (await q(`select advance_sub_order_status($1,'out_for_delivery') r`, [riderPkg]))[0].r.status === 'out_for_delivery');
ok('the seller sees the rider progress in the package history',
  JSON.stringify((await q(`select history from sub_orders where id=$1`, [riderPkg]))[0].history).includes('"actor":"Rider"'));
await expectThrow('but cannot close the package without the buyer’s code',
  () => q(`select advance_sub_order_status($1,'delivered')`, [riderPkg]), 'not authorized');
await expectThrow('and cannot mark their own delivery row delivered',
  () => q(`update deliveries set status='delivered' where id=$1`, [drop]), 'row-level security');
await expectThrow('a wrong code does not deliver the parcel',
  () => q(`select verify_delivery($1,'1111')`, [drop]), 'invalid handover code');
const closed = (await q(`select verify_delivery($1,'4821') r`, [drop]))[0].r;
ok('the handover code closes the delivery', closed.status === 'delivered' &&
  (await q(`select status from sub_orders where id=$1`, [riderPkg]))[0].status === 'delivered' &&
  !!((await q(`select proof_of_delivery from deliveries where id=$1`, [drop]))[0].proof_of_delivery));

console.log(`\n${passed} passed, ${failed} failed`);
await db.close();
if (failed) process.exitCode = 1;
