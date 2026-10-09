import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MegaMenu } from './MegaMenu';

const renderMegaMenu = (isOpen = true, onClose = vi.fn()) => {
  return {
    ...render(
      <BrowserRouter>
        <MegaMenu isOpen={isOpen} onClose={onClose} />
      </BrowserRouter>
    ),
    onClose,
  };
};

describe('MegaMenu Component', () => {
  it('does not render when isOpen is false', () => {
    renderMegaMenu(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders all 11 marketplace categories with icons when open', () => {
    renderMegaMenu(true);

    const expectedCategories = [
      'Electronics',
      'Grocery & Fruits',
      'Home & Furniture',
      'Fashion & Accessories',
      'Beauty & Personal Care',
      'Pets',
      'Baby & Kids',
      'Toys & Video Games',
      'Health & Wellness',
      'Household & Essentials',
      'Patio & Garden',
    ];

    expectedCategories.forEach((catName) => {
      expect(screen.getByRole('link', { name: new RegExp(catName, 'i') })).toBeInTheDocument();
    });
  });

  it('renders the 5 featured products matching the reference design', () => {
    renderMegaMenu(true);

    // 1. AirPods Max
    expect(screen.getByText('Apple AirPods Max – Pink')).toBeInTheDocument();
    expect(screen.getByText('$449.00')).toBeInTheDocument();
    expect(screen.getByText('$489.00')).toBeInTheDocument();

    // 2. iPhone 15 Pro Max
    expect(
      screen.getByText('Apple iPhone 15 Pro Max 256GB Natural Titanium')
    ).toBeInTheDocument();
    expect(screen.getByText('$190.99 – $71.50')).toBeInTheDocument();

    // 3. Apple Watch Series 9
    expect(
      screen.getByText(
        'Apple Watch Series 9 GPS 45mm Midnight Aluminum Case with Midnight Sport Band'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('$71.15')).toBeInTheDocument();
    expect(screen.getByText('$87.98')).toBeInTheDocument();

    // 4. Aqueon Goldfish Flakes
    expect(screen.getByText('Aqueon Goldfish Flakes 7.12 Ounces')).toBeInTheDocument();
    expect(screen.getByText('$1.41')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();

    // 5. Adidas Gazelle Bold
    expect(screen.getByText('ADIDAS GAZELLE BOLD W')).toBeInTheDocument();
    expect(screen.getByText('$110.00')).toBeInTheDocument();
    expect(screen.getByText('$130.00')).toBeInTheDocument();
  });

  it('updates subcategory groups when hovering over a different category', () => {
    renderMegaMenu(true);

    // Initial default is Electronics
    expect(screen.getByText('Cell Phones & Tablets')).toBeInTheDocument();
    expect(screen.getByText('Computers & Laptops')).toBeInTheDocument();

    // Hover over Grocery & Fruits
    const groceryLink = screen.getByRole('link', { name: /Grocery & Fruits/i });
    fireEvent.mouseEnter(groceryLink.parentElement!);

    expect(screen.getByText('Fresh Fruits & Vegetables')).toBeInTheDocument();
    expect(screen.getByText('Dairy, Eggs & Cold Drinks')).toBeInTheDocument();
    expect(screen.getByText('Organic Crisp Apples')).toBeInTheDocument();

    // Hover over Pets
    const petsLink = screen.getByRole('link', { name: /^Pets/i });
    fireEvent.mouseEnter(petsLink.parentElement!);

    expect(screen.getByText('Dog Food & Gear')).toBeInTheDocument();
    expect(screen.getByText('Cat Care & Play')).toBeInTheDocument();
    expect(screen.getByText('Fish, Aquatics & Birds')).toBeInTheDocument();
  });

  it('triggers onClose callback when a category link is clicked', () => {
    const { onClose } = renderMegaMenu(true);

    const electronicsLink = screen.getByRole('link', { name: /Electronics/i });
    fireEvent.click(electronicsLink);

    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onClose callback when a featured product is clicked', () => {
    const { onClose } = renderMegaMenu(true);

    const airpodsLink = screen.getByText('Apple AirPods Max – Pink').closest('a');
    expect(airpodsLink).toBeInTheDocument();
    fireEvent.click(airpodsLink!);

    expect(onClose).toHaveBeenCalled();
  });
});
