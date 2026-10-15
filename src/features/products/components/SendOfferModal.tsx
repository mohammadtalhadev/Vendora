import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, CheckCircle, Tag } from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';
import { useOverlayA11y } from '../../../hooks/useOverlayA11y';
import { useAuthStore } from '../../../store/auth-store';
import { findOrCreateProductThread, sendChatMessage } from '../api/chat';

interface SendOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  currentPrice: number;
  sellerName: string;
  /** vendor_profiles id of the seller; the offer is delivered to them as a chat message. */
  sellerId?: string;
  productId?: string;
}

/**
 * Price offers ride the real product-chat plumbing: submitting finds (or
 * starts) the signed-in customer's conversation with this seller for this
 * product and posts the offer as a message the seller can answer in their
 * workspace. The previous version persisted nothing — it showed a success
 * screen promising an emailed reply, priced in a hard-coded dollar sign,
 * for an offer no one ever received.
 *
 * Batch 127: rendered through a portal to document.body, like the live-chat
 * modal — inline inside the routed page subtree, this fixed overlay family
 * could be captured by an ancestor containing block and land at the bottom
 * of the page instead of centred in the viewport (see LiveChatModal).
 */
export const SendOfferModal: React.FC<SendOfferModalProps> = ({
  isOpen,
  onClose,
  productTitle,
  currentPrice,
  sellerName,
  sellerId,
  productId,
}) => {
  const user = useAuthStore((s) => s.user);
  const [offerPrice, setOfferPrice] = useState((currentPrice * 0.9).toFixed(2));
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice, config: currencyConfig } = useCurrency();
  const panelRef = useOverlayA11y<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const canOffer = Boolean(user) && Boolean(sellerId) && Boolean(productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOffer || !user || !sellerId || !productId || isSubmitting) return;
    const amount = Number(offerPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an offer amount above zero.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const thread = await findOrCreateProductThread({
        vendorId: sellerId,
        customerName: user.name,
        productRef: productId,
      });
      const note = message.trim();
      await sendChatMessage({
        threadId: thread.id,
        senderName: user.name,
        body:
          `Price offer: ${formatPrice(amount)} for "${productTitle}" ` +
          `(listed at ${formatPrice(currentPrice)}).` +
          (note ? ` ${note}` : ''),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your offer could not be sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Send price offer"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          type="button"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-14 w-14 text-emerald-500 animate-bounce" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">Offer Sent!</h3>
            <p className="mt-2 text-xs text-slate-600 max-w-xs">
              Your offer of{' '}
              <span className="font-bold text-slate-900">{formatPrice(Number(offerPrice))}</span>{' '}
              was sent to <span className="font-bold text-sun-orange">{sellerName}</span> as a
              message in your conversation for this product. The seller can reply there.
            </p>
          </div>
        ) : !user ? (
          <div className="py-8 text-center">
            <h3 className="text-xl font-extrabold text-slate-900">Send Price Offer</h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
              Please{' '}
              <Link to="/login" className="font-bold text-sun-orange hover:underline">
                sign in
              </Link>{' '}
              to send {sellerName} an offer for this product.
            </p>
          </div>
        ) : !canOffer ? (
          <div className="py-8 text-center">
            <h3 className="text-xl font-extrabold text-slate-900">Send Price Offer</h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
              Offers are not available for this listing.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-sun-orange">
              <Tag className="h-5 w-5 text-sun-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">Make an Offer</span>
            </div>

            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Send Price Offer</h3>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{productTitle}</p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500">Current Listing Price</span>
                <p className="text-sm font-bold text-slate-700">{formatPrice(currentPrice)}</p>
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-sun-orange ring-1 ring-orange-200/70">
                Seller: {sellerName}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="offer-amount-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Your Offer Amount ({currencyConfig.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    id="offer-amount-input"
                    type="number"
                    step="0.01"
                    min="1"
                    max={currentPrice}
                    required
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-slate-800 shadow-xs focus:border-sun-orange focus:outline-hidden focus:ring-2 focus:ring-sun-orange/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Your offer is sent to the seller as a message in your product conversation.
                </p>
              </div>

              <div>
                <label htmlFor="offer-note-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Note to Seller (Optional)
                </label>
                <textarea
                  id="offer-note-input"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Ready to purchase immediately if offer is accepted..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xs focus:border-sun-orange focus:outline-hidden focus:ring-2 focus:ring-sun-orange/20 placeholder:text-slate-400"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF8C38] hover:from-sun-orange-600 hover:to-sun-orange py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending…' : 'Submit Offer'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
