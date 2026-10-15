import { describe, it, expect, beforeEach, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { VendorShippingSettingsPage } from './VendorShippingSettingsPage';
import { renderWorkspace, signInVendor } from '../test/vendor-render';
import { formatPrice } from '../store/currency-store';
import { shippingRow, supabaseDouble } from '../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  signInVendor();
});

describe('VendorShippingSettingsPage', () => {
  it('starts the form from the row this store saved', async () => {
    supabaseDouble.seedShippingSettings(
      shippingRow({
        vendor_id: 'store-1',
        standard_rate: 7.25,
        express_rate: 19,
        warehouse_name: 'North Dock',
        sla_window: '24h',
      }),
    );

    renderWorkspace(<VendorShippingSettingsPage />);

    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(7.25));
    expect(screen.getByLabelText('Express surcharge')).toHaveValue(19);
    expect(screen.getByLabelText('Facility name')).toHaveValue('North Dock');
    expect(screen.getByRole('radio', { name: 'Dispatched within 24 hours' })).toBeChecked();
    expect(screen.getByText(formatPrice(7.25))).toBeInTheDocument();
  });

  it('shows an unsaved store blanks rather than sample rates', async () => {
    renderWorkspace(<VendorShippingSettingsPage />);

    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(0));
    expect(screen.getByLabelText('Express surcharge')).toHaveValue(0);
    expect(screen.getByLabelText('Facility name')).toHaveValue('');
    // The summary restates the absence instead of inventing an origin.
    await waitFor(() => expect(screen.getByText('not recorded')).toBeInTheDocument());
    expect(supabaseDouble.tables.vendor_shipping_settings).toHaveLength(0);
  });

  it('saves the form into the store’s own row and shows what came back', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1' }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(8.5));

    fireEvent.change(screen.getByLabelText('Standard flat rate'), { target: { value: '9.50' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Custom 3-5 business days' }));
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() => expect(screen.getByText(/Saved: Demo Warehouse · Custom 3-5 business days/)).toBeInTheDocument());
    expect(supabaseDouble.tables.vendor_shipping_settings).toHaveLength(1);
    expect(supabaseDouble.tables.vendor_shipping_settings[0]).toMatchObject({
      vendor_id: 'store-1',
      standard_rate: 9.5,
      sla_window: 'custom',
    });
    // The panel restates the stored row, not what was typed.
    expect(screen.getByText(formatPrice(9.5))).toBeInTheDocument();
  });

  it('reverts to the saved row instead of a marketplace default', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1', standard_rate: 6 }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(6));

    fireEvent.change(screen.getByLabelText('Standard flat rate'), { target: { value: '44' } });
    expect(screen.getByLabelText('Standard flat rate')).toHaveValue(44);

    fireEvent.click(screen.getByRole('button', { name: /Revert to saved/i }));
    expect(screen.getByLabelText('Standard flat rate')).toHaveValue(6);
  });

  it('reports a write the database refused', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1' }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(8.5));

    supabaseDouble.failures.vendor_shipping_settings = 'row-level security';
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() =>
      expect(screen.getByText(/Failed to save your shipping settings: row-level security/)).toBeInTheDocument(),
    );
    expect(supabaseDouble.tables.vendor_shipping_settings[0].standard_rate).toBe(8.5);
  });

  it('shows a failed read as an error rather than as an empty form', async () => {
    supabaseDouble.failures.vendor_shipping_settings = 'connection terminated';

    renderWorkspace(<VendorShippingSettingsPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load your shipping settings: connection terminated/)).toBeInTheDocument(),
    );
  });

  it('starts the delivery-time fields from the tiers this store saved', async () => {
    supabaseDouble.seedShippingSettings(
      shippingRow({
        vendor_id: 'store-1',
        delivery_times: { sameCity: { min: 1, max: 2 }, nationwide: { min: 3, max: 6 } },
      }),
    );

    renderWorkspace(<VendorShippingSettingsPage />);

    const fastest = await screen.findAllByLabelText('Fastest');
    const slowest = screen.getAllByLabelText('Slowest');
    // Tier order on the form: same city, same province, rest of Pakistan.
    await waitFor(() => expect(fastest[0]).toHaveValue(1));
    expect(slowest[0]).toHaveValue(2);
    expect(fastest[1]).toHaveValue(null);
    expect(fastest[2]).toHaveValue(3);
    expect(slowest[2]).toHaveValue(6);
    // The summary restates the stored tiers, and the unset one as unset.
    await waitFor(() => expect(screen.getByText('1–2 business days')).toBeInTheDocument());
    expect(screen.getByText('3–6 business days')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('saves delivery times the seller typed and restates what came back', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1' }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(8.5));

    const fastest = screen.getAllByLabelText('Fastest');
    const slowest = screen.getAllByLabelText('Slowest');
    fireEvent.change(fastest[0], { target: { value: '1' } });
    fireEvent.change(slowest[0], { target: { value: '2' } });
    fireEvent.change(fastest[2], { target: { value: '3' } });
    fireEvent.change(slowest[2], { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() => expect(screen.getByText(/Saved:/)).toBeInTheDocument());
    expect(supabaseDouble.tables.vendor_shipping_settings[0].delivery_times).toEqual({
      sameCity: { min: 1, max: 2 },
      nationwide: { min: 3, max: 5 },
    });
    await waitFor(() => expect(screen.getByText('1–2 business days')).toBeInTheDocument());
  });

  it('refuses a tier whose fastest day is after its slowest, and saves nothing', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1' }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(8.5));

    const fastest = screen.getAllByLabelText('Fastest');
    const slowest = screen.getAllByLabelText('Slowest');
    fireEvent.change(fastest[0], { target: { value: '5' } });
    fireEvent.change(slowest[0], { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() =>
      expect(screen.getByText(/Same city: use whole days from 1 to 15, fastest first/)).toBeInTheDocument(),
    );
    expect(supabaseDouble.tables.vendor_shipping_settings[0].delivery_times).toEqual({});
  });

  it('refuses a half-filled tier instead of guessing the missing day', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: 'store-1' }));

    renderWorkspace(<VendorShippingSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText('Standard flat rate')).toHaveValue(8.5));

    fireEvent.change(screen.getAllByLabelText('Fastest')[1], { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Same province: enter both the fastest and slowest delivery days/),
      ).toBeInTheDocument(),
    );
    expect(supabaseDouble.tables.vendor_shipping_settings[0].delivery_times).toEqual({});
  });
});
