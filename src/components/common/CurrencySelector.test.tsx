import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencySelector } from './CurrencySelector';
import { useCurrencyStore, FALLBACK_RATES } from '../../store/currency-store';

describe('CurrencySelector Component', () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: 'USD',
      rates: FALLBACK_RATES,
      isLoading: false,
      lastUpdated: new Date().toISOString(),
    });
  });

  it('renders topbar button with active currency code and symbol', () => {
    render(<CurrencySelector variant="topbar" />);

    const button = screen.getByRole('button', { name: /select currency/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('USD');
    expect(button).toHaveTextContent('($)');
  });

  it('opens dropdown on click and displays famous currencies', () => {
    render(<CurrencySelector variant="topbar" />);

    const button = screen.getByRole('button', { name: /select currency/i });
    fireEvent.click(button);

    expect(screen.getByText(/Live Google Rates/i)).toBeInTheDocument();
    expect(screen.getByText(/Pakistani Rupee/i)).toBeInTheDocument();
    expect(screen.getByText(/UAE Dirham/i)).toBeInTheDocument();
    expect(screen.getByText(/Euro/i)).toBeInTheDocument();
    expect(screen.getByText(/British Pound/i)).toBeInTheDocument();
  });

  it('switches currency when a currency option is selected', () => {
    render(<CurrencySelector variant="topbar" />);

    const button = screen.getByRole('button', { name: /select currency/i });
    fireEvent.click(button);

    const pkrBtn = screen.getByRole('button', { name: /PKR/i });
    fireEvent.click(pkrBtn);

    expect(useCurrencyStore.getState().currency).toBe('PKR');
  });

  it('renders mobile variant with interactive currency grid', () => {
    render(<CurrencySelector variant="mobile" />);

    expect(screen.getByText(/Market Currency/i)).toBeInTheDocument();
    const pkrMobileBtn = screen.getByRole('button', { name: /PKR/i });
    expect(pkrMobileBtn).toBeInTheDocument();

    fireEvent.click(pkrMobileBtn);
    expect(useCurrencyStore.getState().currency).toBe('PKR');
  });
});
