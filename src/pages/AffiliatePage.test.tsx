import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AffiliatePage } from './AffiliatePage';

/**
 * The affiliate page used to present a fictional program: invented payout
 * totals, a fake earnings dashboard, invented commission rates and a
 * toast-only application form (Batch 5, Pro-0). No affiliate backend
 * exists in the schema, so the page is now an honest "not launched"
 * notice. These tests pin that: no stats, no rates, no form, no promise.
 */
describe('AffiliatePage', () => {
  it('says plainly that the program has not launched', () => {
    render(
      <MemoryRouter>
        <AffiliatePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /hasn.t launched yet/i })).toBeInTheDocument();
    expect(screen.getByText(/applications are not open/i)).toBeInTheDocument();
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
