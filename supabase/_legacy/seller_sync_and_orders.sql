-- ==============================================================================
-- Vendora Marketplace: Seller Panel Database Synchronization & Orders Seed
-- 1. Updates Row Level Security (RLS) policies to allow seller operations
-- 2. Seeds realistic orders and sub-orders for Apple, Samsung, Ronin, Sony, Nike, etc.
-- 3. Seeds verified customer reviews for real products
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RLS Policies: Allow Read, Insert, Update for Seller & Marketplace Flows
-- ------------------------------------------------------------------------------

-- Allow public & authenticated read on all products (including vendor drafts)
drop policy if exists "Approved products are viewable by all" on public.products;
drop policy if exists "Vendors can view their products" on public.products;
drop policy if exists "Vendors can create products" on public.products;
drop policy if exists "Vendors can update their products" on public.products;
drop policy if exists "Vendors can delete their products" on public.products;
drop policy if exists "All products viewable by all" on public.products;
drop policy if exists "Allow insert products" on public.products;
drop policy if exists "Allow update products" on public.products;
drop policy if exists "Allow delete products" on public.products;

create policy "All products viewable by all" on public.products
  for select using (true);

create policy "Allow insert products" on public.products
  for insert with check (true);

create policy "Allow update products" on public.products
  for update using (true) with check (true);

create policy "Allow delete products" on public.products
  for delete using (true);

-- Allow read, insert, update on vendor_profiles
drop policy if exists "Active vendor profiles are viewable by all" on public.vendor_profiles;
drop policy if exists "Vendors can update own profile" on public.vendor_profiles;
drop policy if exists "Vendor profiles viewable by all" on public.vendor_profiles;
drop policy if exists "Allow upsert vendor profiles" on public.vendor_profiles;

create policy "Vendor profiles viewable by all" on public.vendor_profiles
  for select using (true);

create policy "Allow upsert vendor profiles" on public.vendor_profiles
  for all using (true) with check (true);

-- Allow read, insert, update on orders and sub_orders
drop policy if exists "Customers can view their orders" on public.orders;
drop policy if exists "Customers can insert their orders" on public.orders;
drop policy if exists "Orders viewable by all" on public.orders;
drop policy if exists "Allow insert orders" on public.orders;

create policy "Orders viewable by all" on public.orders
  for select using (true);

create policy "Allow insert orders" on public.orders
  for insert with check (true);

drop policy if exists "Authenticated users can view orders" on public.sub_orders;
drop policy if exists "Sub-orders viewable by all" on public.sub_orders;
drop policy if exists "Allow insert sub_orders" on public.sub_orders;
drop policy if exists "Allow update sub_orders" on public.sub_orders;

create policy "Sub-orders viewable by all" on public.sub_orders
  for select using (true);

create policy "Allow insert sub_orders" on public.sub_orders
  for insert with check (true);

create policy "Allow update sub_orders" on public.sub_orders
  for update using (true) with check (true);

-- Allow reviews read & write
drop policy if exists "Reviews viewable by all" on public.reviews;
drop policy if exists "Authenticated users can create reviews" on public.reviews;
drop policy if exists "Allow all for reviews" on public.reviews;

create policy "Allow all for reviews" on public.reviews
  for all using (true) with check (true);

-- ------------------------------------------------------------------------------
-- 2. Seed Real Orders & Sub-Orders for Vendors
-- ------------------------------------------------------------------------------

-- Insert Parent Orders
insert into public.orders (id, customer_id, customer_email, shipping_address, payment_method, created_at)
values
  (
    'ord-grp-9001',
    null,
    'sarah.jenkins@example.com',
    '{"fullName":"Sarah Jenkins","addressLine1":"742 Evergreen Terrace","city":"Springfield","state":"OR","postalCode":"97477","country":"US","phone":"+1 (555) 234-5678"}'::jsonb,
    'card',
    now() - interval '2 hours'
  ),
  (
    'ord-grp-9002',
    null,
    'marcus.vance@techcorp.io',
    '{"fullName":"Marcus Vance","addressLine1":"1040 Mission St, Apt 4B","city":"San Francisco","state":"CA","postalCode":"94103","country":"US","phone":"+1 (555) 345-6789"}'::jsonb,
    'card',
    now() - interval '6 hours'
  ),
  (
    'ord-grp-9003',
    null,
    'elena.rostova@designworks.com',
    '{"fullName":"Elena Rostova","addressLine1":"18 Rue de la Paix","city":"Paris","state":"IDF","postalCode":"75002","country":"FR","phone":"+33 1 42 68 55 00"}'::jsonb,
    'card',
    now() - interval '18 hours'
  ),
  (
    'ord-grp-9004',
    null,
    'alex.chen@innovate.co',
    '{"fullName":"Alex Chen","addressLine1":"500 West Madison St","city":"Chicago","state":"IL","postalCode":"60661","country":"US","phone":"+1 (555) 456-7890"}'::jsonb,
    'card',
    now() - interval '1 day'
  ),
  (
    'ord-grp-9005',
    null,
    'david.miller@soundcraft.org',
    '{"fullName":"David Miller","addressLine1":"1200 Grand Ave","city":"Seattle","state":"WA","postalCode":"98101","country":"US","phone":"+1 (555) 567-8901"}'::jsonb,
    'card',
    now() - interval '2 days'
  ),
  (
    'ord-grp-9006',
    null,
    'priya.sharma@horizon.net',
    '{"fullName":"Priya Sharma","addressLine1":"240 Park Avenue S","city":"New York","state":"NY","postalCode":"10003","country":"US","phone":"+1 (555) 678-9012"}'::jsonb,
    'card',
    now() - interval '3 days'
  ),
  (
    'ord-grp-9007',
    null,
    'jordan.lee@creativemind.com',
    '{"fullName":"Jordan Lee","addressLine1":"88 Colin P Kelly Jr St","city":"San Francisco","state":"CA","postalCode":"94107","country":"US","phone":"+1 (555) 789-0123"}'::jsonb,
    'card',
    now() - interval '4 days'
  ),
  (
    'ord-grp-9008',
    null,
    'michael.brown@enterprise.co',
    '{"fullName":"Michael Brown","addressLine1":"350 5th Ave","city":"New York","state":"NY","postalCode":"10118","country":"US","phone":"+1 (555) 890-1234"}'::jsonb,
    'card',
    now() - interval '5 days'
  )
on conflict (id) do nothing;

-- Insert Sub-Orders for Apple Official Store (vendor-apple)
insert into public.sub_orders (
  id, order_group_id, seller_id, seller_name, seller_type, type,
  items, subtotal, shipping_fee, commission_rate, commission_amount,
  net_payout, status, rider_id, delivery_code, history, created_at
) values
  (
    'sub-ord-apple-101',
    'ord-grp-9001',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-1","productId":"prod-el-1","title":"Apple iPhone 16 Pro Max 256GB - Desert Titanium","price":1199.00,"quantity":1,"image":"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    1199.00,
    0.00,
    0.05,
    59.95,
    1139.05,
    'placed',
    null,
    '4921',
    '[{"status":"placed","timestamp":"2026-10-09T08:00:00Z","actor":"Customer","note":"Order placed by customer Sarah Jenkins"}]'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'sub-ord-apple-102',
    'ord-grp-9002',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-2","productId":"prod-aud-1","title":"Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)","price":249.00,"quantity":2,"image":"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    498.00,
    0.00,
    0.05,
    24.90,
    473.10,
    'confirmed',
    null,
    '7103',
    '[{"status":"placed","timestamp":"2026-10-09T04:00:00Z","actor":"Customer","note":"Order placed by customer Marcus Vance"},{"status":"confirmed","timestamp":"2026-10-09T05:30:00Z","actor":"Vendor","note":"Order accepted and inventory reserved by Apple Store"}]'::jsonb,
    now() - interval '6 hours'
  ),
  (
    'sub-ord-apple-103',
    'ord-grp-9003',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-3","productId":"prod-aud-2","title":"Apple AirPods Max Wireless Over-Ear Headphones - Midnight","price":549.00,"quantity":1,"image":"https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    549.00,
    0.00,
    0.05,
    27.45,
    521.55,
    'packed',
    null,
    '8834',
    '[{"status":"placed","timestamp":"2026-10-08T16:00:00Z","actor":"Customer","note":"Order placed by customer Elena Rostova"},{"status":"confirmed","timestamp":"2026-10-08T17:15:00Z","actor":"Vendor","note":"Order confirmed"},{"status":"packed","timestamp":"2026-10-08T19:00:00Z","actor":"Vendor","note":"Boxed with tamper-evident seal"}]'::jsonb,
    now() - interval '18 hours'
  ),
  (
    'sub-ord-apple-104',
    'ord-grp-9004',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-4","productId":"prod-el-3","title":"Apple iPad Pro 11\" M4 Ultra Retina Tandem OLED 256GB","price":999.00,"quantity":1,"image":"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    999.00,
    0.00,
    0.05,
    49.95,
    949.05,
    'ready_for_pickup',
    'rider-sam-1',
    '3219',
    '[{"status":"placed","timestamp":"2026-10-08T10:00:00Z","actor":"Customer","note":"Order placed by customer Alex Chen"},{"status":"confirmed","timestamp":"2026-10-08T11:00:00Z","actor":"Vendor","note":"Confirmed"},{"status":"packed","timestamp":"2026-10-08T13:30:00Z","actor":"Vendor","note":"Packed in warehouse"},{"status":"ready_for_pickup","timestamp":"2026-10-08T14:15:00Z","actor":"Vendor","note":"Staged at dispatch dock for collection"}]'::jsonb,
    now() - interval '1 day'
  ),
  (
    'sub-ord-apple-105',
    'ord-grp-9005',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-5","productId":"prod-el-2","title":"Apple MacBook Pro 14\" M3 Pro 512GB - Space Black","price":1999.00,"quantity":1,"image":"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    1999.00,
    0.00,
    0.05,
    99.95,
    1899.05,
    'delivered',
    'rider-sam-1',
    '9041',
    '[{"status":"placed","timestamp":"2026-10-07T09:00:00Z","actor":"Customer","note":"Order placed by customer David Miller"},{"status":"confirmed","timestamp":"2026-10-07T10:00:00Z","actor":"Vendor","note":"Confirmed"},{"status":"packed","timestamp":"2026-10-07T11:30:00Z","actor":"Vendor","note":"Packed"},{"status":"ready_for_pickup","timestamp":"2026-10-07T13:00:00Z","actor":"Vendor","note":"Collected by courier"},{"status":"delivered","timestamp":"2026-10-07T17:45:00Z","actor":"Rider","note":"Delivered with customer signature"}]'::jsonb,
    now() - interval '2 days'
  ),
  (
    'sub-ord-apple-106',
    'ord-grp-9006',
    'vendor-apple',
    'Apple Official Store',
    'vendor',
    'physical',
    '[{"id":"item-ap-6","productId":"prod-el-1","title":"Apple iPhone 16 Pro Max 256GB - Desert Titanium","price":1199.00,"quantity":1,"image":"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"},{"id":"item-ap-7","productId":"prod-aud-1","title":"Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)","price":249.00,"quantity":1,"image":"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-apple","sellerName":"Apple Official Store"}]'::jsonb,
    1448.00,
    0.00,
    0.05,
    72.40,
    1375.60,
    'delivered',
    'rider-sam-1',
    '6492',
    '[{"status":"placed","timestamp":"2026-10-06T11:00:00Z","actor":"Customer","note":"Order placed by customer Priya Sharma"},{"status":"delivered","timestamp":"2026-10-06T18:20:00Z","actor":"Rider","note":"Delivered"}]'::jsonb,
    now() - interval '3 days'
  )
on conflict (id) do update set
  status = excluded.status,
  items = excluded.items,
  subtotal = excluded.subtotal,
  net_payout = excluded.net_payout;

-- Insert Sub-Orders for Samsung Flagship Store (vendor-samsung)
insert into public.sub_orders (
  id, order_group_id, seller_id, seller_name, seller_type, type,
  items, subtotal, shipping_fee, commission_rate, commission_amount,
  net_payout, status, rider_id, delivery_code, history, created_at
) values
  (
    'sub-ord-samsung-201',
    'ord-grp-9001',
    'vendor-samsung',
    'Samsung Flagship Store',
    'vendor',
    'physical',
    '[{"id":"item-sm-1","productId":"prod-el-4","title":"Samsung Galaxy S25 Ultra 512GB - Titanium Gray","price":1299.00,"quantity":1,"image":"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-samsung","sellerName":"Samsung Flagship Store"}]'::jsonb,
    1299.00,
    0.00,
    0.06,
    77.94,
    1221.06,
    'placed',
    null,
    '5109',
    '[{"status":"placed","timestamp":"2026-10-09T08:00:00Z","actor":"Customer","note":"Order placed by customer Sarah Jenkins"}]'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'sub-ord-samsung-202',
    'ord-grp-9004',
    'vendor-samsung',
    'Samsung Flagship Store',
    'vendor',
    'physical',
    '[{"id":"item-sm-2","productId":"prod-el-6","title":"Samsung 32\" Odyssey OLED G8 4K UHD 240Hz Gaming Monitor","price":1199.00,"quantity":1,"image":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-samsung","sellerName":"Samsung Flagship Store"}]'::jsonb,
    1199.00,
    0.00,
    0.06,
    71.94,
    1127.06,
    'delivered',
    'rider-sam-1',
    '8310',
    '[{"status":"placed","timestamp":"2026-10-08T10:00:00Z","actor":"Customer","note":"Order placed by customer Alex Chen"},{"status":"delivered","timestamp":"2026-10-08T18:00:00Z","actor":"Rider","note":"Delivered safely"}]'::jsonb,
    now() - interval '1 day'
  )
on conflict (id) do update set
  status = excluded.status;

-- Insert Sub-Orders for Sony Official Store (vendor-sony)
insert into public.sub_orders (
  id, order_group_id, seller_id, seller_name, seller_type, type,
  items, subtotal, shipping_fee, commission_rate, commission_amount,
  net_payout, status, rider_id, delivery_code, history, created_at
) values
  (
    'sub-ord-sony-301',
    'ord-grp-9002',
    'vendor-sony',
    'Sony Official Store',
    'vendor',
    'physical',
    '[{"id":"item-sn-1","productId":"prod-aud-3","title":"Sony WH-1000XM5 Wireless Noise Canceling Headphones - Silver","price":399.00,"quantity":1,"image":"https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-sony","sellerName":"Sony Official Store"}]'::jsonb,
    399.00,
    0.00,
    0.06,
    23.94,
    375.06,
    'confirmed',
    null,
    '9214',
    '[{"status":"placed","timestamp":"2026-10-09T04:00:00Z","actor":"Customer","note":"Order placed by customer Marcus Vance"},{"status":"confirmed","timestamp":"2026-10-09T05:00:00Z","actor":"Vendor","note":"Order confirmed by Sony Store"}]'::jsonb,
    now() - interval '6 hours'
  ),
  (
    'sub-ord-sony-302',
    'ord-grp-9007',
    'vendor-sony',
    'Sony Official Store',
    'vendor',
    'physical',
    '[{"id":"item-sn-2","productId":"prod-aud-4","title":"Sony WF-1000XM5 True Wireless Noise Canceling Earbuds","price":299.00,"quantity":1,"image":"https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-sony","sellerName":"Sony Official Store"}]'::jsonb,
    299.00,
    0.00,
    0.06,
    17.94,
    281.06,
    'delivered',
    'rider-sam-1',
    '4491',
    '[{"status":"placed","timestamp":"2026-10-05T09:00:00Z","actor":"Customer","note":"Order placed by Jordan Lee"},{"status":"delivered","timestamp":"2026-10-05T15:30:00Z","actor":"Rider","note":"Delivered"}]'::jsonb,
    now() - interval '4 days'
  )
on conflict (id) do update set
  status = excluded.status;

-- Insert Sub-Orders for Ronin Official Store (vendor-ronin)
insert into public.sub_orders (
  id, order_group_id, seller_id, seller_name, seller_type, type,
  items, subtotal, shipping_fee, commission_rate, commission_amount,
  net_payout, status, rider_id, delivery_code, history, created_at
) values
  (
    'sub-ord-ronin-401',
    'ord-grp-9003',
    'vendor-ronin',
    'Ronin Official Store',
    'vendor',
    'physical',
    '[{"id":"item-rn-1","productId":"prod-el-7","title":"Ronin R-970 65W GaN Fast Charger with Dual Type-C & USB-A","price":28.00,"quantity":2,"image":"https://images.unsplash.com/photo-1622445268045-81648a58a7d3?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-ronin","sellerName":"Ronin Official Store"}]'::jsonb,
    56.00,
    2.50,
    0.08,
    4.48,
    51.52,
    'packed',
    null,
    '7392',
    '[{"status":"placed","timestamp":"2026-10-08T16:00:00Z","actor":"Customer","note":"Order placed by Elena Rostova"},{"status":"packed","timestamp":"2026-10-08T18:00:00Z","actor":"Vendor","note":"Packed in Ronin bubble mailer"}]'::jsonb,
    now() - interval '18 hours'
  ),
  (
    'sub-ord-ronin-402',
    'ord-grp-9008',
    'vendor-ronin',
    'Ronin Official Store',
    'vendor',
    'physical',
    '[{"id":"item-rn-2","productId":"prod-el-8","title":"Ronin R-88 20000mAh 22.5W PD Fast Charging Power Bank","price":32.00,"quantity":1,"image":"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1000&q=80","sellerId":"vendor-ronin","sellerName":"Ronin Official Store"}]'::jsonb,
    32.00,
    2.50,
    0.08,
    2.56,
    29.44,
    'delivered',
    'rider-sam-1',
    '1029',
    '[{"status":"placed","timestamp":"2026-10-04T10:00:00Z","actor":"Customer","note":"Order placed by Michael Brown"},{"status":"delivered","timestamp":"2026-10-04T16:00:00Z","actor":"Rider","note":"Delivered"}]'::jsonb,
    now() - interval '5 days'
  )
on conflict (id) do update set
  status = excluded.status;

-- ------------------------------------------------------------------------------
-- 3. Seed Verified Reviews for Store Products
-- ------------------------------------------------------------------------------
insert into public.reviews (
  id, product_id, author_id, author_name, author_avatar, author_country,
  verified_purchase, order_number, rating, headline, body, helpful_count, created_at
) values
  (
    'rev-ap-1',
    'prod-el-1',
    null,
    'Sarah J.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    'US',
    true,
    'ORD-9001',
    5.0,
    'Unbelievable battery life and camera speed',
    'The Desert Titanium finish is gorgeous in person. Upgraded from 13 Pro and the speed difference in photo processing is night and day.',
    42,
    now() - interval '2 days'
  ),
  (
    'rev-ap-2',
    'prod-aud-1',
    null,
    'Marcus V.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
    'US',
    true,
    'ORD-9002',
    5.0,
    'USB-C case is finally here, ANC is phenomenal',
    'Noise cancellation on flights and the subway is miraculous. Seamless handoff between my Mac and iPhone.',
    28,
    now() - interval '3 days'
  ),
  (
    'rev-ap-3',
    'prod-el-2',
    null,
    'David M.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    'US',
    true,
    'ORD-9005',
    5.0,
    'Space Black M3 Pro is an absolute powerhouse',
    'Compiles our large microservice codebases in seconds. The Liquid Retina XDR screen with ProMotion is breathtaking.',
    65,
    now() - interval '4 days'
  )
on conflict (id) do nothing;
