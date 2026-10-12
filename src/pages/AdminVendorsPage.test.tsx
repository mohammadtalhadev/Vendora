import { beforeEach, describe, expect, it, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AdminVendorsPage } from './AdminVendorsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import {
  applicationRow,
  profileRow,
  storeRow,
  supabaseDouble,
} from '../test/supabase-double';

const APP = '00000000-0000-4000-8000-000000001301';
const STORE = 'store-1';

beforeEach(() => {
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({
    id: 'user-1', email: 'marcus@demo.test', name: 'Marcus Seller', roles: ['customer', 'vendor'], vendor_status: 'approved',
  }));
  supabaseDouble.seedVendorProfile(storeRow({
    id: STORE, user_id: 'user-1', store_name: 'Nova Tech', slug: 'nova-tech', seller_type: 'vendor',
  }));
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
});

const render = () => renderWorkspace(<AdminVendorsPage />, ['/admin/vendors']);

const lastRpc = (fn: string) => [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === fn);

describe('AdminVendorsPage', () => {
  it('lists the merchants the queue returned and maps the money it pinned', async () => {
    supabaseDouble.setAdminVendors({
      [STORE]: { gross: 4400, commission: 440, net: 3960, balance: 3960, paidOut: 0, tier: 'gold' },
    });
    supabaseDouble.setAdminQueue('admin_vendor_queue', {
      volume: { gross: 9800, commission: 980, net: 8820, stores: 4, active: 3 },
    });

    render();

    await waitFor(() => expect(screen.getAllByText('Nova Tech').length).toBeGreaterThan(0));
    expect(screen.getByText('$4,400')).toBeInTheDocument();
    // The header quotes the platform sum the SQL produced, not a total of the page on screen.
    expect(screen.getByTestId('volume-gross')).toHaveTextContent('$9,800');
    expect(screen.getByTestId('volume-active-pct')).toHaveTextContent('75%');
  });

  it('shows the applicants the pending count is made of, and lets the platform approve one', async () => {
    supabaseDouble.seedApplication(applicationRow({
      id: APP, user_id: 'applicant-9', proposed_store_name: 'Atlas Gadgets', status: 'pending',
    }));

    render();
    await waitFor(() => expect(screen.getByTestId(`applicant-approve-${APP}`)).toBeInTheDocument());

    fireEvent.change(screen.getByTestId(`applicant-note-${APP}`), { target: { value: 'Verified the trade register.' } });
    fireEvent.click(screen.getByTestId(`applicant-approve-${APP}`));

    await waitFor(() => expect(lastRpc('review_vendor_application')?.args).toMatchObject({
      p_application_id: APP, p_decision: 'approved',
    }));
    expect(supabaseDouble.tables.vendor_applications.find((row) => row.id === APP)?.status).toBe('approved');
  });

  it('will not decline an applicant without recording why', async () => {
    supabaseDouble.seedApplication(applicationRow({
      id: APP, user_id: 'applicant-9', proposed_store_name: 'Atlas Gadgets', status: 'pending',
    }));

    render();
    await waitFor(() => expect(screen.getByTestId(`applicant-reject-${APP}`)).toBeInTheDocument());

    expect(screen.getByTestId(`applicant-reject-${APP}`)).toBeDisabled();

    fireEvent.change(screen.getByTestId(`applicant-note-${APP}`), {
      target: { value: 'Business address could not be verified.' },
    });
    fireEvent.click(screen.getByTestId(`applicant-reject-${APP}`));

    await waitFor(() => expect(supabaseDouble.tables.vendor_applications.find((row) => row.id === APP)).toMatchObject({
      status: 'rejected', review_note: 'Business address could not be verified.',
    }));
  });

  it('suspends a merchant through the audited RPC, not through local state', async () => {
    render();
    await waitFor(() => expect(screen.getAllByText('Nova Tech').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: /^suspend$/i })[0]);

    await waitFor(() => expect(lastRpc('admin_set_vendor_status')?.args).toMatchObject({
      p_vendor_id: STORE, p_status: 'suspended',
    }));
    expect(supabaseDouble.tables.vendor_profiles.find((row) => row.id === STORE)?.status).toBe('suspended');
  });

  it('asks the database for the pool a tab names', async () => {
    render();
    await waitFor(() => expect(screen.getAllByText('Nova Tech').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /suspended \/ flagged/i }));

    await waitFor(() => expect(lastRpc('admin_vendor_queue')?.args.p_status).toBe('suspended'));
  });

  it('searches in SQL rather than filtering the page it already has', async () => {
    render();
    await waitFor(() => expect(screen.getAllByText('Nova Tech').length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText(/search vendors/i), { target: { value: 'atlas' } });

    await waitFor(() => expect(lastRpc('admin_vendor_queue')?.args.p_search).toBe('atlas'));
  });

  it('renders a failed read as the database’s own refusal, not as a platform with no merchants', async () => {
    supabaseDouble.failRpc('permission denied for function admin_vendor_queue');

    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission denied for function admin_vendor_queue/i);
    expect(screen.queryByText(/live brands/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows an empty platform as empty, without inventing a store', async () => {
    supabaseDouble.tables.vendor_profiles.length = 0;

    render();

    await waitFor(() => expect(screen.getByTestId('volume-gross')).toHaveTextContent('$0'));
    expect(screen.getByTestId('volume-active-pct')).toHaveTextContent('0%');
    expect(screen.queryAllByText('Nova Tech')).toHaveLength(0);
  });
});
