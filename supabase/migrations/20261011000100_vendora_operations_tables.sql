-- ============================================================================
-- Vendora 0002: Operations tables (disputes, deliveries, payouts, promotions,
-- messaging, notifications, CMS, applications, settings, audit)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rider profiles
-- ----------------------------------------------------------------------------
create table public.rider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null unique,
  full_name text not null default '',
  phone text default '',
  vehicle_type text default 'Motorcycle',
  status public.rider_availability not null default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_rider_profiles_updated before update on public.rider_profiles
  for each row execute function public.set_updated_at();

-- FK now that rider_profiles exists.
alter table public.sub_orders
  add constraint sub_orders_rider_fkey foreign key (rider_id)
  references public.rider_profiles(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Deliveries
-- ----------------------------------------------------------------------------
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid not null unique references public.sub_orders(id) on delete cascade,
  rider_id uuid references public.rider_profiles(id) on delete set null,
  status public.delivery_status not null default 'pending',
  pickup_details jsonb not null default '{}'::jsonb,
  dropoff_details jsonb not null default '{}'::jsonb,
  handover_code_hash text,
  proof_of_delivery jsonb,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliveries_rider_idx on public.deliveries (rider_id);
create index deliveries_status_idx on public.deliveries (status);

create trigger trg_deliveries_updated before update on public.deliveries
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Disputes + messages
-- ----------------------------------------------------------------------------
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid references public.sub_orders(id) on delete set null,
  order_group_id uuid references public.orders(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null default '',
  customer_avatar text,
  vendor_id uuid references public.vendor_profiles(id) on delete set null,
  vendor_name text not null default '',
  reason text not null default '',
  status public.dispute_status not null default 'open',
  urgency public.dispute_urgency not null default 'standard',
  assigned_agent_id uuid references auth.users(id) on delete set null,
  resolution_note text,
  resolution_amount numeric(12,2),
  evidence_photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index disputes_status_idx on public.disputes (status);
create index disputes_vendor_idx on public.disputes (vendor_id);
create index disputes_customer_idx on public.disputes (customer_id);

create trigger trg_disputes_updated before update on public.disputes
  for each row execute function public.set_updated_at();

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role public.message_sender_role not null,
  sender_name text not null default '',
  sender_avatar text,
  content text not null default '',
  is_internal_note boolean not null default false,
  attachments text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index dispute_messages_dispute_idx on public.dispute_messages (dispute_id);

-- ----------------------------------------------------------------------------
-- Vendor payouts + bank accounts
-- ----------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  status public.payout_status not null default 'processing',
  payment_method text not null default 'ACH Instant Direct Transfer',
  payment_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payouts_vendor_idx on public.payouts (vendor_id);

create trigger trg_payouts_updated before update on public.payouts
  for each row execute function public.set_updated_at();

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  holder_name text not null,
  bank_name text not null,
  masked_account text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vendor_id, masked_account)
);

-- ----------------------------------------------------------------------------
-- Promotions
-- ----------------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendor_profiles(id) on delete cascade,
  code text not null unique,
  title text not null default '',
  description text not null default '',
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  usage_limit integer not null default 1000,
  usage_count integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_promotions_updated before update on public.promotions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Messaging (customer <-> vendor threads)
-- ----------------------------------------------------------------------------
create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null default '',
  channel public.thread_channel not null default 'order_inquiry',
  order_ref text,
  product_ref text,
  status public.thread_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index message_threads_vendor_idx on public.message_threads (vendor_id);

create trigger trg_message_threads_updated before update on public.message_threads
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role public.message_sender_role not null,
  sender_name text not null default '',
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (thread_id);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role_target text not null default 'all',
  type public.notification_type not null default 'system',
  title text not null default '',
  message text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id);

-- ----------------------------------------------------------------------------
-- CMS content blocks
-- ----------------------------------------------------------------------------
create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  body jsonb not null default '{}'::jsonb,
  placement text not null default 'homepage_hero',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_content_blocks_updated before update on public.content_blocks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Vendor applications (seller onboarding)
-- ----------------------------------------------------------------------------
create table public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  proposed_store_name text not null,
  proposed_slug text not null,
  description text not null default '',
  business_type text not null default 'General Retail',
  contact_email text not null default '',
  contact_phone text,
  business_address jsonb,
  kyc_documents jsonb,
  policy_accepted boolean not null default false,
  status public.application_status not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_vendor_applications_updated before update on public.vendor_applications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Platform settings (commission etc., singleton row)
-- ----------------------------------------------------------------------------
create table public.commission_config (
  id boolean primary key default true check (id),
  global_default_rate numeric(4,3) not null default 0.10,
  category_overrides jsonb not null default '{}'::jsonb,
  vendor_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.commission_config (id) values (true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Audit logs
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text not null default 'System',
  action text not null,
  entity_type text,
  entity_id text,
  ip_address text default '127.0.0.1',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
