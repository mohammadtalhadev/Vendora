-- ============================================================================
-- Vendora Batch 43: transactional email/SMS outbox + broadcast email.
--
-- Until now the only customer notifications were in-app rows in
-- public.notifications, written by the triggers in 20261011001200. Close the
-- tab and the customer hears nothing: no email on order placed, shipped or
-- delivered, and no email when a payout lands. This migration adds the
-- missing half without pretending to be a mail server:
--
--   1. public.notification_outbox is a durable queue. Database triggers and
--      the broadcast_email RPC only ever ENQUEUE rows here (status 'queued').
--   2. The send-notifications Edge Function (supabase/functions/) drains the
--      queue on a schedule and is the only writer of 'sent' / 'failed' /
--      'skipped'. A row is 'sent' only after the provider accepted it; with
--      no provider key configured the function marks rows 'skipped' and
--      says so - nothing here ever claims a delivery that did not happen.
--
-- SMS note: public.profiles has no phone column. A phone number is only
-- available when the account stored one in profiles.metadata ->> 'phone'.
-- SMS rows are enqueued ONLY in that case; when no phone is on file the SMS
-- is skipped silently (no outbox row at all), never faked.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The outbox table. Writes happen through security-definer triggers/RPCs
--    and the service role (Edge Function); clients get no write policies.
-- ----------------------------------------------------------------------------
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  subject text,
  body text not null,
  kind text not null,
  ref_id uuid,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text,
  provider_ref text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_status_created_idx
  on public.notification_outbox (status, created_at);

alter table public.notification_outbox enable row level security;

-- Admins may inspect the queue (delivery debugging); nobody else reads it,
-- and no client role may insert, update or delete - there are deliberately
-- no policies for those commands.
drop policy if exists notification_outbox_select_admin on public.notification_outbox;
create policy notification_outbox_select_admin on public.notification_outbox
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. The one writer. Every trigger and the broadcast RPC go through it, so
--    the rule "no recipient, no row" lives in exactly one place.
-- ----------------------------------------------------------------------------
create or replace function public.enqueue_notification(
  p_channel text,
  p_recipient text,
  p_subject text,
  p_body text,
  p_kind text,
  p_ref uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_recipient is null or btrim(p_recipient) = '' then
    return null;
  end if;

  insert into public.notification_outbox (channel, recipient, subject, body, kind, ref_id)
  values (p_channel, btrim(p_recipient), p_subject, p_body, p_kind, p_ref)
  returning id into v_id;
  return v_id;
end;
$$;

-- The phone an account stored in its profile metadata, or null. See the SMS
-- note at the top of this file.
create or replace function public.profile_phone(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(coalesce(pr.metadata ->> 'phone', '')), '')
    from public.profiles pr
   where pr.id = p_user_id;
$$;

-- ----------------------------------------------------------------------------
-- 3a. Order placed: email the address the order itself carries, plus an SMS
--     when the account has a phone on file. The orders row holds no total
--     (sub-orders are written after it), so the body quotes the payment
--     method and status the row actually knows.
-- ----------------------------------------------------------------------------
create or replace function public.outbox_on_order_placed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short text := left(new.id::text, 8);
  v_phone text;
begin
  perform public.enqueue_notification(
    'email', new.customer_email,
    'Order ' || v_short || ' confirmed - thank you for shopping with Vendora',
    'Your order ' || v_short || ' has been placed and is being prepared by the seller.'
      || ' Payment method: ' || new.payment_method::text
      || ' (payment status: ' || new.payment_status::text || ').'
      || ' We will email you again when it ships.',
    'order_placed', new.id
  );

  v_phone := public.profile_phone(new.customer_id);
  if v_phone is not null then
    perform public.enqueue_notification(
      'sms', v_phone, null,
      'Vendora: order ' || v_short || ' confirmed. We will text you when it is delivered.',
      'order_placed', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists orders_outbox_placed on public.orders;
create trigger orders_outbox_placed
  after insert on public.orders
  for each row execute function public.outbox_on_order_placed();

-- ----------------------------------------------------------------------------
-- 3b. Package status: shipped, delivered and the return path. Only real
--     public.sub_order_status values are wired: 'shipped', 'delivered',
--     'return_requested', 'return_approved', 'return_rejected', 'returned',
--     'refunded'. Other transitions (placed/confirmed/packed/...) stay
--     in-app only, like the 20261011001200 fan-out.
-- ----------------------------------------------------------------------------
create or replace function public.outbox_on_sub_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_customer uuid;
  v_phone text;
  v_short text := left(new.order_group_id::text, 8);
  v_amount text := 'Rs ' || to_char(new.subtotal + new.shipping_fee, 'FM999,999,990.00');
  v_subject text;
  v_body text;
  v_kind text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status::text
    when 'shipped' then
      v_kind := 'order_shipped';
      v_subject := 'Order ' || v_short || ' is on its way';
      v_body := 'Good news - a package from your order ' || v_short || ' has shipped'
        || coalesce(' via ' || nullif(new.carrier_name, '') ||
                    coalesce(' (tracking ' || nullif(new.tracking_number, '') || ')', ''), '')
        || '. Package total: ' || v_amount || '.';
    when 'delivered' then
      v_kind := 'order_delivered';
      v_subject := 'Order ' || v_short || ' delivered';
      v_body := 'Your package from order ' || v_short || ' was delivered.'
        || ' Package total: ' || v_amount || '. Enjoy!';
    when 'return_requested' then
      v_kind := 'order_status';
      v_subject := 'Return requested for order ' || v_short;
      v_body := 'A return was requested for a package from order ' || v_short
        || coalesce(': ' || nullif(new.return_reason, ''), '')
        || '. The seller will review it shortly.';
    when 'return_approved' then
      v_kind := 'order_status';
      v_subject := 'Return approved for order ' || v_short;
      v_body := 'Your return for order ' || v_short || ' was approved.'
        || ' Send the parcel back as instructed on the order page.';
    when 'return_rejected' then
      v_kind := 'order_status';
      v_subject := 'Return declined for order ' || v_short;
      v_body := 'The seller declined the return for order ' || v_short
        || '. You can open a dispute from the order page if you disagree.';
    when 'returned' then
      v_kind := 'order_status';
      v_subject := 'Return received for order ' || v_short;
      v_body := 'The returned parcel from order ' || v_short || ' arrived at the seller.'
        || ' Your refund of ' || v_amount || ' is being processed.';
    when 'refunded' then
      v_kind := 'order_status';
      v_subject := 'Refund complete for order ' || v_short;
      v_body := 'Your refund of ' || v_amount || ' for order ' || v_short || ' is complete.';
    else
      return new;
  end case;

  select o.customer_email, o.customer_id into v_email, v_customer
    from public.orders o where o.id = new.order_group_id;
  if v_email is null then
    return new;
  end if;

  perform public.enqueue_notification('email', v_email, v_subject, v_body, v_kind, new.id);

  -- SMS only for delivery, and only when a phone is on file (see header note).
  if new.status::text = 'delivered' then
    v_phone := public.profile_phone(v_customer);
    if v_phone is not null then
      perform public.enqueue_notification(
        'sms', v_phone, null,
        'Vendora: order ' || v_short || ' delivered. Thank you for shopping with us.',
        'order_delivered', new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sub_orders_outbox_status on public.sub_orders;
create trigger sub_orders_outbox_status
  after update of status on public.sub_orders
  for each row execute function public.outbox_on_sub_order_status();

-- ----------------------------------------------------------------------------
-- 3c. Payout status: email the store owner behind the payout's vendor
--     profile (vendor_profiles.user_id -> profiles.email).
-- ----------------------------------------------------------------------------
create or replace function public.outbox_on_payout_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_amount text := to_char(new.amount, 'FM999,999,990.00') || ' ' || new.currency;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select pr.email into v_email
    from public.vendor_profiles vp
    join public.profiles pr on pr.id = vp.user_id
   where vp.id = new.vendor_id;
  if v_email is null then
    return new;
  end if;

  perform public.enqueue_notification(
    'email', v_email,
    'Payout ' || new.status::text || ' - ' || v_amount,
    'Your payout of ' || v_amount || ' is now ' || new.status::text || '.'
      || coalesce(' Reference: ' || nullif(new.payment_reference, '') || '.', ''),
    'payout_status', new.id
  );

  return new;
end;
$$;

drop trigger if exists payouts_outbox_status on public.payouts;
create trigger payouts_outbox_status
  after update of status on public.payouts
  for each row execute function public.outbox_on_payout_status();

-- ----------------------------------------------------------------------------
-- 4. Broadcast email: the email channel for the admin announcement console.
--    Same staff guard and audience validation as broadcast_notification
--    (20261011001200); rows are only QUEUED here - the Edge Function sends.
-- ----------------------------------------------------------------------------
create or replace function public.broadcast_email(
  p_role_target text,
  p_title text,
  p_message text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.require_staff('broadcast an email');
  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'Email subject is required';
  end if;
  if p_role_target is null or p_role_target not in
     ('all','customer','vendor','support','admin','rider') then
    raise exception 'Unknown notification audience %', coalesce(p_role_target, '<null>');
  end if;

  insert into public.notification_outbox (channel, recipient, subject, body, kind)
  select 'email', pr.email, left(btrim(p_title), 200),
         left(btrim(coalesce(p_message, '')), 2000), 'broadcast'
    from public.profiles pr
   where (p_role_target = 'all' or pr.roles @> array[p_role_target::public.user_role])
     and btrim(coalesce(pr.email, '')) <> '';

  get diagnostics v_count = row_count;

  perform public.admin_audit(
    'notification.broadcast_email', 'broadcast', null, null,
    jsonb_build_object(
      'audience', p_role_target,
      'title', left(btrim(p_title), 200),
      'message', left(btrim(coalesce(p_message, '')), 500),
      'recipients', v_count
    )
  );

  return v_count;
end;
$$;

-- Only the broadcast RPC is a client entry point (it guards itself with
-- require_staff). enqueue_notification and profile_phone are deliberately NOT
-- granted: they run inside the security-definer triggers above, and exposing
-- them would let any signed-in account queue mail to arbitrary addresses or
-- read back another account's phone number.
grant execute on function
  public.broadcast_email(text, text, text)
to authenticated;

revoke execute on function
  public.broadcast_email(text, text, text)
from anon;
