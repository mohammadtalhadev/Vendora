import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { screen, waitFor } from '@testing-library/react';
import { SupportNav } from './SupportNav';
import { renderWorkspace } from '../../../test/vendor-render';
import { useAuthStore } from '../../../store/auth-store';
import { DEMO_ACCOUNTS } from '../../../lib/demo-accounts';
import { disputeRow, profileRow, subOrderRow, supabaseDouble } from '../../../test/supabase-double';

const AGENT = DEMO_ACCOUNTS.support;
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const CASE = '00000000-0000-4000-8000-000000000601';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: AGENT.id, email: AGENT.email, roles: ['support'] }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: AGENT.id, email: AGENT.email } };
  useAuthStore.getState().setUser(AGENT, 'test-token');
  supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, subtotal: 80, shipping_fee: 10, status: 'delivered' }));
});

describe('SupportNav', () => {
  it('links the desk screens and the public resources an agent sends buyers to', () => {
    renderWorkspace(<SupportNav />, ['/support']);

    const routes: [RegExp, string][] = [
      [/dashboard/i, '/support'],
      [/dispute queue/i, '/support/disputes'],
      [/help center/i, '/help'],
      [/faq/i, '/faq'],
      [/refund policy/i, '/refund-policy'],
    ];
    for (const [name, href] of routes) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('shows no storefront link to an agent who owns no store', () => {
    renderWorkspace(<SupportNav />, ['/support']);

    expect(screen.queryByRole('link', { name: /view storefront/i })).toBeNull();
  });

  it('links an agent who also owns a store to that storefront', () => {
    useAuthStore.getState().setUser({ ...AGENT, vendorId: 'store-1' }, 'test-token');
    renderWorkspace(<SupportNav />, ['/support']);

    expect(screen.getByRole('link', { name: /view storefront/i })).toHaveAttribute('href', '/vendors/store-1');
  });

  it('badges the dispute queue with the unassigned count the desk read returns', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: CASE, sub_order_id: PACKAGE, status: 'open', evidence_photos: [] }));

    renderWorkspace(<SupportNav />, ['/support']);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /dispute queue/i })).toHaveTextContent('1'),
    );
  });

  it('highlights only the active route', () => {
    renderWorkspace(<SupportNav />, ['/support/disputes']);

    expect(screen.getByRole('link', { name: /dispute queue/i }).className).toContain('text-sun-orange-600');
    expect(screen.getByRole('link', { name: /dashboard/i }).className).not.toContain('text-sun-orange-600');
  });
});
