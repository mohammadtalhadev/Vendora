import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import {
  useNotificationStore,
  INITIAL_NOTIFICATIONS,
} from '../store/notification-store';

describe('NotificationsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationStore.setState({
      notifications: [...INITIAL_NOTIFICATIONS],
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length,
    });
  });

  it('renders page header, metrics, and initial notifications', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /notifications center/i })).toBeInTheDocument();
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Unread/i).length).toBeGreaterThan(0);

    // Initial items visible
    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.getByText('Seller Application Approved')).toBeInTheDocument();
    expect(screen.getByText('Dispute Opened')).toBeInTheDocument();
    expect(screen.getByText('New Payout Processed')).toBeInTheDocument();
    expect(screen.getByText('Flash Sale Discount Active')).toBeInTheDocument();
  });

  it('filters notifications using category pill tabs', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    // Click "Unread" tab
    const unreadTab = screen.getByRole('button', { name: /unread/i });
    fireEvent.click(unreadTab);

    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.getByText('Seller Application Approved')).toBeInTheDocument();
    expect(screen.getByText('Dispute Opened')).toBeInTheDocument();
    expect(screen.queryByText('New Payout Processed')).not.toBeInTheDocument();
    expect(screen.queryByText('Flash Sale Discount Active')).not.toBeInTheDocument();

    // Click "Orders" tab
    const ordersTab = screen.getByRole('button', { name: /orders/i });
    fireEvent.click(ordersTab);

    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.queryByText('Seller Application Approved')).not.toBeInTheDocument();

    // Click "Payouts" tab
    const payoutsTab = screen.getByRole('button', { name: /payouts/i });
    fireEvent.click(payoutsTab);

    expect(screen.getByText('New Payout Processed')).toBeInTheDocument();
    expect(screen.queryByText('Order Shipped!')).not.toBeInTheDocument();
  });

  it('searches notifications by keyword', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/search notifications/i);
    fireEvent.change(searchInput, { target: { value: 'Courier' } });

    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.queryByText('Seller Application Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('New Payout Processed')).not.toBeInTheDocument();
  });

  it('marks all as read when bulk action is clicked', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAllBtn);

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(screen.queryByText(/3 Unread/i)).not.toBeInTheDocument();
  });

  it('clears all notifications and renders the empty state illustration', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });

    // First click prompts confirm
    fireEvent.click(clearAllBtn);
    // Second click confirms
    fireEvent.click(clearAllBtn);

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);

    expect(screen.getByText(/you're all caught up!/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse marketplace/i })).toBeInTheDocument();
  });

  it('allows removing an individual notification', () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Remove first
    fireEvent.click(deleteButtons[0]);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(4);
    expect(screen.queryByText('Order Shipped!')).not.toBeInTheDocument();
  });
});
