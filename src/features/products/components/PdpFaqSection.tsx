import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Product-page FAQ — the five questions buyers ask before ordering, answered
 * from the platform's real policies and flows, never invented terms: the
 * delivery answer carries this product's own resolved window (the seller's
 * published times or the 2–4 business-day standard), returns are the site's
 * 30-day policy started from the account's Returns & Refunds hub, payment is
 * exactly what PaymentIcons shows (Visa, Mastercard, Cash on Delivery), and
 * protection points at the real Disputes & Claims flow. No warranty answer
 * exists because no order carries one.
 */
interface PdpFaqSectionProps {
  /** The resolved delivery window label, e.g. "Mon, Oct 19 – Wed, Oct 21". */
  deliveryWindow: string;
  /** Digital products deliver instantly, so the delivery answer differs. */
  isDigital?: boolean;
}

export const PdpFaqSection: React.FC<PdpFaqSectionProps> = ({ deliveryWindow, isDigital = false }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: { question: string; answer: string }[] = [
    {
      question: 'How long will my delivery take?',
      answer: isDigital
        ? 'This is a digital product, so there is no courier wait — it is delivered to your account right after checkout.'
        : `For this item the estimate is ${deliveryWindow}. The platform standard is 2–4 business days; some sellers publish their own delivery times, and when they do, those are what the estimate uses. After you order, live status is always available under Track Orders in your account.`,
    },
    {
      question: 'What is the return policy?',
      answer:
        'You have 30 days from delivery to return this item for a hassle-free refund. Start the request any time from the Returns & Refunds section of your account, and follow its status there until the refund lands.',
    },
    {
      question: 'How can I pay for my order?',
      answer:
        'Vendora accepts Visa and Mastercard, and Cash on Delivery — choose COD at checkout and pay in cash when your order arrives.',
    },
    {
      question: 'What if my item arrives damaged or different from the listing?',
      answer:
        'Raise a dispute from the Disputes & Claims section of your account. Buyer protection covers orders that arrive damaged, defective, or not as described, and every claim is reviewed.',
    },
    {
      question: 'How do I track my order?',
      answer:
        'Every order appears under Track Orders in your account with live status from confirmation through dispatch to delivery — no tracking number hunting needed.',
    },
  ];

  return (
    <section
      id="pdp-faqs"
      className="reveal mt-12 scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white/90 p-6 sm:p-9 shadow-2xs backdrop-blur-md"
    >
      <div className="border-b border-slate-100 pb-6">
        <h3 className="font-outfit text-2xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-sm font-bold text-slate-800">{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="pb-5 pr-8 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
