import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryState } from './QueryState';

describe('QueryState component', () => {
  it('renders skeleton shimmer when isLoading is true', () => {
    const { container } = render(
      <QueryState isLoading>
        <div>Content</div>
      </QueryState>,
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    const shimmerElements = container.querySelectorAll('.skeleton-shimmer');
    expect(shimmerElements.length).toBeGreaterThan(0);
  });

  it('renders custom skeleton if provided', () => {
    render(
      <QueryState isLoading skeleton={<div data-testid="custom-skeleton">Loading...</div>}>
        <div>Content</div>
      </QueryState>,
    );

    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
  });

  it('renders error view with retry button when isError is true', () => {
    const handleRetry = vi.fn();
    render(
      <QueryState
        isError
        errorMessage="Failed to fetch products"
        onRetry={handleRetry}
      >
        <div>Content</div>
      </QueryState>,
    );

    expect(screen.getByText('Failed to fetch products')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Try again/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when isEmpty is true', () => {
    render(
      <QueryState
        isEmpty
        emptyTitle="No results found"
        emptyMessage="Try adjusting your filters"
      >
        <div>Content</div>
      </QueryState>,
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders children when data loaded successfully', () => {
    render(
      <QueryState>
        <div data-testid="success-content">Catalog loaded</div>
      </QueryState>,
    );

    expect(screen.getByTestId('success-content')).toBeInTheDocument();
  });

  it('renders children with subtle non-blocking refetch indicator when isRefetching is true', () => {
    render(
      <QueryState isRefetching refetchLabel="Refreshing catalog...">
        <div data-testid="success-content">Existing catalog preserved</div>
      </QueryState>,
    );

    expect(screen.getByTestId('success-content')).toBeInTheDocument();
    expect(screen.getByText('Refreshing catalog...')).toBeInTheDocument();
  });
});
