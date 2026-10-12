import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as moderation from './moderation';
import {
  categoryRow,
  productRow,
  profileRow,
  storeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const ADMIN = 'admin-1';
const OWNER = 'user-1';
const STAFF = 'staff-2';
const STORE = 'store-1';
const PLATFORM = 'store-platform';
const AUDIO = '00000000-0000-4000-8000-000000000001';
const WEAR = '00000000-0000-4000-8000-000000000002';
const FIRST = '00000000-0000-4000-8000-000000000101';
const SECOND = '00000000-0000-4000-8000-000000000102';
const THIRD = '00000000-0000-4000-8000-000000000103';
const FOURTH = '00000000-0000-4000-8000-000000000104';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: OWNER, email: 'marcus@demo.test', name: 'Marcus Seller', roles: ['vendor'] }));
  supabaseDouble.seedProfile(profileRow({ id: STAFF, email: 'dana@vendora.market', name: 'Dana Review', roles: ['support'] }));
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: OWNER, store_name: 'Nova Tech', slug: 'nova-tech', seller_type: 'vendor' }));
  // `admin_create_product_1p` looks this store up; a caller never names a seller.
  supabaseDouble.seedVendorProfile(storeRow({ id: PLATFORM, store_name: 'Vendora Direct', slug: 'vendora-direct', seller_type: 'platform' }));
  supabaseDouble.seedCategory(categoryRow({ id: AUDIO, name: 'Audio', slug: 'audio' }));
});

describe('fetchModerationQueue', () => {
  it('maps the listings the queue joined, oldest first, with the resubmission flag', async () => {
    supabaseDouble.seedProduct(productRow({
      id: SECOND, title: 'Avrio Keyboard', slug: 'avrio-keyboard', status: 'pending_review', type: 'digital',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-09-20T00:00:00.000Z', updated_at: '2026-09-20T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: FIRST, title: 'Avrio Headphones', slug: 'avrio-headphones', status: 'pending_review',
      price: 199.99, stock: 25, seller_id: STORE, category_id: AUDIO,
      images: ['https://example.test/front.png', 'https://example.test/back.png'],
      created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z',
    }));
    // Rejected on the 2nd and resubmitted on the 3rd, which is the SQL's own comparison.
    supabaseDouble.seedProduct(productRow({
      id: THIRD, title: 'Avrio Speaker', slug: 'avrio-speaker', status: 'pending_review', seller_id: STORE,
      category_id: AUDIO, moderated_by: ADMIN, moderated_at: '2026-10-02T00:00:00.000Z',
      created_at: '2026-10-02T00:00:00.000Z', updated_at: '2026-10-03T00:00:00.000Z',
    }));

    const queue = await moderation.fetchModerationQueue();

    expect(queue.rows.map((row) => row.id)).toEqual([SECOND, FIRST, THIRD]);
    expect(queue.rows[0].type).toBe('digital');
    expect(queue.rows[1].images).toEqual(['https://example.test/front.png', 'https://example.test/back.png']);
    expect(queue.rows.map((row) => row.flagged)).toEqual([false, false, true]);
    expect(queue.rows[2]).toEqual({
      id: THIRD,
      title: 'Avrio Speaker',
      slug: 'avrio-speaker',
      brand: 'AudioBrand',
      price: 199.99,
      stock: 25,
      type: 'physical',
      status: 'pending_review',
      images: ['https://example.test/headphones.png'],
      rejectionReason: null,
      createdAt: '2026-10-02T00:00:00.000Z',
      moderatedAt: '2026-10-02T00:00:00.000Z',
      moderatedBy: 'Platform Admin',
      sellerId: STORE,
      storeName: 'Nova Tech',
      sellerStatus: 'active',
      category: 'Audio',
      flagged: true,
    });
  });

  it('keeps the nulls the database left and the joins that found nothing, inventing nothing', async () => {
    supabaseDouble.seedProduct(productRow({
      id: FIRST, title: 'Orphan Listing', slug: 'orphan-listing', status: 'rejected',
      seller_id: 'store-gone', category_id: null, images: [], price: 0, stock: 0,
      rejection_reason: 'Duplicate listing', moderated_by: 'ghost-9', moderated_at: '2026-10-04T00:00:00.000Z',
      created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-04T00:00:00.000Z',
    }));

    const queue = await moderation.fetchModerationQueue({ status: 'rejected' });
    const row = queue.rows[0];

    expect(row).toMatchObject({
      rejectionReason: 'Duplicate listing',
      moderatedAt: '2026-10-04T00:00:00.000Z',
      category: null,
      moderatedBy: null,
      images: [],
    });
    // `price`/`stock` are numeric columns, so they stay numbers; an absent store is '' rather than undefined.
    expect(row.price).toBe(0);
    expect(row.stock).toBe(0);
    expect(row.storeName).toBe('');
    expect(row.sellerStatus).toBe('');
    expect(row.flagged).toBe(false);
  });

  it('sends the RPC the argument names it declares, with the screen’s defaults filled in', async () => {
    await moderation.fetchModerationQueue();

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_moderation_queue',
      args: { p_status: 'pending_review', p_search: '', p_category: null, p_page: 1, p_page_size: 12 },
    });

    await moderation.fetchModerationQueue({ status: 'approved', search: 'speaker', categoryId: AUDIO, page: 4, pageSize: 20 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_status: 'approved', p_search: 'speaker', p_category: AUDIO, p_page: 4, p_page_size: 20,
    });
  });

  it('asks the database for the filter and the page rather than trimming a page locally', async () => {
    supabaseDouble.seedProduct(productRow({
      id: FIRST, title: 'Avrio Mouse', slug: 'avrio-mouse', status: 'pending_review',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: SECOND, title: 'Avrio Keyboard', slug: 'avrio-keyboard', status: 'pending_review',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-02T00:00:00.000Z', updated_at: '2026-10-02T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: THIRD, title: 'Zenith Mouse', slug: 'zenith-mouse', status: 'pending_review',
      seller_id: STORE, category_id: WEAR, created_at: '2026-10-03T00:00:00.000Z', updated_at: '2026-10-03T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: FOURTH, title: 'Avrio Monitor', slug: 'avrio-monitor', status: 'approved',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-04T00:00:00.000Z', updated_at: '2026-10-04T00:00:00.000Z',
    }));

    const queue = await moderation.fetchModerationQueue({
      status: 'pending_review', search: 'Avrio', categoryId: AUDIO, page: 2, pageSize: 1,
    });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_status: 'pending_review', p_search: 'Avrio', p_category: AUDIO, p_page: 2, p_page_size: 1,
    });
    // The status, the ilike and the category narrow it to two; the window then hands over the second.
    expect(queue.rows.map((row) => row.id)).toEqual([SECOND]);
    expect(queue.page).toBe(2);
    expect(queue.pageSize).toBe(1);
    expect(queue.total).toBe(2);
  });

  it('maps the aggregate section Postgres computed instead of recounting it here', async () => {
    supabaseDouble.seedProduct(productRow({
      id: FIRST, title: 'Row One', slug: 'row-one', status: 'pending_review',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: SECOND, title: 'Row Two', slug: 'row-two', status: 'pending_review',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-02T00:00:00.000Z', updated_at: '2026-10-02T00:00:00.000Z',
    }));
    supabaseDouble.seedProduct(productRow({
      id: THIRD, title: 'Row Three', slug: 'row-three', status: 'pending_review',
      seller_id: STORE, category_id: AUDIO, created_at: '2026-10-03T00:00:00.000Z', updated_at: '2026-10-03T00:00:00.000Z',
    }));
    // `total` and `counts` are `count(*)` work in SQL - scripts/smoke-rpcs.ts checks that arithmetic -
    // so the read fixes them and this test checks the mapping.
    supabaseDouble.setAdminQueue('admin_moderation_queue', {
      total: 512,
      counts: { pendingReview: 137, approved: 300, rejected: 40, draft: 20, archived: 15 },
    });

    const queue = await moderation.fetchModerationQueue({ page: 2, pageSize: 2 });

    expect(queue.page).toBe(2);
    expect(queue.pageSize).toBe(2);
    expect(queue.total).toBe(512);
    expect(queue.counts).toEqual({ pendingReview: 137, approved: 300, rejected: 40, draft: 20, archived: 15 });
    // The rows stay the per-row data the seeded listings describe.
    expect(queue.rows.map((row) => row.id)).toEqual([THIRD]);
  });

  it('reports a queue with nothing in it honestly, and honours the caller’s abort signal', async () => {
    const controller = new AbortController();

    const queue = await moderation.fetchModerationQueue({}, controller.signal);

    expect(queue).toMatchObject({ page: 1, pageSize: 12, total: 0, rows: [] });
    expect(queue.counts).toEqual({ pendingReview: 0, approved: 0, rejected: 0, draft: 0, archived: 0 });

    controller.abort();
    await expect(moderation.fetchModerationQueue({}, controller.signal)).rejects.toThrow(/aborted/i);
  });

  it('refuses a session that is not the platform team, and says why', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.authState.session = {
      access_token: 't', user: { id: OWNER, email: 'marcus@demo.test' },
    };

    await expect(moderation.fetchModerationQueue()).rejects.toThrow(/only the platform team can read the moderation queue/i);
  });

  it('throws on a failed read instead of resolving to an empty queue', async () => {
    supabaseDouble.setAdminQueue('admin_moderation_queue', { total: 137, counts: { pendingReview: 137 } });
    supabaseDouble.failRpc('permission denied for function admin_moderation_queue');

    await expect(moderation.fetchModerationQueue()).rejects.toThrow(
      /Failed to load the moderation queue: permission denied for function admin_moderation_queue/i,
    );
  });
});

describe('moderateProducts', () => {
  it('reports how many rows the RPC actually moved, not how many the form sent', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.seedProduct(productRow({ id: SECOND, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.seedProduct(productRow({ id: THIRD, status: 'approved', seller_id: STORE, category_id: AUDIO }));

    const result = await moderation.moderateProducts([FIRST, SECOND, THIRD], 'approved');

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_moderate_products',
      args: { p_product_ids: [FIRST, SECOND, THIRD], p_status: 'approved', p_reason: null },
    });
    // The third row already sat at `approved`, so the RPC skipped it and said two.
    expect(result).toEqual({ decided: 2, ids: [FIRST, SECOND] });
    expect(supabaseDouble.tables.products.map((row) => row.status)).toEqual(['approved', 'approved', 'approved']);
    // The migration stamps `'product.' || p_status`, so the action carries the past tense.
    expect(supabaseDouble.tables.audit_logs.map((row) => row.action)).toEqual(['product.approved', 'product.approved']);
    expect(supabaseDouble.tables.audit_logs.every((row) => row.actor_role === 'Admin')).toBe(true);
    // A batch that decides nothing is an honest zero, not an invented success.
    expect(await moderation.moderateProducts([THIRD], 'approved')).toEqual({ decided: 0, ids: [] });
  });

  it('writes the reason a rejection carries, and refuses one without it', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.seedProduct(productRow({ id: SECOND, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));

    const result = await moderation.moderateProducts([FIRST], 'rejected', 'Counterfeit packaging');

    expect(result).toEqual({ decided: 1, ids: [FIRST] });
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_product_ids: [FIRST], p_status: 'rejected', p_reason: 'Counterfeit packaging',
    });
    expect(supabaseDouble.tables.products.find((row) => row.id === FIRST)).toMatchObject({
      status: 'rejected', rejection_reason: 'Counterfeit packaging', moderated_by: ADMIN,
    });

    await expect(moderation.moderateProducts([SECOND], 'rejected')).rejects.toThrow(
      /Could not record that decision: A rejected listing needs a reason the seller can read/i,
    );
    expect(supabaseDouble.tables.products.find((row) => row.id === SECOND)?.status).toBe('pending_review');
  });

  it('refuses a hand outside the platform team, and throws when the write fails', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.authState.session = {
      access_token: 't', user: { id: OWNER, email: 'marcus@demo.test' },
    };

    await expect(moderation.moderateProducts([FIRST], 'approved')).rejects.toThrow(
      /Only the platform team can moderate listings/i,
    );
    expect(supabaseDouble.tables.products.find((row) => row.id === FIRST)?.status).toBe('pending_review');

    supabaseDouble.seedAdmin();
    supabaseDouble.failRpc('could not serialize access due to concurrent update');

    await expect(moderation.moderateProducts([FIRST], 'approved')).rejects.toThrow(
      /Could not record that decision: could not serialize access/i,
    );
  });
});

describe('assignModerator', () => {
  it('moves the listing onto a staff account and returns both ids', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));

    const result = await moderation.assignModerator(FIRST, STAFF);

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_assign_moderator',
      args: { p_product_id: FIRST, p_moderator_id: STAFF },
    });
    expect(result).toEqual({ id: FIRST, moderatorId: STAFF });
    expect(supabaseDouble.tables.products.find((row) => row.id === FIRST)?.assigned_moderator_id).toBe(STAFF);
    expect(supabaseDouble.tables.audit_logs.at(-1)).toMatchObject({
      action: 'product.assign_moderator', entity_id: FIRST, actor_role: 'Admin',
    });
  });

  it('refuses a caller outside the team, an account that is not staff and a listing that is not there', async () => {
    supabaseDouble.seedProduct(productRow({ id: FIRST, status: 'pending_review', seller_id: STORE, category_id: AUDIO }));
    supabaseDouble.authState.session = {
      access_token: 't', user: { id: OWNER, email: 'marcus@demo.test' },
    };

    await expect(moderation.assignModerator(FIRST, STAFF)).rejects.toThrow(
      /Only the platform team can assign a listing to a moderator/i,
    );

    supabaseDouble.seedAdmin();
    await expect(moderation.assignModerator(FIRST, OWNER)).rejects.toThrow(/that account is not staff/i);
    await expect(moderation.assignModerator('nope', STAFF)).rejects.toThrow(/Could not assign that listing: Listing not found/i);
    expect(supabaseDouble.tables.products.find((row) => row.id === FIRST)?.assigned_moderator_id).toBeNull();
  });
});

describe('createFirstPartyProduct', () => {
  it('sends the draft as one jsonb argument with the defaults the RPC expects', async () => {
    const created = await moderation.createFirstPartyProduct({ title: 'Vendora Badge', price: 12 });

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'admin_create_product_1p',
      args: {
        p_input: {
          title: 'Vendora Badge', slug: null, description: '', categoryId: null, brand: '',
          images: [], price: 12, compareAtPrice: null, type: 'physical', variants: [], stock: 0,
          status: 'pending_review',
        },
      },
    });
    expect(created.status).toBe('pending_review');
    // The seller is the platform store the RPC looked up, never one the caller named.
    expect(created.sellerId).toBe(PLATFORM);
    expect(supabaseDouble.tables.products.at(-1)).toMatchObject({
      id: created.id, slug: 'vendora-badge', seller_id: PLATFORM, status: 'pending_review',
      moderated_by: null, moderated_at: null,
    });
  });

  it('carries a full draft through and records the approval it was published with', async () => {
    const created = await moderation.createFirstPartyProduct({
      title: 'Vendora Bundle', slug: 'vendora-bundle', description: 'Curated by the platform',
      categoryId: AUDIO, brand: 'Vendora', images: ['https://example.test/bundle.png'],
      price: 89, compareAtPrice: 120, type: 'digital', variants: [{ id: 'variant-1', name: 'Standard' }],
      stock: 4, status: 'approved',
    });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_input: {
        title: 'Vendora Bundle', slug: 'vendora-bundle', description: 'Curated by the platform',
        categoryId: AUDIO, brand: 'Vendora', images: ['https://example.test/bundle.png'],
        price: 89, compareAtPrice: 120, type: 'digital',
        variants: [{ id: 'variant-1', name: 'Standard' }], stock: 4, status: 'approved',
      },
    });
    expect(created).toEqual({ id: expect.any(String), status: 'approved', sellerId: PLATFORM });
    expect(supabaseDouble.tables.products.find((row) => row.id === created.id)).toMatchObject({
      seller_id: PLATFORM, category_id: AUDIO, type: 'digital', status: 'approved',
      compare_at_price: 120, moderated_by: ADMIN,
    });
    expect(supabaseDouble.tables.audit_logs.at(-1)).toMatchObject({
      action: 'product.create_1p', entity_id: created.id, actor_role: 'Admin',
    });
  });

  it('surfaces the refusals the RPC raises for a draft it will not take', async () => {
    await expect(moderation.createFirstPartyProduct({ title: '   ', price: 20 })).rejects.toThrow(
      /Could not publish the listing: A listing needs a title/i,
    );
    await expect(moderation.createFirstPartyProduct({ title: 'Freebie', price: 0 })).rejects.toThrow(
      /A listing needs a price above zero/i,
    );
    await expect(
      moderation.createFirstPartyProduct({ title: 'Odd one', price: 5, status: 'archived' as 'draft' }),
    ).rejects.toThrow(/can be a draft, sent for review, or approved/i);

    supabaseDouble.authState.session = {
      access_token: 't', user: { id: OWNER, email: 'marcus@demo.test' },
    };
    await expect(moderation.createFirstPartyProduct({ title: 'Sneaky', price: 5 })).rejects.toThrow(
      /Only the platform team can publish a first-party listing/i,
    );
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });
});
