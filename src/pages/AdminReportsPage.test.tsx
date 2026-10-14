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
vi.mock('../lib/export-csv', () => ({ exportToCsv: vi.fn() }));

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AdminReportsPage } from './AdminReportsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { formatPrice } from '../store/currency-store';
import { exportToCsv } from '../lib/export-csv';
import { adminReportJson, supabaseDouble } from '../test/supabase-double';

// jsdom does not implement pointer capture or scrollIntoView, both of which
// Radix Select calls while opening. Stub them so the interaction can run.
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => undefined;
window.HTMLElement.prototype.releasePointerCapture = () => undefined;
window.Element.prototype.scrollIntoView = () => undefined;

beforeEach(() => {
  vi.clearAllMocks();
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
});

const render = () => renderWorkspace(<AdminReportsPage />, ['/admin/reports']);

const lastReportRpc = () =>
  [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'admin_report_summary');

function seedWindow() {
  supabaseDouble.setAdminReport(adminReportJson({
    days: 30,
    bucket: 'week',
    totals: {
      gross: 4200, commission: 420, net: 3780, freight: 140, digitalGross: 600,
      orders: 38, packages: 41, refunds: 65, takeRatePct: 10,
    },
    series: [
      { period: '2026-09-28', gross: 1200, commission: 120, net: 1080, orders: 12, packages: 13 },
      { period: '2026-10-05', gross: 3000, commission: 300, net: 2700, orders: 26, packages: 28 },
    ],
    byCategory: [{ category: 'Electronics', gross: 3000, commission: 300, listings: 24 }],
    bySeller: [
      { storeName: 'Nova Tech', gross: 2000, commission: 200, net: 1800, packages: 19, payoutsPaid: 1500 },
      { storeName: 'Atlas Gadgets', gross: 2200, commission: 220, net: 1980, packages: 22, payoutsPaid: 900 },
    ],
  }));
}

describe('AdminReportsPage', () => {
  it('renders the totals the RPC computed, formatted as PKR money', async () => {
    seedWindow();
    render();

    expect(await screen.findByText(formatPrice(4200))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(420))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(3780))).toBeInTheDocument();
    expect(screen.getByText(/Effective take rate 10% of booked volume/)).toBeInTheDocument();
    // AOV is the window's gross over its orders, not a stored constant.
    expect(screen.getByText(formatPrice(4200 / 38))).toBeInTheDocument();
    expect(screen.getByText(/Refunds issued/)).toBeInTheDocument();
    expect(screen.getAllByText(formatPrice(65)).length).toBeGreaterThan(0);
  });

  it('renders the series, category and seller breakdowns the RPC returned', async () => {
    seedWindow();
    render();

    expect(await screen.findByText('Nova Tech')).toBeInTheDocument();
    expect(screen.getByText('Atlas Gadgets')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(1500))).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText(/24 listings/)).toBeInTheDocument();
    // Weekly bucket labels come from the series periods themselves.
    expect(screen.getByText('28 Sept')).toBeInTheDocument();
    expect(screen.getByText('05 Oct')).toBeInTheDocument();
  });

  it('contains none of the legacy page\'s invented figures, files or authors', async () => {
    seedWindow();
    render();

    expect(await screen.findByText('Nova Tech')).toBeInTheDocument();
    expect(screen.queryByText('$1,489,200')).not.toBeInTheDocument();
    expect(screen.queryByText(/Oct_2026_Platform_GMV_Reconciliation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Generate Custom Report/)).not.toBeInTheDocument();
    expect(screen.queryByText(/State Tax Escrow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/M\. Kross/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+18\.4%/)).not.toBeInTheDocument();
  });

  it('drives the RPC window and bucket from the date-range select', async () => {
    seedWindow();
    render();

    expect(await screen.findByText('Nova Tech')).toBeInTheDocument();
    expect(lastReportRpc()?.args).toEqual({ p_days: 30, p_bucket: 'week' });

    fireEvent.pointerDown(screen.getByLabelText('Report date range'), {
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.click(screen.getByRole('option', { name: 'Date Range: Last 7 Days' }));

    await waitFor(() => expect(lastReportRpc()?.args).toEqual({ p_days: 7, p_bucket: 'day' }));
  });

  it('reports an empty window as zeros and honest empty states, not a fabricated trend', async () => {
    render();

    expect(await screen.findByText('No seller sales in this window.')).toBeInTheDocument();
    expect(screen.getByText('No sales recorded in this window.')).toBeInTheDocument();
    expect(screen.getByText('No commission recorded in this window.')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/No booked volume in this window/)).toBeInTheDocument();
  });

  it('exports the seller rows currently on screen, with their real values', async () => {
    seedWindow();
    render();

    expect(await screen.findByText('Nova Tech')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Export Seller CSV/ }));

    expect(exportToCsv).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(exportToCsv).mock.calls[0][0] as { filename: string; data: unknown[] };
    expect(arg.filename).toMatch(/^vendora_seller_performance_30d_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(arg.data).toEqual([
      expect.objectContaining({ storeName: 'Nova Tech', gross: 2000, payoutsPaid: 1500 }),
      expect.objectContaining({ storeName: 'Atlas Gadgets', gross: 2200, payoutsPaid: 900 }),
    ]);
  });

  it('filters the seller table by store name', async () => {
    seedWindow();
    render();

    expect(await screen.findByText('Atlas Gadgets')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter sellers by store name'), {
      target: { value: 'nova' },
    });

    expect(screen.getByText('Nova Tech')).toBeInTheDocument();
    expect(screen.queryByText('Atlas Gadgets')).not.toBeInTheDocument();
  });

  it('shows the query error with a retry instead of an empty chart', async () => {
    supabaseDouble.failRpc('permission denied for function admin_report_summary');
    render();

    expect(await screen.findByText('Unable to load the report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('No seller sales in this window.')).not.toBeInTheDocument();
  });
});
