import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorShippingSettingsPage } from './VendorShippingSettingsPage';

describe('VendorShippingSettingsPage component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders shipping rates, warehouse dispatch origin, and SLA options', () => {
    render(
      <MemoryRouter>
        <VendorShippingSettingsPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Shipping Settings & Dispatch Origin/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Free Shipping Threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Shipping Flat Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Express Courier Surcharge/i)).toBeInTheDocument();
    expect(screen.getByText(/Warehouse Dispatch Origin/i)).toBeInTheDocument();
    expect(screen.getByText(/Dispatched within 24 hours \(Prime SLA\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dispatched within 48 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom 3-5 business days/i)).toBeInTheDocument();
  });

  it('allows editing shipping rates and saving to localStorage with toast notification', async () => {
    render(
      <MemoryRouter>
        <VendorShippingSettingsPage />
      </MemoryRouter>
    );

    const standardInput = screen.getByLabelText(/Standard Shipping Flat Rate/i);
    fireEvent.change(standardInput, { target: { value: '9.50' } });

    const saveButtons = screen.getAllByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Shipping rates, dispatch origin, and SLA rules successfully saved!/i)).toBeInTheDocument();
    });

    const stored = localStorage.getItem('vd:v1:vendor_shipping_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).standardRate).toBe(9.5);
  });

  it('allows updating warehouse address origin and access codes', () => {
    render(
      <MemoryRouter>
        <VendorShippingSettingsPage />
      </MemoryRouter>
    );

    const streetInput = screen.getByLabelText(/Street Address & Bay \/ Suite/i);
    fireEvent.change(streetInput, { target: { value: '100 Metro Logistics Way' } });
    expect(streetInput).toHaveValue('100 Metro Logistics Way');

    const gateInput = screen.getByLabelText(/Security Gate Access Code/i);
    fireEvent.change(gateInput, { target: { value: '#9999-DOCK' } });
    expect(gateInput).toHaveValue('#9999-DOCK');
  });

  it('switches fulfillment SLA window radio choice', () => {
    render(
      <MemoryRouter>
        <VendorShippingSettingsPage />
      </MemoryRouter>
    );

    const sla48Radio = screen.getByRole('radio', { name: /Dispatched within 48 hours/i });
    fireEvent.click(sla48Radio);
    expect(sla48Radio).toBeChecked();

    const slaCustomRadio = screen.getByRole('radio', { name: /Custom 3-5 business days/i });
    fireEvent.click(slaCustomRadio);
    expect(slaCustomRadio).toBeChecked();
  });

  it('resets settings to default on Reset Defaults click', async () => {
    render(
      <MemoryRouter>
        <VendorShippingSettingsPage />
      </MemoryRouter>
    );

    const standardInput = screen.getByLabelText(/Standard Shipping Flat Rate/i);
    fireEvent.change(standardInput, { target: { value: '25.00' } });

    const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/Reset to marketplace standard configurations/i)).toBeInTheDocument();
    expect(standardInput).toHaveValue(8.5);
  });
});
