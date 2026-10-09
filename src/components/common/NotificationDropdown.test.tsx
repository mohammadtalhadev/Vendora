import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import {
  useNotificationStore,
  INITIAL_NOTIFICATIONS,
} from '../../store/notification-store';

describe('NotificationDropdown Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationStore.setState({
      notifications: [...INITIAL_NOTIFICATIONS],
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length,
    });
  });

  it('renders notification bell icon with unread badge count', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();

    const badge = screen.getByTestId('unread-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('toggles dropdown popover on click', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(screen.queryByTestId('notification-popover')).not.toBeInTheDocument();

    // Open dropdown
    fireEvent.click(bellBtn);
    expect(screen.getByTestId('notification-popover')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/3 unread/i)).toBeInTheDocument();

    // Close dropdown
    fireEvent.click(bellBtn);
    expect(screen.queryByTestId('notification-popover')).not.toBeInTheDocument();
  });

  it('filters notifications by tabs (All, Unread, Orders, Alerts)', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    // Default "All" shows all 5
    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.getByText('Seller Application Approved')).toBeInTheDocument();
    expect(screen.getByText('Dispute Opened')).toBeInTheDocument();
    expect(screen.getByText('New Payout Processed')).toBeInTheDocument();
    expect(screen.getByText('Flash Sale Discount Active')).toBeInTheDocument();

    // Filter "Unread" tab
    const unreadTab = screen.getByRole('button', { name: 'Unread' });
    fireEvent.click(unreadTab);

    // Only unread items should be visible
    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.getByText('Seller Application Approved')).toBeInTheDocument();
    expect(screen.getByText('Dispute Opened')).toBeInTheDocument();
    expect(screen.queryByText('New Payout Processed')).not.toBeInTheDocument();
    expect(screen.queryByText('Flash Sale Discount Active')).not.toBeInTheDocument();

    // Filter "Orders" tab
    const ordersTab = screen.getByRole('button', { name: 'Orders' });
    fireEvent.click(ordersTab);
    expect(screen.getByText('Order Shipped!')).toBeInTheDocument();
    expect(screen.queryByText('Seller Application Approved')).not.toBeInTheDocument();

    // Filter "Alerts" tab (disputes & price alerts)
    const alertsTab = screen.getByRole('button', { name: 'Alerts' });
    fireEvent.click(alertsTab);
    expect(screen.getByText('Dispute Opened')).toBeInTheDocument();
    expect(screen.getByText('Flash Sale Discount Active')).toBeInTheDocument();
    expect(screen.queryByText('Order Shipped!')).not.toBeInTheDocument();
  });

  it('marks individual notification as read when clicked', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    // Click on unread "Order Shipped!" item
    const orderItem = screen.getByText('Order Shipped!').closest('button');
    expect(orderItem).toBeInTheDocument();
    fireEvent.click(orderItem!);

    // Dropdown should close and item should be marked as read
    expect(screen.queryByTestId('notification-popover')).not.toBeInTheDocument();

    const state = useNotificationStore.getState();
    const target = state.notifications.find((n) => n.id === 'notif-seed-1');
    expect(target?.isRead).toBe(true);
    expect(state.unreadCount).toBe(2);
  });

  it('marks all notifications as read when clicking "Mark all as read" button', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    expect(markAllBtn).toBeInTheDocument();

    fireEvent.click(markAllBtn);

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.isRead)).toBe(true);

    // Badge should be hidden now
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('renders link to /notifications in dropdown footer', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    const viewAllLink = screen.getByRole('link', {
      name: /view all notifications/i,
    });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/notifications');
  });
});
