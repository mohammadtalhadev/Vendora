import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustStrip } from './TrustStrip';

describe('TrustStrip (canonical trust badges, Batch 22H)', () => {
  it('renders exactly the four canonical assurances', () => {
    render(<TrustStrip />);
    expect(screen.getByText('Fast & Free Shipping')).toBeInTheDocument();
    expect(screen.getByText('100% Authentic')).toBeInTheDocument();
    expect(screen.getByText('30-Day Easy Returns')).toBeInTheDocument();
    expect(screen.getByText('24/7 Dedicated Support')).toBeInTheDocument();
  });
});
