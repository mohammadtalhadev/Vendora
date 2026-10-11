import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as disputes from './disputes';
import {
  disputeMessageRow,
  disputeRow,
  productRow,
  storeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const SELLER = 'vendor-1';
const STORE = 'store-1';
const OTHER_STORE = 'store-2';
const CASE = '00000000-0000-4000-8000-000000000601';
const OTHER_CASE = '00000000-0000-4000-8000-000000000602';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: SELLER, email: 'seller@demo.test' },
  };
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: SELLER, store_name: 'Nova Tech' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: OTHER_STORE, store_name: 'Other Shop' }));
  supabaseDouble.seedProduct(productRow({ seller_id: STORE }));
});

describe('fetchVendorDisputes', () => {
  it('returns the cases naming this store, most recently touched first', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, vendor_id: STORE, updated_at: '2026-10-07T00:00:00.000Z' }));
    supabaseDouble.seedDispute(
      disputeRow({
        id: OTHER_CASE,
        vendor_id: STORE,
        reason: 'Damaged on arrival',
        status: 'under_review',
        urgency: 'urgent',
        resolution_note: 'Partial refund issued.',
        resolution_amount: 25,
        updated_at: '2026-10-09T00:00:00.000Z',
      }),
    );
    supabaseDouble.seedDispute(disputeRow({ id: 'case-3', vendor_id: OTHER_STORE }));

    const list = await disputes.fetchVendorDisputes();

    expect(list.map((dispute) => dispute.id)).toEqual([OTHER_CASE, CASE]);
    expect(list[0]).toMatchObject({
      reason: 'Damaged on arrival',
      status: 'under_review',
      urgency: 'urgent',
      customerName: 'Alex Buyer',
      resolutionNote: 'Partial refund issued.',
      resolutionAmount: 25,
    });
    // A case the platform has not settled carries no resolution to show.
    expect(list[1]).toMatchObject({ resolutionNote: undefined, resolutionAmount: undefined });
  });

  it('refuses to guess a store for an account that owns none', async () => {
    supabaseDouble.authState.session = {
      access_token: 't',
      user: { id: 'shopper-1', email: 'buyer@demo.test' },
    };

    await expect(disputes.fetchVendorDisputes()).rejects.toThrow(/no store/i);
  });

  it('reports a denied read instead of showing an empty queue', async () => {
    supabaseDouble.failures.disputes = 'row-level security';

    await expect(disputes.fetchVendorDisputes()).rejects.toThrow(/Failed to load your escalations: row-level security/);
  });
});

describe('fetchDisputeMessages', () => {
  it('reads the whole thread oldest first, keeping staff notes labelled', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, vendor_id: STORE }));
    supabaseDouble.seedDisputeMessage(
      disputeMessageRow({ id: 'm2', dispute_id: CASE, created_at: '2026-10-08T00:00:00.000Z' }),
    );
    supabaseDouble.seedDisputeMessage(
      disputeMessageRow({
        id: 'm1',
        dispute_id: CASE,
        sender_role: 'support',
        sender_name: 'Vendora Support',
        content: 'Asked the rider for a scan history.',
        is_internal_note: true,
        created_at: '2026-10-07T12:00:00.000Z',
      }),
    );
    supabaseDouble.seedDisputeMessage(disputeMessageRow({ id: 'm3', dispute_id: OTHER_CASE }));

    const messages = await disputes.fetchDisputeMessages(CASE);

    expect(messages.map((message) => message.id)).toEqual(['m1', 'm2']);
    expect(messages[0]).toMatchObject({
      senderRole: 'support',
      body: 'Asked the rider for a scan history.',
      isInternalNote: true,
    });
  });
});

describe('postDisputeMessage', () => {
  it('replies as the store, wearing its own name rather than the browser’s', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, vendor_id: STORE }));

    const message = await disputes.postDisputeMessage(CASE, 'We have reshipped the order today.');

    expect(message).toMatchObject({
      disputeId: CASE,
      senderRole: 'vendor',
      senderName: 'Nova Tech',
      body: 'We have reshipped the order today.',
      isInternalNote: false,
    });
    expect(supabaseDouble.tables.dispute_messages).toHaveLength(1);
  });

  it('carries the database rejection when the case belongs to someone else', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, vendor_id: OTHER_STORE }));
    supabaseDouble.failures.dispute_messages = 'row-level security';

    await expect(disputes.postDisputeMessage(CASE, 'Not my case.')).rejects.toThrow(
      /Failed to send the message: row-level security/,
    );
    expect(supabaseDouble.tables.dispute_messages).toHaveLength(0);
  });

  it('needs a session before it will write', async () => {
    supabaseDouble.authState.session = null;

    await expect(disputes.postDisputeMessage(CASE, 'hello')).rejects.toThrow(/Sign in to manage your store/);
  });
});
