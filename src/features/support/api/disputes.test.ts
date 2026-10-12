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
  refundRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const SUPPORT = 'support-1';
const SUPPORT2 = 'support-2';
const CUSTOMER = 'user-1';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const CASE = '00000000-0000-4000-8000-000000000601';

/** The desk reads with a support role on its own profile: that is what `require_staff()` checks. */
const signIn = (id: string, roles: string[]) => {
  supabaseDouble.seedProfile(profileRow({ id, roles, name: 'Talha Javaid' }));
  supabaseDouble.authState.session = { access_token: 't', user: { id, email: `${id}@demo.test` } };
};

beforeEach(() => {
  supabaseDouble.reset();
  signIn(SUPPORT, ['customer', 'support']);
  supabaseDouble.seedProfile(profileRow({ id: SUPPORT2, roles: ['customer', 'support'], name: 'Zara Agent' }));
  supabaseDouble.seedProfile(profileRow({ id: CUSTOMER, roles: ['customer'], name: 'Alex Buyer' }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, subtotal: 80, shipping_fee: 10 }));
});

describe('fetchDisputeQueue', () => {
  it('maps the row the queue built, including what the refund ledger already returned', async () => {
    supabaseDouble.seedDispute(disputeRow({
      id: CASE,
      sub_order_id: PACKAGE,
      assigned_agent_id: SUPPORT2,
      urgency: 'urgent',
      evidence_photos: ['https://cdn.test/label.jpg'],
    }));
    supabaseDouble.seedRefund(refundRow({ sub_order_id: PACKAGE, amount: 25 }));

    const queue = await disputes.fetchDisputeQueue();

    expect(queue.rows).toHaveLength(1);
    expect(queue.rows[0]).toMatchObject({
      id: CASE,
      reason: 'Package never arrived',
      status: 'open',
      urgency: 'urgent',
      customerName: 'Alex Buyer',
      vendorName: 'Demo Store',
      agentName: 'Zara Agent',
      assignedAgentId: SUPPORT2,
      evidencePhotos: ['https://cdn.test/label.jpg'],
      packageGross: 90,
      refundedAmount: 25,
      remainingGross: 65,
      packageStatus: 'placed',
      messages: 0,
    });
  });

  it('takes the pool badges from the rows rather than adding three figures in the browser', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: 'case-open', status: 'open' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-mine', status: 'under_review', assigned_agent_id: SUPPORT }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-esc', status: 'escalated', assigned_agent_id: SUPPORT2 }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-denied', status: 'resolved_denied' }));

    const { counts } = await disputes.fetchDisputeQueue();

    expect(counts).toMatchObject({ open: 1, underReview: 1, escalated: 1, resolved: 1, unassigned: 1, mine: 1, awaitingStaff: 3 });
  });

  it('asks Postgres for the pool rather than filtering one page locally', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: 'case-mine', assigned_agent_id: SUPPORT }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-other', assigned_agent_id: SUPPORT2 }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-none' }));

    const mine = await disputes.fetchDisputeQueue({ status: 'awaiting_staff', assignedTo: SUPPORT });
    const unassigned = await disputes.fetchDisputeQueue({ status: 'awaiting_staff', unassigned: true });

    expect(mine.rows.map((row) => row.id)).toEqual(['case-mine']);
    expect(unassigned.rows.map((row) => row.id)).toEqual(['case-none']);
  });

  it('reads the resolved pool as the two rulings it covers', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: 'case-a', status: 'resolved_refund' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-b', status: 'resolved_denied' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-live', status: 'open' }));

    const queue = await disputes.fetchDisputeQueue({ status: 'resolved' });

    expect(queue.rows.map((row) => row.id).sort()).toEqual(['case-a', 'case-b']);
  });

  it('refuses an account that is not staff, with the database’s own words', async () => {
    signIn(CUSTOMER, ['customer']);

    await expect(disputes.fetchDisputeQueue()).rejects.toThrow(/only staff can read the dispute queue/i);
  });

  it('surfaces a failed read instead of returning an empty queue', async () => {
    supabaseDouble.failRpc('permission denied for function support_dispute_queue');

    await expect(disputes.fetchDisputeQueue()).rejects.toThrow(/could not load the dispute queue/i);
  });
});

describe('fetchDisputeThread', () => {
  it('returns the conversation in the order the database stored it', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({
      id: 'msg-2', dispute_id: CASE, content: 'Here is the label photo.', sender_role: 'customer',
      created_at: '2026-10-08T00:00:00.000Z',
    }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({
      id: 'msg-1', dispute_id: CASE, content: 'What did you receive?', sender_role: 'support',
      sender_name: 'Talha Javaid', is_internal_note: false, created_at: '2026-10-07T00:00:00.000Z',
    }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({
      id: 'msg-3', dispute_id: CASE, content: 'Store shipped the wrong SKU.', sender_role: 'support',
      sender_name: 'Talha Javaid', is_internal_note: true, attachments: ['https://cdn.test/note.jpg'],
      created_at: '2026-10-09T00:00:00.000Z',
    }));

    const thread = await disputes.fetchDisputeThread(CASE);

    expect(thread.map((message) => message.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
    expect(thread[2]).toMatchObject({ internalNote: true, senderName: 'Talha Javaid', attachments: ['https://cdn.test/note.jpg'] });
    expect(thread[1]).toMatchObject({ senderRole: 'customer', senderName: 'Alex Buyer' });
  });

  it('leaves another case’s messages out of the thread', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({ dispute_id: 'other-case' }));

    await expect(disputes.fetchDisputeThread(CASE)).resolves.toEqual([]);
  });
});

describe('fetchSupportAgents', () => {
  it('lists only support accounts and marks who is asking', async () => {
    const { agents } = { agents: await disputes.fetchSupportAgents() };

    expect(agents.map((agent) => agent.id).sort()).toEqual([SUPPORT, SUPPORT2]);
    expect(agents.find((agent) => agent.id === SUPPORT)?.isMe).toBe(true);
    expect(agents.find((agent) => agent.id === SUPPORT2)?.name).toBe('Zara Agent');
  });

  it('counts the cases each agent is holding', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: 'case-1', assigned_agent_id: SUPPORT2, status: 'under_review' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-2', assigned_agent_id: SUPPORT2, status: 'resolved_denied' }));

    const agents = await disputes.fetchSupportAgents();

    expect(agents.find((agent) => agent.id === SUPPORT2)?.openCases).toBe(1);
  });
});

describe('assignDispute', () => {
  beforeEach(() => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));
  });

  it('records the handover on the case', async () => {
    await expect(disputes.assignDispute(CASE, SUPPORT2)).resolves.toBe(CASE);

    const queue = await disputes.fetchDisputeQueue();
    expect(queue.rows[0]).toMatchObject({ assignedAgentId: SUPPORT2, agentName: 'Zara Agent' });
  });

  it('refuses to hand a case to the agent already holding it', async () => {
    await expect(disputes.assignDispute(CASE, SUPPORT)).rejects.toThrow(/cannot assign a dispute to yourself/i);
  });

  it('refuses an account with no support access', async () => {
    await expect(disputes.assignDispute(CASE, CUSTOMER)).rejects.toThrow(/does not have support access/i);
  });
});

describe('escalateDispute', () => {
  it('raises urgency, takes the case and keeps the reason on the thread', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    await expect(disputes.escalateDispute(CASE, 'Needs a senior decision')).resolves.toBe(CASE);

    const queue = await disputes.fetchDisputeQueue();
    expect(queue.rows[0]).toMatchObject({ status: 'escalated', urgency: 'urgent', assignedAgentId: SUPPORT });
    const thread = await disputes.fetchDisputeThread(CASE);
    expect(thread[0]).toMatchObject({ content: 'Needs a senior decision', internalNote: true });
  });

  it('will not reopen a closed case', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, status: 'resolved_refund' }));

    await expect(disputes.escalateDispute(CASE, 'too late')).rejects.toThrow(/resolved disputes cannot be escalated/i);
  });
});

describe('postDisputeMessage', () => {
  it('posts as staff and returns the message id', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    const id = await disputes.postDisputeMessage(CASE, 'Please send a photo of the label.');
    const thread = await disputes.fetchDisputeThread(CASE);

    expect(thread.map((message) => message.id)).toContain(id);
    expect(thread[0]).toMatchObject({ senderRole: 'support', senderName: 'Talha Javaid', internalNote: false });
  });

  it('refuses an empty reply', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE }));

    await expect(disputes.postDisputeMessage(CASE, '   ')).rejects.toThrow(/write something before posting/i);
  });
});

describe('refundPackage', () => {
  beforeEach(() => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, sub_order_id: PACKAGE }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, subtotal: 80, shipping_fee: 10, status: 'delivered' }));
  });

  it('returns what the ledger now holds and keeps the package open', async () => {
    const result = await disputes.refundPackage(PACKAGE, 30, 'Goodwill on late delivery');

    expect(result).toEqual({ subOrderId: PACKAGE, amount: 30, remainingGross: 60, fullyRefunded: false });

    const queue = await disputes.fetchDisputeQueue();
    expect(queue.rows[0]).toMatchObject({ refundedAmount: 30, remainingGross: 60 });
  });

  it('closes the package only when the whole amount is back', async () => {
    await disputes.refundPackage(PACKAGE, 30, 'Part now');
    const rest = await disputes.refundPackage(PACKAGE, 60, 'The balance');

    expect(rest).toEqual({ subOrderId: PACKAGE, amount: 60, remainingGross: 0, fullyRefunded: true });

    const queue = await disputes.fetchDisputeQueue();
    expect(queue.rows[0]).toMatchObject({ packageStatus: 'refunded', remainingGross: 0 });
  });

  it('refuses more than the buyer was charged', async () => {
    await expect(disputes.refundPackage(PACKAGE, 999, 'greed')).rejects.toThrow(/more than the buyer was charged/i);
  });

  it('refuses to refund a package that is already closed', async () => {
    await disputes.refundPackage(PACKAGE, 90, 'Everything');

    await expect(disputes.refundPackage(PACKAGE, 5, 'again')).rejects.toThrow(/already been fully refunded/i);
  });

  it('refuses an amount that is not above zero', async () => {
    await expect(disputes.refundPackage(PACKAGE, 0, 'nothing')).rejects.toThrow(/amount above zero/i);
  });
});

describe('lookupOrders', () => {
  it('joins the packages onto the order it finds', async () => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_email: 'alex@demo.test', payment_status: 'succeeded' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, order_group_id: 'order-1', subtotal: 80, shipping_fee: 10 }));

    const found = await disputes.lookupOrders('alex@demo.test');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      id: 'order-1',
      customerEmail: 'alex@demo.test',
      paymentStatus: 'succeeded',
      hasOpenReturn: false,
    });
    expect(found[0].packages[0]).toMatchObject({ id: PACKAGE, status: 'placed', gross: 90 });
  });

  it('reads nothing for an email with no orders in the window', async () => {
    supabaseDouble.seedOrder(orderRow({ customer_email: 'someone-else@demo.test' }));

    await expect(disputes.lookupOrders('alex@demo.test')).resolves.toEqual([]);
  });
});

describe('notifyAccount', () => {
  it('writes the notice against the account the desk picked', async () => {
    const id = await disputes.notifyAccount(CUSTOMER, 'Your return was approved', 'Reply with evidence.');

    expect(id).toBeTruthy();
    expect(supabaseDouble.tables.notifications[0]).toMatchObject({
      id, user_id: CUSTOMER, title: 'Your return was approved', type: 'dispute',
    });
  });

  it('refuses a notice with no title', async () => {
    await expect(disputes.notifyAccount(CUSTOMER, '  ', 'body')).rejects.toThrow(/title is required/i);
  });
});
