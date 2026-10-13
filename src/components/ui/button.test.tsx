import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('Button primitive', () => {
  it('enforces rounded-full pill geometry across all variants', () => {
    const variants = [
      'default',
      'orange-cta',
      'glass-pill',
      'outline',
      'ghost',
    ] as const;

    variants.forEach((variant) => {
      const className = buttonVariants({ variant });
      expect(className).toContain('rounded-full');
    });
  });

  it('renders orange-cta variant with Sun Orange branding', () => {
    render(<Button variant="orange-cta">Buy Now</Button>);
    const button = screen.getByRole('button', { name: /Buy Now/i });
    expect(button.className).toContain('bg-sun-orange');
    expect(button.className).toContain('rounded-full');
  });

  it('renders glass-pill variant with blur and solid fallback', () => {
    render(<Button variant="glass-pill">Explore</Button>);
    const button = screen.getByRole('button', { name: /Explore/i });
    expect(button.className).toContain('backdrop-blur-[16px]');
    expect(button.className).toContain('rounded-full');
    expect(button.className).toContain('supports-[not(backdrop-filter:blur(0))]:bg-white');
  });

  it('renders outline and ghost variants correctly', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button', { name: /Outline/i }).className).toContain('border-slate-200');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button', { name: /Ghost/i }).className).toContain('hover:bg-slate-100');
  });

  it('renders gradient variant with the canonised admin/vendor CTA treatment', () => {
    render(<Button variant="gradient">Create</Button>);
    const button = screen.getByRole('button', { name: /Create/i });
    expect(button.className).toContain('bg-gradient-to-r');
    expect(button.className).toContain('from-sun-orange');
    expect(button.className).toContain('to-sun-orange-600');
    expect(button.className).toContain('hover:to-sun-orange-700');
    expect(button.className).toContain('text-white');
    expect(button.className).toContain('rounded-full');
    expect(buttonVariants({ variant: 'gradient' })).toContain('rounded-full');
  });

  it('renders correctly with asChild slot', () => {
    render(
      <Button asChild variant="orange-cta">
        <a href="/checkout">Checkout Link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: /Checkout Link/i });
    expect(link).toBeInTheDocument();
    expect(link.className).toContain('rounded-full');
    expect(link.className).toContain('bg-sun-orange');
  });
});
