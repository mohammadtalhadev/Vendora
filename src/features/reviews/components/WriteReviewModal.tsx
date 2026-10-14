import React, { useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import type { NewReviewInput } from '../types';

export interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: NewReviewInput) => void | Promise<void>;
  productTitle?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor - Not recommended',
  2: 'Fair - Below expectations',
  3: 'Average - Met basic expectations',
  4: 'Good - Satisfied with purchase',
  5: 'Excellent - Highly recommended!',
};

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productTitle,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRating = hoveredRating !== null ? hoveredRating : rating;

  const resetForm = () => {
    setRating(5);
    setHoveredRating(null);
    setTitle('');
    setComment('');
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5 stars.');
      return;
    }

    if (!title.trim() || title.trim().length < 2) {
      setError('Please enter a review title with at least 2 characters.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please provide feedback with at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit review. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-ink">
            Write a Customer Review
          </DialogTitle>
          <DialogDescription>
            {productTitle
              ? `Share your thoughts on "${productTitle}" with other shoppers.`
              : 'Share your authentic experience to help other buyers make confident decisions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-coral" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Overall Rating <span className="text-coral">*</span>
            </label>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= activeRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(null)}
                    aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                    className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sun-orange/40"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-100 text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-slate-600">
                {RATING_LABELS[activeRating] || `${activeRating} Stars`}
              </span>
            </div>
          </div>

          {/* Review Title Input */}
          <div>
            <label
              htmlFor="review-title"
              className="block text-xs font-bold text-slate-700"
            >
              Review Title <span className="text-coral">*</span>
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fantastic quality and fast delivery"
              className="mt-1.5 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-inner focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/20"
            />
          </div>

          {/* Review Comment Textarea */}
          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-bold text-slate-700"
            >
              Your Feedback <span className="text-coral">*</span>
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your experience with build quality, battery life, packaging, or customer service..."
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 placeholder-slate-400 shadow-inner focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/20"
            />
          </div>

          {/* Dialog Footer Actions */}
          <DialogFooter className="mt-6 flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="orange-cta"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
