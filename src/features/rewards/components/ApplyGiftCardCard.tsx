import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCurrency } from '../../../store/currency-store';
import { useApplyGiftCardToOrder } from '../hooks/useRewards';
import type { ApplyGiftCardResult } from '../api/rewards';

interface ApplyGiftCardCardProps {
  orderId: string;
  paymentMethod: string;
  /** Order total (subtotal + shipping across all packages). */
  total: number;
  /** Amount this order's gift cards have already covered (orders.gift_card_amount). */
  giftCardAmount: number;
}

/**
 * "Apply a gift card" for a cash-on-delivery order. The card code is spent
 * by the `apply_gift_card_to_order` RPC, which caps the spend at what is
 * still due; this card only collects the code and reports the outcome.
 * Hidden for card-paid orders and once an order is fully covered.
 */
export const ApplyGiftCardCard: React.FC<ApplyGiftCardCardProps> = ({
  orderId,
  paymentMethod,
  total,
  giftCardAmount,
}) => {
  const { formatPrice } = useCurrency();
  const mutation = useApplyGiftCardToOrder(orderId);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ApplyGiftCardResult | null>(null);

  const amountDue = Math.max(0, total - (result?.giftCardAmount ?? giftCardAmount));
  if (paymentMethod !== 'cod' || amountDue <= 0) return null;

  const handleApply = () => {
    const trimmed = code.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed, {
      onSuccess: (applied) => {
        setResult(applied);
        setCode('');
      },
    });
  };

  return (
    <section
      aria-label="Apply a gift card"
      className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-sun-orange">
          <Gift className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
          Apply a gift card
        </h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        This is a cash-on-delivery order. A gift card reduces what you hand the rider —{' '}
        <strong className="text-slate-700 dark:text-slate-200">{formatPrice(amountDue)}</strong> is
        still due.
        {giftCardAmount > 0 && (
          <>
            {' '}
            Gift cards have already covered{' '}
            <strong className="text-slate-700 dark:text-slate-200">{formatPrice(giftCardAmount)}</strong>.
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={`gift-card-code-${orderId}`} className="sr-only">
          Gift card code
        </label>
        <input
          id={`gift-card-code-${orderId}`}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="VGC-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="h-10 min-w-52 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          disabled={!code.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Applying…' : 'Apply gift card'}
        </Button>
      </div>
      {result && (
        <p role="status" className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Applied {formatPrice(result.applied)} from your gift card.{' '}
          {result.amountDue > 0
            ? `${formatPrice(result.amountDue)} is now due on delivery.`
            : 'This order is fully covered — nothing is due on delivery.'}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-400">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
};

export default ApplyGiftCardCard;
