import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchAuditQueue, fetchBroadcastLog } from './audit';
import { auditLogRow, profileRow, supabaseDouble } from '../../../test/supabase-double';

const ADMIN = 'admin-1';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchAuditQueue', () => {
  it('reads the trail newest first with the actor resolved by name', async () => {
    supabaseDouble.seedAuditLog(auditLogRow({
      id: 'log-old', action: 'vendor.suspended', entity_type: 'vendor', entity_id: 'store-1',
      created_at: '2026-10-06T00:00:00.000Z',
    }));
    supabaseDouble.seedAuditLog(auditLogRow({
      id: 'log-new', action: 'product.approve', entity_type: 'product', entity_id: 'prod-1',
      created_at: '2026-10-09T00:00:00.000Z',
    }));

    const queue = await fetchAuditQueue();

    expect(queue.rows.map((row) => row.id)).toEqual(['log-new', 'log-old']);
    expect(queue.rows[0]).toMatchObject({
      action: 'product.approve',
      actorRole: 'Admin',
      actorName: 'Platform Admin',
      entityType: 'product',
      entityId: 'prod-1',
    });
    expect(queue.total).toBe(2);
  });

  it('keeps the before and after images, so a decision can be read back rather than only named', async () => {
    supabaseDouble.seedAuditLog(auditLogRow({
      id: 'log-diff',
      action: 'vendor.suspended',
      before_data: { status: 'active' },
      after_data: { status: 'suspended', reason: 'Counterfeit goods' },
    }));

    const queue = await fetchAuditQueue();

    expect(queue.rows[0].before).toEqual({ status: 'active' });
    expect(queue.rows[0].after).toEqual({ status: 'suspended', reason: 'Counterfeit goods' });
  });

  it('facets the actions the trail actually holds', async () => {
    supabaseDouble.seedAuditLog(auditLogRow({ id: 'a', action: 'product.approve' }));
    supabaseDouble.seedAuditLog(auditLogRow({ id: 'b', action: 'product.approve' }));
    supabaseDouble.seedAuditLog(auditLogRow({ id: 'c', action: 'order.refund' }));

    const { actions } = await fetchAuditQueue();

    expect(actions.find((facet) => facet.action === 'product.approve')?.count).toBe(2);
    expect(actions.find((facet) => facet.action === 'order.refund')?.count).toBe(1);
  });

  it('filters and searches in SQL and passes the page through', async () => {
    await fetchAuditQueue({ action: 'order.refund', search: 'store-9', page: 2, pageSize: 10 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_action: 'order.refund', p_search: 'store-9', p_page: 2, p_page_size: 10,
    });
  });

  it('finds an entry by the actor’s own name', async () => {
    supabaseDouble.seedProfile(profileRow({ id: 'ops-7', name: 'Nadia Ops', roles: ['admin'] }));
    supabaseDouble.seedAuditLog(auditLogRow({ id: 'log-x', actor_id: 'ops-7', action: 'vendor.strike' }));
    supabaseDouble.seedAuditLog(auditLogRow({ id: 'log-y', actor_id: ADMIN, action: 'product.reject' }));

    const queue = await fetchAuditQueue({ search: 'Nadia' });

    expect(queue.rows.map((row) => row.id)).toEqual(['log-x']);
  });

  it('shows nothing rather than everything when the trail is empty', async () => {
    const queue = await fetchAuditQueue();

    expect(queue.rows).toEqual([]);
    expect(queue.actions).toEqual([]);
    expect(queue.total).toBe(0);
  });

  it('rejects for an account that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchAuditQueue()).rejects.toThrow(/only the platform team can read the audit trail/i);
  });

  it('throws on a failed read instead of showing a clean trail', async () => {
    supabaseDouble.failRpc('permission denied for function admin_audit_queue');

    await expect(fetchAuditQueue()).rejects.toThrow(/failed to load the audit trail/i);
  });
});

describe('fetchBroadcastLog', () => {
  it('asks the trail for the announcements the platform sent', async () => {
    await fetchBroadcastLog({ page: 2, pageSize: 5 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_action: 'notification.broadcast', p_page: 2, p_page_size: 5,
    });
  });

  it('reads the audience and the reach back out of the record the RPC wrote', async () => {
    supabaseDouble.seedAuditLog(auditLogRow({
      id: 'bc-1',
      action: 'notification.broadcast',
      entity_type: 'broadcast',
      entity_id: null,
      after_data: {
        audience: 'vendor', type: 'promotion', title: 'Winter sale opens Friday',
        message: 'Submit your offers by Thursday midnight.', href: '/vendor/promotions', recipients: 42,
      },
    }));

    const log = await fetchBroadcastLog();

    expect(log.total).toBe(1);
    expect(log.rows[0]).toMatchObject({
      id: 'bc-1',
      audience: 'vendor',
      type: 'promotion',
      title: 'Winter sale opens Friday',
      message: 'Submit your offers by Thursday midnight.',
      href: '/vendor/promotions',
      recipients: 42,
    });
  });

  it('leaves an announcement with no link as no link, not an empty path', async () => {
    supabaseDouble.seedAuditLog(auditLogRow({
      id: 'bc-2',
      action: 'notification.broadcast',
      after_data: { audience: 'all', type: 'system', title: 'Maintenance', message: '', recipients: 7 },
    }));

    const { rows } = await fetchBroadcastLog();

    expect(rows[0]?.href).toBeNull();
    expect(rows[0]?.recipients).toBe(7);
  });

  it('reports a failed read as a failed read, not as a quiet log', async () => {
    supabaseDouble.failRpc('permission denied for function admin_audit_queue');

    await expect(fetchBroadcastLog()).rejects.toThrow(/failed to load the audit trail/i);
  });
});
