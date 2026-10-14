import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders exactly one h1 with the page title', () => {
    render(<PageHeader title="Shopping Cart (2 items)" description="Grouped by seller" />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Shopping Cart (2 items)');
    expect(screen.getByText('Grouped by seller')).toBeInTheDocument();
  });

  it('renders the eyebrow and action when given', () => {
    render(
      <PageHeader
        title="Product Analysis Matrix (2/4)"
        eyebrow="Side-by-Side Product Comparison"
        action={<button type="button">Clear Matrix</button>}
      />,
    );
    expect(screen.getByText('Side-by-Side Product Comparison')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Matrix' })).toBeInTheDocument();
  });
});
