import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { categoryRow, contentBlockRow, productRow, storeRow, supabaseDouble } from '../test/supabase-double';

/**
 * The homepage used to render ~115 hard-coded products; it now reads the real
 * catalogue (QA frontend-Critical-2). These tests seed the supabase double
 * with a small real catalogue and pin the data-driven behaviour the old
 * hard-coded suite pinned: campaign pills only for categories with genuine
 * discounts, pill switching, sub-category tab filtering, carousel headings.
 */

const CAT = {
  electronics: '00000000-0000-4000-8000-000000001001',
  audio: '00000000-0000-4000-8000-000000001002',
  cameras: '00000000-0000-4000-8000-000000001003',
  fashion: '00000000-0000-4000-8000-000000001004',
  beauty: '00000000-0000-4000-8000-000000001005',
  home: '00000000-0000-4000-8000-000000001006',
  shoes: '00000000-0000-4000-8000-000000001007',
  kids: '00000000-0000-4000-8000-000000001008',
  bags: '00000000-0000-4000-8000-000000001009',
  jewelry: '00000000-0000-4000-8000-000000001010',
  digital: '00000000-0000-4000-8000-000000001011',
};

let productSeq = 2000;
function seedProduct(
  title: string,
  categoryId: string,
  overrides: Record<string, unknown> = {},
) {
  productSeq += 1;
  const id = `00000000-0000-4000-8000-${String(productSeq).padStart(12, '0')}`;
  supabaseDouble.seedProduct(
    productRow({
      id,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category_id: categoryId,
      ...overrides,
    }),
  );
}

function seedCatalogue() {
  const categories: Array<[string, string, string]> = [
    [CAT.electronics, 'Electronics', 'electronics'],
    [CAT.audio, 'Audio & Wearables', 'audio-wearables'],
    [CAT.cameras, 'Cameras & Photo', 'cameras-photo'],
    [CAT.fashion, 'Fashion', 'fashion'],
    [CAT.beauty, 'Beauty & Personal Care', 'beauty-personal-care'],
    [CAT.home, 'Home & Kitchen', 'home-kitchen'],
    [CAT.shoes, 'Shoes', 'shoes'],
    [CAT.kids, 'Kids & Baby', 'kids-baby'],
    [CAT.bags, 'Bags & Luggage', 'bags-luggage'],
    [CAT.jewelry, 'Jewelry & Watches', 'jewelry-watches'],
    [CAT.digital, 'Digital Products', 'digital-products'],
  ];
  for (const [id, name, slug] of categories) {
    supabaseDouble.seedCategory(categoryRow({ id, name, slug }));
  }

  // On sale (compare-at above price) -> Limited Campaign members.
  seedProduct('Samsung Galaxy S24 Ultra 256GB', CAT.electronics, { price: 289380, compare_at_price: 319999, review_count: 900 });
  seedProduct('KeebCraft Pro 75% Mechanical Keyboard', CAT.electronics, { price: 18500, compare_at_price: 24000, review_count: 850 });
  seedProduct('Sony WH-1000XM5 Wireless Headphones', CAT.audio, { price: 82522, compare_at_price: 94999, review_count: 950 });
  seedProduct('Marshall Emberton II Portable Speaker', CAT.audio, { price: 41999, compare_at_price: null, review_count: 800 });
  seedProduct('FUJIFILM instax mini Evo Camera', CAT.cameras, { price: 58999, compare_at_price: null, review_count: 700 });
  seedProduct('DJI Mini 3 Lightweight Camera Drone', CAT.cameras, { price: 124999, compare_at_price: null, review_count: 750 });
  seedProduct('Outside Beauty & Skincare SPF 50+ Mineral Sunscreen', CAT.beauty, { price: 3450, compare_at_price: 4600, review_count: 600 });
  seedProduct('Ceramic Non-Stick Cookware Set 10 Piece', CAT.home, { price: 15999, compare_at_price: 21000, review_count: 550 });
  seedProduct('Flex Knit Running Shoes', CAT.shoes, { price: 8999, compare_at_price: 12000, review_count: 500 });

  // Fashion sale items are deliberately quiet (low reviews, older) so the
  // review-/recency-ranked shelves do not leak them before the pill click.
  seedProduct('Cozy Ribbed Knit Cashmere Pullover Sweater', CAT.fashion, {
    price: 12400, compare_at_price: 16800, review_count: 5, rating: 3.9, created_at: '2026-09-01T00:00:00.000Z',
  });
  seedProduct('Heritage Trench Coat', CAT.fashion, {
    price: 21900, compare_at_price: 27500, review_count: 4, rating: 3.8, created_at: '2026-09-01T00:00:00.000Z',
  });

  // No discount in these categories -> no campaign pill.
  seedProduct('Kids Cotton Graphic T-Shirt', CAT.kids, { price: 1999, compare_at_price: null, review_count: 300 });
  seedProduct('Leather Tote Bag', CAT.bags, { price: 15400, compare_at_price: null, review_count: 300 });
  seedProduct('Gold Plated Pendant Necklace', CAT.jewelry, { price: 6850, compare_at_price: null, review_count: 300 });

  // A real digital product for the Digital Goods vault (no discount).
  seedProduct('Nova UI Kit & Design System Pro', CAT.digital, { type: 'digital', price: 10800, compare_at_price: null, review_count: 450 });
}

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage Component - Limited Campaign & Electronics Carousel', { timeout: 40000 }, () => {
  beforeEach(() => {
    supabaseDouble.reset();
    localStorage.clear();
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
    productSeq = 2000;
    seedCatalogue();
  });

  it('renders Limited Campaign section with parent categories that have products on sale', async () => {
    renderHome();

    // Section title appears once real sale data has loaded
    expect(await screen.findByText('Limited Campaign')).toBeInTheDocument();

    // Parent categories with discounted products are present as pills
    expect(screen.getByRole('button', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Audio & Wearables' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fashion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beauty & Personal Care' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home & Kitchen' })).toBeInTheDocument();

    // Batch 92: only the TOP 5 trending parents (most products on sale)
    // become pills, busiest first. The fixtures put 2 on sale in Electronics
    // and Fashion, 1 each in Audio, Beauty, Home & Kitchen and Shoes — so
    // Shoes (1 sale, latest in def order) is the one cut, and the pill
    // order is Electronics, Fashion, Audio, Beauty, Home & Kitchen.
    const campaignSection = (await screen.findByText('Limited Campaign')).closest('section');
    expect(campaignSection).not.toBeNull();
    const candidateNames = [
      'Electronics',
      'Fashion',
      'Audio & Wearables',
      'Beauty & Personal Care',
      'Home & Kitchen',
      'Shoes',
    ];
    const pillNames = within(campaignSection as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter((name) => name !== undefined && candidateNames.includes(name));
    expect(pillNames).toEqual([
      'Electronics',
      'Fashion',
      'Audio & Wearables',
      'Beauty & Personal Care',
      'Home & Kitchen',
    ]);
    expect(
      within(campaignSection as HTMLElement).queryByRole('button', { name: 'Shoes' }),
    ).not.toBeInTheDocument();

    // Categories with NO sale products are omitted
    expect(screen.queryByRole('button', { name: 'Kids & Baby' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bags & Luggage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jewelry & Watches' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Digital Products' })).not.toBeInTheDocument();
  });

  it('switches sale products when clicking a different parent category pill', async () => {
    renderHome();

    // Default is Electronics sale products
    expect((await screen.findAllByText(/Samsung Galaxy S24 Ultra/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KeebCraft Pro 75%/i).length).toBeGreaterThan(0);

    // Fashion sale products are not rendered anywhere before the switch
    expect(screen.queryByText(/Cozy Ribbed Knit Cashmere Pullover Sweater/i)).not.toBeInTheDocument();

    // Click Fashion pill
    const fashionPill = screen.getByRole('button', { name: 'Fashion' });
    fireEvent.click(fashionPill);

    // Now Fashion products are rendered in the Limited Campaign grid
    expect(screen.getAllByText(/Cozy Ribbed Knit Cashmere Pullover Sweater/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Heritage Trench Coat/i).length).toBeGreaterThan(0);

    // Click Beauty & Personal Care pill
    const beautyPill = screen.getByRole('button', { name: 'Beauty & Personal Care' });
    fireEvent.click(beautyPill);

    expect(screen.getAllByText(/Outside Beauty & Skincare SPF 50\+/i).length).toBeGreaterThan(0);
  });

  it('renders sub-category pills in Electronics category carousel without All Products tab and filters products', async () => {
    renderHome();

    // Carousel title: only parent category name "Electronics" (no "Trending In")
    expect(await screen.findByRole('heading', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.queryByText('Trending In Electronics & Audio')).not.toBeInTheDocument();
    expect(screen.queryByText('Best In Skincare, Radiance & Beauty')).not.toBeInTheDocument();

    // Verify "All Products" tab pill is removed
    expect(screen.queryByRole('button', { name: 'All Products' })).not.toBeInTheDocument();

    // Sub-category switcher pills
    const audioPill = screen.getByRole('button', { name: 'Audio & Headphones' });
    const computersPill = screen.getByRole('button', { name: 'Computers & Laptops' });
    const smartphonesPill = screen.getByRole('button', { name: 'Smartphones & Tablets' });
    const camerasPill = screen.getByRole('button', { name: 'Cameras & Drones' });

    expect(audioPill).toBeInTheDocument();
    expect(computersPill).toBeInTheDocument();
    expect(smartphonesPill).toBeInTheDocument();
    expect(camerasPill).toBeInTheDocument();

    // Without selecting a tab, clicking View All leads to parent category all products ranked with best selling
    const viewAllLinks = screen.getAllByRole('link', { name: /view all/i });
    const electronicsViewAll = viewAllLinks.find((link) =>
      link.getAttribute('href')?.includes('/products?category=electronics&sort=best_selling'),
    );
    expect(electronicsViewAll).toBeDefined();

    // Switch to Cameras & Drones
    fireEvent.click(camerasPill);
    expect(screen.getAllByText(/FUJIFILM instax mini Evo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DJI Mini 3 Lightweight Camera Drone/i).length).toBeGreaterThan(0);

    // Switch to Audio & Headphones
    fireEvent.click(audioPill);
    expect(screen.getAllByText(/Sony WH-1000XM5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Marshall Emberton II/i).length).toBeGreaterThan(0);
  });

  it('renders parent category titles for carousels without tabs and displays verified badge hover tooltip', async () => {
    renderHome();

    // Carousels without tabs show parent category titles only
    expect(await screen.findByRole('heading', { name: 'Beauty & Personal Care' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home & Kitchen' })).toBeInTheDocument();

    // Verify Verified Badge text is present in the document for the tooltip
    await waitFor(() => {
      expect(screen.getAllByLabelText('Verified Badge').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Verified Badge').length).toBeGreaterThan(0);
  });
});

describe('HomePage fabricated-content takedown (Batch 5, Pro-0)', { timeout: 40000 }, () => {
  beforeEach(() => {
    supabaseDouble.reset();
    localStorage.clear();
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
    productSeq = 2000;
    seedCatalogue();
  });

  it('renders the store rail from the real vendor directory, not invented flagship partners', async () => {
    supabaseDouble.seedVendorProfile(
      storeRow({
        id: 'store-alpha',
        store_name: 'SoundWave Direct',
        slug: 'soundwave-direct',
        tagline: 'Studio audio, shipped from Karachi',
        rating: 4.5,
        review_count: 10,
      }),
    );
    supabaseDouble.seedVendorProfile(
      storeRow({
        id: 'store-beta',
        store_name: 'Quiet Corner Store',
        slug: 'quiet-corner',
        tagline: '',
        description: 'A small neighbourhood shop.',
        // The rating column defaults to 5.0 for unreviewed stores; with zero
        // reviews that number is not a signal and must not be printed.
        rating: 5.0,
        review_count: 0,
      }),
    );

    renderHome();

    // Real stores from the directory appear, linked to their storefronts.
    const reviewed = await screen.findByRole('link', { name: /SoundWave Direct/ });
    expect(reviewed.getAttribute('href')).toBe('/vendors/soundwave-direct');
    expect(within(reviewed).getByText(/4\.5 · 10 reviews/)).toBeInTheDocument();

    const unreviewed = screen.getByRole('link', { name: /Quiet Corner Store/ });
    expect(unreviewed.getAttribute('href')).toBe('/vendors/quiet-corner');
    expect(within(unreviewed).queryByText(/reviews?/)).not.toBeInTheDocument();
    expect(within(unreviewed).queryByText(/5\.0/)).not.toBeInTheDocument();

    // The invented flagship partners and their claims are gone.
    expect(screen.queryByText('Apple Flagship Partner')).not.toBeInTheDocument();
    expect(screen.queryByText('Samsung Official Store')).not.toBeInTheDocument();
    expect(screen.queryByText(/SBP Escrow Protected/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verified Partnerships/)).not.toBeInTheDocument();
  });

  it('shows orders delivered only for stores the stats view has a row for (Batch 74)', async () => {
    supabaseDouble.seedVendorProfile(
      storeRow({
        id: 'store-alpha',
        store_name: 'SoundWave Direct',
        slug: 'soundwave-direct',
        rating: 4.5,
        review_count: 10,
      }),
    );
    supabaseDouble.seedVendorProfile(
      storeRow({
        id: 'store-beta',
        store_name: 'Quiet Corner Store',
        slug: 'quiet-corner',
        rating: 5.0,
        review_count: 0,
      }),
    );
    supabaseDouble.seedStoreOrderStat({ vendor_id: 'store-alpha', orders_delivered: 7 });

    renderHome();

    const withDeliveries = await screen.findByRole('link', { name: /SoundWave Direct/ });
    expect(await within(withDeliveries).findByText(/7 orders delivered/)).toBeInTheDocument();

    const withoutDeliveries = screen.getByRole('link', { name: /Quiet Corner Store/ });
    expect(within(withoutDeliveries).queryByText(/delivered/)).not.toBeInTheDocument();
  });

  it('hides the store rail entirely when the directory is empty', async () => {
    renderHome();

    expect(await screen.findByText('Limited Campaign')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shop by Store' })).not.toBeInTheDocument();
  });

  it('no longer renders the fabricated testimonials section', async () => {
    renderHome();

    expect(await screen.findByText('Limited Campaign')).toBeInTheDocument();
    expect(screen.queryByText('Customer Experiences & Unboxing Stories')).not.toBeInTheDocument();
    expect(screen.queryByText(/Hamza Farooq/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ayesha Siddiqui/)).not.toBeInTheDocument();
    expect(screen.queryByText(/120k\+ Escrow Protected Orders/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.92 \/ 5\.0/)).not.toBeInTheDocument();
  });

  it('no longer advertises the non-existent VENDORAMOBILE voucher', async () => {
    renderHome();

    expect(await screen.findByText('Limited Campaign')).toBeInTheDocument();
    expect(screen.queryByText(/VENDORAMOBILE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/10% OFF your first mobile order/)).not.toBeInTheDocument();
  });
});

/**
 * Batch 87 — the hero is back to its two planned parts: the slides carousel
 * (`homepage_hero`) and the 9:16 portrait carousel (`homepage_hero_portrait`,
 * every published banner). The Batch 85 promo column no longer lives in the
 * hero; the `homepage_left_promo` banner became the left picture of the
 * New Arrivals / Best Seller / Best Offers section (DealsStrip) instead.
 * Batch 93 removed that promo column too, so the placement no longer
 * renders anywhere on the homepage and DealsStrip is products only.
 */
describe('HomePage hero + best seller banner (Batch 87)', { timeout: 40000 }, () => {
  beforeEach(() => {
    supabaseDouble.reset();
    localStorage.clear();
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
    productSeq = 2000;
    seedCatalogue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function seedSlide() {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        id: '00000000-0000-4000-8000-000000000921',
        slug: 'hero-slide-iphone',
        placement: 'homepage_hero',
        sort_order: 10,
        body: {
          headline: 'iPhone 18 Pro Max',
          subtitle: 'The next generation is here.',
          imageUrl: '/banners/hero-iphone.webp',
          ctaLink: '/brands/apple-official',
          ctaText: 'Shop Now',
        },
      }),
    );
  }

  function seedPortraitWatch() {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        id: '00000000-0000-4000-8000-000000000922',
        slug: 'hero-watch-portrait',
        placement: 'homepage_hero_portrait',
        sort_order: 10,
        body: {
          headline: 'Apple Watch Series 10',
          imageUrl: '/banners/hero-watch.webp',
          ctaLink: '/brands/apple-official',
        },
      }),
    );
  }

  function seedPortraitKitchen() {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        id: '00000000-0000-4000-8000-000000000923',
        slug: 'hero-poster-kitchen',
        placement: 'homepage_hero_portrait',
        sort_order: 20,
        body: {
          headline: 'Home & Kitchen Made Beautiful',
          imageUrl: '/images/home/hero-home-kitchen.png',
          ctaLink: '/products?category=home-kitchen',
        },
      }),
    );
  }

  function seedPortraitBeauty() {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        id: '00000000-0000-4000-8000-000000000924',
        slug: 'hero-poster-beauty',
        placement: 'homepage_hero_portrait',
        sort_order: 30,
        body: {
          headline: 'Your Beauty & Self-Care, All in One Place',
          imageUrl: '/images/home/hero-beauty.png',
          ctaLink: '/products?category=beauty-personal-care',
        },
      }),
    );
  }

  function seedSidePromo() {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        id: '00000000-0000-4000-8000-000000000925',
        slug: 'hero-side-promo-best-seller',
        placement: 'homepage_left_promo',
        sort_order: 10,
        body: {
          headline: 'Best Seller Category',
          imageUrl: '/images/home/hero-left-best-seller.png',
          ctaLink: '/deals',
        },
      }),
    );
  }

  /** The first ancestor whose class list carries a col-span token. */
  function blockOf(img: HTMLElement): HTMLElement {
    let el: HTMLElement | null = img;
    for (let depth = 0; depth < 6 && el; depth += 1) {
      if (el.className.includes('col-span')) return el;
      el = el.parentElement;
    }
    throw new Error('grid block not found for image');
  }

  /** The <section> element wrapping a node. */
  function sectionOf(node: HTMLElement): HTMLElement {
    let el: HTMLElement | null = node;
    while (el && el.tagName !== 'SECTION') el = el.parentElement;
    if (!el) throw new Error('section not found');
    return el;
  }

  it('hero shows the slides plus all three portrait banners in a strict 9:16 rail that sets the row height, and no promo column', async () => {
    seedSlide();
    seedPortraitWatch();
    seedPortraitKitchen();
    seedPortraitBeauty();
    seedSidePromo();
    renderHome();

    // Wait for the CMS portrait read to land first: the kitchen poster only
    // exists once it has (the watch alt also matches the built-in fallback,
    // so it cannot be the wait target).
    const kitchenImg = await screen.findByAltText('Home & Kitchen Made Beautiful');

    // Slides section is back, untouched — and showing the published CMS
    // slide, not the built-in set (no AirPods slide beside it).
    const slideImg = screen.getByAltText('iPhone 18 Pro Max');
    expect(blockOf(slideImg).className).toContain('lg:col-span-9');
    expect(screen.queryByAltText('AirPods Pro 2')).not.toBeInTheDocument();

    // All three published portrait banners join the rail.
    const watchImg = screen.getByAltText('Apple Watch Series 10');
    const beautyImg = screen.getByAltText('Your Beauty & Self-Care, All in One Place');
    expect(watchImg).toBeInTheDocument();
    expect(beautyImg).toBeInTheDocument();

    // Batch 96: the rail's strict 9:16 box drives the hero row's height —
    // it keeps its ratio, and neither column self-starts, so the desktop
    // grid stretches both columns to that one height.
    const rail = blockOf(kitchenImg);
    expect(rail.className).toContain('aspect-[9/16]');
    expect(rail.className).not.toContain('lg:aspect-auto');
    expect(rail.className).not.toContain('self-start');
    expect(rail.className).toContain('lg:col-span-3');

    // The main carousel keeps 16:9 below lg but gives the fixed ratio up on
    // desktop, stretching to the portrait rail's height instead.
    const mainBlock = blockOf(slideImg);
    expect(mainBlock.className).toContain('aspect-[16/9]');
    expect(mainBlock.className).toContain('lg:aspect-auto');
    expect(mainBlock.className).toContain('lg:h-full');
    expect(mainBlock.className).not.toContain('self-start');

    // Batch 93: a published `homepage_left_promo` banner no longer renders
    // anywhere on the page — the deals section's promo column is gone.
    const heroSection = sectionOf(slideImg);
    expect(within(heroSection).queryByAltText('Best Seller Category')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Best Seller Category')).not.toBeInTheDocument();
  });

  it('portrait rail rotates through all three banners on its 6.5s timer and pauses on hover', async () => {
    seedPortraitWatch();
    seedPortraitKitchen();
    seedPortraitBeauty();
    // Fake timers from the start: the rotation interval must be created
    // under them (an interval registered on the real clock cannot be
    // advanced afterwards). vi.waitFor drives the wait because it advances
    // fake time itself (RTL's findBy polling deadlocks under fake timers);
    // its 1s fake-time budget stays well under the 6.5s rotation period.
    vi.useFakeTimers();
    renderHome();

    // Kitchen first (see the composition test): it only renders once the
    // CMS read has landed, so the rotation starts from a known frame.
    const kitchenImg = await vi.waitFor(() =>
      screen.getByAltText('Home & Kitchen Made Beautiful'),
    );
    const watchImg = screen.getByAltText('Apple Watch Series 10');
    const beautyImg = screen.getByAltText('Your Beauty & Self-Care, All in One Place');
    const frameOf = (img: HTMLElement) => img.parentElement as HTMLElement;
    expect(frameOf(watchImg).className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(frameOf(kitchenImg).className).toContain('opacity-100');
    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(frameOf(beautyImg).className).toContain('opacity-100');

    // Hovering the rail pauses the rotation.
    fireEvent.mouseEnter(blockOf(watchImg));
    act(() => {
      vi.advanceTimersByTime(13000);
    });
    expect(frameOf(beautyImg).className).toContain('opacity-100');
    vi.useRealTimers();
  });

  it('main carousel and portrait rail advance on the same tick (Batch 96: one shared clock)', async () => {
    seedPortraitWatch();
    seedPortraitKitchen();
    seedPortraitBeauty();
    // No CMS slide seeded, so the three built-in slides render from the
    // start while the portraits land with the CMS read. One interval drives
    // both sides (Batch 96): after a single 6.5s tick the active slide AND
    // the active portrait have each moved exactly one step — the old pair
    // of private timers drifted because each restarted when its own list's
    // read landed.
    vi.useFakeTimers();
    renderHome();

    const kitchenImg = await vi.waitFor(() =>
      screen.getByAltText('Home & Kitchen Made Beautiful'),
    );
    const iphoneImg = screen.getByAltText('iPhone 18 Pro Max');
    const airpodsImg = screen.getByAltText('AirPods Pro 2');
    const fashionImg = screen.getByAltText('Fashion — upgrade your style');
    const watchImg = screen.getByAltText('Apple Watch Series 10');
    const beautyImg = screen.getByAltText('Your Beauty & Self-Care, All in One Place');
    const frameOf = (img: HTMLElement) => img.parentElement as HTMLElement;
    expect(frameOf(iphoneImg).className).toContain('opacity-100');
    expect(frameOf(watchImg).className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(frameOf(airpodsImg).className).toContain('opacity-100');
    expect(frameOf(kitchenImg).className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(frameOf(fashionImg).className).toContain('opacity-100');
    expect(frameOf(beautyImg).className).toContain('opacity-100');
    vi.useRealTimers();
  });

  it('deals section ignores a published promo banner: no promo column, products full width (Batch 93)', async () => {
    seedSidePromo();
    renderHome();

    const tab = await screen.findByRole('button', { name: 'Best Seller' });
    const dealsSection = sectionOf(tab);

    // Products still render.
    expect(
      await within(dealsSection).findByText('Sony WH-1000XM5 Wireless Headphones'),
    ).toBeInTheDocument();

    // Neither the CMS banner nor the built-in Tech Fest card renders, and
    // no promo/grid column split remains in the section.
    expect(screen.queryByAltText('Best Seller Category')).not.toBeInTheDocument();
    expect(within(dealsSection).queryByText('Tech Fest 2026')).not.toBeInTheDocument();
    expect(dealsSection.querySelector('[class*="lg:col-span-3"]')).toBeNull();
    expect(dealsSection.querySelector('[class*="lg:col-span-9"]')).toBeNull();
  });

  it('deals section tabs are pills and every tab shows one row of six products (Batch 93, widened Batch 100)', async () => {
    renderHome();

    const tab = await screen.findByRole('button', { name: 'Best Seller' });
    const dealsSection = sectionOf(tab);
    expect(
      await within(dealsSection).findByText('Sony WH-1000XM5 Wireless Headphones'),
    ).toBeInTheDocument();

    // All three tabs render as shared pills; the default tab is pressed
    // and carries the solid sun-orange selected recipe.
    for (const name of ['New Arrivals', 'Best Seller', 'Best Offers']) {
      const pill = within(dealsSection).getByRole('button', { name });
      expect(pill.className).toContain('rounded-full');
    }
    expect(tab).toHaveAttribute('aria-pressed', 'true');
    expect(tab.className).toContain('bg-sun-orange');
    expect(tab.className).toContain('text-white');

    // One row of six on the default tab: exactly six cards (each card
    // renders a mobile + a desktop add-to-cart button), and the
    // seventh-ranked best seller no longer makes the cut.
    expect(within(dealsSection).getAllByRole('button', { name: /^Add .* to cart$/ })).toHaveLength(12);
    expect(
      within(dealsSection).queryByText('Outside Beauty & Skincare SPF 50+ Mineral Sunscreen'),
    ).not.toBeInTheDocument();

    // Switching tabs keeps the one-row-of-six cap.
    fireEvent.click(within(dealsSection).getByRole('button', { name: 'Best Offers' }));
    expect(
      await within(dealsSection).findByText('Cozy Ribbed Knit Cashmere Pullover Sweater'),
    ).toBeInTheDocument();
    expect(within(dealsSection).getAllByRole('button', { name: /^Add .* to cart$/ })).toHaveLength(12);

    fireEvent.click(within(dealsSection).getByRole('button', { name: 'New Arrivals' }));
    await waitFor(() =>
      expect(
        within(dealsSection).getAllByRole('button', { name: /^Add .* to cart$/ }),
      ).toHaveLength(12),
    );

    // No promo card in any state.
    expect(within(dealsSection).queryByText('Tech Fest 2026')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Best Seller Category')).not.toBeInTheDocument();
  });
});
