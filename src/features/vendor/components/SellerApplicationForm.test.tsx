import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  SellerApplicationForm,
  ApplicationPendingCard,
  sellerApplicationSchema,
} from './SellerApplicationForm';
import { BecomeSellerPage } from '../../../pages/BecomeSellerPage';
import { useAuthStore } from '../../../store/auth-store';
import { DEMO_ACCOUNTS } from '../../../lib/demo-accounts';
import { supabaseDouble } from '../../../test/supabase-double';
import type { User } from '../../../types/domain';

// The application form now persists to the real vendor_applications table via
// the typed features API, so — like every other suite that exercises a
// Supabase-backed flow — this file installs the repo's Supabase double. (The
// legacy service writer swallowed every failure, which is why this suite
// previously passed against a live-fetch client.)
vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

describe('Seller Onboarding & Application Workflow', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    // Reset auth store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    vi.clearAllMocks();
  });

  describe('Zod Validation Schema (sellerApplicationSchema)', () => {
    it('passes validation with valid data', () => {
      const validData = {
        businessName: 'Nordic Sound Labs',
        storeSlug: 'nordic-sound-labs',
        categoryFocus: 'electronics',
        businessEmail: 'contact@nordicsound.io',
        storeDescription: 'Crafting minimalist audio equipment with premium acoustic fidelity.',
        termsAccepted: true,
      };

      const result = sellerApplicationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessName).toBe('Nordic Sound Labs');
        expect(result.data.storeSlug).toBe('nordic-sound-labs');
      }
    });

    it('fails when required fields are missing or invalid', () => {
      const invalidData = {
        businessName: 'N', // too short (< 2)
        storeSlug: 'Invalid Slug!', // uppercase and invalid chars
        categoryFocus: '', // empty
        businessEmail: 'not-an-email',
        storeDescription: 'Too short', // < 10
        termsAccepted: false, // must be true
      };

      const result = sellerApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((i) => i.path[0]);
        expect(errorPaths).toContain('businessName');
        expect(errorPaths).toContain('storeSlug');
        expect(errorPaths).toContain('categoryFocus');
        expect(errorPaths).toContain('businessEmail');
        expect(errorPaths).toContain('storeDescription');
        expect(errorPaths).toContain('termsAccepted');
      }
    });
  });

  describe('SellerApplicationForm - Rendering & Validation', () => {
    it('renders all 6 required application fields and submit button', () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/store slug/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category focus/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/store description/i)).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /vendora merchant agreement/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit merchant application/i }),
      ).toBeInTheDocument();
    });

    it('auto-generates store slug when user types business name', () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      const businessNameInput = screen.getByLabelText(/business name/i);
      const storeSlugInput = screen.getByLabelText(/store slug/i);

      fireEvent.change(businessNameInput, { target: { value: 'Horizon Gear Labs' } });

      expect(storeSlugInput).toHaveValue('horizon-gear-labs');
    });

    it('allows manually overriding store slug', () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      const businessNameInput = screen.getByLabelText(/business name/i);
      const storeSlugInput = screen.getByLabelText(/store slug/i);

      fireEvent.change(storeSlugInput, { target: { value: 'custom-slug' } });
      fireEvent.change(businessNameInput, { target: { value: 'Brand Name' } });

      // Once manually edited, businessName change does not overwrite it
      expect(storeSlugInput).toHaveValue('custom-slug');
    });

    it('displays validation errors on empty submission', async () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      const submitButton = screen.getByRole('button', {
        name: /submit merchant application/i,
      });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText(/business name must be at least 2 characters/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/store slug must be at least 3 characters/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please select a primary category focus/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please enter a valid business email address/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/store description must be at least 10 characters/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/you must accept the seller terms and conditions/i),
      ).toBeInTheDocument();
    });

    it('validates email format and slug characters', async () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/business email/i), {
        target: { value: 'invalid-email-address' },
      });
      fireEvent.change(screen.getByLabelText(/store slug/i), {
        target: { value: 'UPPERCASE_AND_SPACES!' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /submit merchant application/i }),
      );

      expect(
        await screen.findByText(/please enter a valid business email address/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /store slug must contain only lowercase letters, numbers, and hyphens/i,
        ),
      ).toBeInTheDocument();
    });

    it('clears error when user updates input', async () => {
      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      fireEvent.click(
        screen.getByRole('button', { name: /submit merchant application/i }),
      );

      expect(
        await screen.findByText(/business name must be at least 2 characters/i),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/business name/i), {
        target: { value: 'Audio Studio' },
      });

      expect(
        screen.queryByText(/business name must be at least 2 characters/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('SellerApplicationForm - Submission Lifecycle', () => {
    it('submits successfully, sets auth store vendorStatus to pending, and calls onSuccess', async () => {
      const onSuccessMock = vi.fn();

      // Start as logged-in new user with vendorStatus 'none'
      const initialUser: User = { ...DEMO_ACCOUNTS.newuser, vendorStatus: 'none' };
      useAuthStore.setState({
        user: initialUser,
        token: 'mock-token',
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <SellerApplicationForm onSuccess={onSuccessMock} apiDelayMs={10} />
        </MemoryRouter>,
      );

      // Fill in all valid fields
      fireEvent.change(screen.getByLabelText(/business name/i), {
        target: { value: 'Pulse Audio Works' },
      });
      fireEvent.change(screen.getByLabelText(/store slug/i), {
        target: { value: 'pulse-audio' },
      });
      fireEvent.change(screen.getByLabelText(/category focus/i), {
        target: { value: 'electronics' },
      });
      fireEvent.change(screen.getByLabelText(/business email/i), {
        target: { value: 'team@pulse-audio.test' },
      });
      fireEvent.change(screen.getByLabelText(/store description/i), {
        target: {
          value: 'High fidelity audio equipment and custom monitors for audiophiles.',
        },
      });
      fireEvent.click(
        screen.getByRole('checkbox', { name: /vendora merchant agreement/i }),
      );

      // Click submit
      const submitButton = screen.getByRole('button', {
        name: /submit merchant application/i,
      });
      fireEvent.click(submitButton);

      // Verify pending status card renders
      expect(
        await screen.findByTestId('application-pending-card'),
      ).toBeInTheDocument();
      expect(screen.getByText(/application under review/i)).toBeInTheDocument();
      expect(screen.getByTestId('estimated-review-time')).toHaveTextContent(
        /estimated review time: 24–48 business hours/i,
      );

      // Verify auth store updated to 'pending'
      const updatedUser = useAuthStore.getState().user;
      expect(updatedUser?.vendorStatus).toBe('pending');

      // Verify onSuccess callback called with form payload
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Pulse Audio Works',
          storeSlug: 'pulse-audio',
          categoryFocus: 'electronics',
          businessEmail: 'team@pulse-audio.test',
          termsAccepted: true,
        }),
      );
    });

    it('creates new applicant user in auth store if user was guest', async () => {
      // User is initially null
      useAuthStore.setState({ user: null, isAuthenticated: false });

      render(
        <MemoryRouter>
          <SellerApplicationForm apiDelayMs={0} />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/business name/i), {
        target: { value: 'Guest Merchant Co' },
      });
      fireEvent.change(screen.getByLabelText(/store slug/i), {
        target: { value: 'guest-merchant' },
      });
      fireEvent.change(screen.getByLabelText(/category focus/i), {
        target: { value: 'apparel' },
      });
      fireEvent.change(screen.getByLabelText(/business email/i), {
        target: { value: 'hello@guestmerchant.com' },
      });
      fireEvent.change(screen.getByLabelText(/store description/i), {
        target: { value: 'Ethically manufactured apparel and organic cotton fabrics.' },
      });
      fireEvent.click(
        screen.getByRole('checkbox', { name: /vendora merchant agreement/i }),
      );

      fireEvent.click(
        screen.getByRole('button', { name: /submit merchant application/i }),
      );

      expect(
        await screen.findByTestId('application-pending-card'),
      ).toBeInTheDocument();

      const userState = useAuthStore.getState().user;
      expect(userState).not.toBeNull();
      expect(userState?.vendorStatus).toBe('pending');
      expect(userState?.name).toBe('Guest Merchant Co');
      expect(userState?.email).toBe('hello@guestmerchant.com');
    });

    it('handles submission error gracefully and displays alert', async () => {
      const mockSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Network gateway timeout while registering store'));

      render(
        <MemoryRouter>
          <SellerApplicationForm onSubmit={mockSubmit} />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/business name/i), {
        target: { value: 'Valid Store' },
      });
      fireEvent.change(screen.getByLabelText(/store slug/i), {
        target: { value: 'valid-store' },
      });
      fireEvent.change(screen.getByLabelText(/category focus/i), {
        target: { value: 'books' },
      });
      fireEvent.change(screen.getByLabelText(/business email/i), {
        target: { value: 'seller@valid.com' },
      });
      fireEvent.change(screen.getByLabelText(/store description/i), {
        target: { value: 'Independent book publisher with rare limited edition prints.' },
      });
      fireEvent.click(
        screen.getByRole('checkbox', { name: /vendora merchant agreement/i }),
      );

      fireEvent.click(
        screen.getByRole('button', { name: /submit merchant application/i }),
      );

      expect(
        await screen.findByText(/network gateway timeout while registering store/i),
      ).toBeInTheDocument();
      // Form should remain visible so user can retry
      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    });
  });

  describe('Pending Status Card Rendering', () => {
    it('renders ApplicationPendingCard when user already has vendorStatus = pending', () => {
      useAuthStore.setState({
        user: {
          id: 'usr-pending-1',
          email: 'pending@applicant.test',
          name: 'Apex Studio',
          roles: ['customer'],
          vendorStatus: 'pending',
        },
        token: 'mock-token',
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <SellerApplicationForm />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('application-pending-card')).toBeInTheDocument();
      expect(screen.getByText(/application under review/i)).toBeInTheDocument();
      expect(screen.getByTestId('estimated-review-time')).toHaveTextContent(
        /estimated review time: 24–48 business hours/i,
      );
      // Form fields should not be present
      expect(screen.queryByLabelText(/store slug/i)).not.toBeInTheDocument();
    });

    it('renders standalone ApplicationPendingCard directly', () => {
      render(
        <ApplicationPendingCard
          businessName="Cosmic Synth Labs"
          categoryFocus="Digital Software"
          estimatedTime="12–24 hours"
        />,
      );

      expect(screen.getByTestId('application-pending-card')).toBeInTheDocument();
      expect(screen.getByText(/cosmic synth labs/i)).toBeInTheDocument();
      expect(screen.getByText(/digital software/i)).toBeInTheDocument();
      expect(screen.getByTestId('estimated-review-time')).toHaveTextContent(
        /estimated review time: 12–24 hours/i,
      );
    });
  });

  describe('BecomeSellerPage - Public Landing & Status Router', () => {
    it('renders landing page with 3 key seller benefits for guests and new users', () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      render(
        <MemoryRouter>
          <BecomeSellerPage />
        </MemoryRouter>,
      );

      // Benefit 1: Low Commission
      expect(
        screen.getByRole('heading', { name: /industry-low commission/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/5% – 8% rate/i)).toBeInTheDocument();

      // Benefit 2: Instant Payouts
      expect(
        screen.getByRole('heading', { name: /instant split payouts/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/automated split/i)).toBeInTheDocument();

      // Benefit 3: Platform Reach — Batch 51 removed the fabricated
      // "500,000+ Buyers" badge (no such count exists); the card now
      // claims only a growing marketplace.
      expect(
        screen.getByRole('heading', { name: /massive platform reach/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/^growing marketplace$/i)).toBeInTheDocument();
      expect(screen.queryByText(/500,000\+ buyers/i)).not.toBeInTheDocument();

      // Also renders application form for new applicants
      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    });

    it('renders "Already Approved" with button to /vendor when user is approved vendor', () => {
      useAuthStore.setState({
        user: DEMO_ACCOUNTS.vendor, // vendorStatus: 'approved'
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <BecomeSellerPage />
        </MemoryRouter>,
      );

      const approvedSection = screen.getByTestId('approved-vendor-status');
      expect(approvedSection).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /already approved/i })).toBeInTheDocument();

      const dashboardLink = screen.getByRole('link', {
        name: /go to vendor dashboard/i,
      });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/vendor');

      // Application form should not be rendered
      expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    });

    it('renders "Application Under Review" card when user vendorStatus is pending', () => {
      useAuthStore.setState({
        user: {
          id: 'usr-pending-2',
          email: 'pending2@demo.test',
          name: 'Quantum Sound',
          roles: ['customer'],
          vendorStatus: 'pending',
        },
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <BecomeSellerPage />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pending-vendor-status')).toBeInTheDocument();
      expect(screen.getByText(/application under review/i)).toBeInTheDocument();
      expect(screen.getByTestId('estimated-review-time')).toHaveTextContent(
        /estimated review time: 24–48 business hours/i,
      );

      // Form should not be rendered
      expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    });

    it('renders rejection notice with reason and "Re-apply" button when application is rejected', async () => {
      useAuthStore.setState({
        user: {
          id: 'usr-rejected-1',
          email: 'rejected@demo.test',
          name: 'Declined Merchant',
          roles: ['customer'],
          vendorStatus: 'rejected',
        },
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <BecomeSellerPage />
        </MemoryRouter>,
      );

      const rejectedCard = screen.getByTestId('rejected-vendor-status');
      expect(rejectedCard).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /application not approved/i })).toBeInTheDocument();
      expect(screen.getByTestId('rejection-reason')).toBeInTheDocument();

      const reapplyButton = screen.getByRole('button', { name: /re-apply/i });
      expect(reapplyButton).toBeInTheDocument();

      // Click "Re-apply"
      fireEvent.click(reapplyButton);

      // Should now render the SellerApplicationForm to allow re-application
      await waitFor(() => {
        expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
      });
      expect(useAuthStore.getState().user?.vendorStatus).toBe('none');
    });
  });
});
