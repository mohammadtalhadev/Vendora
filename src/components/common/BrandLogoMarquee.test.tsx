import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  BrandLogoMarquee,
  ELECTRONICS_BRAND_LOGOS,
  BEAUTY_BRAND_LOGOS,
} from './BrandLogoMarquee';

describe('BrandLogoMarquee', () => {
  it('renders every logo twice for the seamless loop; the duplicate pass is decorative', () => {
    const logos = [
      { src: '/images/brands/electronics/apple.webp', alt: 'Apple' },
      { src: '/images/brands/electronics/sony.webp', alt: 'Sony' },
    ];
    const { container } = render(
      <BrandLogoMarquee logos={logos} label="Official electronics brands" />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Apple' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Sony' })).toBeTruthy();
    // Duplicate pass: no accessible name, wrapped in aria-hidden.
    expect(imgs[2].getAttribute('alt')).toBe('');
    expect(imgs[2].closest('div')?.getAttribute('aria-hidden')).toBe('true');
    expect(imgs[0].closest('div')?.getAttribute('aria-hidden')).toBeNull();
  });

  it('is a labelled region riding the shared marquee classes from base.css', () => {
    const { container } = render(
      <BrandLogoMarquee
        logos={ELECTRONICS_BRAND_LOGOS}
        label="Official electronics brands"
      />,
    );
    expect(
      screen.getByRole('region', { name: 'Official electronics brands' }),
    ).toBeTruthy();
    expect(container.querySelector('.brand-logo-marquee')).toBeTruthy();
    expect(container.querySelector('.brand-logo-marquee-track')).toBeTruthy();
  });

  it('logos rest muted (grayscale, reduced opacity) and colour on hover', () => {
    render(
      <BrandLogoMarquee
        logos={[{ src: '/images/brands/beauty/dior.webp', alt: 'Dior' }]}
        label="Official beauty brands"
      />,
    );
    const img = screen.getByRole('img', { name: 'Dior' });
    expect(img.className).toContain('grayscale');
    expect(img.className).toContain('opacity-50');
    expect(img.className).toContain('hover:grayscale-0');
    expect(img.className).toContain('hover:opacity-100');
    expect(img.className).toContain('h-8');
    expect(img.className).toContain('sm:h-10');
  });

  it('ready sets point at the individual per-brand WebPs, 12 each', () => {
    expect(ELECTRONICS_BRAND_LOGOS).toHaveLength(12);
    expect(BEAUTY_BRAND_LOGOS).toHaveLength(12);
    for (const logo of ELECTRONICS_BRAND_LOGOS) {
      expect(logo.src).toMatch(/^\/images\/brands\/electronics\/[a-z-]+\.webp$/);
      expect(logo.alt.length).toBeGreaterThan(0);
    }
    for (const logo of BEAUTY_BRAND_LOGOS) {
      expect(logo.src).toMatch(/^\/images\/brands\/beauty\/[a-z-]+\.webp$/);
      expect(logo.alt.length).toBeGreaterThan(0);
    }
  });
});
