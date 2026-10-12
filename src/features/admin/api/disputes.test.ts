import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as disputes from './disputes';
import {
  disputeMessageRow,
  disputeRow,
  orderRow,
  profileRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const ADMIN = 'admin-1';
const SUPPORT = 'support-2';
const OUTSIDER = 'user-9';
const ORDER = '00000000-0000-4000-8000-000000000401';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const CASE = '00000000-0000-4000-8000-000000000601';

/** The package the buyer was charged 80 + 10 shipping for, so its gross is 90. */
beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: SUPPORT, roles: ['support'], name: 'Zara Agent' }));
  supabaseDouble.seedOrder(orderRow({ id: ORDER }));
  supabaseDouble.seedSubOrder(subOrderRow({
    id: PACKAGE, order_group_id: ORDER, subtotal: 80, shipping_fee: 10, status: 'delivered',
  }));
});

describe('fetchDisputeQueue', () => {
  it('maps the case the queue built from the rows it joined', async () => {
    supabaseDouble.seedDispute(disputeRow({
      id: CASE, sub_order_id: PACKAGE, order_group_id: ORDER, status: 'under_review', urgency: 'urgent',
      assigned_agent_id: SUPPORT, evidence_photos: ['https://cdn.test/label.jpg'],
    }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({ dispute_id: CASE }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({ id: 'msg-2', dispute_id: CASE, content: 'The label was on it.' }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({ id: 'msg-3', dispute_id: 'other-case' }));

    const queue = await disputes.fetchDisputeQueue();

    expect(queue).toMatchObject({ page: 1, pageSize: 12, total: 1 });
    expect(queue.rows).toHaveLength(1);
    expect(queue.rows[0]).toMatchObject({
      id: CASE,
      reason: 'Package never arrived',
      status: 'under_review',
      urgency: 'urgent',
      customerId: 'user-1',
      customerName: 'Alex Buyer',
      vendorId: 'store-1',
      vendorName: 'Demo Store',
      subOrderId: PACKAGE,
      orderGroupId: ORDER,
      evidencePhotos: ['https://cdn.test/label.jpg'],
      agentName: 'Zara Agent',
      // `count(*) from dispute_messages where dispute_id = d.id` - this case's two, not the table's three.
      messages: 2,
      packageGross: 90,
      packageStatus: 'delivered',
      createdAt: '2026-10-07T00:00:00.000Z',
      updatedAt: '2026-10-07T00:00:00.000Z',
    });
  });

  it('maps a case with nothing joined as nulls, zeros and an empty list', async () => {
    supabaseDouble.seedDispute(disputeRow({
      id: CASE, sub_order_id: null, order_group_id: null, customer_id: null, vendor_id: null,
      assigned_agent_id: null,
    }));
    supabaseDouble.seedDispute(disputeRow({
      id: 'case-unknown', reason: 'Charged twice', status: 'in_arbitration', urgency: 'critical',
      created_at: '2026-10-08T00:00:00.000Z', updated_at: '2026-10-08T00:00:00.000Z',
    }));

    const queue = await disputes.fetchDisputeQueue();

    expect(queue.rows[0]).toEqual({
      id: CASE,
      reason: 'Package never arrived',
      status: 'open',
      urgency: 'standard',
      customerId: null,
      customerName: 'Alex Buyer',
      vendorId: null,
      vendorName: 'Demo Store',
      subOrderId: null,
      orderGroupId: null,
      evidencePhotos: [],
      resolutionNote: null,
      resolutionAmount: null,
      agentName: null,
      assignedAgentId: null,
      messages: 0,
      packageGross: 0,
      refundedAmount: 0,
      remainingGross: 0,
      packageStatus: 'n/a',
      createdAt: '2026-10-07T00:00:00.000Z',
      updatedAt: '2026-10-07T00:00:00.000Z',
    });
    // A state the console has no badge for still reads as a case, not as a crash.
    expect(queue.rows[1]).toMatchObject({ id: 'case-unknown', status: 'open', urgency: 'standard' });
  });

  it('takes the badges, the exposure and the total from Postgres rather than adding them up here', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));
    // The `sum(package_gross)` over every open case and the facets over the whole table are
    // `admin_dispute_queue`'s arithmetic - asserted against real Postgres by `scripts/smoke-rpcs.ts`
    // - so the test pins it as a fixture and checks only that the map hands it over.
    supabaseDouble.setAdminQueue('admin_dispute_queue', {
      counts: {
        open: 41, underReview: 7, escalated: 3, resolved: 128, urgent: 11,
        unassigned: 22, mine: 5, awaitingStaff: 51,
      },
      exposure: 9620.5,
      total: 179,
    });

    const queue = await disputes.fetchDisputeQueue();

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_dispute_queue');
    expect(queue.total).toBe(179);
    expect(queue.exposure).toBe(9620.5);
    expect(queue.counts).toEqual({
      open: 41, underReview: 7, escalated: 3, resolved: 128, urgent: 11,
      unassigned: 22, mine: 5, awaitingStaff: 51,
    });
    expect(queue.rows).toHaveLength(1);
  });

  it('asks the database for the filter and the page instead of trimming one page locally', async () => {
    supabaseDouble.seedDispute(disputeRow({
      id: 'case-urgent', reason: 'Charged twice', urgency: 'urgent', created_at: '2026-10-09T00:00:00.000Z',
    }));
    supabaseDouble.seedDispute(disputeRow({
      id: 'case-old', reason: 'Package never arrived', created_at: '2026-10-01T00:00:00.000Z',
    }));
    supabaseDouble.seedDispute(disputeRow({
      id: 'case-waiting', reason: 'Wrong item shipped', created_at: '2026-10-03T00:00:00.000Z',
    }));

    const first = await disputes.fetchDisputeQueue();

    // Exactly the four arguments the read takes, defaulted - and no filter of the desk's own.
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_status: 'all', p_search: '', p_page: 1, p_page_size: 12,
    });
    expect(first.total).toBe(3);
    expect(first.rows.map((row) => row.id)).toEqual(['case-urgent', 'case-old', 'case-waiting']);

    const secondPage = await disputes.fetchDisputeQueue({ page: 2, pageSize: 1 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_status: 'all', p_search: '', p_page: 2, p_page_size: 1,
    });
    expect(secondPage).toMatchObject({ page: 2, pageSize: 1, total: 3 });
    expect(secondPage.rows.map((row) => row.id)).toEqual(['case-old']);

    const filtered = await disputes.fetchDisputeQueue({ status: 'resolved', search: 'twice' });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_status: 'resolved', p_search: 'twice', p_page: 1, p_page_size: 12,
    });
    // Nothing is closed, so the honest answer is no rows - the search reached Postgres.
    expect(filtered).toMatchObject({ total: 0, rows: [] });
  });

  it('refuses an account that is not staff, with the database’s own words', async () => {
    supabaseDouble.seedProfile(profileRow({ id: OUTSIDER, roles: ['customer'], name: 'Alex Buyer' }));
    supabaseDouble.authState.session = { access_token: 't', user: { id: OUTSIDER, email: 'alex@demo.test' } };

    await expect(disputes.fetchDisputeQueue()).rejects.toThrow(/Failed to load disputes: Only staff can read the dispute queue/i);
  });

  it('throws on a failed read instead of an empty queue with invented zeros', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));
    supabaseDouble.failRpc('permission denied for function admin_dispute_queue');

    await expect(disputes.fetchDisputeQueue()).rejects.toThrow(
      /Failed to load disputes: permission denied for function admin_dispute_queue/i,
    );
  });

  it('reports a queue with no cases as honestly empty', async () => {
    const queue = await disputes.fetchDisputeQueue();

    expect(queue).toEqual({
      page: 1,
      pageSize: 12,
      total: 0,
      counts: { open: 0, underReview: 0, escalated: 0, resolved: 0, urgent: 0, unassigned: 0, mine: 0, awaitingStaff: 0 },
      exposure: 0,
      rows: [],
    });
  });
});

describe('escalateDispute', () => {
  it('sends the case and the note, and NULL when the admin typed no reason', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    const result = await disputes.escalateDispute(CASE, 'Needs a senior decision');

    expect(result).toEqual({ id: CASE, status: 'escalated' });
    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_escalate_dispute',
      args: { p_dispute_id: CASE, p_note: 'Needs a senior decision' },
    });

    await disputes.escalateDispute(CASE);

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_dispute_id: CASE, p_note: null });
  });

  it('hands the case to the platform and keeps the justification on it', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    await disputes.escalateDispute(CASE, 'Chargeback risk - senior ruling needed');

    expect(supabaseDouble.tables.disputes.find((row) => row.id === CASE)).toMatchObject({
      status: 'escalated', urgency: 'urgent', assigned_agent_id: ADMIN,
    });
    expect(supabaseDouble.tables.dispute_messages[0]).toMatchObject({
      dispute_id: CASE, sender_role: 'support', content: 'Chargeback risk - senior ruling needed',
      is_internal_note: true,
    });
    // No note means no message, because an empty internal note decides nothing.
    await disputes.escalateDispute(CASE);
    expect(supabaseDouble.tables.dispute_messages).toHaveLength(1);
  });

  it('refuses an account outside the platform team, and a case the platform does not have', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: SUPPORT, email: 'zara@vendora.market' } };

    await expect(disputes.escalateDispute(CASE, 'note')).rejects.toThrow(
      /Could not escalate this dispute: Only the platform team can escalate a dispute/i,
    );

    supabaseDouble.seedAdmin();

    await expect(disputes.escalateDispute('case-missing')).rejects.toThrow(
      /Could not escalate this dispute: Dispute not found/i,
    );
  });
});

describe('resolveDispute', () => {
  it('rules the refund the platform decided and the case reads back closed', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, sub_order_id: PACKAGE }));

    await expect(disputes.resolveDispute(CASE, 'resolved_refund', 'Refunded the package in full', 74))
      .resolves.toBe(true);

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'resolve_dispute',
      args: {
        p_dispute_id: CASE, p_outcome: 'resolved_refund', p_note: 'Refunded the package in full', p_amount: 74,
      },
    });
    expect(supabaseDouble.tables.sub_orders.find((row) => row.id === PACKAGE)?.status).toBe('refunded');

    const queue = await disputes.fetchDisputeQueue();
    expect(queue.counts.resolved).toBe(1);
    expect(queue.rows[0]).toMatchObject({
      status: 'resolved_refund', resolutionNote: 'Refunded the package in full', resolutionAmount: 74,
    });
  });

  it('denies a claim without moving any money', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, sub_order_id: PACKAGE }));

    await disputes.resolveDispute(CASE, 'resolved_denied', 'Tracking shows it was signed for');

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_dispute_id: CASE, p_outcome: 'resolved_denied', p_note: 'Tracking shows it was signed for', p_amount: null,
    });
    expect(supabaseDouble.tables.disputes.find((row) => row.id === CASE)).toMatchObject({
      status: 'resolved_denied', resolution_amount: null,
    });
    expect(supabaseDouble.tables.sub_orders.find((row) => row.id === PACKAGE)?.status).toBe('delivered');
    expect(supabaseDouble.tables.refunds).toHaveLength(0);
  });

  it('surfaces the database’s refusal and names the ruling that failed', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    await expect(disputes.resolveDispute(CASE, 'void' as 'resolved_refund', 'A note')).rejects.toThrow(
      /Could not record this denial: Invalid outcome/i,
    );

    supabaseDouble.authState.session = { access_token: 't', user: { id: OUTSIDER, email: 'alex@demo.test' } };

    await expect(disputes.resolveDispute(CASE, 'resolved_refund', 'A note')).rejects.toThrow(
      /Could not record this refund: Not authorized/i,
    );
  });
});

describe('refundSubOrder', () => {
  it('writes the refund as a ledger row and reports the money it returned', async () => {
    const result = await disputes.refundSubOrder(PACKAGE, 90, 'Delivered three weeks late');

    expect(result).toEqual({ subOrderId: PACKAGE, amount: 90, reason: 'Delivered three weeks late' });
    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_refund_sub_order',
      args: { p_sub_order_id: PACKAGE, p_amount: 90, p_reason: 'Delivered three weeks late' },
    });
    expect(supabaseDouble.tables.refunds[0]).toMatchObject({
      sub_order_id: PACKAGE, order_group_id: ORDER, amount: 90, processed_by: ADMIN,
    });
    expect(supabaseDouble.tables.sub_orders.find((row) => row.id === PACKAGE)?.status).toBe('refunded');
  });

  it('refuses to refund more than the buyer was charged, and writes nothing', async () => {
    await expect(disputes.refundSubOrder(PACKAGE, 999, 'The whole order again')).rejects.toThrow(
      /Could not refund this package: Cannot refund more than the buyer was charged for this package/i,
    );

    expect(supabaseDouble.tables.refunds).toHaveLength(0);
  });

  it('refuses an account outside the platform team and a package that is not there', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: SUPPORT, email: 'zara@vendora.market' } };

    await expect(disputes.refundSubOrder(PACKAGE, 10, 'Goodwill')).rejects.toThrow(
      /Could not refund this package: Only the platform team can refund a package/i,
    );

    supabaseDouble.seedAdmin();

    await expect(disputes.refundSubOrder('package-missing', 10, 'Goodwill')).rejects.toThrow(
      /Could not refund this package: Package not found/i,
    );
  });
});
