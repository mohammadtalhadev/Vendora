-- ============================================================================
-- Vendora 20261015060000: General support tickets (Batch 38).
--
-- The support desk worked disputes only: a buyer whose problem was not a
-- dispute - a locked account, a question about an order, a technical fault -
-- had no case, no number and no thread. This migration adds the general
-- ticket system beside the dispute desk, on the same rules:
--
--   * A ticket is a row in `support_tickets` with a human number
--     (`ticket_no`, shown as VD-000123) and a thread in
--     `support_ticket_messages`. Internal notes live in the same thread,
--     flagged, and are never readable by the customer (RLS, below).
--   * Writes go through RPCs only. There are no insert/update policies, so
--     a client cannot mint a ticket in someone else's name, forge an agent
--     reply, or post an "internal" note as a customer; the RPCs decide who
--     the author is and what a reply does to the status.
--   * A staff reply moves the ticket to `waiting_customer`; the customer's
--     answer moves it back to `in_progress` (and reopens a resolved ticket).
--     A closed ticket refuses replies - closed is final, like a ruled case.
--   * Notifications reuse the one writer (`notify_user`, 20261011001200):
--     the customer is told about staff replies and assignments, the assigned
--     agent is told about customer replies. Best-effort by design - a notice
--     failure must never fail the reply it announces, so each call is
--     wrapped and its error swallowed inside the RPC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no serial unique,
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null default '',
  customer_name text not null default '',
  subject text not null,
  category text not null default 'other'
    check (category in ('account','order','payment','delivery','technical','other')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  assigned_agent_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index support_tickets_customer_idx on public.support_tickets (customer_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status, priority, created_at);
create index support_tickets_agent_idx on public.support_tickets (assigned_agent_id)
  where assigned_agent_id is not null;

create trigger trg_support_tickets_updated before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null default 'customer'
    check (author_role in ('customer','support','admin')),
  body text not null,
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create index support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at);

-- The label every screen prints for a ticket.
create or replace function public.support_ticket_label(p_ticket_no integer)
returns text
language sql
immutable
set search_path = public
as $$
  select 'VD-' || lpad(p_ticket_no::text, 6, '0');
$$;

-- ----------------------------------------------------------------------------
-- RLS: customers read their own tickets and the non-internal part of their
-- threads; staff read everything. No write policies at all - the RPCs below
-- (security definer) are the only writers.
-- ----------------------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists support_tickets_select_customer on public.support_tickets;
create policy support_tickets_select_customer on public.support_tickets
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists support_tickets_select_staff on public.support_tickets;
create policy support_tickets_select_staff on public.support_tickets
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

drop policy if exists support_ticket_messages_select_customer on public.support_ticket_messages;
create policy support_ticket_messages_select_customer on public.support_ticket_messages
  for select to authenticated
  using (
    internal_note = false
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.customer_id = (select auth.uid())
    )
  );

drop policy if exists support_ticket_messages_select_staff on public.support_ticket_messages;
create policy support_ticket_messages_select_staff on public.support_ticket_messages
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

-- ----------------------------------------------------------------------------
-- create_support_ticket: the customer's opening move. Identity and email come
-- from the caller's own profile row - never from arguments - and an order
-- link is only honoured when the order is actually the caller's.
-- ----------------------------------------------------------------------------
create or replace function public.create_support_ticket(
  p_subject text,
  p_category text,
  p_body text,
  p_priority text default 'normal',
  p_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_ticket public.support_tickets%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if coalesce(btrim(p_subject), '') = '' then
    raise exception 'A subject is required';
  end if;
  if coalesce(btrim(p_body), '') = '' then
    raise exception 'Describe the problem so the desk can help';
  end if;
  if p_category not in ('account','order','payment','delivery','technical','other') then
    raise exception 'Unknown ticket category %', p_category;
  end if;
  if coalesce(p_priority, 'normal') not in ('low','normal','high','urgent') then
    raise exception 'Unknown ticket priority %', p_priority;
  end if;
  if p_order_id is not null and not exists (
    select 1 from public.orders o where o.id = p_order_id and o.customer_id = v_uid
  ) then
    raise exception 'That order does not belong to this account';
  end if;

  select pr.email, pr.name into v_email, v_name
  from public.profiles pr where pr.id = v_uid;

  insert into public.support_tickets (
    customer_id, customer_email, customer_name, subject, category, priority, order_id
  )
  values (
    v_uid, coalesce(v_email, ''), coalesce(v_name, ''), btrim(p_subject),
    p_category, coalesce(p_priority, 'normal'), p_order_id
  )
  returning * into v_ticket;

  insert into public.support_ticket_messages (ticket_id, author_id, author_role, body)
  values (v_ticket.id, v_uid, 'customer', btrim(p_body));

  return jsonb_build_object(
    'id', v_ticket.id,
    'ticketNo', public.support_ticket_label(v_ticket.ticket_no)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- reply_support_ticket: one writer for both sides of the thread. The caller's
-- side is decided by their roles, a customer can never post an internal note,
-- and the status follows who just spoke (see header). Notifications are
-- best-effort and never fail the reply.
-- ----------------------------------------------------------------------------
create or replace function public.reply_support_ticket(
  p_ticket_id uuid,
  p_body text,
  p_internal_note boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets%rowtype;
  v_staff boolean := public.is_admin() or public.has_role('support');
  v_role text;
  v_internal boolean := coalesce(p_internal_note, false) and v_staff;
  v_next text;
  v_message_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if coalesce(btrim(p_body), '') = '' then
    raise exception 'A reply cannot be empty';
  end if;

  select * into v_ticket from public.support_tickets t
  where t.id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  if not v_staff and v_ticket.customer_id <> v_uid then
    raise exception 'This ticket belongs to another customer' using errcode = '42501';
  end if;
  if v_ticket.status = 'closed' then
    raise exception 'This ticket is closed; open a new ticket if you still need help';
  end if;

  v_role := case
    when public.is_admin() then 'admin'
    when public.has_role('support') then 'support'
    else 'customer'
  end;

  insert into public.support_ticket_messages (ticket_id, author_id, author_role, body, internal_note)
  values (p_ticket_id, v_uid, v_role, btrim(p_body), v_internal)
  returning id into v_message_id;

  v_next := v_ticket.status;
  if not v_internal then
    if v_staff then
      if v_ticket.status in ('open', 'in_progress', 'waiting_customer') then
        v_next := 'waiting_customer';
      end if;
    else
      if v_ticket.status in ('waiting_customer', 'resolved') then
        v_next := 'in_progress';
      end if;
    end if;
  end if;

  if v_next <> v_ticket.status then
    update public.support_tickets
    set status = v_next,
        resolved_at = case when v_next in ('resolved', 'closed') then resolved_at else null end
    where id = p_ticket_id;
  end if;

  if not v_internal then
    begin
      if v_staff then
        perform public.notify_user(
          v_ticket.customer_id, 'system',
          'Support replied to your ticket ' || public.support_ticket_label(v_ticket.ticket_no),
          left(btrim(p_body), 500),
          '/account/support'
        );
      elsif v_ticket.assigned_agent_id is not null then
        perform public.notify_user(
          v_ticket.assigned_agent_id, 'system',
          'Customer replied to ticket ' || public.support_ticket_label(v_ticket.ticket_no),
          left(btrim(p_body), 500),
          '/support/tickets/' || p_ticket_id::text
        );
      end if;
    exception when others then
      null; -- a failed notice never fails the reply it announces
    end;
  end if;

  return jsonb_build_object(
    'messageId', v_message_id,
    'ticketId', p_ticket_id,
    'status', v_next
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- assign_support_ticket: staff only, and the new holder must be a real staff
-- account - the same rule the dispute desk's directory enforces. The customer
-- is told their case has a named owner; the agent sees it in their Mine pool.
-- ----------------------------------------------------------------------------
create or replace function public.assign_support_ticket(
  p_ticket_id uuid,
  p_agent_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  perform public.require_staff('assign a support ticket');

  if not exists (
    select 1 from public.profiles pr
    where pr.id = p_agent_id
      and (pr.roles @> array['support']::public.user_role[]
           or pr.roles @> array['admin']::public.user_role[])
  ) then
    raise exception 'That account is not a support or admin user';
  end if;

  update public.support_tickets
  set assigned_agent_id = p_agent_id
  where id = p_ticket_id
  returning * into v_ticket;
  if not found then
    raise exception 'Ticket not found';
  end if;

  begin
    perform public.notify_user(
      v_ticket.customer_id, 'system',
      'Your ticket ' || public.support_ticket_label(v_ticket.ticket_no) || ' was assigned',
      'A support agent is now looking after your case.',
      '/account/support'
    );
    if p_agent_id <> auth.uid() then
      perform public.notify_user(
        p_agent_id, 'system',
        'Ticket ' || public.support_ticket_label(v_ticket.ticket_no) || ' assigned to you',
        v_ticket.subject,
        '/support/tickets/' || p_ticket_id::text
      );
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object('ticketId', p_ticket_id, 'assignedAgentId', p_agent_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- set_support_ticket_status: the desk's deliberate moves (the reply RPC owns
-- the automatic ones). Resolving or closing stamps resolved_at; moving a
-- ticket back into an active status clears it.
-- ----------------------------------------------------------------------------
create or replace function public.set_support_ticket_status(
  p_ticket_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  perform public.require_staff('change a ticket status');

  if p_status not in ('open','in_progress','waiting_customer','resolved','closed') then
    raise exception 'Unknown ticket status %', p_status;
  end if;

  update public.support_tickets
  set status = p_status,
      resolved_at = case when p_status in ('resolved','closed') then now() else null end
  where id = p_ticket_id
  returning * into v_ticket;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if p_status in ('resolved', 'closed') then
    begin
      perform public.notify_user(
        v_ticket.customer_id, 'system',
        'Your ticket ' || public.support_ticket_label(v_ticket.ticket_no) || ' was ' || p_status,
        'If the problem comes back, just reply on the ticket or open a new one.',
        '/account/support'
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ticketId', p_ticket_id, 'status', p_status);
end;
$$;

-- ----------------------------------------------------------------------------
-- support_ticket_queue: the desk's one read, shaped like the dispute queue
-- ({page, pageSize, total, counts, rows}) so both desks feel identical.
-- p_status is 'all', a ticket status, or 'unassigned'; p_mine restricts to
-- the caller's own load. Counts are computed over the whole table, like the
-- dispute queue's, so the tabs never disagree with the sidebar badge.
-- ----------------------------------------------------------------------------
create or replace function public.support_ticket_queue(
  p_status text default 'all',
  p_mine boolean default false,
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_staff('read the ticket queue');

  return (
    with
      rollups as (
        select
          t.*,
          (select pr.name from public.profiles pr where pr.id = t.assigned_agent_id) as agent_name,
          (select count(*) from public.support_ticket_messages m where m.ticket_id = t.id)::int as message_count,
          (select m.body from public.support_ticket_messages m
            where m.ticket_id = t.id and m.internal_note = false
            order by m.created_at desc limit 1) as last_message_body,
          (select m.created_at from public.support_ticket_messages m
            where m.ticket_id = t.id order by m.created_at desc limit 1) as last_message_at
        from public.support_tickets t
        where (p_status = 'all'
               or (p_status = 'unassigned' and t.assigned_agent_id is null
                   and t.status in ('open','in_progress','waiting_customer'))
               or t.status = p_status)
          and (p_mine is not true or t.assigned_agent_id = auth.uid())
          and (btrim(coalesce(p_search, '')) = ''
               or t.subject ilike '%' || p_search || '%'
               or t.customer_name ilike '%' || p_search || '%'
               or t.customer_email ilike '%' || p_search || '%'
               or t.id::text ilike '%' || p_search || '%'
               or ('VD-' || lpad(t.ticket_no::text, 6, '0')) ilike '%' || p_search || '%')
      ),
      paged as (
        select r.*, count(*) over () as total from rollups r
        order by case r.priority when 'urgent' then 0 when 'high' then 1 else 2 end,
                 r.updated_at desc
        limit greatest(coalesce(p_page_size, 12), 1)
        offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 12), 1)
      )
    select jsonb_build_object(
      'page', greatest(coalesce(p_page, 1), 1),
      'pageSize', greatest(coalesce(p_page_size, 12), 1),
      'total', coalesce((select max(total) from paged), 0),
      'counts', jsonb_build_object(
        'all', (select count(*) from public.support_tickets),
        'open', (select count(*) from public.support_tickets where status = 'open'),
        'inProgress', (select count(*) from public.support_tickets where status = 'in_progress'),
        'waitingCustomer', (select count(*) from public.support_tickets where status = 'waiting_customer'),
        'resolved', (select count(*) from public.support_tickets where status = 'resolved'),
        'closed', (select count(*) from public.support_tickets where status = 'closed'),
        'awaitingStaff', (select count(*) from public.support_tickets
                          where status in ('open','in_progress')),
        'unassigned', (select count(*) from public.support_tickets
                       where assigned_agent_id is null and status in ('open','in_progress','waiting_customer')),
        'mine', (select count(*) from public.support_tickets
                 where assigned_agent_id = auth.uid() and status in ('open','in_progress','waiting_customer')),
        'urgent', (select count(*) from public.support_tickets
                   where priority in ('urgent','high') and status in ('open','in_progress','waiting_customer'))
      ),
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'ticketNo', public.support_ticket_label(ticket_no), 'ticketNoValue', ticket_no,
        'customerId', customer_id, 'customerName', customer_name, 'customerEmail', customer_email,
        'subject', subject, 'category', category, 'priority', priority, 'status', status,
        'assignedAgentId', assigned_agent_id, 'agentName', agent_name,
        'orderId', order_id, 'messages', message_count,
        'lastMessagePreview', case when last_message_body is null then null
                                   else left(last_message_body, 140) end,
        'lastMessageAt', last_message_at,
        'createdAt', created_at, 'updatedAt', updated_at, 'resolvedAt', resolved_at
      ) order by case priority when 'urgent' then 0 when 'high' then 1 else 2 end,
                updated_at desc), '[]'::jsonb)
    ) from paged
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- my_support_tickets: the customer's own list for /account/support. Scoped by
-- auth.uid() in the function itself (it runs as the owner), counting only the
-- messages the customer may see - internal notes are invisible here too.
-- ----------------------------------------------------------------------------
create or replace function public.my_support_tickets()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'ticketNo', public.support_ticket_label(t.ticket_no),
        'subject', t.subject, 'category', t.category, 'priority', t.priority,
        'status', t.status, 'orderId', t.order_id,
        'messages', (select count(*) from public.support_ticket_messages m
                     where m.ticket_id = t.id and m.internal_note = false)::int,
        'lastMessagePreview', (select left(m.body, 140) from public.support_ticket_messages m
                               where m.ticket_id = t.id and m.internal_note = false
                               order by m.created_at desc limit 1),
        'lastMessageAt', (select m.created_at from public.support_ticket_messages m
                          where m.ticket_id = t.id and m.internal_note = false
                          order by m.created_at desc limit 1),
        'agentName', (select pr.name from public.profiles pr where pr.id = t.assigned_agent_id),
        'createdAt', t.created_at, 'updatedAt', t.updated_at, 'resolvedAt', t.resolved_at
      ) order by t.updated_at desc)
      from public.support_tickets t
      where t.customer_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Grants + realtime (additive and idempotent, like the fanout migration).
-- ----------------------------------------------------------------------------
grant execute on function
  public.support_ticket_label(integer),
  public.create_support_ticket(text, text, text, text, uuid),
  public.reply_support_ticket(uuid, text, boolean),
  public.assign_support_ticket(uuid, uuid),
  public.set_support_ticket_status(uuid, text),
  public.support_ticket_queue(text, boolean, text, integer, integer),
  public.my_support_tickets()
to authenticated, service_role;

revoke execute on function
  public.create_support_ticket(text, text, text, text, uuid),
  public.reply_support_ticket(uuid, text, boolean),
  public.assign_support_ticket(uuid, uuid),
  public.set_support_ticket_status(uuid, text),
  public.support_ticket_queue(text, boolean, text, integer, integer),
  public.my_support_tickets()
from anon;

do $$
declare
  t text;
  wanted text[] := array['support_tickets', 'support_ticket_messages'];
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
