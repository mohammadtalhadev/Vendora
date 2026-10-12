import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as canned from './canned';
import { cannedRow, profileRow, supabaseDouble } from '../../../test/supabase-double';

const SUPPORT = 'support-1';
const OTHER = 'support-2';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: SUPPORT, roles: ['customer', 'support'] }));
  supabaseDouble.seedProfile(profileRow({ id: OTHER, roles: ['customer', 'support'], name: 'Zara Agent' }));
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: SUPPORT, email: `${SUPPORT}@demo.test` },
  };
});

describe('fetchCannedResponses', () => {
  it('reads the library newest first, with the author kept', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-old', created_at: '2026-10-01T00:00:00.000Z' }));
    supabaseDouble.seedCanned(cannedRow({
      id: 'tpl-new', agent_id: OTHER, subject: 'Refund timeline', category: 'refund',
      created_at: '2026-10-09T00:00:00.000Z',
    }));

    const rows = await canned.fetchCannedResponses();

    expect(rows.map((row) => row.id)).toEqual(['tpl-new', 'tpl-old']);
    expect(rows[0]).toMatchObject({ agentId: OTHER, subject: 'Refund timeline', category: 'refund' });
  });

  it('asks Postgres for one category rather than filtering the page', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-delivery', category: 'delivery' }));
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-refund', category: 'refund' }));

    const rows = await canned.fetchCannedResponses({ category: 'refund' });

    expect(rows.map((row) => row.id)).toEqual(['tpl-refund']);
  });

  it('surfaces a failed read instead of an empty library', async () => {
    supabaseDouble.failures.canned_responses = 'permission denied for table canned_responses';

    await expect(canned.fetchCannedResponses()).rejects.toThrow(/could not load the template library/i);
  });
});

describe('createCannedResponse', () => {
  it('saves the template under the signed-in agent, because the policy reads that column', async () => {
    const saved = await canned.createCannedResponse({
      subject: 'Late delivery apology',
      body: 'We are sorry your parcel ran late.',
      category: 'delivery',
    });

    expect(saved).toMatchObject({ agentId: SUPPORT, subject: 'Late delivery apology', category: 'delivery' });
    expect(supabaseDouble.tables.canned_responses).toHaveLength(1);
  });

  it('throws when the insert is refused', async () => {
    supabaseDouble.failures.canned_responses = 'invalid input syntax for column body';

    await expect(
      canned.createCannedResponse({ subject: 'x', body: 'y' }),
    ).rejects.toThrow(/could not save that template/i);
  });
});

describe('updateCannedResponse', () => {
  it('rewrites the subject and body the author owns', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-1', agent_id: SUPPORT, subject: 'Old subject', body: 'Old body' }));

    await canned.updateCannedResponse('tpl-1', { subject: 'New subject', body: 'New body', category: 'refund' });

    const [row] = await canned.fetchCannedResponses();
    expect(row).toMatchObject({ subject: 'New subject', body: 'New body', category: 'refund' });
  });

  it('throws when the write is refused', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-1', agent_id: SUPPORT }));
    supabaseDouble.failures.canned_responses = 'new row violates row-level security policy';

    await expect(
      canned.updateCannedResponse('tpl-1', { subject: 'hijacked', body: 'x' }),
    ).rejects.toThrow(/could not update that template/i);
  });
});

describe('deleteCannedResponse', () => {
  it('removes the template the desk can delete', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-1', agent_id: SUPPORT }));

    await canned.deleteCannedResponse('tpl-1');

    await expect(canned.fetchCannedResponses()).resolves.toEqual([]);
  });

  it('throws when the delete is refused', async () => {
    supabaseDouble.seedCanned(cannedRow({ id: 'tpl-1', agent_id: OTHER }));
    supabaseDouble.failures.canned_responses = 'new row violates row-level security policy';

    await expect(canned.deleteCannedResponse('tpl-1')).rejects.toThrow(/could not delete that template/i);
  });
});
