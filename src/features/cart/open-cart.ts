/**
 * The cart drawer is mounted by the Navbar, so anything deeper in the tree
 * that needs it open (the product page's Add to Cart, its sticky buy bar)
 * asks through this event instead of threading an open callback through
 * every layout.
 */
export const OPEN_CART_EVENT = 'vendora:open-cart';

export function openCartDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_CART_EVENT));
  }
}
