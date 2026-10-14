import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../features/vendor/api/applications', () => ({
  fetchMyApplications: vi.fn(),
}));

import { screen } from '@testing-library/react';
import { SellerApplicationPage } from './SellerApplicationPage';
import { fetchMyApplications, type MyVendorApplication } from '../features/vendor/api/applications';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';

const fetchMock = vi.mocked(fetchMyApplications);

const application = (overrides: Partial<MyVendorApplication> = {}): MyVendorApplication => ({
  id: 'app-1',
  proposedStoreName: 'Nova Tech',
  proposedSlug: 'nova-tech',
  businessType: 'Electronics',
  status: 'pending',
  reviewNote: null,
  reviewedAt: null,
  createdAt: '2026-10-10T09:00:00.000Z',
  updatedAt: '2026-10-10T09:00:00.000Z',
  ...overrides,
});

describe('SellerApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('asks guests to sign in instead of querying', async () => {
    renderWorkspace(<SellerApplicationPage />, ['/seller-application']);
    expect(await screen.findByText(/sign in to track your application/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the empty state with an apply CTA when the account never applied', async () => {
    useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
    fetchMock.mockResolvedValue([]);
    renderWorkspace(<SellerApplicationPage />, ['/seller-application']);
    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apply to sell/i })).toHaveAttribute(
      'href',
      '/become-a-seller',
    );
    expect(fetchMock).toHaveBeenCalledWith(DEMO_ACCOUNTS.customer.id);
  });

  it('renders a pending application as a status card with its submitted date', async () => {
    useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
    fetchMock.mockResolvedValue([application()]);
    renderWorkspace(<SellerApplicationPage />, ['/seller-application']);
    expect(await screen.findByText('Nova Tech')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/in the review queue/i)).toBeInTheDocument();
  });

  it('shows the real review note on a rejected application', async () => {
    useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
    fetchMock.mockResolvedValue([
      application({
        status: 'rejected',
        reviewNote: 'Trade licence image was unreadable.',
        reviewedAt: '2026-10-12T09:00:00.000Z',
      }),
    ]);
    renderWorkspace(<SellerApplicationPage />, ['/seller-application']);
    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Trade licence image was unreadable.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /submit a corrected application/i }),
    ).toHaveAttribute('href', '/become-a-seller');
  });

  it('surfaces a load failure with a retry instead of an empty list', async () => {
    useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
    fetchMock.mockRejectedValue(new Error('Could not load your applications: network down'));
    renderWorkspace(<SellerApplicationPage />, ['/seller-application']);
    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no applications yet/i)).not.toBeInTheDocument();
  });
});
