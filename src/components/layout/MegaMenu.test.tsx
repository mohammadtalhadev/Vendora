import { beforeEach, describe, expect, it, vi } from 'vitest';

// The menu has no static catalog of its own: it renders whichever root
// categories and subcategories the database returns, so the double is the
// only fixture it needs.
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MegaMenu } from './MegaMenu';
import { renderWorkspace } from '../../test/vendor-render';
import { categoryRow, storeRow, supabaseDouble } from '../../test/supabase-double';

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
    expect(screen.queryByRole('region', { name: /subcategories$/i })).not.toBeInTheDocument();
  });

  it('lists the root categories the catalog actually has, and no others', async () => {
    seedCatalog();
    renderMenu();

    await waitFor(() => expect(screen.getByRole('button', { name: /Electronics/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Fashion/ })).toBeInTheDocument();
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

  it('shows the active root’s subcategories as plain links to their own slugs', async () => {
    seedCatalog();
    renderMenu();

    const pane = await screen.findByRole('region', { name: /subcategories$/i });
    expect(pane).toHaveTextContent('Electronics');
    const tvs = await screen.findByRole('link', { name: 'Televisions & Video' });
    expect(tvs).toHaveAttribute('href', '/products?category=televisions-video');
    expect(screen.getByRole('link', { name: 'Smart Home' })).toHaveAttribute(
      'href',
      '/products?category=smart-home',
    );
    // Another root's subcategories stay out of this pane.
    expect(pane).not.toHaveTextContent("Men's Fashion");
    // The pane is a navigation list, not a product shelf.
    expect(pane).not.toHaveTextContent('Rs');
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
      expect(screen.getByRole('region', { name: /subcategories$/i })).toHaveTextContent("Men's Fashion"),
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
      expect(screen.getByRole('region', { name: /subcategories$/i })).toHaveTextContent("Men's Fashion"),
    );
  });

  it('renders a root without subcategories as a direct link that closes the menu', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const pets = await screen.findByRole('link', { name: /Pet Supplies/ });
    expect(pets).toHaveAttribute('href', '/products?category=pet-supplies');
    expect(screen.queryByRole('button', { name: /Pet Supplies/ })).not.toBeInTheDocument();
    fireEvent.click(pets);
    expect(onClose).toHaveBeenCalled();
  });

  it('links “Explore All” to the active root slug and closes the menu', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const exploreAll = await screen.findByRole('link', { name: /Explore All Electronics/ });
    expect(exploreAll).toHaveAttribute('href', '/products?category=electronics');
    fireEvent.click(exploreAll);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes the menu when a subcategory link is clicked', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const tvs = await screen.findByRole('link', { name: 'Televisions & Video' });
    fireEvent.click(tvs);
    expect(onClose).toHaveBeenCalled();
  });
});
