-- ============================================================================
-- Vendora Phase 8: notifications that the database emits, and the realtime
-- surface the client listens to.
--
-- Before this file, a notification row was only ever created by `place_order`
-- (twice, for the buyer) and by `send_support_notification`. Everything else
-- the app wanted to say - "your dispute was assigned", "the courier failed the
-- drop", "your store received a return request", "your payout was sent" - lived
-- in `src/store/notification-store.ts`, which was a Zustand store persisted to
-- localStorage and pre-seeded with five invented orders ("Order #ORD-9821 has
-- been shipped via Express Courier"). Its own `addNotification` minted ids like
-- `notif-1730...`, which cannot satisfy the uuid primary key, so those writes
-- failed and were only logged. That store is deleted by this phase.
--
-- Design decisions:
--
--   1. Notices are raised by AFTER triggers on the table where the event
--      happens, not by editing the decision RPCs. A trigger fires whether the
--      change came from `resolve_dispute`, from a policy-gated client write, or
--      from the seed, so a rule cannot be skipped by choosing a different door.
--      The RPCs that were already pushed (20261011000300, 000800, 000900) also
--      stay untouched.
--   2. Fan-out is per recipient. `broadcast_notification` inserts one row per
--      account rather than one shared `user_id IS NULL` row, because `read_at`
--      is a per-person fact: a shared row would let one admin's "mark all read"
--      silently mark it read for every other admin.
--   3. Only `notification_type` values are used. The browser store invented
--      'dispute_update' and 'price_alert'; neither exists in the enum, so those
--      two categories disappear with it.
--   4. Every notice carries the `href` the app route it points at, so the bell
--      navigates instead of dead-ending.
--
-- Nothing here is applied to the remote until you approve a push; `npm run
-- db:check` compiles the chain and asserts each rule against real Postgres.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The one writer. Every trigger and the broadcast RPC go through it, so the
--    shape of a notice - and the rule that it needs a recipient - lives once.
-- ----------------------------------------------------------------------------
create or replace function public.notify_user(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Nobody to tell: a courier parcel with no logged-in buyer, a store that was
  -- created without an owner row. Skipping is correct; writing a null row is not.
  if p_user_id is null then
    return null;
  end if;

  insert into public.notifications (user_id, role_target, type, title, message, href, created_at)
  values (
    p_user_id,
    coalesce(nullif(btrim(p_type::text), ''), 'system'),
    p_type,
    left(btrim(coalesce(p_title, '')), 120),
    left(btrim(coalesce(p_message, '')), 500),
    p_href,
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- The store owner behind a `vendor_profiles` id; null when the store has no account.
create or replace function public.store_owner_id(p_vendor_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vp.user_id from public.vendor_profiles vp where vp.id = p_vendor_id;
$$;

-- ----------------------------------------------------------------------------
-- 2. Disputes: opened, handed over, escalated, ruled on, and every reply.
-- ----------------------------------------------------------------------------
create or replace function public.notify_on_dispute_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_user(
      public.store_owner_id(new.vendor_id), 'dispute',
      'A dispute was opened on your store',
      left(new.reason, 200),
      '/vendor/orders'
    );
    return new;
  end if;

  -- Handed over: the receiving agent is told, because the case is now theirs.
  if new.assigned_agent_id is not distinct from old.assigned_agent_id then
    null;
  elsif new.assigned_agent_id is not null then
    perform public.notify_user(
      new.assigned_agent_id, 'dispute',
      'A dispute was assigned to you',
      left(new.reason, 200),
      '/support'
    );
  end if;

  if new.status is distinct from old.status then
    if new.status::text in ('resolved_refund', 'resolved_denied') then
      perform public.notify_user(
        new.customer_id, 'dispute',
        case when new.status::text = 'resolved_refund'
             then 'Your dispute was settled with a refund'
             else 'Your dispute was closed without a refund' end,
        coalesce(nullif(btrim(new.resolution_note), ''), 'Read the case for the full decision.'),
        '/notifications'
      );
    elsif new.status::text = 'escalated' then
      perform public.notify_user(
        new.assigned_agent_id, 'dispute',
        'A dispute was escalated for a senior decision',
        left(new.reason, 200),
        '/support'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists disputes_notify on public.disputes;
create trigger disputes_notify
  after insert or update of status, assigned_agent_id on public.disputes
  for each row execute function public.notify_on_dispute_change();

-- A reply on a case reaches the side that did not write it. `sender_role` is the
-- enum customer|vendor|support, so the branch is decided by who sent it.
create or replace function public.notify_on_dispute_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
begin
  select d.customer_id, d.vendor_id, d.assigned_agent_id
    into v_case
    from public.disputes d where d.id = new.dispute_id;
  if not found then
    return new;
  end if;

  -- Staff notes are internal by definition; nothing leaves the desk.
  if new.is_internal_note then
    return new;
  end if;

  if new.sender_role::text = 'support' then
    perform public.notify_user(
      v_case.customer_id, 'dispute', 'Support replied to your dispute',
      left(new.content, 200), '/notifications');
  elsif new.sender_role::text = 'customer' then
    perform public.notify_user(
      public.store_owner_id(v_case.vendor_id), 'dispute', 'The buyer replied on a dispute',
      left(new.content, 200), '/vendor/orders');
    perform public.notify_user(
      v_case.assigned_agent_id, 'dispute', 'The buyer replied on a case you hold',
      left(new.content, 200), '/support');
  else
    perform public.notify_user(
      v_case.customer_id, 'dispute', 'The store replied on your dispute',
      left(new.content, 200), '/notifications');
    perform public.notify_user(
      v_case.assigned_agent_id, 'dispute', 'The store replied on a case you hold',
      left(new.content, 200), '/support');
  end if;

  return new;
end;
$$;

drop trigger if exists dispute_messages_notify on public.dispute_messages;
create trigger dispute_messages_notify
  after insert on public.dispute_messages
  for each row execute function public.notify_on_dispute_message();

-- ----------------------------------------------------------------------------
-- 3. Packages: the road is the buyer's question and the return is the store's.
-- ----------------------------------------------------------------------------
create or replace function public.notify_on_package_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_owner uuid;
  v_href text;
begin
  -- Status unchanged: the row was edited for tracking or a refund note, not the road.
  if new.status is not distinct from old.status then
    return new;
  end if;

  select o.customer_id into v_buyer from public.orders o where o.id = new.order_group_id;
  v_href := '/orders/' || coalesce(new.order_group_id::text, '');
  v_owner := public.store_owner_id(new.seller_id);

  case new.status::text
    when 'shipped' then
      perform public.notify_user(v_buyer, 'order_status', 'Your package is on the way',
        'The courier has collected it from the store.', v_href);
    when 'out_for_delivery' then
      perform public.notify_user(v_buyer, 'order_status', 'Your package is arriving today',
        'Keep your handover code ready - the rider cannot close the delivery without it.', v_href);
    when 'delivered' then
      perform public.notify_user(v_buyer, 'order_status', 'Your package was delivered',
        'Handover code verified on arrival.', v_href);
    when 'delivery_failed' then
      perform public.notify_user(v_buyer, 'order_status', 'The delivery attempt failed',
        'Support will follow up, or reply on the order to arrange another attempt.', v_href);
      perform public.notify_user(v_owner, 'order_status', 'A delivery from your store failed',
        'The rider reported a problem with a parcel.', '/vendor/orders');
    when 'return_requested' then
      perform public.notify_user(v_owner, 'order_status', 'A return was requested',
        left(coalesce(new.return_reason, 'No reason given.'), 200), '/vendor/returns');
    when 'return_approved' then
      perform public.notify_user(v_buyer, 'order_status', 'Your return was approved',
        'Send the parcel back with the RMA code the store was given.', v_href);
    when 'returned' then
      perform public.notify_user(v_owner, 'order_status', 'A returned parcel arrived and was restocked',
        'The units are back on your shelf.', '/vendor/returns');
    when 'refunded' then
      perform public.notify_user(v_buyer, 'order_status', 'Your refund is complete',
        'The full amount charged for that package has been returned.', v_href);
    else
      null;
  end case;

  return new;
end;
$$;

drop trigger if exists sub_orders_notify on public.sub_orders;
create trigger sub_orders_notify
  after update of status on public.sub_orders
  for each row execute function public.notify_on_package_change();

-- ----------------------------------------------------------------------------
-- 4. Money and standing: strikes, payouts, listings and applications.
-- ----------------------------------------------------------------------------
create or replace function public.notify_on_strike()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    public.store_owner_id(new.vendor_id), 'system',
    'A strike was issued against your store',
    left(new.reason || coalesce(' - ' || new.note, ''), 200),
    '/vendor'
  );
  return new;
end;
$$;

drop trigger if exists vendor_strikes_notify on public.vendor_strikes;
create trigger vendor_strikes_notify
  after insert on public.vendor_strikes
  for each row execute function public.notify_on_strike();

create or replace function public.notify_on_payout_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status::text = 'completed' then
    perform public.notify_user(
      public.store_owner_id(new.vendor_id), 'payout',
      'A payout has been sent',
      format('$%s to the account on file (reference %s).', to_char(new.amount, 'FM999999990.00'),
             coalesce(nullif(new.payment_reference, ''), 'not recorded')),
      '/vendor/payouts');
  elsif new.status::text = 'failed' then
    perform public.notify_user(
      public.store_owner_id(new.vendor_id), 'payout',
      'A payout could not be sent',
      'Update your bank details and the platform can retry.', '/vendor/banking');
  end if;

  return new;
end;
$$;

drop trigger if exists payouts_notify on public.payouts;
create trigger payouts_notify
  after update of status on public.payouts
  for each row execute function public.notify_on_payout_change();

-- A listing's fate belongs to the seller, not to the moderation queue.
create or replace function public.notify_on_product_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status::text = 'approved' then
    perform public.notify_user(
      (select p.user_id from public.vendor_profiles p where p.id = new.seller_id), 'system',
      'Your listing is live', left(new.title, 80), '/vendor/products');
  elsif new.status::text = 'rejected' then
    perform public.notify_user(
      (select p.user_id from public.vendor_profiles p where p.id = new.seller_id), 'system',
      'Your listing was not approved',
      left(coalesce(nullif(new.rejection_reason, ''), 'Read the moderation note on the listing.'), 200),
      '/vendor/products');
  end if;

  return new;
end;
$$;

drop trigger if exists products_notify on public.products;
create trigger products_notify
  after update of status on public.products
  for each row execute function public.notify_on_product_moderation();

create or replace function public.notify_on_application_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status::text = 'approved' then
    perform public.notify_user(new.user_id, 'system', 'Your store was approved',
      'You can start listing in the seller workspace.', '/vendor');
  elsif new.status::text = 'rejected' then
    perform public.notify_user(new.user_id, 'system', 'Your store application was declined',
      left(coalesce(nullif(new.review_note, ''), 'The platform recorded no reason.'), 200),
      '/become-a-seller');
  end if;

  return new;
end;
$$;

drop trigger if exists vendor_applications_notify on public.vendor_applications;
create trigger vendor_applications_notify
  after update of status on public.vendor_applications
  for each row execute function public.notify_on_application_decision();

-- ----------------------------------------------------------------------------
-- 5. Broadcasts: staff speak to a role, and every account in it gets its own row.
-- ----------------------------------------------------------------------------
create or replace function public.broadcast_notification(
  p_role_target text,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_href text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.require_staff('broadcast a notification');
  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'Notification title is required';
  end if;
  if p_role_target is null or p_role_target not in
     ('all','customer','vendor','support','admin','rider') then
    raise exception 'Unknown notification audience %', coalesce(p_role_target, '<null>');
  end if;

  insert into public.notifications (user_id, role_target, type, title, message, href, created_at)
  select pr.id, p_role_target, p_type, left(btrim(p_title), 120), left(btrim(coalesce(p_message, '')), 500),
         p_href, now()
    from public.profiles pr
   where p_role_target = 'all' or pr.roles @> array[p_role_target::public.user_role];

  get diagnostics v_count = row_count;

  -- The announcement is only verifiable afterwards through its record: the rows it wrote belong
  -- to other people's trays and RLS keeps them out of the sender's reads.
  perform public.admin_audit(
    'notification.broadcast', 'broadcast', null, null,
    jsonb_build_object(
      'audience', p_role_target,
      'type', p_type,
      'title', left(btrim(p_title), 120),
      'message', left(btrim(coalesce(p_message, '')), 500),
      'href', p_href,
      'recipients', v_count
    )
  );

  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Grants, policies and the realtime publication.
-- ----------------------------------------------------------------------------

-- `review_vendor_application` could not approve anything: it granted the seller role with
-- `roles + array['vendor']`, and PostgreSQL has no `+` for arrays, so every approval raised
-- "operator does not exist: user_role[] + user_role[]" - including the ones an admin clicked
-- in the console, because the failure happens after the audit row is written. It lives in
-- 20261011000300, which is already pushed, so it is redefined here rather than edited there.
-- The rewrite unions the role through `array_agg(distinct ...)` rather than an operator, so a
-- second approval of the same application cannot leave the account listed as a seller twice.
create or replace function public.review_vendor_application(
  p_application_id uuid,
  p_decision text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.vendor_applications%rowtype;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_decision not in ('approved','rejected','under_review') then
    raise exception 'Invalid decision';
  end if;

  select * into v_app from public.vendor_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;

  update public.vendor_applications
  set status = p_decision::public.application_status,
      review_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id;

  if p_decision = 'approved' and v_app.user_id is not null then
    insert into public.vendor_profiles (user_id, store_name, slug, description)
    values (v_app.user_id, v_app.proposed_store_name, v_app.proposed_slug, v_app.description)
    on conflict (user_id) do update set store_name = excluded.store_name;

    update public.profiles
    set roles = (select coalesce(array_agg(distinct r), '{}'::public.user_role[])
                   from unnest(roles || array['vendor'::public.user_role]) as r),
        vendor_status = 'approved',
        rejection_reason = null
    where id = v_app.user_id;
  elsif p_decision = 'rejected' and v_app.user_id is not null then
    update public.profiles
    set vendor_status = 'rejected',
        rejection_reason = p_note
    where id = v_app.user_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id)
  values (auth.uid(), 'Super Admin', 'application.' || p_decision, 'vendor_application', p_application_id::text);

  return true;
end;
$$;

grant execute on function
  public.notify_user(uuid, public.notification_type, text, text, text),
  public.store_owner_id(uuid),
  public.broadcast_notification(text, public.notification_type, text, text, text)
to authenticated;

revoke execute on function
  public.broadcast_notification(text, public.notification_type, text, text, text)
from anon;

-- A notice is dismissible by the person it was addressed to. No update policy is
-- added here: `notifications_update_own` already lets a recipient set `read_at`.
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Publication additions are additive and idempotent, like the Phase 0 block.
do $$
declare
  t text;
  wanted text[] := array['vendor_applications', 'payouts', 'vendor_strikes', 'refunds'];
begin
  foreach t in array wanted loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
