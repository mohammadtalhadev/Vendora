import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ViewAllLink } from './ViewAllLink';

function renderLink(props: React.ComponentProps<typeof ViewAllLink>) {
  return render(
    <MemoryRouter>
      <ViewAllLink {...props} />
    </MemoryRouter>,
  );
}

describe('ViewAllLink', () => {
  it('renders the standard recipe with the default "View All" label', () => {
    renderLink({ to: '/products' });
    const link = screen.getByRole('link', { name: /View All/ });
    expect(link).toHaveAttribute('href', '/products');
    // The one recipe: pale tint at rest, solid sun-orange fill on hover.
    expect(link.className).toContain('bg-orange-50/80');
    expect(link.className).toContain('hover:bg-sun-orange');
    expect(link.className).toContain('hover:text-white');
    expect(link.className).not.toContain('text-sun-orange-700');
  });

  it('renders custom children instead of the default label', () => {
    renderLink({ to: '/recently-viewed', children: 'See everything' });
    expect(screen.getByRole('link', { name: /See everything/ })).toBeInTheDocument();
  });

  it('merges layout extras (visibility, spacing) without losing the recipe', () => {
    renderLink({ to: '/products', className: 'mr-2 hidden sm:inline-flex' });
    const link = screen.getByRole('link', { name: /View All/ });
    expect(link.className).toContain('mr-2');
    expect(link.className).toContain('hidden');
    expect(link.className).toContain('sm:inline-flex');
    expect(link.className).toContain('hover:bg-sun-orange');
  });

  it('forwards onClick (the mega menu closes through it)', () => {
    const onClick = vi.fn();
    renderLink({ to: '/products?category=audio', onClick });
    fireEvent.click(screen.getByRole('link', { name: /View All/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
