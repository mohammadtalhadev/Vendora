import { beforeEach, describe, expect, it, vi } from 'vitest';

// The menu has no static catalog of its own: it renders whichever categories and
// products the database returns, so the double is the only fixture it needs.
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MegaMenu } from './MegaMenu';
import { renderWorkspace } from '../../test/vendor-render';
import { categoryRow, productRow, storeRow, supabaseDouble } from '../../test/supabase-double';
import { formatPrice } from '../../store/currency-store';

const AUDIO = '00000000-0000-4000-8000-00000000000a';
const LAMPS = '00000000-0000-4000-8000-00000000000b';

const seedCatalog = () => {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedCategory(categoryRow({ id: AUDIO, name: 'Audio', slug: 'audio' }));
  supabaseDouble.seedCategory(categoryRow({ id: LAMPS, name: 'Lighting', slug: 'lighting' }));
  supabaseDouble.seedProduct(
    productRow({ id: '00000000-0000-4000-8000-000000000101', title: 'Reference Headphones', slug: 'reference-headphones', category_id: AUDIO, price: 199.99, status: 'approved' }),
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

  it('lists the categories the catalog actually has, and no others', async () => {
    seedCatalog();
    renderMenu();

    await waitFor(() => expect(screen.getByRole('button', { name: /Audio/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Lighting/ })).toBeInTheDocument();
    // The pre-Supabase menu shipped eleven invented entries; a category that was never
    // seeded must not appear just because the design file named it.
    expect(screen.queryByRole('button', { name: /Grocery & Fruits/ })).not.toBeInTheDocument();
  });

  it('says so when the catalog has no categories', async () => {
    renderMenu();
    await waitFor(() => expect(screen.getByText(/No categories are available yet/)).toBeInTheDocument());
  });

  it('shows the active category’s approved products with their real prices', async () => {
    seedCatalog();
    supabaseDouble.seedProduct(
      productRow({ id: '00000000-0000-4000-8000-000000000202', title: 'Desk Lamp', slug: 'desk-lamp', category_id: LAMPS, price: 42.5, status: 'approved' }),
    );
    supabaseDouble.seedProduct(
      productRow({ id: '00000000-0000-4000-8000-000000000303', title: 'Unlisted Prototype', slug: 'unlisted-prototype', category_id: AUDIO, price: 999, status: 'pending_review' }),
    );

    renderMenu();

    const pane = await screen.findByRole('region', { name: /products$/i });
    await waitFor(() => expect(pane).toHaveTextContent('Reference Headphones'));
    expect(pane).toHaveTextContent(formatPrice(199.99));
    // A listing still in moderation is not a product the storefront may advertise.
    expect(pane).not.toHaveTextContent('Unlisted Prototype');
    expect(pane).not.toHaveTextContent('Desk Lamp');
  });

  it('switches the pane to the clicked category instead of only following the mouse', async () => {
    seedCatalog();
    renderMenu();

    const audio = await screen.findByRole('button', { name: /Audio/ });
    expect(audio).toHaveAttribute('aria-expanded', 'true');
    expect(audio).toHaveAttribute('aria-controls', 'mega-menu-pane');

    const lighting = screen.getByRole('button', { name: /Lighting/ });
    expect(lighting).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(lighting);

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /products$/i })).toHaveTextContent(
        'No approved products are listed in Lighting yet',
      ),
    );
    expect(lighting).toHaveAttribute('aria-expanded', 'true');
    expect(audio).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a keyboard focus on a category, so the menu is reachable without hover', async () => {
    seedCatalog();
    renderMenu();

    const lighting = await screen.findByRole('button', { name: /Lighting/ });
    fireEvent.focus(lighting);
    await waitFor(() =>
      expect(screen.getByRole('region', { name: /products$/i })).toHaveTextContent('Lighting'),
    );
  });

  it('links “View All” to the real category slug and closes the menu', async () => {
    seedCatalog();
    const { onClose } = renderMenu();

    const viewAll = await screen.findByRole('link', { name: /View All/ });
    expect(viewAll).toHaveAttribute('href', '/products?category=audio');
    fireEvent.click(viewAll);
    expect(onClose).toHaveBeenCalled();
  });
});
