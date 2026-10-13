import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../lib/auth-context';
import { useAuthStore } from '../store/auth-store';
import { supabaseDouble } from '../test/supabase-double';

// Registration connects to Supabase auth & vendor_applications
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('RegisterPage Component (Vendora Dual-Role Customer & Seller Portal)', () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseDouble.reset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('renders Vendora brand logo, typography, and dual-role switcher tabs', () => {
    renderPage();

    // 1. Brand Heading & Subtitles
    expect(screen.getAllByText('Vendora').length).toBeGreaterThan(0);
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(
      screen.getByText(/Select your account tier to begin transacting with verified buyer protections/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Pakistan's Premier Multi-Vendor Marketplace")).not.toBeInTheDocument();
    expect(screen.queryByText('Protected by Vendora Escrow Shield')).not.toBeInTheDocument();
    expect(screen.queryByText('Encrypted Escrow Vault')).not.toBeInTheDocument();
    expect(screen.queryByText('SBP Regulated Gateways')).not.toBeInTheDocument();

    // 2. Dual-Role Switcher Tabs
    expect(screen.getByRole('button', { name: /Customer \(Shopper\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seller \(Merchant Store\)/i })).toBeInTheDocument();

    // 3. Customer Form Inputs
    expect(screen.getByPlaceholderText('e.g. Ayesha Khan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ayesha@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('300 1234567')).toBeInTheDocument();

    // 4. Submit button
    expect(screen.getByRole('button', { name: /Create Customer Account/i })).toBeInTheDocument();

    // 5. Lateral Perks
    expect(screen.getByText('100% Escrow Buyer Protection')).toBeInTheDocument();
    expect(screen.getByText('24–48h Express Nationwide Dispatch')).toBeInTheDocument();
  });

  it('switches between Customer and Seller mode smoothly, changing perks and fields', () => {
    renderPage();

    // Switch to Seller Tab
    const sellerTab = screen.getByRole('button', { name: /Seller \(Merchant Store\)/i });
    fireEvent.click(sellerTab);

    // Verify Seller Form Heading & Inputs
    expect(screen.getByPlaceholderText('e.g. Khaadi Studio or Volt Audio PK')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('brand-slug')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Authorized Representative Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sales@yourbrand.pk')).toBeInTheDocument();

    // Verify Seller Lateral Perks
    expect(screen.getByText('0% Take Rate / 90 Days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Merchant Application/i })).toBeInTheDocument();

    // Switch back to Customer Tab
    const customerTab = screen.getByRole('button', { name: /Customer \(Shopper\)/i });
    fireEvent.click(customerTab);

    expect(screen.getByPlaceholderText('e.g. Ayesha Khan')).toBeInTheDocument();
    expect(screen.getByText('100% Escrow Buyer Protection')).toBeInTheDocument();
  });

  it('validates password mismatch on customer form', async () => {
    renderPage();

    const nameInput = screen.getByPlaceholderText('e.g. Ayesha Khan');
    const emailInput = screen.getByPlaceholderText('ayesha@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');

    fireEvent.change(nameInput, { target: { value: 'Ayesha Khan' } });
    fireEvent.change(emailInput, { target: { value: 'ayesha@example.com' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'DifferentPass123!' } });

    const submitBtn = screen.getByRole('button', { name: /Create Customer Account/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('validates terms agreement on customer form', async () => {
    renderPage();

    const nameInput = screen.getByPlaceholderText('e.g. Ayesha Khan');
    const emailInput = screen.getByPlaceholderText('ayesha@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');

    fireEvent.change(nameInput, { target: { value: 'Ayesha Khan' } });
    fireEvent.change(emailInput, { target: { value: 'ayesha@example.com' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass123!' } });

    // Uncheck terms (customerAgreed defaults to true in form)
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    const submitBtn = screen.getByRole('button', { name: /Create Customer Account/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('You must accept the Vendora Customer Terms of Service')).toBeInTheDocument();
  });

  it('successfully creates customer account and syncs authentication', async () => {
    renderPage();

    const nameInput = screen.getByPlaceholderText('e.g. Ayesha Khan');
    const emailInput = screen.getByPlaceholderText('ayesha@example.com');
    const phoneInput = screen.getByPlaceholderText('300 1234567');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');

    fireEvent.change(nameInput, { target: { value: 'Ayesha Khan' } });
    fireEvent.change(emailInput, { target: { value: 'ayesha.buyer@vendora.pk' } });
    fireEvent.change(phoneInput, { target: { value: '300 1234567' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass123!' } });

    const submitBtn = screen.getByRole('button', { name: /Create Customer Account/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    const authUser = useAuthStore.getState().user;
    expect(authUser).not.toBeNull();
    expect(authUser?.name).toBe('Ayesha Khan');
    expect(authUser?.email).toBe('ayesha.buyer@vendora.pk');
  });

  it('validates required fields on seller form', async () => {
    renderPage();

    // Switch to seller
    fireEvent.click(screen.getByRole('button', { name: /Seller \(Merchant Store\)/i }));

    const submitBtn = screen.getByRole('button', { name: /Submit Merchant Application/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Please provide your store / brand name')).toBeInTheDocument();
  });

  it('successfully submits seller application to vendor_applications table', async () => {
    renderPage();

    // Switch to seller
    fireEvent.click(screen.getByRole('button', { name: /Seller \(Merchant Store\)/i }));

    const storeInput = screen.getByPlaceholderText('e.g. Khaadi Studio or Volt Audio PK');
    const slugInput = screen.getByPlaceholderText('brand-slug');
    const ownerInput = screen.getByPlaceholderText('Authorized Representative Name');
    const emailInput = screen.getByPlaceholderText('sales@yourbrand.pk');
    const phoneInput = screen.getByPlaceholderText('321 9876543');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');

    fireEvent.change(storeInput, { target: { value: 'Khaadi Crafts Hub' } });
    fireEvent.change(slugInput, { target: { value: 'khaadi-crafts-hub' } });
    fireEvent.change(ownerInput, { target: { value: 'Tariq Mehmood' } });
    fireEvent.change(emailInput, { target: { value: 'tariq.seller@vendora.pk' } });
    fireEvent.change(phoneInput, { target: { value: '321 9876543' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'MerchantSecret123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'MerchantSecret123!' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Merchant Application/i });
    fireEvent.submit(submitBtn.closest('form')!);

    // Verify vendor application was inserted into database double
    await waitFor(() => {
      const applications = supabaseDouble.tables.vendor_applications;
      expect(applications.length).toBeGreaterThan(0);
      const app = applications[0];
      expect(app.proposed_store_name).toBe('Khaadi Crafts Hub');
      expect(app.slug).toBe('khaadi-crafts-hub');
      expect(app.contact_email).toBe('tariq.seller@vendora.pk');
    });
  });
});
