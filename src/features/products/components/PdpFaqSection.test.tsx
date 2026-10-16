import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdpFaqSection } from './PdpFaqSection';

/**
 * Batch 133 — the PDP FAQ section. Answers must stay grounded in the
 * platform's real policies (the resolved delivery window handed in by
 * the page, 30-day returns, Visa/Mastercard/COD, the disputes flow,
 * account order tracking) — no invented terms, no warranty promise.
 */

describe('PdpFaqSection (Batch 133)', () => {
  it('renders the section anchor the nav pill scrolls to', () => {
    const { container } = render(<PdpFaqSection deliveryWindow="Tue, Oct 20 – Thu, Oct 22" />);
    expect(container.querySelector('#pdp-faqs')).not.toBeNull();
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('answers delivery with the product’s own resolved window', () => {
    render(<PdpFaqSection deliveryWindow="Tue, Oct 20 – Thu, Oct 22" />);
    // First question starts open.
    expect(screen.getByText(/Tue, Oct 20 – Thu, Oct 22/)).toBeInTheDocument();
    expect(screen.getByText(/2–4 business days/)).toBeInTheDocument();
  });

  it('digital products get the instant-delivery answer instead', () => {
    render(<PdpFaqSection deliveryWindow="unused" isDigital />);
    expect(screen.getByText(/delivered to your account right after checkout/)).toBeInTheDocument();
  });

  it('opens the returns answer on click, citing the 30-day policy', () => {
    render(<PdpFaqSection deliveryWindow="Tue, Oct 20 – Thu, Oct 22" />);
    fireEvent.click(screen.getByRole('button', { name: /return policy/ }));
    expect(screen.getByText(/30 days from delivery/)).toBeInTheDocument();
  });

  it('never promises a warranty', () => {
    const { container } = render(<PdpFaqSection deliveryWindow="Tue, Oct 20 – Thu, Oct 22" />);
    expect(container.textContent?.toLowerCase()).not.toContain('warranty');
  });
});
