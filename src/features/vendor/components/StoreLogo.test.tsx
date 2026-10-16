import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreLogo } from './StoreLogo';

describe('StoreLogo (fallback)', () => {
  it('renders the logo image when a URL is present', () => {
    render(<StoreLogo name="Nike Flagship Store" logo="https://logo.clearbit.com/nike.com?size=200" />);
    expect(screen.getByRole('img', { name: 'Nike Flagship Store logo' })).toBeInTheDocument();
  });

  it('shows the monogram tile when there is no logo', () => {
    const { container } = render(<StoreLogo name="Ronin Official Store" logo="" />);
    expect(screen.getByText('R')).toBeInTheDocument();
    // The fallback is a labelled tile, not an <img> element.
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('falls back to the monogram when the image fails to load', () => {
    render(<StoreLogo name="Khaadi Retail Store" logo="https://example.invalid/logo.png" />);
    fireEvent.error(screen.getByRole('img', { name: 'Khaadi Retail Store logo' }));
    expect(screen.getByText('K')).toBeInTheDocument();
  });
});
