-- ============================================================================
-- Vendora 0003: Row Level Security — real policies on every table.
-- Principle: least privilege. Customers see their own data; vendors see their
-- store's data; staff roles (admin/support/rider) see what their job needs.
-- Trust-critical writes go through SECURITY DEFINER RPCs (migration 0004).
-- ============================================================================

-- Helper: does a review belong to the current vendor's store?
create or replace function public.owns_review(r uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews rv
    join public.products p on p.id = rv.product_id
    where rv.id = r
      and p.seller_id = public.current_vendor_id()
  );
$$;

-- Helper: is current auth user a participant of the dispute?
create or replace function public.is_dispute_party(d uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.disputes ds
    where ds.id = d
      and (ds.customer_id = auth.uid() or ds.vendor_id = public.current_vendor_id())
  );
$$;

create or replace function public.is_thread_participant(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.message_threads mt
    where mt.id = t
      and (mt.customer_id = auth.uid() or mt.vendor_id = public.current_vendor_id())
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

-- Users may edit their own profile but may NEVER change roles/vendor linkage;
-- those columns are only writable by admins.
-- A qualified subquery here reads the row as of statement start, i.e. the OLD value;
-- an unqualified reference in WITH CHECK is the NEW value (and comparing a reference
-- to the table's own columns would be trivially true).
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and roles = (select old_p.roles from public.profiles old_p where old_p.id = profiles.id)
  );

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- vendor_profiles
-- ----------------------------------------------------------------------------
alter table public.vendor_profiles enable row level security;

create policy vendor_profiles_select_public on public.vendor_profiles
  for select using (status = 'active');

create policy vendor_profiles_select_owner on public.vendor_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy vendor_profiles_select_admin on public.vendor_profiles
  for select to authenticated
  using (public.is_admin());

create policy vendor_profiles_insert_admin on public.vendor_profiles
  for insert to authenticated
  with check (public.is_admin());

create policy vendor_profiles_update_owner on public.vendor_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    -- status and commission are admin-controlled (subquery reads the OLD row)
    and status = (select old_vp.status from public.vendor_profiles old_vp where old_vp.id = vendor_profiles.id)
    and commission_rate_override is not distinct from (select old_vp.commission_rate_override from public.vendor_profiles old_vp where old_vp.id = vendor_profiles.id)
  );

create policy vendor_profiles_update_admin on public.vendor_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;

create policy categories_select_public on public.categories
  for select using (true);

create policy categories_write_admin on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;

create policy products_select_approved on public.products
  for select using (status = 'approved');

create policy products_select_owner on public.products
  for select to authenticated
  using (seller_id = public.current_vendor_id());

create policy products_select_admin on public.products
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

-- Vendors may list products for their own store only, and may not self-approve:
-- new rows must be pending_review/draft and rating/review_count start at 0.
create policy products_insert_vendor on public.products
  for insert to authenticated
  with check (
    seller_id = public.current_vendor_id()
    and status in ('draft','pending_review')
    and rating = 0
    and review_count = 0
  );

create policy products_insert_admin on public.products
  for insert to authenticated
  with check (public.is_admin());

-- Vendors may edit their own products but cannot touch moderation/rollup columns.
create policy products_update_vendor on public.products
  for update to authenticated
  using (seller_id = public.current_vendor_id())
  with check (
    seller_id = public.current_vendor_id()
    -- moderation status and rating rollups are not vendor-writable
    -- (each subquery reads the pre-update row)
    and status = (select old_p.status from public.products old_p where old_p.id = products.id)
    and rating = (select old_p.rating from public.products old_p where old_p.id = products.id)
    and review_count = (select old_p.review_count from public.products old_p where old_p.id = products.id)
  );

create policy products_update_admin on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy products_delete_admin on public.products
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- orders / sub_orders
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;

create policy orders_select_own on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy orders_select_staff on public.orders
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

-- Direct inserts disabled; orders are created by the place_order RPC.
-- (No insert policy => denied for anon/authenticated; RPC is SECURITY DEFINER.)

create policy orders_update_admin on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.sub_orders enable row level security;

create policy sub_orders_select_own_order on public.sub_orders
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = sub_orders.order_group_id
        and o.customer_id = (select auth.uid())
    )
  );

create policy sub_orders_select_vendor on public.sub_orders
  for select to authenticated
  using (seller_id = public.current_vendor_id());

create policy sub_orders_select_staff on public.sub_orders
  for select to authenticated
  using (
    public.has_role('admin') or public.has_role('support') or public.has_role('rider')
  );

-- Writes go through advance_sub_order_status / place_order RPCs only.

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy reviews_select_public on public.reviews
  for select using (true);

create policy reviews_insert_self on public.reviews
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Anyone may bump helpful_count, but only if every other column is unchanged.
-- Each subquery reads the OLD row (statement snapshot); unqualified refs are NEW.
create policy reviews_update_helpful on public.reviews
  for update to authenticated
  using (true)
  with check (
    author_id = (select old_r.author_id from public.reviews old_r where old_r.id = reviews.id)
    and product_id = (select old_r.product_id from public.reviews old_r where old_r.id = reviews.id)
    and rating = (select old_r.rating from public.reviews old_r where old_r.id = reviews.id)
    and headline = (select old_r.headline from public.reviews old_r where old_r.id = reviews.id)
    and body = (select old_r.body from public.reviews old_r where old_r.id = reviews.id)
    and photos = (select old_r.photos from public.reviews old_r where old_r.id = reviews.id)
    and seller_reply is not distinct from (select old_r.seller_reply from public.reviews old_r where old_r.id = reviews.id)
  );

-- A vendor may only set the seller_reply on reviews of their own products.
create policy reviews_update_vendor_reply on public.reviews
  for update to authenticated
  using (public.owns_review(id))
  with check (
    public.owns_review(id)
    and author_id = (select old_r.author_id from public.reviews old_r where old_r.id = reviews.id)
    and product_id = (select old_r.product_id from public.reviews old_r where old_r.id = reviews.id)
    and rating = (select old_r.rating from public.reviews old_r where old_r.id = reviews.id)
    and headline = (select old_r.headline from public.reviews old_r where old_r.id = reviews.id)
    and body = (select old_r.body from public.reviews old_r where old_r.id = reviews.id)
    and photos = (select old_r.photos from public.reviews old_r where old_r.id = reviews.id)
    and helpful_count = (select old_r.helpful_count from public.reviews old_r where old_r.id = reviews.id)
  );

create policy reviews_delete_admin on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- cart / wishlist
-- ----------------------------------------------------------------------------
alter table public.cart_items enable row level security;

create policy cart_own_all on public.cart_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.wishlist_items enable row level security;

create policy wishlist_own_all on public.wishlist_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- disputes + dispute_messages
-- ----------------------------------------------------------------------------
alter table public.disputes enable row level security;

create policy disputes_select_party on public.disputes
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or vendor_id = public.current_vendor_id()
  );

create policy disputes_select_staff on public.disputes
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy disputes_insert_customer on public.disputes
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and status in ('open','under_review')
  );

create policy disputes_update_staff on public.disputes
  for update to authenticated
  using (public.has_role('admin') or public.has_role('support'))
  with check (public.has_role('admin') or public.has_role('support'));

alter table public.dispute_messages enable row level security;

create policy dispute_messages_select_party on public.dispute_messages
  for select to authenticated
  using (
    public.is_dispute_party(dispute_id)
    or public.has_role('admin')
    or public.has_role('support')
  );

create policy dispute_messages_insert on public.dispute_messages
  for insert to authenticated
  with check (
    public.is_dispute_party(dispute_id)
    and (sender_role = 'support' or sender_id = (select auth.uid()) or sender_id is null)
  );

-- ----------------------------------------------------------------------------
-- deliveries / rider_profiles
-- ----------------------------------------------------------------------------
alter table public.deliveries enable row level security;

create policy deliveries_select_rider on public.deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = deliveries.rider_id and rp.user_id = (select auth.uid())
    )
  );

create policy deliveries_select_staff on public.deliveries
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy deliveries_update_rider on public.deliveries
  for update to authenticated
  using (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = deliveries.rider_id and rp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = deliveries.rider_id and rp.user_id = (select auth.uid())
    )
  );

create policy deliveries_write_admin on public.deliveries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.rider_profiles enable row level security;

create policy riders_select_self on public.rider_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy riders_select_staff on public.rider_profiles
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy riders_update_self on public.rider_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy riders_write_admin on public.rider_profiles
  for insert to authenticated
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- payouts / bank_accounts / promotions
-- ----------------------------------------------------------------------------
alter table public.payouts enable row level security;

create policy payouts_select_vendor on public.payouts
  for select to authenticated
  using (vendor_id = public.current_vendor_id());

create policy payouts_select_admin on public.payouts
  for select to authenticated
  using (public.is_admin());

create policy payouts_write_admin on public.payouts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.bank_accounts enable row level security;

create policy bank_select_vendor on public.bank_accounts
  for select to authenticated
  using (vendor_id = public.current_vendor_id());

create policy bank_insert_vendor on public.bank_accounts
  for insert to authenticated
  with check (vendor_id = public.current_vendor_id());

create policy bank_update_vendor on public.bank_accounts
  for update to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

create policy bank_delete_vendor on public.bank_accounts
  for delete to authenticated
  using (vendor_id = public.current_vendor_id());

create policy bank_write_admin on public.bank_accounts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.promotions enable row level security;

create policy promos_select_public on public.promotions
  for select using (active);

create policy promos_select_vendor on public.promotions
  for select to authenticated
  using (vendor_id = public.current_vendor_id() or vendor_id is null);

create policy promos_insert_vendor on public.promotions
  for insert to authenticated
  with check (vendor_id = public.current_vendor_id());

create policy promos_insert_admin on public.promotions
  for insert to authenticated
  with check (public.is_admin());

create policy promos_update_vendor on public.promotions
  for update to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

create policy promos_update_admin on public.promotions
  for update to authenticated
  using (public.is_admin() or vendor_id = public.current_vendor_id())
  with check (public.is_admin() or vendor_id = public.current_vendor_id());

create policy promos_delete_vendor on public.promotions
  for delete to authenticated
  using (vendor_id = public.current_vendor_id());

create policy promos_delete_admin on public.promotions
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- message_threads / messages
-- ----------------------------------------------------------------------------
alter table public.message_threads enable row level security;

create policy threads_select_party on public.message_threads
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or vendor_id = public.current_vendor_id()
  );

create policy threads_select_staff on public.message_threads
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy threads_insert_customer on public.message_threads
  for insert to authenticated
  with check (customer_id = (select auth.uid()));

create policy threads_update_member on public.message_threads
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or vendor_id = public.current_vendor_id()
    or public.has_role('support')
  )
  with check (
    customer_id = (select auth.uid())
    or vendor_id = public.current_vendor_id()
    or public.has_role('support')
  );

alter table public.messages enable row level security;

create policy messages_select_party on public.messages
  for select to authenticated
  using (
    public.is_thread_participant(thread_id)
    or public.has_role('admin')
    or public.has_role('support')
  );

create policy messages_insert_party on public.messages
  for insert to authenticated
  with check (
    public.is_thread_participant(thread_id)
    and (sender_id = (select auth.uid()) or sender_id is null)
  );

create policy messages_update_read on public.messages
  for update to authenticated
  using (
    public.is_thread_participant(thread_id)
    or public.has_role('support')
  )
  with check (
    public.is_thread_participant(thread_id)
    or public.has_role('support')
  );

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own_or_broadcast on public.notifications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and (
      role_target = 'all'
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.roles @> array[role_target::public.user_role])
    ))
  );

create policy notifications_insert_admin on public.notifications
  for insert to authenticated
  with check (
    public.is_admin()
    or (user_id = (select auth.uid()))
  );

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()) or user_id is null)
  with check (user_id = (select auth.uid()) or user_id is null);

-- ----------------------------------------------------------------------------
-- content_blocks
-- ----------------------------------------------------------------------------
alter table public.content_blocks enable row level security;

create policy content_select_published on public.content_blocks
  for select using (published);

create policy content_select_admin on public.content_blocks
  for select to authenticated
  using (public.is_admin());

create policy content_write_admin on public.content_blocks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- vendor_applications
-- ----------------------------------------------------------------------------
alter table public.vendor_applications enable row level security;

create policy applications_select_own on public.vendor_applications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy applications_select_staff on public.vendor_applications
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

create policy applications_insert_own on public.vendor_applications
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy applications_update_staff on public.vendor_applications
  for update to authenticated
  using (public.is_admin() or public.has_role('support'))
  with check (public.is_admin() or public.has_role('support'));

-- ----------------------------------------------------------------------------
-- commission_config
-- ----------------------------------------------------------------------------
alter table public.commission_config enable row level security;

create policy commission_select_authenticated on public.commission_config
  for select to authenticated
  using (public.is_admin() or public.has_role('vendor') or public.has_role('support'));

create policy commission_update_admin on public.commission_config
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy audit_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

create policy audit_insert_staff on public.audit_logs
  for insert to authenticated
  with check (
    public.is_admin() or public.has_role('support') or public.has_role('vendor') or public.has_role('rider')
  );
