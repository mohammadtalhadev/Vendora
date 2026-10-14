import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface ProductFaq {
  q: string;
  a: string;
}

/** Sensible marketplace FAQs (Ronin-style), generic enough for any product. */
export const DEFAULT_FAQS: ProductFaq[] = [
  {
    q: 'Is this product original and covered by warranty?',
    a: 'Yes. Every unit sold on Vendora is 100% authentic and backed by the seller verification program. Physical products include a 1-year official brand warranty; digital licenses are verified before delivery.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery completes within 2–4 business days. Express delivery is available in major cities. You will receive a tracking link with live status updates as soon as the order ships.',
  },
  {
    q: 'What is the return & refund policy?',
    a: 'You can request a return within 30 days of delivery if the product is damaged, defective, or not as described. Once the vendor approves the return, refunds are processed to your original payment method within 3–5 business days.',
  },
  {
    q: 'Which payment methods are accepted?',
    a: 'We accept all major debit/credit cards (Visa, Mastercard, AMEX) and Cash on Delivery for physical products. Digital products require prepaid card payment for instant license delivery.',
  },
  {
    q: 'Can I track my order after placing it?',
    a: 'Absolutely. Visit Orders → select your order to see the live 7-stage tracking timeline, from vendor confirmation through rider delivery, including the delivery verification PIN.',
  },
];

interface ProductFaqsProps {
  faqs?: ProductFaq[];
}

/** Ronin-style FAQ accordion in brand palette. */
export const ProductFaqs: React.FC<ProductFaqsProps> = ({ faqs = DEFAULT_FAQS }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-mist-100 px-5 py-4">
        <HelpCircle className="h-4 w-4 text-aqua" />
        <h3 className="text-sm font-extrabold tracking-tight text-ink-900">
          Frequently Asked Questions
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-mist-100/60"
              >
                <span
                  className={`text-xs font-bold leading-snug ${
                    isOpen ? 'text-sun-orange' : 'text-ink-800'
                  }`}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-sun-orange' : 'text-ink-400'
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-xs leading-relaxed text-ink-500">{faq.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
