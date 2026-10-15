import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductSectionNav, ProductQuickAddPill, PDP_SECTION_LINKS } from './PdpStickyBars';

/**
 * Batch 121 — the Ronin-style PDP sticky bars.
 *
 * SectionNav: renders one pill button per real PDP section, and a click
 * smooth-scrolls to that section (the PDP pattern, as in scrollToReviews).
 * QuickAddPill: shows the real title/price handed to it, fires the page's
 * add-to-cart handler once per click, reflects the added state, and is
 * disabled with an Out of Stock label when the selection has no stock.
 */

const SECTION_IDS = ['pdp-overview', 'pdp-specs', 'reviews-section'];

describe('ProductSectionNav (Batch 121)', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  afterEach(() => {
    SECTION_IDS.forEach((id) => document.getElementById(id)?.remove());
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
  });

  const renderNavWithTargets = () => {
    SECTION_IDS.forEach((id) => {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    });
    return render(<ProductSectionNav />);
  };

  it('renders one button per section link with its label', () => {
    renderNavWithTargets();
    expect(screen.getByTestId('pdp-section-nav')).toBeInTheDocument();
    for (const link of PDP_SECTION_LINKS) {
      expect(screen.getByRole('button', { name: new RegExp(link.label) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Specs/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reviews/ })).toBeInTheDocument();
  });

  it('clicking Specs smooth-scrolls to the specs section', () => {
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;
    renderNavWithTargets();

    fireEvent.click(screen.getByRole('button', { name: /Specs/ }));

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.instances[0]).toBe(document.getElementById('pdp-specs'));
  });

  it('marks the clicked section as the current one', () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    renderNavWithTargets();

    const specsButton = screen.getByRole('button', { name: /Specs/ });
    fireEvent.click(specsButton);

    expect(specsButton).toHaveAttribute('aria-current', 'true');
  });
});

describe('ProductQuickAddPill (Batch 121)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseProps = {
    image: '/images/products/test.webp',
    title: 'Test Headphones',
    priceLabel: 'Rs 4,995',
    inStock: true,
    added: false,
    onAdd: vi.fn(),
  };

  it('renders the title, variant and price it is handed', () => {
    render(<ProductQuickAddPill {...baseProps} variantName="Beige" />);
    expect(screen.getByTestId('pdp-quick-add-pill')).toBeInTheDocument();
    expect(screen.getByText('Test Headphones')).toBeInTheDocument();
    expect(screen.getByText('Beige')).toBeInTheDocument();
    expect(screen.getByText('Rs 4,995')).toBeInTheDocument();
  });

  it('fires onAdd exactly once when Add to Cart is clicked', () => {
    const onAdd = vi.fn();
    render(<ProductQuickAddPill {...baseProps} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows Added! in the added state', () => {
    render(<ProductQuickAddPill {...baseProps} added={true} />);
    expect(screen.getByRole('button', { name: /Added!/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add to Cart/ })).not.toBeInTheDocument();
  });

  it('plays the checkmark burst icon in the added state only', () => {
    const { rerender } = render(<ProductQuickAddPill {...baseProps} added={true} />);
    expect(screen.getByTestId('added-burst-icon')).toBeInTheDocument();

    rerender(<ProductQuickAddPill {...baseProps} added={false} />);
    expect(screen.queryByTestId('added-burst-icon')).not.toBeInTheDocument();
  });

  it('is disabled and labelled Out of Stock when there is no stock', () => {
    const onAdd = vi.fn();
    render(<ProductQuickAddPill {...baseProps} inStock={false} onAdd={onAdd} />);

    const button = screen.getByRole('button', { name: /Out of Stock/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
