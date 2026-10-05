import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';

describe('Badge primitive', () => {
  it('enforces rounded-full pill geometry on all badges', () => {
    const variants = [
      'vendor-verified',
      'vendora-platform',
      'discount-coral',
      'in-stock',
      'default',
      'outline',
    ] as const;

    variants.forEach((variant) => {
      const className = badgeVariants({ variant });
      expect(className).toContain('rounded-full');
    });
  });

  it('renders vendor-verified with aqua theme', () => {
    render(<Badge variant="vendor-verified">Verified Vendor</Badge>);
    const badge = screen.getByText('Verified Vendor');
    expect(badge.className).toContain('bg-aqua/15');
    expect(badge.className).toContain('rounded-full');
  });

  it('renders vendora-platform with sun orange theme', () => {
    render(<Badge variant="vendora-platform">Sold by Vendora</Badge>);
    const badge = screen.getByText('Sold by Vendora');
    expect(badge.className).toContain('bg-sun-orange/15');
    expect(badge.className).toContain('rounded-full');
  });

  it('renders discount-coral with coral theme', () => {
    render(<Badge variant="discount-coral">25% OFF</Badge>);
    const badge = screen.getByText('25% OFF');
    expect(badge.className).toContain('bg-coral');
    expect(badge.className).toContain('rounded-full');
  });

  it('renders in-stock badge with emerald theme', () => {
    render(<Badge variant="in-stock">In Stock</Badge>);
    const badge = screen.getByText('In Stock');
    expect(badge.className).toContain('bg-emerald-50');
    expect(badge.className).toContain('rounded-full');
  });
});
