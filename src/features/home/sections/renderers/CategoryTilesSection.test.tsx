import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryTilesSection, resolveCategoryTileImageUrl } from './CategoryTilesSection';
import type { SiteSection } from '../../api/sections';

describe('resolveCategoryTileImageUrl', () => {
  it('swaps a legacy full-size local tile PNG for its WebP thumbnail', () => {
    expect(resolveCategoryTileImageUrl('/images/categories/cat_electronics_2k.png')).toBe(
      '/images/categories/cat_electronics_thumb.webp',
    );
    expect(resolveCategoryTileImageUrl('/images/categories/cat_kids_baby_2k.png')).toBe(
      '/images/categories/cat_kids_baby_thumb.webp',
    );
  });

  it('leaves already-optimised, external and non-tile URLs untouched', () => {
    expect(resolveCategoryTileImageUrl('/images/categories/cat_electronics_thumb.webp')).toBe(
      '/images/categories/cat_electronics_thumb.webp',
    );
    expect(resolveCategoryTileImageUrl('https://cdn.example.com/cat_electronics_2k.png')).toBe(
      'https://cdn.example.com/cat_electronics_2k.png',
    );
    expect(resolveCategoryTileImageUrl('/images/home/hero-home-kitchen.png')).toBe(
      '/images/home/hero-home-kitchen.png',
    );
    expect(resolveCategoryTileImageUrl('/images/categories/cat_electronics_2k.jpg')).toBe(
      '/images/categories/cat_electronics_2k.jpg',
    );
  });
});

const sectionWith = (imageUrl: string): SiteSection => ({
  id: 'sec-1',
  key: 'popular-categories',
  type: 'category-tiles',
  title: 'Explore Popular Categories',
  settings: {},
  sortOrder: 0,
  isEnabled: true,
  items: [
    {
      id: 'item-1',
      sectionId: 'sec-1',
      imageUrl,
      heading: 'Electronics',
      subtext: '',
      ctaLabel: '',
      ctaLink: '/products?category=electronics',
      sortOrder: 1,
      isActive: true,
    },
  ],
});

describe('CategoryTilesSection', () => {
  it('renders the thumbnail URL even when the stored item points at the legacy PNG', () => {
    render(
      <MemoryRouter>
        <CategoryTilesSection section={sectionWith('/images/categories/cat_electronics_2k.png')} />
      </MemoryRouter>,
    );
    const img = screen.getByAltText('Electronics');
    expect(img.getAttribute('src')).toBe('/images/categories/cat_electronics_thumb.webp');
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});
