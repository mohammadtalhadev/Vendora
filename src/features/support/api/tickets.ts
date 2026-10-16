import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './support-client';

/**
 * General support tickets: the desk's second queue beside disputes.
 * A ticket is any problem that is not a dispute - account, order help, a
 * technical fault - with a human number (VD-000123), a thread, an owner and a
 * status. Every read and write here goes through the ticket RPCs or the
 * RLS-scoped tables; nothing is derived in the browser.
 */

export type SupportTicketCategory =
  | 'account'
  | 'order'
  | 'payment'
  | 'delivery'
  | 'technical'
  | 'other';

export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed';

export const TICKET_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: 'account', label: 'Account' },
  { value: 'order', label: 'Order help' },
  { value: 'payment', label: 'Payment' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'technical', label: 'Technical problem' },
  { value: 'other', label: 'Something else' },
];

export const TICKET_PRIORITIES: { value: SupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting for you',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CATEGORIES = TICKET_CATEGORIES.map((c) => c.value) as readonly string[];
const PRIORITIES = TICKET_PRIORITIES.map((p) => p.value) as readonly string[];
const STATUSES: readonly string[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
];

function nullable(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

const categoryOf = (value: unknown): SupportTicketCategory =>
  CATEGORIES.includes(text(value)) ? (text(value) as SupportTicketCategory) : 'other';

const priorityOf = (value: unknown): SupportTicketPriority =>
  PRIORITIES.includes(text(value)) ? (text(value) as SupportTicketPriority) : 'normal';

export const statusOf = (value: unknown): SupportTicketStatus =>
  STATUSES.includes(text(value)) ? (text(value) as SupportTicketStatus) : 'open';

/** A staff-side queue row: every field is what `support_ticket_queue` computed. */
export interface SupportTicketRow {
  id: string;
  ticketNo: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedAgentId: string | null;
  agentName: string | null;
  orderId: string | null;
  messages: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SupportTicketQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<
    | 'all'
    | 'open'
    | 'inProgress'
    | 'waitingCustomer'
    | 'resolved'
    | 'closed'
    | 'awaitingStaff'
    | 'unassigned'
    | 'mine'
    | 'urgent',
    number
  >;
  rows: SupportTicketRow[];
}

/** A customer's own ticket, as `my_support_tickets` returns it. */
export interface MySupportTicket {
  id: string;
  ticketNo: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  orderId: string | null;
  messages: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  agentName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/** One message in a ticket thread, read from the table under its RLS policy. */
export interface SupportTicketMessage {
  id: string;
  authorId: string | null;
  authorRole: 'customer' | 'support' | 'admin';
  body: string;
  internalNote: boolean;
  createdAt: string;
}

/** A ticket header read straight from the table (staff see all; a customer only their own). */
export interface SupportTicketDetail extends MySupportTicket {
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAgentId: string | null;
}

export function mapTicketRow(row: Record<string, unknown>): SupportTicketRow {
  return {
    id: text(row.id),
    ticketNo: text(row.ticketNo),
    customerId: text(row.customerId),
    customerName: text(row.customerName),
    customerEmail: text(row.customerEmail),
    subject: text(row.subject),
    category: categoryOf(row.category),
    priority: priorityOf(row.priority),
    status: statusOf(row.status),
    assignedAgentId: nullable(row.assignedAgentId),
    agentName: nullable(row.agentName),
    orderId: nullable(row.orderId),
    messages: num(row.messages),
    lastMessagePreview: nullable(row.lastMessagePreview),
    lastMessageAt: nullable(row.lastMessageAt),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
    resolvedAt: nullable(row.resolvedAt),
  };
}

export function mapTicketQueue(value: unknown): SupportTicketQueue {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    counts: {
      all: num(counts.all),
      open: num(counts.open),
      inProgress: num(counts.inProgress),
      waitingCustomer: num(counts.waitingCustomer),
      resolved: num(counts.resolved),
      closed: num(counts.closed),
      awaitingStaff: num(counts.awaitingStaff),
      unassigned: num(counts.unassigned),
      mine: num(counts.mine),
      urgent: num(counts.urgent),
    },
    rows: asRows(root.rows).map(mapTicketRow),
  };
}

export function mapMyTicket(row: Record<string, unknown>): MySupportTicket {
  return {
    id: text(row.id),
    ticketNo: text(row.ticketNo),
    subject: text(row.subject),
    category: categoryOf(row.category),
    priority: priorityOf(row.priority),
    status: statusOf(row.status),
    orderId: nullable(row.orderId),
    messages: num(row.messages),
    lastMessagePreview: nullable(row.lastMessagePreview),
    lastMessageAt: nullable(row.lastMessageAt),
    agentName: nullable(row.agentName),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
    resolvedAt: nullable(row.resolvedAt),
  };
}

/**
 * The desk's queue read. `status` is 'all', a ticket status, or 'unassigned';
 * `mine` narrows to the signed-in agent. Filtering is server-side, exactly
 * like the dispute queue, so a page of twelve is twelve tickets of that pool.
 */
export async function fetchTicketQueue(
  params: {
    status?: string;
    mine?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
): Promise<SupportTicketQueue> {
  let query = supabase.rpc('support_ticket_queue', {
    p_status: params.status ?? 'all',
    p_mine: params.mine ?? false,
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load the ticket queue', error.message);
  return mapTicketQueue(data);
}

/** The caller's own tickets for /account/support, newest activity first. */
export async function fetchMyTickets(signal?: AbortSignal): Promise<MySupportTicket[]> {
  let query = supabase.rpc('my_support_tickets');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load your tickets', error.message);
  return asRows(asRecord(data).tickets).map(mapMyTicket);
}

/**
 * One ticket + its thread, read from the tables: RLS decides what the caller
 * may see, so a customer never receives internal notes and staff see the
 * whole thread. A ticket the read does not return is reported as missing.
 */
export async function fetchTicketDetail(
  ticketId: string,
  signal?: AbortSignal,
): Promise<{ ticket: SupportTicketDetail; messages: SupportTicketMessage[] }> {
  let ticketQuery = supabase
    .from('support_tickets')
    .select(
      'id, ticket_no, customer_id, customer_email, customer_name, subject, category, priority, status, assigned_agent_id, order_id, created_at, updated_at, resolved_at',
    )
    .eq('id', ticketId);
  if (signal) ticketQuery = ticketQuery.abortSignal(signal);

  const { data: ticketRow, error: ticketError } = await ticketQuery.maybeSingle();
  if (ticketError) throw rpcFailed('Could not load this ticket', ticketError.message);
  if (!ticketRow) throw new Error('Ticket not found.');

  let messageQuery = supabase
    .from('support_ticket_messages')
    .select('id, author_id, author_role, body, internal_note, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (signal) messageQuery = messageQuery.abortSignal(signal);

  const { data: messageRows, error: messageError } = await messageQuery;
  if (messageError) throw rpcFailed('Could not load this conversation', messageError.message);

  const agentName = ticketRow.assigned_agent_id
    ? await fetchAgentName(ticketRow.assigned_agent_id)
    : null;

  return {
    ticket: {
      id: ticketRow.id,
      ticketNo: `VD-${String(ticketRow.ticket_no).padStart(6, '0')}`,
      subject: ticketRow.subject,
      category: categoryOf(ticketRow.category),
      priority: priorityOf(ticketRow.priority),
      status: statusOf(ticketRow.status),
      orderId: ticketRow.order_id,
      messages: (messageRows ?? []).filter((m) => !m.internal_note).length,
      lastMessagePreview: null,
      lastMessageAt: null,
      agentName,
      createdAt: ticketRow.created_at,
      updatedAt: ticketRow.updated_at,
      resolvedAt: ticketRow.resolved_at,
      customerId: ticketRow.customer_id,
      customerName: ticketRow.customer_name,
      customerEmail: ticketRow.customer_email,
      assignedAgentId: ticketRow.assigned_agent_id,
    },
    messages: (messageRows ?? []).map((row) => ({
      id: row.id,
      authorId: row.author_id,
      authorRole: (['customer', 'support', 'admin'] as const).includes(row.author_role as never)
        ? (row.author_role as SupportTicketMessage['authorRole'])
        : 'support',
      body: row.body,
      internalNote: row.internal_note === true,
      createdAt: row.created_at,
    })),
  };
}

/** Agent display names live on profiles; staff reads resolve them, customers may not. */
async function fetchAgentName(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', agentId)
    .maybeSingle();
  if (error || !data) return null;
  return data.name?.trim() ? data.name : data.email;
}

/** The customer's opening move; the database returns the new ticket's number. */
export async function createSupportTicket(input: {
  subject: string;
  category: SupportTicketCategory;
  body: string;
  priority?: SupportTicketPriority;
  orderId?: string | null;
}): Promise<{ id: string; ticketNo: string }> {
  const { data, error } = await supabase.rpc('create_support_ticket', {
    p_subject: input.subject,
    p_category: input.category,
    p_body: input.body,
    p_priority: input.priority ?? 'normal',
    p_order_id: input.orderId ?? undefined,
  });
  if (error) throw rpcFailed('Could not open your ticket', error.message);
  const root = asRecord(data);
  return { id: text(root.id), ticketNo: text(root.ticketNo) };
}

/** One reply writer for both sides; the RPC decides the author's role and the status move. */
export async function replySupportTicket(
  ticketId: string,
  body: string,
  internalNote = false,
): Promise<{ messageId: string; status: SupportTicketStatus }> {
  const { data, error } = await supabase.rpc('reply_support_ticket', {
    p_ticket_id: ticketId,
    p_body: body,
    p_internal_note: internalNote,
  });
  if (error) throw rpcFailed('Could not post your reply', error.message);
  const root = asRecord(data);
  return { messageId: text(root.messageId), status: statusOf(root.status) };
}

/** Handing a ticket over is a staff decision; the RPC validates the agent's roles. */
export async function assignSupportTicket(ticketId: string, agentId: string): Promise<string> {
  const { error } = await supabase.rpc('assign_support_ticket', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
  });
  if (error) throw rpcFailed('Could not assign this ticket', error.message);
  return ticketId;
}

/** The desk's deliberate status moves; resolving/closing stamps resolved_at in the RPC. */
export async function setSupportTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
): Promise<string> {
  const { error } = await supabase.rpc('set_support_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });
  if (error) throw rpcFailed('Could not change this ticket', error.message);
  return ticketId;
}
