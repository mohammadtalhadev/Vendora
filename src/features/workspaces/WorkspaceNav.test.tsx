import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceLayout } from './WorkspaceLayout';
import { VendorNav } from '../vendor/components/VendorNav';
import { AdminNav } from '../admin/components/AdminNav';
import { RiderHeader } from '../rider/components/RiderHeader';
import { SupportHeader } from '../support/components/SupportHeader';
import { useAuthStore, DEMO_ACCOUNTS } from '../../store/auth-store';
import { renderWorkspace, signInVendor } from '../../test/vendor-render';
import { dashboardJson, supabaseDouble } from '../../test/supabase-double';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
// VendorNav's badges come from the vendor dashboard query.
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

describe('Workspace Navigation & Layout Shell', () => {
  beforeEach(() => {
    // Reset auth store before each test
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.vendor,
      token: 'mock-token',
      isAuthenticated: true,
    });
  });

  describe('WorkspaceLayout', () => {
    it('renders top bar with storefront link, role badge, and user profile', () => {
      render(
        <MemoryRouter>
          <WorkspaceLayout role="vendor">
            <div>Vendor Dashboard Content</div>
          </WorkspaceLayout>
        </MemoryRouter>
      );

      // Verify Storefront link back to '/'
      const storefrontLink = screen.getByRole('link', { name: /storefront/i });
      expect(storefrontLink).toBeInTheDocument();
      expect(storefrontLink).toHaveAttribute('href', '/');

      // Verify role badge
      const roleBadge = screen.getByTestId('role-badge');
      expect(roleBadge).toBeInTheDocument();
      expect(roleBadge).toHaveTextContent(/VENDOR/i);
      expect(roleBadge.className).toContain('rounded-full');

      // Verify user profile
      const userProfile = screen.getByTestId('user-profile');
      expect(userProfile).toBeInTheDocument();
      expect(userProfile).toHaveTextContent(DEMO_ACCOUNTS.vendor.name);

      // Verify child content
      expect(screen.getByText('Vendor Dashboard Content')).toBeInTheDocument();
    });

    it('renders custom role badge when specified', () => {
      render(
        <MemoryRouter>
          <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN">
            <div>Admin Content</div>
          </WorkspaceLayout>
        </MemoryRouter>
      );

      const roleBadge = screen.getByTestId('role-badge');
      expect(roleBadge).toHaveTextContent('SUPER ADMIN');
      expect(roleBadge.className).toContain('rounded-full');
    });

    it('renders sidebar structure when provided', () => {
      render(
        <MemoryRouter>
          <WorkspaceLayout
            role="vendor"
            sidebar={<div data-testid="test-sidebar">Custom Sidebar Menu</div>}
          >
            <div>Main Content</div>
          </WorkspaceLayout>
        </MemoryRouter>
      );

      expect(screen.getByTestId('test-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Custom Sidebar Menu')).toBeInTheDocument();
    });

    it('toggles mobile menu drawer when mobile button is clicked', () => {
      render(
        <MemoryRouter>
          <WorkspaceLayout
            role="vendor"
            sidebar={<div>Sidebar Links</div>}
          >
            <div>Content</div>
          </WorkspaceLayout>
        </MemoryRouter>
      );

      const toggleBtn = screen.getByRole('button', { name: /open sidebar menu/i });
      expect(toggleBtn).toBeInTheDocument();

      fireEvent.click(toggleBtn);
      // Dialog drawer is opened
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('VendorNav', () => {
    beforeEach(() => {
      supabaseDouble.reset();
      signInVendor();
    });

    it('links each workspace screen to the route the router actually serves', () => {
      renderWorkspace(<VendorNav />);

      const routes: [RegExp, string][] = [
        [/overview/i, '/vendor'],
        [/products/i, '/vendor/products'],
        [/stock console/i, '/vendor/inventory'],
        [/import export/i, '/vendor/products/import-export'],
        [/orders/i, '/vendor/orders'],
        [/returns/i, '/vendor/returns'],
        [/earnings/i, '/vendor/earnings'],
        [/payouts/i, '/vendor/payouts'],
        [/product qa/i, '/vendor/qa'],
        [/shipping & origin/i, '/vendor/shipping-settings'],
        [/settings/i, '/vendor/store-settings'],
      ];
      for (const [name, href] of routes) {
        expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
      }
    });

    it('names the store the session owns rather than a hardcoded seller', async () => {
      renderWorkspace(<VendorNav />);

      await waitFor(() => expect(screen.getByText('Nova Tech')).toBeInTheDocument());
      expect(screen.getByRole('link', { name: /public storefront/i })).toHaveAttribute(
        'href',
        '/vendors/store-1',
      );
    });

    it('badges the queues with the counts the dashboard query returns, and hides zeros', async () => {
      supabaseDouble.setDashboard({
        ...dashboardJson(),
        stages: { placed: 2, confirmed: 1, packed: 0, inTransit: 0, delivered: 0, returns: 0, cancelled: 0 },
        engagement: { openThreads: 0, unreadMessages: 4, activePromotions: 0, unansweredQuestions: 0 },
      });
      renderWorkspace(<VendorNav />);

      await waitFor(() => expect(screen.getByRole('link', { name: /orders/i })).toHaveTextContent('3'));
      expect(screen.getByRole('link', { name: /messages/i })).toHaveTextContent('4');
      // returns and Q&A are zero, so they carry no badge.
      expect(screen.getByRole('link', { name: /returns/i })).toHaveTextContent('Returns');
    });

    it('triggers onNavigate callback when a link is clicked', () => {
      const handleNavigate = vi.fn();
      renderWorkspace(<VendorNav onNavigate={handleNavigate} />);

      fireEvent.click(screen.getByRole('link', { name: /products/i }));
      expect(handleNavigate).toHaveBeenCalledTimes(1);
    });

    it('highlights active route correctly', () => {
      renderWorkspace(<VendorNav />, ['/vendor/orders']);

      expect(screen.getByRole('link', { name: /orders/i }).className).toContain('text-[#EA6C13]');
      expect(screen.getByRole('link', { name: /earnings/i }).className).not.toContain('text-[#EA6C13]');
    });
  });

  describe('AdminNav', () => {
    it('renders all 6 required platform governance links with correct hrefs', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminNav />
        </MemoryRouter>
      );

      // 1. /admin (Overview)
      const overviewLink = screen.getByRole('link', { name: /overview/i });
      expect(overviewLink).toBeInTheDocument();
      expect(overviewLink).toHaveAttribute('href', '/admin');

      // 2. /admin/vendors (Vendor Approvals)
      const vendorsLink = screen.getByRole('link', { name: /vendor approvals/i });
      expect(vendorsLink).toBeInTheDocument();
      expect(vendorsLink).toHaveAttribute('href', '/admin/vendors');

      // 3. /admin/products (Product Moderation)
      const productsLink = screen.getByRole('link', { name: /product moderation/i });
      expect(productsLink).toBeInTheDocument();
      expect(productsLink).toHaveAttribute('href', '/admin/products');

      // 4. /admin/commission (Commission Settings)
      const commissionLink = screen.getByRole('link', { name: /commission settings/i });
      expect(commissionLink).toBeInTheDocument();
      expect(commissionLink).toHaveAttribute('href', '/admin/commission');

      // 5. /admin/disputes (Dispute Resolution)
      const disputesLink = screen.getByRole('link', { name: /dispute resolution/i });
      expect(disputesLink).toBeInTheDocument();
      expect(disputesLink).toHaveAttribute('href', '/admin/disputes');

      // 6. /admin/reports (Reports)
      const reportsLink = screen.getByRole('link', { name: /reports/i });
      expect(reportsLink).toBeInTheDocument();
      expect(reportsLink).toHaveAttribute('href', '/admin/reports');
    });

    it('triggers onNavigate callback when admin link is clicked', () => {
      const handleNavigate = vi.fn();
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminNav onNavigate={handleNavigate} />
        </MemoryRouter>
      );

      const disputesLink = screen.getByRole('link', { name: /dispute resolution/i });
      fireEvent.click(disputesLink);
      expect(handleNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('RiderHeader', () => {
    it('renders online/offline shift toggle and handles shift state change', () => {
      const handleToggleShift = vi.fn();
      render(
        <RiderHeader
          isOnline={true}
          onToggleShift={handleToggleShift}
          vehicleType="motorcycle"
          activeDeliveries={3}
        />
      );

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText('Online')).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(handleToggleShift).toHaveBeenCalledWith(false);
    });

    it('renders vehicle indicator and active deliveries count', () => {
      render(
        <RiderHeader
          isOnline={false}
          vehicleType="bicycle"
          vehicleLabel="E-Bike Cargo"
          activeDeliveries={2}
          riderName="Sam Rider"
        />
      );

      // Verify Rider name
      expect(screen.getByText('Sam Rider')).toBeInTheDocument();

      // Verify Vehicle Indicator
      const vehicleIndicator = screen.getByTestId('vehicle-indicator');
      expect(vehicleIndicator).toHaveTextContent('E-Bike Cargo');
      expect(vehicleIndicator.className).toContain('glass-pill');

      // Verify Active Deliveries Counter
      const deliveriesCounter = screen.getByTestId('active-deliveries-counter');
      expect(deliveriesCounter).toBeInTheDocument();
      expect(screen.getByTestId('delivery-count')).toHaveTextContent('2');
      expect(deliveriesCounter).toHaveTextContent(/2 Active Deliveries/i);
    });
  });

  describe('SupportHeader', () => {
    it('renders queue count indicators for Unassigned, Mine, and Escalated', () => {
      render(
        <SupportHeader
          unassignedCount={14}
          mineCount={5}
          escalatedCount={2}
          agentName="Jordan Support"
        />
      );

      expect(screen.getByText('Jordan Support')).toBeInTheDocument();

      // Unassigned queue
      const unassignedTab = screen.getByTestId('queue-unassigned');
      expect(unassignedTab).toHaveTextContent('Unassigned');
      expect(screen.getByTestId('count-unassigned')).toHaveTextContent('14');

      // Mine queue
      const mineTab = screen.getByTestId('queue-mine');
      expect(mineTab).toHaveTextContent('Mine');
      expect(screen.getByTestId('count-mine')).toHaveTextContent('5');

      // Escalated queue
      const escalatedTab = screen.getByTestId('queue-escalated');
      expect(escalatedTab).toHaveTextContent('Escalated');
      expect(screen.getByTestId('count-escalated')).toHaveTextContent('2');
    });

    it('handles queue selection when a queue indicator is clicked', () => {
      const handleSelectQueue = vi.fn();
      render(
        <SupportHeader
          unassignedCount={7}
          mineCount={3}
          escalatedCount={1}
          activeQueue="mine"
          onSelectQueue={handleSelectQueue}
        />
      );

      const escalatedTab = screen.getByTestId('queue-escalated');
      fireEvent.click(escalatedTab);
      expect(handleSelectQueue).toHaveBeenCalledWith('escalated');
    });
  });
});
