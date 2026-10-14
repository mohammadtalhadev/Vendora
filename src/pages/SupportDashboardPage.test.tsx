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

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SupportDashboardPage } from './SupportDashboardPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { formatPrice } from '../store/currency-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import {
  cannedRow,
  disputeMessageRow,
  disputeRow,
  profileRow,
  refundRow,
  subOrderRow,
  supabaseDouble,
} from '../test/supabase-double';

const AGENT = DEMO_ACCOUNTS.support;
const COLLEAGUE = 'usr-support-2';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const CASE = '00000000-0000-4000-8000-000000000601';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: AGENT.id, email: AGENT.email, roles: ['support'] }));
  supabaseDouble.seedProfile(profileRow({ id: COLLEAGUE, email: 'zara@demo.test', roles: ['support'], name: 'Zara Agent' }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: AGENT.id, email: AGENT.email } };
  // The desk keys its cache by the signed-in agent, so the app state needs the persona too.
  useAuthStore.getState().setUser(AGENT, 'test-token');
  supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, subtotal: 80, shipping_fee: 10, status: 'delivered' }));
  supabaseDouble.seedDispute(disputeRow({
    id: CASE, sub_order_id: PACKAGE, reason: 'Wrong item delivered', status: 'open', evidence_photos: [],
  }));
});

const render = () => renderWorkspace(<SupportDashboardPage />, ['/support']);

describe('SupportDashboardPage', () => {
  it('lists the queue it read and shows what the ledger still owes on the case', async () => {
    supabaseDouble.seedRefund(refundRow({ sub_order_id: PACKAGE, amount: 25 }));

    render();

    await waitFor(() => expect(screen.getByTestId(`dispute-item-${CASE}`)).toBeInTheDocument());
    expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument();
    expect(screen.getByTestId('dispute-remaining')).toHaveTextContent(formatPrice(65));
    expect(within(screen.getByTestId('dispute-money')).getByText(formatPrice(25))).toBeInTheDocument();
  });

  it('shows nothing invented where the desk has no data', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    // Trust scores, courier names and handover PINs were fabricated in the mock console.
    expect(screen.queryByText(/trust score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/high trust/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sam express rider/i)).not.toBeInTheDocument();
    expect(screen.queryByText('4829')).not.toBeInTheDocument();
  });

  it('renders the conversation of the open case, internal notes marked as such', async () => {
    supabaseDouble.seedDisputeMessage(disputeMessageRow({
      id: 'msg-1', dispute_id: CASE, sender_role: 'customer', sender_name: 'Alex Buyer',
      content: 'The box I opened held a different model.', created_at: '2026-10-07T00:00:00.000Z',
    }));
    supabaseDouble.seedDisputeMessage(disputeMessageRow({
      id: 'msg-2', dispute_id: CASE, sender_role: 'support', sender_name: 'Zara Agent',
      content: 'Store shipped the wrong SKU, check the pick list.', is_internal_note: true,
      created_at: '2026-10-08T00:00:00.000Z',
    }));

    render();

    await waitFor(() => expect(screen.getByText('The box I opened held a different model.')).toBeInTheDocument());
    expect(screen.getByTestId('internal-note-card')).toHaveTextContent('check the pick list');
  });

  it('posts a reply as staff and keeps it out of the note channel', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Please photo the label.' } });
    fireEvent.click(screen.getByTestId('send-message-btn'));

    await waitFor(() => expect(supabaseDouble.tables.dispute_messages).toHaveLength(1));
    expect(supabaseDouble.tables.dispute_messages[0]).toMatchObject({
      dispute_id: CASE, sender_role: 'support', is_internal_note: false, content: 'Please photo the label.',
    });
    expect(screen.getByTestId('message-input')).toHaveValue('');
  });

  it('marks the internal note when the toggle is on', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('internal-note-toggle'));
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Warehouse pick error.' } });
    fireEvent.click(screen.getByTestId('send-message-btn'));

    await waitFor(() => expect(supabaseDouble.tables.dispute_messages[0]).toMatchObject({ is_internal_note: true }));
  });

  it('pours the desk’s own templates into the composer', async () => {
    supabaseDouble.seedCanned(cannedRow({
      id: 'tpl-1', agent_id: COLLEAGUE, subject: 'Late delivery apology',
      body: 'We are sorry your parcel ran late.',
    }));

    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('canned-responses-btn'));
    fireEvent.click(screen.getByTestId('canned-option-0'));

    expect(screen.getByTestId('message-input')).toHaveValue('We are sorry your parcel ran late.');
  });

  it('asks Postgres for a pool when the tab changes instead of filtering the page', async () => {
    supabaseDouble.seedDispute(disputeRow({ id: 'case-mine', assigned_agent_id: AGENT.id, status: 'under_review' }));

    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('filter-tab-unassigned'));

    await waitFor(() => {
      const call = [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'support_dispute_queue');
      expect(call?.args).toMatchObject({ p_unassigned: true, p_status: 'awaiting_staff' });
    });
  });

  it('sends the search to the database on submit', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('support-search-input'), { target: { value: 'never arrived' } });
    fireEvent.click(screen.getByTestId('support-search-submit'));

    await waitFor(() => {
      const call = [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'support_dispute_queue');
      expect(call?.args.p_search).toBe('never arrived');
    });
  });

  it('refunds what is still owed, with the reason the agent typed', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-full-refund'));
    const dialog = await screen.findByRole('dialog', { name: /confirm the refund/i });
    // No reason, no refund: the button stays refused until the note is written.
    expect(within(dialog).getByTestId('confirm-full-refund-btn')).toBeDisabled();

    fireEvent.change(within(dialog).getByTestId('refund-confirm-note'), { target: { value: 'Buyer kept the wrong item.' } });
    fireEvent.click(within(dialog).getByTestId('confirm-full-refund-btn'));

    await waitFor(() => expect(supabaseDouble.tables.refunds).toHaveLength(1));
    expect(supabaseDouble.tables.refunds[0]).toMatchObject({ sub_order_id: PACKAGE, amount: 90, reason: 'Buyer kept the wrong item.' });
    await waitFor(() => expect(screen.getByTestId('dispute-remaining')).toHaveTextContent(formatPrice(0)));
  });

  it('refuses a partial refund larger than the remaining gross before it leaves the browser', async () => {
    supabaseDouble.seedRefund(refundRow({ sub_order_id: PACKAGE, amount: 60 }));

    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-partial-refund'));
    fireEvent.change(screen.getByTestId('partial-refund-input'), { target: { value: '50' } });
    fireEvent.change(screen.getByTestId('partial-refund-note'), { target: { value: 'Too much' } });

    expect(screen.getByTestId('confirm-partial-refund-btn')).toBeDisabled();

    fireEvent.change(screen.getByTestId('partial-refund-input'), { target: { value: '29.99' } });
    expect(screen.getByTestId('confirm-partial-refund-btn')).toBeEnabled();
  });

  it('records a ruling with its note, and refuses one without', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    expect(screen.getByTestId('btn-deny-dispute')).toBeDisabled();

    fireEvent.change(screen.getByTestId('ruling-note'), { target: { value: 'Photo shows the correct seal was intact.' } });
    fireEvent.click(screen.getByTestId('btn-deny-dispute'));

    await waitFor(() => {
      const call = [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'resolve_dispute');
      expect(call?.args).toMatchObject({ p_dispute_id: CASE, p_outcome: 'resolved_denied' });
    });
    await waitFor(() => expect(screen.getByTestId('resolution-status-badge')).toHaveTextContent('denied'));
  });

  it('escalates the case and takes it', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-escalate-admin'));

    await waitFor(() => {
      const call = [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'escalate_to_support');
      expect(call?.args.p_dispute_id).toBe(CASE);
    });
    await waitFor(() => expect(screen.getByTestId('resolution-status-badge')).toHaveTextContent('escalated'));
    expect(supabaseDouble.tables.disputes[0].assigned_agent_id).toBe(AGENT.id);
  });

  it('hands the case to another agent from the directory', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('assign-agent-select'), { target: { value: COLLEAGUE } });

    await waitFor(() => {
      const call = [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === 'assign_dispute');
      expect(call?.args).toMatchObject({ p_dispute_id: CASE, p_agent_id: COLLEAGUE });
    });
  });

  it('shows the database’s refusal rather than pretending the write worked', async () => {
    render();
    await waitFor(() => expect(screen.getByTestId('dispute-context-bar')).toBeInTheDocument());

    // Only the write is refused: the queue read that got the desk here still succeeded.
    supabaseDouble.failRpc('Only staff can issue refunds');

    fireEvent.click(screen.getByTestId('btn-partial-refund'));
    fireEvent.change(screen.getByTestId('partial-refund-input'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('partial-refund-note'), { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('confirm-partial-refund-btn'));

    await waitFor(() => expect(screen.getByTestId('context-bar-error')).toHaveTextContent(/only staff can issue refunds/i));
    expect(supabaseDouble.tables.refunds).toHaveLength(0);
  });

  it('renders a failed queue read as an error rather than an empty desk', async () => {
    supabaseDouble.failRpc('permission denied for function support_dispute_queue');

    render();

    await waitFor(() => expect(screen.getByText(/the queue could not be read/i)).toBeInTheDocument());
    expect(screen.queryByTestId('dispute-context-bar')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong item delivered')).not.toBeInTheDocument();
  });
});
