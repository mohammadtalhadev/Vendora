import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { useMyGiftCards, usePurchaseGiftCard } from '../features/rewards/hooks/useRewards';
import type { PurchasedGiftCard } from '../features/rewards/api/rewards';

const AMOUNT_PRESETS = [500, 1000, 2500, 5000, 10000];

/**
 * Gift Cards (/gift-cards) — buy a real gift card, see the cards you bought.
 *
 * Buying creates a `gift_cards` row through the `purchase_gift_card` RPC;
 * the raw code is returned once, here, and never stored or shown again —
 * only the last four digits are kept. Payment is booked under the project's
 * existing simulated-card model because a real gateway is deferred.
 */
export const GiftCardsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { formatPrice } = useCurrency();
  const { data: mine, isLoading } = useMyGiftCards();
  const purchase = usePurchaseGiftCard();

  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [issued, setIssued] = useState<PurchasedGiftCard | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveAmount = customAmount.trim() ? Number(customAmount) : amount;
  const amountValid = Number.isFinite(effectiveAmount) && effectiveAmount >= 100 && effectiveAmount <= 500000;
  const emailValid = recipientEmail.includes('@');

  const handlePurchase = () => {
    if (!amountValid || !emailValid || purchase.isPending) return;
    purchase.mutate(
      { recipientEmail: recipientEmail.trim(), amount: effectiveAmount, message: message.trim() || undefined },
      {
        onSuccess: (card) => {
          setIssued(card);
          setCopied(false);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-[#EA6C13] ring-1 ring-orange-200">
        <Gift className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Vendora Gift Cards</span>
      </div>
      <h1 className="font-outfit mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        Give a Vendora gift card
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        A gift card carries a real balance in our system for one year. The recipient applies its
        code to a cash-on-delivery order and pays less at the door. Cards are booked as paid under
        Vendora&apos;s current simulated card checkout — no external payment gateway is involved yet.
      </p>

      {issued && (
        <div
          role="status"
          className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        >
          <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">
            Your gift card is ready
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            Copy this code now — it is shown in full only once, here. After this, only its last
            four digits are kept, and the full code cannot be recovered.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-2xl bg-white px-4 py-3 font-mono text-lg font-black tracking-wider text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white">
              {issued.code}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy} className="gap-2 bg-white">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Balance {formatPrice(issued.balance)} · expires{' '}
            {new Date(issued.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            . Send the code to the recipient — anyone signed in who holds the code can spend it.
          </p>
        </div>
      )}

      <section className="mt-8 rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Buy a gift card</h2>
        {!user ? (
          <div className="mt-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sign in to buy a gift card — the purchase is recorded against your account so you can
              track its balance.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
            >
              Sign in to buy a gift card
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Amount</span>
              <div className="flex flex-wrap gap-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      setCustomAmount('');
                    }}
                    aria-pressed={!customAmount && amount === preset}
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      !customAmount && amount === preset
                        ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-sun-orange hover:text-sun-orange dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                    }`}
                  >
                    {formatPrice(preset)}
                  </button>
                ))}
                <input
                  type="number"
                  min={100}
                  max={500000}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom amount (Rs)"
                  aria-label="Custom amount in rupees"
                  className="h-9 w-48 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-900 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              {!amountValid && (
                <p className="mt-2 text-xs font-semibold text-rose-600">
                  Choose an amount between Rs 100 and Rs 500,000.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gift-recipient" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recipient email
                </label>
                <input
                  id="gift-recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="gift-message" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Message (optional)
                </label>
                <input
                  id="gift-message"
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Happy birthday!"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>
            {purchase.isError && (
              <p role="alert" className="text-xs font-semibold text-rose-600">
                {purchase.error.message}
              </p>
            )}
            <Button
              type="button"
              onClick={handlePurchase}
              disabled={!amountValid || !emailValid || purchase.isPending}
            >
              {purchase.isPending ? 'Creating card…' : `Buy gift card · ${formatPrice(Number.isFinite(effectiveAmount) ? effectiveAmount : 0)}`}
            </Button>
          </div>
        )}
      </section>

      {user && (
        <section className="mt-8 rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Cards you&apos;ve bought</h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-slate-500">Loading your gift cards…</p>
          ) : !mine || mine.cards.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              You have not bought any gift cards yet. Cards you buy will appear here with their
              remaining balance — the full code is never stored, so keep the code from purchase.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
              {mine.cards.map((card) => (
                <li key={card.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      VGC-••••-••••-{card.codeLast4}
                    </p>
                    <p className="text-xs text-slate-500">
                      To {card.recipientEmail} · bought{' '}
                      {new Date(card.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}expires{' '}
                      {new Date(card.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {card.message && <p className="text-xs italic text-slate-500">“{card.message}”</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatPrice(card.balance)}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      of {formatPrice(card.initialAmount)} · {card.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
        <h2 className="font-outfit text-base font-black text-slate-900 dark:text-white">Received a gift card?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Open one of your cash-on-delivery orders and use the “Apply a gift card” card on it — the
          amount comes off what you owe the rider. You can apply a card from the order confirmation
          page right after checkout, or later from the order&apos;s detail page.
        </p>
        <Link to="/orders" className="mt-3 inline-flex text-sm font-bold text-sun-orange hover:underline">
          Go to My Orders
        </Link>
      </section>
    </div>
  );
};

export default GiftCardsPage;
