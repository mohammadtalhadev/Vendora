import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AffiliatePage } from './AffiliatePage';

/**
 * The affiliate page used to present a fictional program: invented payout
 * totals, a fake earnings dashboard, invented commission rates and a
 * toast-only application form (Pro-0). built the real
 * referral backend (referral codes, loyalty points, coupon conversion),
 * so the page now presents that live program — and only its real rules.
 * These tests pin the launched behaviour and that none of the fabricated
 * content came back with it.
 */
describe('AffiliatePage', () => {
  it('presents the live referral program and its real points rules', () => {
    render(
      <MemoryRouter>
        <AffiliatePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /share vendora, earn loyalty points/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/referral program is live/i)).toBeInTheDocument();
    expect(screen.getByText(/250 loyalty points/i)).toBeInTheDocument();
    expect(screen.getByText(/100 points convert into a Rs 100 coupon/i)).toBeInTheDocument();
    // Guests are pointed at sign-in to get their own referral link.
    expect(
      screen.getByRole('link', { name: /sign in to get your referral link/i }),
    ).toBeInTheDocument();
  });

  it('carries none of the fabricated program content', () => {
    const { container } = render(
      <MemoryRouter>
        <AffiliatePage />
      </MemoryRouter>,
    );

    expect(container.textContent).not.toMatch(/\$2\.8M/);
    expect(container.textContent).not.toMatch(/14,840/);
    expect(container.textContent).not.toMatch(/Paid to Creators/i);
    expect(container.textContent).not.toMatch(/Earnings Estimator/i);
    expect(container.textContent).not.toMatch(/Hamza Nasir|Sarah Jenkins|Rayan Tariq/);
    // No application form and nothing that accepts a submission.
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
  });
});
