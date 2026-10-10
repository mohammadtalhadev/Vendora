-- ============================================================================
-- Vendora 0001: Extensions, enums, helpers, identity + catalog + commerce core
-- Single source of truth for the database schema. Replaces all ad-hoc SQL files.
-- Idempotent where practical; designed to be applied on a clean (reset) database.
-- ============================================================================

-- pgcrypto lives in the Supabase-conventional `extensions` schema.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
-- Every Supabase platform role needs USAGE here. `supabase_auth_admin` runs
-- GoTrue's DB-side crypto: if `extensions` is re-created without that grant
-- (as happens on `db reset`), password sign-in fails with an opaque
-- "Database error querying schema" 500. Roles are conditional so the same
-- migration also applies to a vanilla Postgres (PGlite) instance.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'authenticator', 'supabase_auth_admin'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant usage on schema extensions to %I', r);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('customer','vendor','admin','support','rider');
create type public.vendor_status as enum ('none','pending','approved','rejected','suspended');
create type public.seller_type as enum ('platform','vendor');
create type public.product_type as enum ('physical','digital');
create type public.moderation_status as enum ('draft','pending_review','approved','rejected','archived');
create type public.vendor_state as enum ('active','suspended');
create type public.sub_order_status as enum (
  'placed','confirmed','packed','ready_for_pickup','shipped','out_for_delivery','delivered',
  'cancelled','delivery_failed','return_requested','return_approved','refunded',
  'paid','available'
);
create type public.payment_method as enum ('card','cod');
create type public.payment_status as enum ('pending','succeeded','failed','refunded');
create type public.dispute_status as enum ('open','under_review','escalated','resolved_refund','resolved_denied');
create type public.dispute_urgency as enum ('standard','urgent');
create type public.delivery_status as enum ('pending','assigned','picked_up','in_transit','out_for_delivery','delivered','failed');
create type public.rider_availability as enum ('available','busy','offline');
create type public.payout_status as enum ('processing','completed','failed');
create type public.thread_channel as enum ('order_inquiry','return_rma','product_question','dispute');
create type public.thread_status as enum ('open','pending','urgent','resolved','escalated');
create type public.message_sender_role as enum ('customer','vendor','support');
create type public.notification_type as enum ('order_status','system','promotion','payout','dispute','review','security');
create type public.application_status as enum ('pending','under_review','approved','rejected');

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text default '',
  roles public.user_role[] not null default array['customer'::public.user_role],
  vendor_status public.vendor_status not null default 'none',
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- vendor_profiles (includes the synthetic 'platform' seller row)
-- ----------------------------------------------------------------------------
create table public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null unique,
  store_name text not null,
  slug text not null unique,
  description text default '',
  logo text default '',
  banner text default '',
  rating numeric(2,1) not null default 5.0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  commission_rate_override numeric(4,3),
  status public.vendor_state not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_vendor_profiles_updated before update on public.vendor_profiles
  for each row execute function public.set_updated_at();

-- Identity helpers. Declared after profiles / vendor_profiles because SQL-language
-- function bodies are analyzed at creation time.
-- SECURITY DEFINER: policy checks on profiles must not recurse through RLS.
create or replace function public.has_role(check_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.roles @> array[check_role]::public.user_role[]
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin'::public.user_role);
$$;

-- Vendor account -> its vendor_profiles.id (NULL when not a vendor).
create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vp.id
  from public.vendor_profiles vp
  where vp.user_id = auth.uid()
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  image text,
  commission_rate_override numeric(4,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  brand text not null default '',
  images text[] not null default '{}',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  type public.product_type not null default 'physical',
  seller_id uuid not null references public.vendor_profiles(id) on delete restrict,
  variants jsonb not null default '[]'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  shipping_settings jsonb not null default '{}'::jsonb,
  digital_asset_info jsonb not null default '{}'::jsonb,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  status public.moderation_status not null default 'pending_review',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector
);

-- Kept in a trigger rather than a generated column: the textsearch expression
-- needs stable functions (concat_ws / array_to_string), which generated columns reject.
create or replace function public.build_product_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector := to_tsvector('english', concat_ws(
    ' ',
    coalesce(new.title, ''),
    coalesce(new.brand, ''),
    coalesce(new.description, ''),
    coalesce(array_to_string(new.images, ' '), '')
  ));
  return new;
end;
$$;

create trigger trg_products_search
  before insert or update on public.products
  for each row execute function public.build_product_search_vector();

create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);
create index products_seller_idx on public.products (seller_id);
create index products_price_idx on public.products (price);
create index products_search_idx on public.products using gin (search_vector);

create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- orders (group) + sub_orders (per-seller)
-- ----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text not null default '',
  shipping_address jsonb not null default '{}'::jsonb,
  payment_method public.payment_method not null default 'card',
  payment_details jsonb not null default '{"brand":"Visa","last4":"4242"}'::jsonb,
  payment_status public.payment_status not null default 'succeeded',
  created_at timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id);

create table public.sub_orders (
  id uuid primary key default gen_random_uuid(),
  order_group_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.vendor_profiles(id) on delete restrict,
  type public.product_type not null default 'physical',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  commission_rate numeric(4,3) not null default 0.1,
  commission_amount numeric(12,2) not null default 0,
  net_payout numeric(12,2) not null default 0,
  status public.sub_order_status not null default 'placed',
  rider_id uuid,
  delivery_code_hash text,
  license_key text,
  history jsonb not null default '[]'::jsonb,
  return_reason text,
  carrier_name text,
  tracking_number text,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sub_orders_group_idx on public.sub_orders (order_group_id);
create index sub_orders_seller_idx on public.sub_orders (seller_id);
create index sub_orders_status_idx on public.sub_orders (status);

create trigger trg_sub_orders_updated before update on public.sub_orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- reviews (+ product rating rollup trigger)
-- ----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  author_avatar text default '',
  author_country text default 'US',
  verified_purchase boolean not null default true,
  order_number text,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  headline text not null default '',
  body text not null default '',
  photos text[] not null default '{}',
  helpful_count integer not null default 0,
  seller_reply jsonb,
  created_at timestamptz not null default now()
);

create index reviews_product_idx on public.reviews (product_id);
create unique index reviews_one_per_customer_per_product
  on public.reviews (product_id, author_id) where author_id is not null;

create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p
  set rating = coalesce(agg.avg_rating, 0),
      review_count = coalesce(agg.cnt, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
    from public.reviews where product_id = pid
  ) agg
  where p.id = pid;
  return coalesce(new, old);
end;
$$;

create trigger trg_reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ----------------------------------------------------------------------------
-- cart_items + wishlist_items (cross-device sync, scoped to owner)
-- ----------------------------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id text,
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant_id)
);

create trigger trg_cart_items_updated before update on public.cart_items
  for each row execute function public.set_updated_at();

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
