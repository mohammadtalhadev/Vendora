import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';

describe('HomePage Component - Limited Campaign & Electronics Carousel', { timeout: 40000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
  });

  it('renders Limited Campaign section with parent categories that have products on sale', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Section title
    expect(screen.getByText('Limited Campaign')).toBeInTheDocument();

    // Verify parent categories with sale products are present as pills
    expect(screen.getByRole('button', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Audio & Wearables' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fashion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beauty & Personal Care' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home & Kitchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shoes' })).toBeInTheDocument();

    // Verify categories with NO sale products are omitted
    expect(screen.queryByRole('button', { name: 'Kids & Baby' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bags & Luggage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jewelry & Watches' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Digital Products' })).not.toBeInTheDocument();
  });

  it('switches sale products when clicking a different parent category pill', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Default is Electronics sale products
    expect(screen.getAllByText(/Samsung Galaxy S24 Ultra/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KeebCraft Pro 75%/i).length).toBeGreaterThan(0);

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

  it('renders sub-category pills in Electronics category carousel without All Products tab and filters products', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Carousel title: only parent category name "Electronics" (no "Trending In")
    expect(screen.getByRole('heading', { name: 'Electronics' })).toBeInTheDocument();
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
    expect(screen.getByText(/FUJIFILM instax mini Evo/i)).toBeInTheDocument();
    expect(screen.getByText(/DJI Mini 3 Lightweight Camera Drone/i)).toBeInTheDocument();

    // Switch to Audio & Headphones
    fireEvent.click(audioPill);
    expect(screen.getAllByText(/Sony WH-1000XM5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Marshall Emberton II/i).length).toBeGreaterThan(0);
  });

  it('renders parent category titles for carousels without tabs and displays verified badge hover tooltip', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Carousels without tabs show parent category titles only
    expect(screen.getByRole('heading', { name: 'Beauty & Personal Care' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home & Kitchen' })).toBeInTheDocument();

    // Verify Verified Badge text is present in the document for the tooltip
    const verifiedBadges = screen.getAllByLabelText('Verified Badge');
    expect(verifiedBadges.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified Badge').length).toBeGreaterThan(0);
  });
});
