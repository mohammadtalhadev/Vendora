import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RiderDashboardPage } from './RiderDashboardPage';
import { useAuthStore, DEMO_ACCOUNTS } from '../store/auth-store';
import { mockDb } from '../mocks/db';

describe('RiderDashboardPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDb.resetToSeed();
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.rider,
      token: 'mock-rider-token',
      isAuthenticated: true,
    });
  });

  it('renders rider header, shift toggle, and stats', () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // Rider Header
    expect(screen.getByTestId('rider-header')).toBeInTheDocument();
    expect(screen.getByText('Sam Express Rider')).toBeInTheDocument();

    // Shift Toggle Switch
    const shiftSwitch = screen.getByRole('switch', {
      name: /toggle rider shift online\/offline/i,
    });
    expect(shiftSwitch).toBeInTheDocument();
    expect(shiftSwitch).toHaveAttribute('aria-checked', 'true');
    expect(shiftSwitch).toHaveTextContent('Online');

    // Today's Performance Stats
    expect(screen.getByTestId('stat-completed')).toHaveTextContent('8');
    expect(screen.getByTestId('stat-earnings')).toHaveTextContent('$64.00');
    expect(screen.getByTestId('stat-ontime')).toHaveTextContent('98.5%');
    expect(screen.getByTestId('stat-active')).toHaveTextContent('3');
  });

  it('toggles shift online/offline', () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    const shiftSwitch = screen.getByRole('switch', {
      name: /toggle rider shift online\/offline/i,
    });

    // Flip to offline
    fireEvent.click(shiftSwitch);
    expect(shiftSwitch).toHaveAttribute('aria-checked', 'false');
    expect(shiftSwitch).toHaveTextContent('Offline');
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

    // Flip back to online via the banner button
    const goOnlineBtn = screen.getByRole('button', { name: /go online/i });
    fireEvent.click(goOnlineBtn);
    expect(shiftSwitch).toHaveAttribute('aria-checked', 'true');
    expect(shiftSwitch).toHaveTextContent('Online');
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('displays active deliveries queue', () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // Order 1 verification
    expect(screen.getByText('#SUB-98421-A')).toBeInTheDocument();
    expect(screen.getAllByText(/SoundWave Direct|KeebCraft Studio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('120 Industrial Pkwy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Navigate to Pickup')[0]).toBeInTheDocument();

    expect(screen.getAllByText(/Sarah Jenkins|Sarah Customer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('742 Evergreen Terrace, Apt 4B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Call Customer')[0]).toBeInTheDocument();

    // Initial Status Badge
    expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
  });

  it('advances sub-order status through pickup -> out for delivery -> handover PIN -> delivered', async () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // 1. Initial status: ready_for_pickup -> Click "Confirm Package Picked Up from Vendor"
    const card = screen.getByTestId('delivery-card-sub-98421-A');
    const pickupBtn = within(card).getByRole('button', {
      name: /confirm package picked up from vendor/i,
    });
    expect(pickupBtn).toBeInTheDocument();
    fireEvent.click(pickupBtn);

    // Status advances to 'shipped' (Picked Up / In Transit)
    expect(within(card).getByText('Picked Up / In Transit')).toBeInTheDocument();

    // 2. Click "Start Delivery Route" on this card
    const startRouteBtn = within(card).getByRole('button', {
      name: /start delivery route/i,
    });
    expect(startRouteBtn).toBeInTheDocument();
    fireEvent.click(startRouteBtn);

    // Status advances to 'out_for_delivery'
    const handoverBtn = within(card).getByRole('button', {
      name: /confirm customer handover/i,
    });
    expect(handoverBtn).toBeInTheDocument();

    // 3. Click "Confirm Customer Handover" -> opens HandoverVerificationModal
    fireEvent.click(handoverBtn);

    expect(screen.getByText('Customer Handover Verification')).toBeInTheDocument();
    const demoHint = screen.getByTestId('demo-pin-hint');
    expect(demoHint).toHaveTextContent(/Customer's verification code is:/i);

    // Extract the 4-digit code shown in the simulation hint
    const codeMatch = demoHint.textContent?.match(/\d{4}/);
    const pin = codeMatch ? codeMatch[0] : '4829';

    // 4. Enter the 4-digit PIN
    fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: pin[0] } });
    fireEvent.change(screen.getByTestId('pin-digit-1'), { target: { value: pin[1] } });
    fireEvent.change(screen.getByTestId('pin-digit-2'), { target: { value: pin[2] } });
    fireEvent.change(screen.getByTestId('pin-digit-3'), { target: { value: pin[3] } });

    // Submit verification
    const confirmModalBtn = screen.getByRole('button', { name: /confirm handover/i });
    fireEvent.click(confirmModalBtn);

    // 5. Verification succeeds -> modal closes & stats increment
    await waitFor(() => {
      expect(screen.queryByText('Customer Handover Verification')).not.toBeInTheDocument();
      expect(screen.getByTestId('stat-completed')).toHaveTextContent('9');
      expect(screen.getByTestId('stat-earnings')).toHaveTextContent('$72.00');
    });

    // Check completed history tab contains delivered item
    const historyTabBtn = screen.getByRole('button', { name: /completed history/i });
    fireEvent.click(historyTabBtn);

    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+$8.00 payout').length).toBeGreaterThan(0);
  });

  it('handles PIN verification error on incorrect code', async () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // Open handover for an order in 'out_for_delivery' status
    const handoverBtns = screen.getAllByRole('button', {
      name: /confirm customer handover/i,
    });
    fireEvent.click(handoverBtns[0]);

    expect(screen.getByText('Customer Handover Verification')).toBeInTheDocument();

    // Enter wrong PIN: '0000'
    fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('pin-digit-1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('pin-digit-2'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('pin-digit-3'), { target: { value: '0' } });

    const confirmModalBtn = screen.getByRole('button', { name: /confirm handover/i });
    fireEvent.click(confirmModalBtn);

    // Error alert is shown
    expect(screen.getByTestId('verification-error')).toBeInTheDocument();
    expect(screen.getByTestId('verification-error')).toHaveTextContent(
      /invalid verification code/i
    );

    // Stat remains 8 (not completed)
    expect(screen.getByTestId('stat-completed')).toHaveTextContent('8');
  });

  it('reports a delivery exception and marks status as delivery_failed', async () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // Click "Report Issue" on the first card
    const reportIssueBtns = screen.getAllByRole('button', { name: /report issue/i });
    fireEvent.click(reportIssueBtns[0]);

    expect(screen.getByText('Report Delivery Exception')).toBeInTheDocument();

    // Select reason "Access Denied / Gate Code Required"
    const radio = screen.getByLabelText(/Access Denied \/ Gate Code Required/i);
    fireEvent.click(radio);

    // Add notes
    const textarea = screen.getByPlaceholderText(/Provide extra details/i);
    fireEvent.change(textarea, {
      target: { value: 'Security refused entry without resident pass.' },
    });

    // Submit issue
    const submitBtn = screen.getByRole('button', { name: /submit issue/i });
    fireEvent.click(submitBtn);

    // Modal closes and active queue updates
    await waitFor(() => {
      expect(screen.queryByText('Report Delivery Exception')).not.toBeInTheDocument();
      expect(screen.getByTestId('stat-active')).toHaveTextContent('2');
    });

    // Switch to history tab and verify failed record
    fireEvent.click(screen.getByRole('button', { name: /completed history/i }));
    expect(screen.getByText('Delivery Failed')).toBeInTheDocument();
  });

  it('shows empty queue state when all deliveries are completed', async () => {
    render(
      <MemoryRouter>
        <RiderDashboardPage />
      </MemoryRouter>
    );

    // Sequentially submit issue on each active delivery
    while (screen.queryAllByRole('button', { name: /report issue/i }).length > 0) {
      const issueBtns = screen.getAllByRole('button', { name: /report issue/i });
      fireEvent.click(issueBtns[0]);
      const submitBtn = screen.getByRole('button', { name: /submit issue/i });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(screen.queryByText('Report Delivery Exception')).not.toBeInTheDocument();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('empty-queue')).toBeInTheDocument();
      expect(
        screen.getByText(
          /All deliveries completed! Take a break or wait for new assignments/i
        )
      ).toBeInTheDocument();
    });
  });
});
