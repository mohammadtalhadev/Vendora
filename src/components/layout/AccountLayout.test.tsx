import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AccountLayout } from './AccountLayout';
import { useAuthStore } from '../../store/auth-store';
import { useWishlistStore } from '../../store/wishlist-store';
import type { User } from '../../types/domain';

const CUSTOMER: User = {
  id: 'user-1',
  email: 'alex@example.pk',
  name: 'Alex Buyer',
  roles: ['customer'],
  vendorStatus: 'none',
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AccountLayout />}>
          <Route path="/account/profile" element={<p>Profile content</p>} />
          <Route path="/orders" element={<p>Orders content</p>} />
          <Route path="/wishlist" element={<p>Wishlist content</p>} />
          <Route path="/downloads" element={<p>Downloads content</p>} />
          <Route path="/account/addresses" element={<p>Addresses content</p>} />
          <Route path="/disputes" element={<p>Disputes content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AccountLayout', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useWishlistStore.getState().clearWishlist();
  });

  it('renders the user summary and every account section link', () => {
    useAuthStore.getState().setUser(CUSTOMER, 'token');
    renderAt('/account/profile');

    expect(screen.getByText('Alex Buyer')).toBeInTheDocument();
    expect(screen.getByText('alex@example.pk')).toBeInTheDocument();
    expect(screen.getByText('Customer account')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: /account sections/i });
    expect(nav).toBeInTheDocument();
    for (const [label, href] of [
      ['Profile & Settings', '/account/profile'],
      ['My Orders', '/orders'],
      ['My Wishlist', '/wishlist'],
      ['My Downloads', '/downloads'],
      ['Addresses', '/account/addresses'],
      ['Disputes & Claims', '/disputes'],
    ] as const) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toHaveAttribute('href', href);
    }
    expect(screen.getByText('Profile content')).toBeInTheDocument();
  });

  it('marks only the current section active', () => {
    useAuthStore.getState().setUser(CUSTOMER, 'token');
    renderAt('/wishlist');

    expect(screen.getByRole('link', { name: /my wishlist/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /profile & settings/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /addresses/i })).not.toHaveAttribute('aria-current');
  });

  it('keeps the same sidebar mounted while the content swaps (wishlist -> downloads)', () => {
    useAuthStore.getState().setUser(CUSTOMER, 'token');
    renderAt('/wishlist');

    const navBefore = screen.getByRole('navigation', { name: /account sections/i });
    expect(screen.getByText('Wishlist content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /my downloads/i }));

    expect(screen.getByText('Downloads content')).toBeInTheDocument();
    expect(screen.queryByText('Wishlist content')).not.toBeInTheDocument();
    // The sidebar never unmounted: it is literally the same DOM node.
    expect(screen.getByRole('navigation', { name: /account sections/i })).toBe(navBefore);
    expect(screen.getByRole('link', { name: /my downloads/i })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a guest summary with a sign-in link when signed out', () => {
    renderAt('/orders');
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByText('Orders content')).toBeInTheDocument();
  });
});
