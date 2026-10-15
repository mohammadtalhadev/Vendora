import { beforeEach, describe, expect, it, vi } from 'vitest';

// The header reads the catalogue (categories for the strip, suggestions for
// the search) and the session through the same doubles the rest of the
// migrated screens use — there is no second fixture behind it.
vi.mock('../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { Navbar } from './Navbar';
import { categoryRow, productRow, supabaseDouble } from '../../test/supabase-double';

const SearchProbe = () => {
  const [params] = useSearchParams();
  return <div>PRODUCTS PAGE q={params.get('q') ?? ''} category={params.get('category') ?? ''}</div>;
};

const renderNavbar = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
        <Routes>
          <Route path="/products" element={<SearchProbe />} />
          <Route path="/products/:id" element={<div>PRODUCT DETAIL PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const seedCategories = (names: string[]) => {
  names.forEach((name, i) => {
    supabaseDouble.seedCategory(
      categoryRow({ id: `cat-${i + 1}`, name, slug: name.toLowerCase() }),
    );
  });
};

describe('Navbar (Batch 98 header redesign, Batch 107 pill shape, Batch 111 smart sticky, Batch 116 menu clip fix)', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders the dark-mode toggle in the header and flips the real vd_theme preference', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Toggle dark mode' });
    expect(toggle).toHaveAttribute('title', 'Switch to Dark Mode');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(toggle);
    // The same mechanism the workspace toggle writes: class on <html> + the
    // persisted vd_theme value, so every surface agrees on the scheme.
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('vd_theme')).toBe('dark');
    expect(toggle).toHaveAttribute('title', 'Switch to Light Mode');

    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('vd_theme')).toBe('light');
    expect(toggle).toHaveAttribute('title', 'Switch to Dark Mode');
  });

  it('honours a stored dark preference on mount, like the workspace toggle does', () => {
    localStorage.setItem('vd_theme', 'dark');
    renderNavbar();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: 'Toggle dark mode' })).toHaveAttribute(
      'title',
      'Switch to Light Mode',
    );
  });

  it('keeps the All Categories trigger on its frozen classes while opening the MegaMenu', async () => {
    seedCategories(['Audio']);
    renderNavbar();

    const trigger = screen.getByRole('button', { name: /All Categories/ });
    // Frozen (owner decision): the exact recipe the pill header shipped —
    // solid orange when open, slate wash when closed.
    expect(trigger.className).toContain('rounded-full');
    expect(trigger.className).toContain('px-3.5');
    expect(trigger.className).toContain('py-2.5');
    expect(trigger.className).toContain('bg-slate-900/5');
    expect(trigger.className).toContain('text-slate-700');
    expect(trigger.className).toContain('hover:bg-sun-orange/10');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.className).toContain('bg-sun-orange');
    expect(trigger.className).toContain('text-white');
    // The MegaMenu itself is untouched: it mounts under its stable id.
    await waitFor(() =>
      expect(document.getElementById('all-categories-menu')).toBeInTheDocument(),
    );
  });

  it('fills the category strip with the catalogue’s own categories, capped at six', async () => {
    seedCategories(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']);
    renderNavbar();

    const nav = await screen.findByRole('navigation', { name: 'Top categories' });
    await waitFor(() => expect(within(nav).getAllByRole('link')).toHaveLength(6));
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute(
        'href',
        `/products?category=${name.toLowerCase()}`,
      );
    }
    expect(within(nav).queryByRole('link', { name: 'Golf' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Hotel' })).not.toBeInTheDocument();
  });

  it('puts Track Order, Become a Seller and Help on the strip’s right with real routes', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Become a Seller' })).toHaveAttribute(
      'href',
      '/become-a-seller',
    );
    // Track Order and Help also live on the utility strip above; every
    // instance must land on the same real route.
    for (const link of screen.getAllByRole('link', { name: 'Track Order' })) {
      expect(link).toHaveAttribute('href', '/track-order');
    }
    for (const link of screen.getAllByRole('link', { name: 'Help' })) {
      expect(link).toHaveAttribute('href', '/faq');
    }
  });

  it('renders the header itself as true pills, not full-width rectangular bars (Batch 107)', () => {
    renderNavbar();

    // Main header: the original capsule shell (border-radius var(--radius-pill)
    // = 9999px in tokens.css) plus an explicit rounded-full, floating inside
    // the page container — Batch 98's w-full border-b rectangle is gone.
    const mainPill = screen.getByTestId('header-main-pill');
    expect(mainPill.className).toContain('header-pill-shell');
    expect(mainPill.className).toContain('rounded-full');
    expect(mainPill.className).not.toContain('border-b');
    expect(mainPill.parentElement!.className).toContain('max-w-[1600px]');

    // Category strip: its own pill (header-pill-nav), same capsule radius.
    const stripPill = screen.getByTestId('header-strip-pill');
    expect(stripPill.className).toContain('header-pill-nav');
    expect(stripPill.className).toContain('rounded-full');
    expect(stripPill.className).not.toContain('border-b');
    // Nothing was removed to make the pills: the strip still carries the
    // All Categories trigger and the quick-link nav inside the pill.
    expect(within(stripPill).getByRole('button', { name: /All Categories/ })).toBeInTheDocument();
    expect(within(stripPill).getByRole('navigation', { name: 'Top categories' })).toBeInTheDocument();
  });

  it('gives the header dropdowns solid backgrounds so page content cannot bleed through (Batch 111)', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Account and personas menu' }));
    const menu = document.getElementById('navbar-account-menu');
    expect(menu).not.toBeNull();
    const tokens = menu!.className.split(/\s+/);
    // Exactly the opaque token — the old bg-white/90 glass token (and any
    // backdrop-blur, which stopped working inside the frosted pill) is gone.
    expect(tokens).toContain('bg-white');
    expect(tokens).not.toContain('bg-white/90');
    expect(menu!.className).not.toContain('backdrop-blur');
  });

  it('stacks the main pill above the category strip so its dropdowns win the overlap (header stacking fix)', () => {
    renderNavbar();

    // Both pills create backdrop-filter stacking contexts and paint in DOM
    // order, so without explicit stacking the later strip pill covered the
    // top of the account menu hanging out of the main pill. The main pill
    // must stack above the strip; the strip stays above the page via the
    // sticky header itself.
    const mainTokens = screen.getByTestId('header-main-pill').className.split(/\s+/);
    expect(mainTokens).toContain('relative');
    expect(mainTokens).toContain('z-50');

    const stripTokens = screen.getByTestId('header-strip-pill').className.split(/\s+/);
    expect(stripTokens).toContain('relative');
    expect(stripTokens).toContain('z-30');
  });

  it('animates the pills in on mount and slides the header up on scroll down, back down on scroll up (Batch 111)', async () => {
    renderNavbar();

    expect(screen.getByTestId('header-main-pill').className).toContain('header-pill-enter');
    expect(screen.getByTestId('header-strip-pill').className).toContain('header-pill-enter-delayed');

    const header = screen.getByTestId('site-header');
    expect(header.className).toContain('transition-transform');
    expect(header.className).toContain('translate-y-0');
    expect(screen.getByTestId('header-strip-collapse').className).toContain('grid-rows-[1fr]');

    const scrollTo = (y: number) => {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    };

    // Scrolling down past the thresholds: the category strip collapses so
    // only the Vendora pill rides along, then the header slides up away.
    scrollTo(400);
    await waitFor(() => expect(header.className).toContain('-translate-y-full'));
    expect(screen.getByTestId('header-strip-collapse').className).toContain('grid-rows-[0fr]');

    // The first upward scroll brings it straight back down.
    scrollTo(360);
    await waitFor(() => expect(header.className).toContain('translate-y-0'));
    expect(header.className).not.toContain('-translate-y-full');

    // Back near the top the strip expands again.
    scrollTo(40);
    await waitFor(() =>
      expect(screen.getByTestId('header-strip-collapse').className).toContain('grid-rows-[1fr]'),
    );
    scrollTo(0);
  });

  it('never clips the MegaMenu: opening All Categories un-clips the strip wrapper (Batch 116)', async () => {
    seedCategories(['Audio']);
    renderNavbar();

    // At rest the collapse animation's clip box is on.
    expect(screen.getByTestId('header-strip-clip').className).toContain('overflow-hidden');

    fireEvent.click(screen.getByRole('button', { name: /All Categories/ }));
    await waitFor(() =>
      expect(document.getElementById('all-categories-menu')).toBeInTheDocument(),
    );

    // The pane hangs below the pill, so while it is open the wrapper must
    // be fully visible and expanded — Batch 111's overflow-hidden cut the
    // mounted menu off completely, which read as "menu nahi chal raha".
    const clip = screen.getByTestId('header-strip-clip');
    expect(clip.className).toContain('overflow-visible');
    expect(clip.className).not.toContain('overflow-hidden');
    expect(screen.getByTestId('header-strip-collapse').className).toContain('grid-rows-[1fr]');
  });

  it('keeps the search pill recipe: tinted surface, visible border, orange focus state', () => {
    renderNavbar();

    const input = screen.getByRole('combobox', { name: /Search Vendora/ });
    const pill = input.closest('div.flex.w-full');
    expect(pill).not.toBeNull();
    expect(pill!.className).toContain('rounded-full');
    expect(pill!.className).toContain('border-orange-200/90');
    expect(pill!.className).toContain('bg-orange-50/80');
    expect(pill!.className).toContain('focus-within:border-sun-orange');
    expect(pill!.className).toContain('focus-within:bg-white');
    expect(pill!.className).toContain('focus-within:ring-sun-orange/15');
    expect(pill!.className).toContain('dark:bg-white/10');
    expect(pill!.className).toContain('dark:border-white/15');
  });

  it('submits the search to the catalogue with the typed query', async () => {
    renderNavbar();

    const input = screen.getByRole('combobox', { name: /Search Vendora/ });
    fireEvent.change(input, { target: { value: 'desk lamp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(screen.getByText(/PRODUCTS PAGE/)).toHaveTextContent('q=desk lamp'),
    );
  });

  it('shows live suggestions and follows a product suggestion to its page', async () => {
    supabaseDouble.seedCategory(categoryRow({ id: 'cat-audio', name: 'Audio', slug: 'audio' }));
    supabaseDouble.seedProduct(
      productRow({
        id: '00000000-0000-4000-8000-000000000101',
        title: 'Reference Headphones',
        slug: 'reference-headphones',
        category_id: 'cat-audio',
        price: 199.99,
        status: 'approved',
      }),
    );
    renderNavbar();

    const input = screen.getByRole('combobox', { name: /Search Vendora/ });
    fireEvent.change(input, { target: { value: 'Reference' } });

    const option = await screen.findByRole('option', { name: /Reference Headphones/ });
    fireEvent.click(option);

    await waitFor(() => expect(screen.getByText('PRODUCT DETAIL PAGE')).toBeInTheDocument());
  });
});
