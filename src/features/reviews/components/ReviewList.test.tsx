import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewList } from './ReviewList';
import type { Review } from '../types';

const sampleReviews: Review[] = [
  {
    id: 'rev-test-1',
    productId: 'prod-1',
    authorName: 'Alice Walker',
    rating: 5,
    title: 'Top-tier wireless audio',
    comment: 'Soundstage is expansive and battery lasts all week.',
    createdAt: '2026-03-20T10:00:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 10,
  },
  {
    id: 'rev-test-2',
    productId: 'prod-1',
    authorName: 'Bob Builder',
    rating: 3,
    title: 'Decent but heavy',
    comment: 'Good sound, but gets slightly uncomfortable after hours.',
    createdAt: '2026-03-25T12:00:00Z',
    isVerifiedPurchase: false,
    helpfulCount: 2,
  },
  {
    id: 'rev-test-3',
    productId: 'prod-1',
    authorName: 'Charlie Cox',
    rating: 1,
    title: 'Defective cable',
    comment: 'The charging cable frayed immediately.',
    createdAt: '2026-01-10T08:00:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 5,
  },
];

describe('ReviewList component', { timeout: 15000 }, () => {
  it('renders rating breakdown bar chart for 5, 4, 3, 2, 1 stars', () => {
    render(<ReviewList reviews={sampleReviews} />);

    expect(screen.getByText('Customer Reviews & Ratings')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Based on 3 verified reviews/i)).toBeInTheDocument();
  });

  it('renders review cards with Verified Purchase badges and author info', () => {
    render(<ReviewList reviews={sampleReviews} />);

    expect(screen.getByText('Alice Walker')).toBeInTheDocument();
    expect(screen.getByText('Top-tier wireless audio')).toBeInTheDocument();
    expect(screen.getByText('Decent but heavy')).toBeInTheDocument();

    // 2 verified purchase badges
    const verifiedBadges = screen.getAllByText('Verified Purchase');
    expect(verifiedBadges).toHaveLength(2);
  });

  it('toggles helpful votes when clicking the helpful button', () => {
    render(<ReviewList reviews={sampleReviews} />);

    const helpfulBtn = screen.getByRole('button', {
      name: /Mark review as helpful \(10 votes\)/i,
    });
    expect(helpfulBtn).toHaveTextContent('Helpful (10)');

    // Click to vote helpful
    fireEvent.click(helpfulBtn);
    expect(helpfulBtn).toHaveTextContent('Helpful (11)');

    // Click again to un-vote
    fireEvent.click(helpfulBtn);
    expect(helpfulBtn).toHaveTextContent('Helpful (10)');
  });

  it('filters reviews when clicking a star rating in breakdown', () => {
    render(<ReviewList reviews={sampleReviews} />);

    expect(screen.getByText('Top-tier wireless audio')).toBeInTheDocument();
    expect(screen.getByText('Decent but heavy')).toBeInTheDocument();

    // Click 5 star filter button
    const filter5StarBtn = screen.getByRole('button', {
      name: /Filter by 5 star reviews/i,
    });
    fireEvent.click(filter5StarBtn);

    expect(screen.getByText('Top-tier wireless audio')).toBeInTheDocument();
    expect(screen.queryByText('Decent but heavy')).not.toBeInTheDocument();

    // Clear filter
    const clearBtn = screen.getByRole('button', { name: /Clear Filter/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Top-tier wireless audio')).toBeInTheDocument();
    expect(screen.getByText('Decent but heavy')).toBeInTheDocument();
  });

  it('changes sort order when sort dropdown option changes', () => {
    render(<ReviewList reviews={sampleReviews} />);

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'lowest' } });

    // Review titles should now be present and ordered
    const titles = screen.getAllByRole('heading', { level: 4 });
    expect(titles[0]).toHaveTextContent('Defective cable'); // 1 star
  });
});
