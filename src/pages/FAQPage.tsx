import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  Headphones,
  Lock,
  Mail,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from 'lucide-react';

interface FaqEntry {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  answer: string;
}

/**
 * The FAQ page, in the clean two-column editorial layout: an icon tile, a
 * bold question, and a plain answer — no accordion, no search theatre.
 *
 * Every answer describes behaviour the storefront actually has (checkout
 * payment methods, the 7-day returns flow, the dispute flow, the Batch 23
 * email rules, the Batch 10 card-storage rules). The previous page invented
 * an escrow vault, courier partners, SLA vouchers and payout cycles; all of
 * that fiction is gone.
 */
const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'track-order',
    icon: Truck,
    question: 'How can I track my order?',
    answer:
      'Open Account → Orders to see the live status of every order, from confirmation to dispatch to delivery. When your parcel arrives, the rider may ask for the delivery code shown on your order — only share it once the parcel is physically in your hands.',
  },
  {
    id: 'payment-methods',
    icon: CreditCard,
    question: 'What payment methods can I use?',
    answer:
      'You can pay by card at checkout, or choose Cash on Delivery (COD) and pay the rider when your parcel arrives. Prices across Vendora are in Pakistani Rupees (PKR).',
  },
  {
    id: 'returns',
    icon: RotateCcw,
    question: 'How do returns work?',
    answer:
      'Most items can be returned within 7 days of delivery. Start from the Returns page or from the order in your account, book a doorstep pickup, and follow the return status in your account until it completes.',
  },
  {
    id: 'refunds',
    icon: Receipt,
    question: 'When will I get my refund?',
    answer:
      'Refunds are processed once the returned item reaches the seller and the return is approved. You can follow the refund status from your orders and returns pages; for Cash on Delivery orders, our support team will contact you to arrange the refund.',
  },
  {
    id: 'multi-seller',
    icon: ShoppingBag,
    question: 'Can I order from more than one seller at once?',
    answer:
      'Yes. Add items from different sellers to one cart and check out in a single payment. Each seller packs and dispatches their own items, so the items arrive as separate orders that you track individually in your account.',
  },
  {
    id: 'become-seller',
    icon: Store,
    question: 'How do I start selling on Vendora?',
    answer:
      'Apply from the Become a Seller page. Our team reviews every application; once you are approved, you get a vendor dashboard where you can add products, manage orders and track your earnings.',
  },
  {
    id: 'seller-payouts',
    icon: Wallet,
    question: 'When do sellers get paid?',
    answer:
      'Your earnings are tracked in the vendor dashboard as your orders are delivered. You can request and follow payouts from the Payouts page of your vendor workspace.',
  },
  {
    id: 'change-email',
    icon: Mail,
    question: 'How do I change the email on my account?',
    answer:
      'Customers can change their email from Account Settings — we send a confirmation link to the new address, and the change takes effect once you confirm it. Vendor accounts keep their email locked to the store identity, so sellers contact our admin team to change it.',
  },
  {
    id: 'dispute',
    icon: ShieldCheck,
    question: 'What if something goes wrong with my order?',
    answer:
      'Open the order in your account and file a dispute with the details of what went wrong — photos help. Our team reviews both sides and resolves the case, including a refund where the claim is valid.',
  },
  {
    id: 'card-storage',
    icon: Lock,
    question: 'Do you store my card details?',
    answer:
      'No. Vendora never stores full card numbers. A saved payment method keeps only the display details — the card brand and the last digits — so you can recognise it at checkout.',
  },
];

const VISIBLE_COUNT = 6;

const FaqItem: React.FC<{ entry: FaqEntry }> = ({ entry }) => {
  const Icon = entry.icon;
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sun-orange shadow-xs dark:border-white/10 dark:bg-slate-900">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-outfit text-sm font-bold text-slate-900 sm:text-base dark:text-white">
          {entry.question}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {entry.answer}
        </p>
      </div>
    </div>
  );
};

export const FAQPage: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = FAQ_ENTRIES.slice(0, VISIBLE_COUNT);
  const remaining = FAQ_ENTRIES.slice(VISIBLE_COUNT);

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header — title left, contact action right (reference layout) */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="font-outfit text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Frequently Asked Questions
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                Quick answers to questions you may have. Can&apos;t find what you&apos;re
                looking for?{' '}
                <Link
                  to="/contact"
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-sun-orange hover:decoration-sun-orange dark:text-white dark:decoration-slate-600"
                >
                  Message our support team
                </Link>
                .
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
            >
              Contact Us
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Q&A grid — open text, two columns */}
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {visible.map((entry) => (
              <FaqItem key={entry.id} entry={entry} />
            ))}
            {expanded &&
              remaining.map((entry) => <FaqItem key={entry.id} entry={entry} />)}
          </div>

          {/* Collapsed tail — faded preview + Load more (reference behaviour) */}
          {!expanded && remaining.length > 0 && (
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none mt-10 grid max-h-44 select-none gap-x-10 gap-y-10 overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)] sm:grid-cols-2"
              >
                {remaining.map((entry) => (
                  <FaqItem key={entry.id} entry={entry} />
                ))}
              </div>
              <div className="relative z-10 mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-md transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                >
                  Load more
                </button>
              </div>
            </div>
          )}

          {/* Still-have-questions banner */}
          <section className="mt-16 flex flex-col justify-between gap-5 rounded-3xl border border-slate-200/70 bg-slate-50 px-6 py-6 sm:px-8 md:flex-row md:items-center dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun-orange text-white shadow-md shadow-orange-500/25">
                <Headphones className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-outfit text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                  Still have questions?
                </h2>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  Can&apos;t find the answer you&apos;re looking for? Please{' '}
                  <Link
                    to="/contact"
                    className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-sun-orange hover:decoration-sun-orange dark:text-white dark:decoration-slate-600"
                  >
                    chat to our friendly team
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/account/orders"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
              >
                Track Your Order
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
              >
                Get in Touch
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
