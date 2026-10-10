-- ==============================================================================
-- Vendora E-Commerce Marketplace - Initial Supabase Schema
-- Includes Tables, Enums, Row Level Security (RLS), Triggers & Initial Seed Data
-- ==============================================================================

-- 1. Profiles Table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_url text default '',
  roles text[] default array['customer']::text[],
  vendor_status text default 'none',
  vendor_id text,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text,
  image text,
  commission_rate_override numeric,
  created_at timestamptz default now()
);

-- 3. Vendor Profiles Table
create table if not exists public.vendor_profiles (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  store_name text not null,
  slug text not null unique,
  description text default '',
  logo text default '',
  banner text default '',
  rating numeric default 5.0,
  review_count integer default 0,
  commission_rate_override numeric,
  status text default 'active',
  created_at timestamptz default now()
);

-- 4. Products Table
create table if not exists public.products (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text default '',
  category_id text references public.categories(id) on delete set null,
  brand text default '',
  images text[] default array[]::text[],
  price numeric not null,
  compare_at_price numeric,
  type text not null default 'physical' check (type in ('physical', 'digital')),
  seller_id text not null,
  seller_name text not null,
  seller_type text not null default 'platform' check (seller_type in ('platform', 'vendor')),
  variants jsonb default '[]'::jsonb,
  stock integer not null default 0,
  shipping_settings jsonb default '{}'::jsonb,
  digital_asset_info jsonb default '{}'::jsonb,
  rating numeric default 0,
  review_count integer default 0,
  status text not null default 'approved' check (status in ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  rejection_reason text,
  created_at timestamptz default now()
);

-- 5. Orders Table
create table if not exists public.orders (
  id text primary key,
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  shipping_address jsonb,
  payment_method text not null default 'card',
  created_at timestamptz default now()
);

-- 6. Split Sub-Orders Table
create table if not exists public.sub_orders (
  id text primary key,
  order_group_id text references public.orders(id) on delete cascade,
  seller_id text not null,
  seller_name text not null,
  seller_type text not null default 'platform',
  type text not null default 'physical',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  shipping_fee numeric not null default 0,
  commission_rate numeric not null default 0,
  commission_amount numeric not null default 0,
  net_payout numeric not null default 0,
  status text not null default 'placed',
  rider_id text,
  delivery_code text,
  license_key text,
  history jsonb default '[]'::jsonb,
  return_reason text,
  created_at timestamptz default now()
);

-- 7. Reviews Table
create table if not exists public.reviews (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_avatar text,
  author_country text default 'US',
  verified_purchase boolean default true,
  order_number text,
  rating numeric not null check (rating >= 1 and rating <= 5),
  headline text not null,
  body text not null,
  photos text[] default array[]::text[],
  helpful_count integer default 0,
  seller_reply jsonb,
  created_at timestamptz default now()
);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.sub_orders enable row level security;
alter table public.reviews enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Admin can view ALL profiles
create policy "Admins can view all profiles" on public.profiles
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any profile (change roles, vendor status, etc)
create policy "Admins can update all profiles" on public.profiles
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Categories Policies (Public read)
create policy "Categories are viewable by all" on public.categories
  for select using (true);

-- Admin can manage categories
create policy "Admins can insert categories" on public.categories
  for insert to authenticated
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

create policy "Admins can update categories" on public.categories
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

create policy "Admins can delete categories" on public.categories
  for delete to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Vendor Profiles Policies (Public read for active vendors)
create policy "Active vendor profiles are viewable by all" on public.vendor_profiles
  for select using (status = 'active');

create policy "Vendors can update own profile" on public.vendor_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Admin can view ALL vendor profiles (including pending/suspended)
create policy "Admins can view all vendor profiles" on public.vendor_profiles
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any vendor profile (approve/suspend/etc)
create policy "Admins can update all vendor profiles" on public.vendor_profiles
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can insert vendor profiles
create policy "Admins can insert vendor profiles" on public.vendor_profiles
  for insert to authenticated
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Products Policies
create policy "Approved products are viewable by all" on public.products
  for select using (status = 'approved');

create policy "Vendors can view their products" on public.products
  for select to authenticated
  using (seller_id = (select vendor_id from public.profiles where id = auth.uid()));

create policy "Vendors can create products" on public.products
  for insert to authenticated
  with check (seller_id = (select vendor_id from public.profiles where id = auth.uid()));

create policy "Vendors can update their products" on public.products
  for update to authenticated
  using (seller_id = (select vendor_id from public.profiles where id = auth.uid()))
  with check (seller_id = (select vendor_id from public.profiles where id = auth.uid()));

-- Admin can view ALL products (including draft/pending/rejected)
create policy "Admins can view all products" on public.products
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any product (moderate, change status, etc)
create policy "Admins can update all products" on public.products
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can insert products (for platform-owned products)
create policy "Admins can insert products" on public.products
  for insert to authenticated
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can delete products
create policy "Admins can delete products" on public.products
  for delete to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Orders Policies
create policy "Customers can view their orders" on public.orders
  for select to authenticated
  using ((select auth.uid()) = customer_id);

create policy "Customers can insert their orders" on public.orders
  for insert to authenticated
  with check ((select auth.uid()) = customer_id);

-- Admin can view ALL orders (for admin dashboard)
create policy "Admins can view all orders" on public.orders
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any order (for admin actions)
create policy "Admins can update all orders" on public.orders
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Sub-orders Policies
create policy "Authenticated users can view orders" on public.sub_orders
  for select to authenticated
  using (true);

-- Admin can view ALL sub-orders (for admin dashboard)
create policy "Admins can view all sub_orders" on public.sub_orders
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any sub-order (for admin actions like status changes)
create policy "Admins can update all sub_orders" on public.sub_orders
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can insert sub-orders (for admin creating orders on behalf of customers)
create policy "Admins can insert sub_orders" on public.sub_orders
  for insert to authenticated
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Reviews Policies
create policy "Reviews viewable by all" on public.reviews
  for select using (true);

create policy "Authenticated users can create reviews" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = author_id);

-- Admin can view ALL reviews
create policy "Admins can view all reviews" on public.reviews
  for select to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can update any review (moderate)
create policy "Admins can update all reviews" on public.reviews
  for update to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  )
  with check (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- Admin can delete reviews
create policy "Admins can delete reviews" on public.reviews
  for delete to authenticated
  using (
    'admin' = any(select roles from public.profiles where id = auth.uid())
  );

-- ==============================================================================
-- Auto-create profile trigger on auth.users sign up
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, roles, vendor_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    array['customer']::text[],
    'none'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- Initial Seed Data: Categories
-- ==============================================================================
insert into public.categories (id, name, slug, image, commission_rate_override) values
  ('cat-electronics', 'Electronics', 'electronics', '/images/categories/cat_electronics_2k.png', null),
  ('cat-audio', 'Audio & Wearables', 'audio-wearables', '/images/categories/cat_audio_wearables_2k.png', null),
  ('cat-cameras', 'Cameras & Photo', 'cameras-photo', '/images/categories/cat_cameras_photo_2k.png', null),
  ('cat-fashion', 'Fashion', 'fashion', '/images/categories/cat_fashion_2k.png', null),
  ('cat-shoes', 'Shoes', 'shoes', '/images/categories/cat_shoes_2k.png', null),
  ('cat-bags', 'Bags & Luggage', 'bags-luggage', '/images/categories/cat_bags_luggage_2k.png', null),
  ('cat-jewelry', 'Jewelry & Watches', 'jewelry-watches', '/images/categories/cat_jewelry_watches_2k.png', null),
  ('cat-beauty', 'Beauty & Personal Care', 'beauty-personal-care', '/images/categories/cat_beauty_personalcare_2k.png', null),
  ('cat-home', 'Home & Kitchen', 'home-kitchen', '/images/categories/cat_home_kitchen_2k.png', null),
  ('cat-kids', 'Kids & Baby', 'kids-baby', '/images/categories/cat_kids_baby_2k.png', null),
  ('cat-sports', 'Sports & Outdoors', 'sports-outdoors', '/images/categories/cat_sports_outdoors_2k.png', null),
  ('cat-digital', 'Digital Products', 'digital-products', '/images/categories/cat_digital_products_2k.png', 0.15)
on conflict (id) do nothing;
