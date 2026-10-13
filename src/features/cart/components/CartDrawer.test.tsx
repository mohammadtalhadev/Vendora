import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { CartDrawer } from './CartDrawer';
import { useCartStore } from '../../../store/cart-store';
import type { CartItem } from '../../../types/domain';

const ITEM: CartItem = {
  id: '00000000-0000-4000-8000-000000000301',
  productId: '00000000-0000-4000-8000-000000000301',
  title: 'Reference Headphones',
  price: 45692,
  quantity: 1,
  maxStock: 5,
  image: '',
  sellerId: 'store-1',
  sellerName: 'Nova Tech',
  sellerType: 'vendor',
  type: 'physical',
};

function renderDrawer(onClose: () => void) {
  return render(
    <MemoryRouter>
      <CartDrawer isOpen onClose={onClose} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({
    items: [{ ...ITEM }],
    activeUserId: null,
    appliedCoupon: null,
    hydrating: false,
    error: null,
  });
});

/**
 * QA M-4 regression: the drawer may close ONLY on an explicit affordance —
 * the X, the backdrop, Escape, or a navigation action. Interacting with the
 * cart itself (quantity steppers, the discount box, the panel) must never
 * dismiss it, or checkout becomes unreachable.
 */
describe('CartDrawer close behaviour', () => {
  it('stays open when the quantity stepper is used', () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('stays open when the panel itself is clicked', () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole('dialog', { name: 'Shopping cart' }));
    fireEvent.click(screen.getByText('Estimated total'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on the backdrop, and only the backdrop', () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    const backdrop = screen.getByRole('dialog', { name: 'Shopping cart' }).previousElementSibling;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the X button and on Escape', () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Close cart' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes when the customer chooses checkout (explicit navigation)', () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole('button', { name: /check out/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
