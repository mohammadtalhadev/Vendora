import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The ticket API is mapped against a hand stub of the supabase client: the
 * shared test double implements the dispute RPCs in-process, and tickets are
 * covered at the SQL layer by scripts/smoke-rpcs.ts instead. What belongs to
 * the client - the argument names it sends and the shape it maps back - is
 * pinned here.
 */
const rpc = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: true,
}));

import {
  createSupportTicket,
  mapMyTicket,
  mapTicketQueue,
  replySupportTicket,
} from './tickets';

beforeEach(() => {
  rpc.mockReset();
});

describe('mapTicketQueue', () => {
  it('maps the queue contract the RPC returns, counts included', () => {
    const queue = mapTicketQueue({
      page: 2,
      pageSize: 12,
      total: 30,
      counts: {
        all: 30,
        open: 4,
        inProgress: 3,
        waitingCustomer: 2,
        resolved: 15,
        closed: 6,
        awaitingStaff: 7,
        unassigned: 5,
        mine: 1,
        urgent: 2,
      },
      rows: [
        {
          id: 'ticket-1',
          ticketNo: 'VD-000007',
          customerId: 'user-1',
          customerName: 'Alex Buyer',
          customerEmail: 'alex@example.pk',
          subject: 'Cannot sign in',
          category: 'account',
          priority: 'high',
          status: 'in_progress',
          assignedAgentId: 'agent-1',
          agentName: 'Zara Agent',
          orderId: null,
          messages: 3,
          lastMessagePreview: 'Have you tried resetting…',
          lastMessageAt: '2026-10-15T09:00:00Z',
          createdAt: '2026-10-15T08:00:00Z',
          updatedAt: '2026-10-15T09:00:00Z',
          resolvedAt: null,
        },
      ],
    });

    expect(queue.total).toBe(30);
    expect(queue.counts).toMatchObject({ awaitingStaff: 7, unassigned: 5, mine: 1 });
    expect(queue.rows[0]).toMatchObject({
      id: 'ticket-1',
      ticketNo: 'VD-000007',
      category: 'account',
      priority: 'high',
      status: 'in_progress',
      agentName: 'Zara Agent',
      messages: 3,
    });
  });

  it('falls back to safe values for unknown enum text', () => {
    const queue = mapTicketQueue({
      rows: [{ id: 't', category: 'nonsense', priority: 'whenever', status: 'limbo' }],
    });
    expect(queue.rows[0].category).toBe('other');
    expect(queue.rows[0].priority).toBe('normal');
    expect(queue.rows[0].status).toBe('open');
    expect(queue.total).toBe(0);
  });
});

describe('mapMyTicket', () => {
  it('maps a customer-side ticket without staff fields', () => {
    const ticket = mapMyTicket({
      id: 'ticket-9',
      ticketNo: 'VD-000009',
      subject: 'Where is my parcel?',
      category: 'delivery',
      priority: 'normal',
      status: 'waiting_customer',
      orderId: 'order-1',
      messages: 2,
      agentName: null,
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    });
    expect(ticket).toMatchObject({
      ticketNo: 'VD-000009',
      status: 'waiting_customer',
      orderId: 'order-1',
      agentName: null,
    });
  });
});

describe('ticket writes', () => {
  it('createSupportTicket sends the RPC arguments and returns the number', async () => {
    rpc.mockResolvedValue({ data: { id: 'ticket-1', ticketNo: 'VD-000001' }, error: null });

    const result = await createSupportTicket({
      subject: 'Locked out',
      category: 'account',
      body: 'The reset link expired.',
      priority: 'high',
      orderId: null,
    });

    expect(rpc).toHaveBeenCalledWith('create_support_ticket', {
      p_subject: 'Locked out',
      p_category: 'account',
      p_body: 'The reset link expired.',
      p_priority: 'high',
      p_order_id: undefined,
    });
    expect(result).toEqual({ id: 'ticket-1', ticketNo: 'VD-000001' });
  });

  it('createSupportTicket surfaces the database refusal', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'A subject is required' } });
    await expect(
      createSupportTicket({ subject: '', category: 'other', body: 'x' }),
    ).rejects.toThrow(/A subject is required/);
  });

  it('replySupportTicket defaults the internal-note flag off and maps the new status', async () => {
    rpc.mockResolvedValue({
      data: { messageId: 'm-1', ticketId: 'ticket-1', status: 'in_progress' },
      error: null,
    });

    const result = await replySupportTicket('ticket-1', 'That worked, thanks');

    expect(rpc).toHaveBeenCalledWith('reply_support_ticket', {
      p_ticket_id: 'ticket-1',
      p_body: 'That worked, thanks',
      p_internal_note: false,
    });
    expect(result).toEqual({ messageId: 'm-1', status: 'in_progress' });
  });
});
