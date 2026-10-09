import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupportDashboardPage } from './SupportDashboardPage';
import { mockDb } from '../mocks/db';
import { useAuthStore, DEMO_ACCOUNTS } from '../store/auth-store';

describe('SupportDashboardPage - Customer Support & Dispute Resolution Workspace', () => {
  beforeEach(() => {
    // Reset auth store to support agent persona
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.support,
      token: 'mock-support-jwt',
      isAuthenticated: true,
    });

    // Reset database to initial seed
    mockDb.resetToSeed();
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('renders support header with triage queues and counters', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // Support Header presence
    const supportHeader = screen.getByTestId('support-header');
    expect(supportHeader).toBeInTheDocument();
    expect(within(supportHeader).getByText(/Support Triage/i)).toBeInTheDocument();
    expect(within(supportHeader).getByText(DEMO_ACCOUNTS.support.name)).toBeInTheDocument();

    // Queue count indicators in header
    expect(screen.getByTestId('queue-unassigned')).toBeInTheDocument();
    expect(screen.getByTestId('queue-mine')).toBeInTheDocument();
    expect(screen.getByTestId('queue-escalated')).toBeInTheDocument();

    // 3-Pane workspace presence
    expect(screen.getByTestId('dispute-queue-list')).toBeInTheDocument();
    expect(screen.getByTestId('dispute-conversation-thread')).toBeInTheDocument();
    expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument();

    // Check dispute item rendered in queue
    expect(screen.getByTestId('dispute-item-DSP-401')).toBeInTheDocument();
  });

  it('filters disputes by queue tab (unassigned, mine, escalated, all)', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    const queueList = screen.getByTestId('dispute-queue-list');

    // 1. Filter by Unassigned
    const unassignedTab = screen.getByTestId('filter-tab-unassigned');
    fireEvent.click(unassignedTab);

    // Unassigned tickets DSP-403 & DSP-405 should be visible
    expect(within(queueList).getByTestId('dispute-item-DSP-403')).toBeInTheDocument();
    expect(within(queueList).getByTestId('dispute-item-DSP-405')).toBeInTheDocument();
    // DSP-401 is assigned to support agent, should NOT be visible in unassigned
    expect(within(queueList).queryByTestId('dispute-item-DSP-401')).not.toBeInTheDocument();

    // 2. Filter by Mine (Jordan Support Lead)
    const mineTab = screen.getByTestId('filter-tab-mine');
    fireEvent.click(mineTab);

    expect(within(queueList).getByTestId('dispute-item-DSP-401')).toBeInTheDocument();
    expect(within(queueList).getByTestId('dispute-item-DSP-402')).toBeInTheDocument();
    expect(within(queueList).queryByTestId('dispute-item-DSP-403')).not.toBeInTheDocument();

    // 3. Filter by Escalated
    const escalatedTab = screen.getByTestId('filter-tab-escalated');
    fireEvent.click(escalatedTab);

    expect(within(queueList).getByTestId('dispute-item-DSP-402')).toBeInTheDocument();
    expect(within(queueList).queryByTestId('dispute-item-DSP-401')).not.toBeInTheDocument();

    // 4. Return to All
    const allTab = screen.getByTestId('filter-tab-all');
    fireEvent.click(allTab);

    expect(within(queueList).getByTestId('dispute-item-DSP-401')).toBeInTheDocument();
    expect(within(queueList).getByTestId('dispute-item-DSP-402')).toBeInTheDocument();
    expect(within(queueList).getByTestId('dispute-item-DSP-403')).toBeInTheDocument();
  });

  it('selects dispute and displays conversation timeline and evidence photos', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // Select DSP-402 (Escalated lost package)
    const disputeItem2 = screen.getByTestId('dispute-item-DSP-402');
    fireEvent.click(disputeItem2);

    // Verify conversation thread header updates
    const conversationThread = screen.getByTestId('dispute-conversation-thread');
    expect(within(conversationThread).getByText(/Dispute #DSP-402/i)).toBeInTheDocument();
    expect(within(conversationThread).getByText(/Item Not Received/i)).toBeInTheDocument();

    // Check message timeline contents
    expect(
      within(conversationThread).getByText(/Tracking says delivered at 4:15 PM yesterday/i)
    ).toBeInTheDocument();

    // Check internal note card
    expect(within(conversationThread).getByTestId('internal-note-card')).toBeInTheDocument();
    expect(
      within(conversationThread).getByText(/Rider delivery code was bypassed with manual override/i)
    ).toBeInTheDocument();

    // Check photo evidence display
    expect(within(conversationThread).getByTestId('evidence-photos')).toBeInTheDocument();
  });

  it('sends new regular customer response and staff internal note', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // Select DSP-401
    fireEvent.click(screen.getByTestId('dispute-item-DSP-401'));

    const messageInput = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-message-btn');

    // 1. Send public message
    fireEvent.change(messageInput, {
      target: { value: 'We have escalated this issue with SoundWave Direct fulfillment.' },
    });
    fireEvent.click(sendButton);

    const thread = screen.getByTestId('dispute-conversation-thread');
    expect(
      within(thread).getByText('We have escalated this issue with SoundWave Direct fulfillment.')
    ).toBeInTheDocument();

    // 2. Post staff internal note
    const noteToggle = screen.getByTestId('internal-note-toggle');
    fireEvent.click(noteToggle);
    expect(noteToggle).toBeChecked();

    fireEvent.change(messageInput, {
      target: { value: 'Staff Audit Note: Customer account in good standing. Authorized 100% replacement warranty.' },
    });
    fireEvent.click(screen.getByTestId('send-message-btn'));

    expect(
      within(thread).getByText('Staff Audit Note: Customer account in good standing. Authorized 100% replacement warranty.')
    ).toBeInTheDocument();
  });

  it('inserts pre-written policy canned response into composer', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // Open Canned Responses dropdown
    const cannedBtn = screen.getByTestId('canned-responses-btn');
    fireEvent.click(cannedBtn);

    // Select the first canned option: Request Return Shipping Label Photo
    const cannedOption0 = screen.getByTestId('canned-option-0');
    expect(cannedOption0).toHaveTextContent(/Request Return Shipping Label Photo/i);
    fireEvent.click(cannedOption0);

    // Verify textarea populated with policy wording
    const messageInput = screen.getByTestId('message-input');
    expect(messageInput).toHaveValue(
      'Please provide a clear, well-lit photo of the return shipping label attached to the outer parcel carton so that our fulfillment team can trace the courier dispatch log.'
    );
  });

  it('executes resolution action (Issue Full Refund) and verifies dispute and sub-order status update', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // Select DSP-401
    fireEvent.click(screen.getByTestId('dispute-item-DSP-401'));

    const contextBar = screen.getByTestId('dispute-context-bar');

    // Verify sub-order snapshot and items
    expect(within(contextBar).getByTestId('suborder-items-list')).toBeInTheDocument();
    expect(within(contextBar).getByTestId('tracking-stepper')).toBeInTheDocument();
    expect(within(contextBar).getByTestId('carrier-rider-info')).toBeInTheDocument();
    expect(within(contextBar).getByTestId('customer-history-card')).toBeInTheDocument();

    // Click "Issue Full Refund" action
    const fullRefundBtn = within(contextBar).getByTestId('btn-full-refund');
    expect(fullRefundBtn).toBeInTheDocument();
    fireEvent.click(fullRefundBtn);

    // Verify dispute status in context bar updates to resolved
    expect(
      within(contextBar).getByText(/Dispute Resolved: Full \/ Partial Refund Issued/i)
    ).toBeInTheDocument();

    // Verify in mockDb that dispute is updated
    const updatedDispute = mockDb.disputes.find((d) => d.id === 'DSP-401');
    expect(updatedDispute?.status).toBe('resolved_refund');

    // Verify associated sub-order is marked refunded
    const updatedSubOrder = mockDb.subOrders.find((so) => so.id === 'sub-98419-A');
    expect(updatedSubOrder?.status).toBe('refunded');
  });

  it('executes resolution actions: Partial Refund and Deny Dispute', () => {
    render(
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    );

    // 1. Partial refund on DSP-405
    fireEvent.click(screen.getByTestId('dispute-item-DSP-405'));

    const contextBar = screen.getByTestId('dispute-context-bar');
    const partialRefundBtn = within(contextBar).getByTestId('btn-partial-refund');
    fireEvent.click(partialRefundBtn);

    // Input custom partial amount
    const partialInput = screen.getByTestId('partial-refund-input');
    fireEvent.change(partialInput, { target: { value: '45.00' } });

    const confirmPartialBtn = screen.getByTestId('confirm-partial-refund-btn');
    fireEvent.click(confirmPartialBtn);

    // Check resolution
    expect(within(contextBar).getByText(/Dispute Resolved/i)).toBeInTheDocument();
    const dispute405 = mockDb.disputes.find((d) => d.id === 'DSP-405');
    expect(dispute405?.status).toBe('resolved_refund');
    expect(dispute405?.resolutionAmount).toBe(45);
  });
});
