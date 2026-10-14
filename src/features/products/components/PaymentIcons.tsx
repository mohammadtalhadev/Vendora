import React from 'react';
import { Banknote } from 'lucide-react';

/**
 * Accepted-payment marks for the product page, drawn as real brand geometry:
 * the Mastercard interlocking circles (brand red / amber with the orange lens
 * where they overlap) and the Visa wordmark in its brand navy. The set is
 * Pakistan-relevant only — the old row carried styled-text fakes for tabby and
 * tamara (UAE BNPL schemes Vendora does not offer) and a generic "Pay" badge;
 * all three are gone. Cash on Delivery is a payment method, not a brand mark,
 * so it rides as a labelled chip with a plain lucide icon.
 */
const CHIP =
  'flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 shadow-2xs transition-colors hover:border-slate-300';

export const PaymentIcons: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 pt-1" aria-label="Accepted payment methods">
      {/* Visa */}
      <div className={CHIP} title="Visa">
        <svg className="h-3.5 w-auto" viewBox="0 0 38 12" role="img" aria-label="Visa">
          <text
            x="19"
            y="10"
            textAnchor="middle"
            fontFamily="'Arial Black', Arial, Helvetica, sans-serif"
            fontSize="11"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="1.5"
            fill="#1A1F71"
          >
            VISA
          </text>
        </svg>
      </div>

      {/* Mastercard */}
      <div className={CHIP} title="Mastercard">
        <svg className="h-4 w-auto" viewBox="0 0 36 22" role="img" aria-label="Mastercard">
          <circle cx="13" cy="11" r="8" fill="#EB001B" />
          <circle cx="23" cy="11" r="8" fill="#F79E1B" />
          <path d="M18 4.76a8 8 0 0 1 0 12.48 8 8 0 0 1 0-12.48z" fill="#FF5F00" />
        </svg>
      </div>

      {/* Cash on Delivery */}
      <div className={`${CHIP} gap-1.5`} title="Cash on Delivery">
        <Banknote className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        <span className="text-[10px] font-bold tracking-tight text-slate-700">COD</span>
      </div>
    </div>
  );
};
