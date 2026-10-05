import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WriteReviewModal } from './WriteReviewModal';

describe('WriteReviewModal component', { timeout: 15000 }, () => {
  it('renders modal elements when open', () => {
    render(
      <WriteReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        productTitle="Vendora Sound Pro"
      />,
    );

    expect(screen.getByText('Write a Customer Review')).toBeInTheDocument();
    expect(screen.getByText(/Share your thoughts on "Vendora Sound Pro"/i)).toBeInTheDocument();
    expect(screen.getByText(/Overall Rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Review Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Feedback/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
  });

  it('selects star rating when a star button is clicked', () => {
    render(
      <WriteReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const fourStarBtn = screen.getByRole('button', { name: /Rate 4 stars/i });
    fireEvent.click(fourStarBtn);

    expect(screen.getByText(/Good - Satisfied with purchase/i)).toBeInTheDocument();
  });

  it('validates required fields before submitting', () => {
    const onSubmit = vi.fn();
    render(
      <WriteReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Click submit with empty fields
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    expect(
      screen.getByText(/Please enter a review title with at least 2 characters/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid review payload and calls onSubmit', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <WriteReviewModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    // Select 4 stars
    fireEvent.click(screen.getByRole('button', { name: /Rate 4 stars/i }));

    // Fill title
    fireEvent.change(screen.getByLabelText(/Review Title/i), {
      target: { value: 'Crisp sound and durable' },
    });

    // Fill comment
    fireEvent.change(screen.getByLabelText(/Your Feedback/i), {
      target: { value: 'Battery lasts for days. Absolutely satisfied.' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      title: 'Crisp sound and durable',
      comment: 'Battery lasts for days. Absolutely satisfied.',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
