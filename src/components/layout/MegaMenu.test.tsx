import { beforeEach, describe, expect, it, vi } from 'vitest';

// The menu has no static catalog of its own: it renders whichever root
// categories, subcategories and products the database returns, so the double
// is the only fixture it needs.
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MegaMenu } from './MegaMenu';
import { renderWorkspace } from '../../test/vendor-render';
import { categoryRow, productRow, storeRow, supabaseDouble } from '../../test/supabase-double';
import { formatPrice } from '../../store/currency-store';

const ELECTRONICS = '00000000-0000-4000-8000-00000000000a';
const FASHION = '00000000-0000-4000-8000-00000000000b';
const PETS = '00000000-0000-4000-8000-00000000000c';
const TVS = '00000000-0000-4000-8000-00000000001a';
const SMART_HOME = '00000000-0000-4000-8000-00000000001b';
const MENS = '00000000-0000-4000-8000-00000000001c';

const seedCatalog = () => {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedCategory(categoryRow({ id: ELECTRONICS, name: 'Electronics', slug: 'electronics' }));
  supabaseDouble.seedCategory(categoryRow({ id: FASHION, name: 'Fashion', slug: 'fashion' }));
  supabaseDouble.seedCategory(categoryRow({ id: PETS, name: 'Pet Supplies', slug: 'pet-supplies' }));
  supabaseDouble.seedCategory(categoryRow({ id: TVS, name: 'Televisions & Video', slug: 'televisions-video', parent_id: ELECTRONICS }));
  supabaseDouble.seedCategory(categoryRow({ id: SMART_HOME, name: 'Smart Home', slug: 'smart-home', parent_id: ELECTRONICS }));
  supabaseDouble.seedCategory(categoryRow({ id: MENS, name: "Men's Fashion", slug: 'mens-fashion', parent_id: FASHION }));
  supabaseDouble.seedProduct(
    productRow({ id: '00000000-0000-4000-8000-000000000101', title: 'Reference Television', slug: 'reference-television', category_id: ELECTRONICS, price: 899.99, status: 'approved' }),
  );
  supabaseDouble.seedProduct(
    productRow({ id: '00000000-0000-4000-8000-000000000102', title: 'Smart Speaker Mini', slug: 'smart-speaker-mini', category_id: SMART_HOME, price: 59.5, status: 'approved' }),
  );
  supabaseDouble.seedProduct(
    productRow({ id: '00000000-0000-4000-8000-000000000103', title: 'Unlisted Prototype', slug: 'unlisted-prototype', category_id: ELECTRONICS, price: 999, status: 'pending_review' }),
  );
  supabaseDouble.seedProduct(
    productRow({ id: '00000000-0000-4000-8000-000000000104', title: 'Braided Dog Leash', slug: 'braided-dog-leash', category_id: PETS, price: 24.99, status: 'approved' }),
  );
};

const renderMenu = (isOpen = true, onClose = vi.fn()) => ({
  onClose,
  ...renderWorkspace(<MegaMenu isOpen={isOpen} onClose={onClose} />, ['/']),
});

describe('MegaMenu', () => {
  beforeEach(() => {
    supabaseDouble.reset();
  });

  it('renders nothing while closed', () => {
    seedCatalog();
    renderMenu(false);
    expect(screen.queryByRole('region', { name: /products$/i })).not.toBeInTheDocument();
  });

  it('lists the root categories the catalog actually has, and no others', async () => {
    seedCatalog();
    renderMenu();

    await waitFor(() => expect(screen.getByRole('button', { name: /Electronics/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Fashion/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pet Supplies/ })).toBeInTheDocument();
    // Subcategories are pane links, never left-column entries of their own.
    expect(screen.queryByRole('button', { name: /Televisions & Video/ })).not.toBeInTheDocument();
    // The pre-Supabase menu shipped eleven invented entries; a category that was never
    // seeded must not appear just because the design file named it.
    expect(screen.queryByRole('button', { name: /Grocery & Fruits/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Grocery & Fruits/ })).not.toBeInTheDocument();
  });

  it('says so when the catalog has no categories', async () => {
    renderMenu();
    await waitFor(() => expect(screen.getByText(/No categories are available yet/)).toBeInTheDocument());
  });

  it('shows the active root’s subcategory links AND its products with real prices', async () => {
    seedCatalog();
    renderMenu();

    const pane = await screen.findByRole('region', { name: /products$/i });
    // Subcategory links, pointing at their own slugs.
    const tvs = await screen.findByRole('link', { name: 'Televisions & Video' });
    expect(tvs).toHaveAttribute('href', '/products?category=televisions-video');
    expect(screen.getByRole('link', { name: 'Smart Home' })).toHaveAttribute(
      'href',
      '/products?category=smart-home',
    );
    // Products filed under the root itself…
    await waitFor(() => expect(pane).toHaveTextContent('Reference Television'));
    expect(pane).toHaveTextContent(formatPrice(899.99));
    // …and products filed under one of its subcategories.
    expect(pane).toHaveTextContent('Smart Speaker Mini');
    expect(pane).toHaveTextContent(formatPrice(59.5));
    // A listing still in moderation is not a product the storefront may advertise.
    expect(pane).not.toHaveTextContent('Unlisted Prototype');
    // Another root's subcategories and products stay out of this pane.
    expect(pane).not.toHaveTextContent("Men's Fashion");
    expect(pane).not.toHaveTextContent('Braided Dog Leash');
  });

  it('switches the pane to the clicked category instead of only following the mouse', async () => {
    seedCatalog();
    renderMenu();

    const electronics = await screen.findByRole('button', { name: /Electronics/ });
    expect(electronics).toHaveAttribute('aria-expanded', 'true');
    expect(electronics).toHaveAttribute('aria-controls', 'mega-menu-pane');

    const fashion = screen.getByRole('button', { name: /Fashion/ });
    expect(fashion).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(fashion);

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /products$/i })).toHaveTextContent("Men's Fashion"),
    );
    expect(fashion).toHaveAttribute('aria-expanded', 'true');
    expect(electronics).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a keyboard focus on a category, so the menu is reachable without hover', async () => {
    seedCatalog();
    renderMenu();

    const fashion = await screen.findByRole('button', { name: /Fashion/ });
    fireEvent.focus(fashion);
    await waitFor(() =>
      expect(screen.getByRole('region', { name: /products$/i })).toHaveTextContent("Men's Fashion"),
    );
  });

  it('shows a root without subcategories with its products and no subcategory list', async () => {
    seedCatalog();
    renderMenu();

    const pets = await screen.findByRole('button', { name: /Pet Supplies/ });
    fireEvent.click(pets);

    const pane = await screen.findByRole('region', { name: /products$/i });
    await waitFor(() => expect(pane).toHaveTextContent('Braided Dog Leash'));
    expect(pane).toHaveTextContent('Pet Supplies');
    expect(pane).not.toHaveTextContent('Televisions & Video');
    expect(pane).not.toHaveTextContent('Smart Home');
  });

  it('links “View All” to the real category slug and closes the menu', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const viewAll = await screen.findByRole('link', { name: /View All/ });
    expect(viewAll).toHaveAttribute('href', '/products?category=electronics');
    fireEvent.click(viewAll);
    expect(onClose).toHaveBeenCalled();
  });

  it('has no “Explore All” button — the header’s View All already covers that link', async () => {
    seedCatalog();
    renderMenu();

    await screen.findByRole('link', { name: /View All/ });
    expect(screen.queryByRole('link', { name: /Explore All/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Shopping the full shelf/)).not.toBeInTheDocument();
  });

  it('closes the menu when a subcategory link is clicked', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const tvs = await screen.findByRole('link', { name: 'Televisions & Video' });
    fireEvent.click(tvs);
    expect(onClose).toHaveBeenCalled();
  });
});
