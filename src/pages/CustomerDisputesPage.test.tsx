import { beforeEach, describe, expect, it, vi } from 'vitest';

// The claims centre reads through the customer disputes API; mock it so the
// routing behaviour (which dispute a /disputes/:id link presents) is driven
// by a known set of cases.
const api = vi.hoisted(() => ({
  fetchMyDisputes: vi.fn(),
  createDispute: vi.fn(),
  postDisputeMessage: vi.fn(),
}));

vi.mock('../features/orders/api/disputes', () => api);

import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { CustomerDisputesPage } from './CustomerDisputesPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import type { Dispute } from '../types/domain';

const REAL_DISPUTE: Dispute = {
  id: 'dsp-real-1',
  subOrderId: 'sub-1',
  orderGroupId: 'order-1',
  customerId: DEMO_ACCOUNTS.customer.id,
  vendorId: 'vendor-1',
  vendorName: 'Nova Tech',
  reason: 'Item arrived defective or damaged',
  status: 'open',
  messages: [],
  createdAt: '2026-10-01T10:00:00.000Z',
};

const renderAt = (path: string) =>
  renderWorkspace(
    <Routes>
      <Route path="/disputes" element={<CustomerDisputesPage />} />
      <Route path="/disputes/:id" element={<CustomerDisputesPage />} />
    </Routes>,
    [path],
  );

describe('CustomerDisputesPage deep links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchMyDisputes.mockResolvedValue([REAL_DISPUTE]);
    useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
  });

  it('shows an honest not-found state for an unknown dispute id instead of the first dispute', async () => {
    renderAt('/disputes/dsp-does-not-exist');

    expect(await screen.findByTestId('dispute-not-found')).toBeInTheDocument();
    expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
    // The real case is listed in the queue, but it is NOT presented as the
    // linked dispute's thread (its thread header never renders).
    expect(screen.queryByText(`Dispute #${REAL_DISPUTE.id}`)).not.toBeInTheDocument();
  });

  it('opens the linked dispute when the id is real', async () => {
    renderAt(`/disputes/${REAL_DISPUTE.id}`);

    expect(await screen.findByText(`Dispute #${REAL_DISPUTE.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId('dispute-not-found')).not.toBeInTheDocument();
    // The seller named is the dispute's own store, never an invented one.
    expect(screen.getAllByText('Nova Tech').length).toBeGreaterThan(0);
    expect(screen.queryByText('Apex Tech')).not.toBeInTheDocument();
  });

  it('omits the vendor line entirely when the dispute carries no store name', async () => {
    api.fetchMyDisputes.mockResolvedValue([{ ...REAL_DISPUTE, vendorName: undefined }]);
    renderAt('/disputes');

    expect(await screen.findByText(REAL_DISPUTE.reason)).toBeInTheDocument();
    expect(screen.queryByText('Apex Tech')).not.toBeInTheDocument();
    expect(screen.queryByText(/Vendor:/)).not.toBeInTheDocument();
  });
});
