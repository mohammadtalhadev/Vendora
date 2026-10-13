import React, { useState } from 'react';
import { X, CheckCircle, Tag } from 'lucide-react';

interface SendOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  currentPrice: number;
  sellerName: string;
}

export const SendOfferModal: React.FC<SendOfferModalProps> = ({
  isOpen,
  onClose,
  productTitle,
  currentPrice,
  sellerName,
}) => {
  const [offerPrice, setOfferPrice] = useState(
    (currentPrice * 0.9).toFixed(2),
  );
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
            <h3 className="mt-4 text-xl font-bold text-slate-900">Offer Submitted!</h3>
            <p className="mt-2 text-xs text-slate-600 max-w-xs">
              Your offer of <span className="font-bold text-slate-900">${offerPrice}</span> was sent to{' '}
              <span className="font-bold text-[#FF7A1A]">{sellerName}</span>. You will receive an email response shortly.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-[#FF7A1A]">
              <Tag className="h-5 w-5 text-[#FF7A1A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">Make an Offer</span>
            </div>

            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Send Price Offer</h3>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{productTitle}</p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500">Current Listing Price</span>
                <p className="text-sm font-bold text-slate-700">${currentPrice.toFixed(2)}</p>
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-[#FF7A1A] ring-1 ring-orange-200/70">
                Seller: {sellerName}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="offer-amount-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Your Offer Amount ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    $
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
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-slate-800 shadow-xs focus:border-[#FF7A1A] focus:outline-hidden focus:ring-2 focus:ring-[#FF7A1A]/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Recommended: reasonable offers within 10-20% of listing price have the highest acceptance rate.
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xs focus:border-[#FF7A1A] focus:outline-hidden focus:ring-2 focus:ring-[#FF7A1A]/20 placeholder:text-slate-400"
                />
              </div>

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
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF8C38] hover:from-[#EA6C13] hover:to-[#FF7A1A] py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  Submit Offer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
