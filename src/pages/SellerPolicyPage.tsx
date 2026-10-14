import React from 'react';
import { Link } from 'react-router-dom';

const CONTAINER = 'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8';

interface PolicySection {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: PolicySection[] = [
  {
    id: 'joining',
    title: 'Joining and store review',
    body: [
      'Anyone can apply to sell on Vendora through the Become a Seller page. Your application is reviewed by the Vendora team before your store can trade; until it is approved, your listings are not public.',
      'Your store email address is your account identity and stays fixed once set. If it ever has to change, contact the admin team — seller emails are changed by the platform, not self-service, so a store can never be quietly handed to another address.',
    ],
  },
  {
    id: 'listings',
    title: 'Listings must be accurate',
    body: [
      'Describe what you are actually selling: real photos of the product, honest condition and specifications, and a price you will honour. A listing that misleads buyers — wrong item, copied photos of a different product, counterfeit goods presented as genuine — can be removed and counts against your store.',
      'Stock must be real. If an item sells out, mark it out of stock or take the listing down rather than letting buyers order what you cannot ship.',
    ],
  },
  {
    id: 'orders',
    title: 'Orders and dispatch',
    body: [
      'When a buyer orders from you, the order appears in your workspace as a package. Pack it, hand it to the assigned rider, and move its status forward as it travels — the buyer tracks the same statuses you set, so a package left untouched reads as a problem, not a delay.',
      'Cash-on-delivery orders are settled through the rider handover: the buyer pays the rider, and the package settles in your earnings with the same commission treatment as a card order.',
    ],
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    body: [
      'Buyers can request a return inside the return window you set in your store settings. You decide each request from your Returns page: approving mints an RMA code for the buyer and sets the refund; declining requires a reason, which the buyer sees.',
      'Once returned goods reach you, complete the return so the refund and restocking close together. Disagreements are not settled by ignoring them — unresolved cases can be escalated to a dispute, which the Vendora team reviews with the full record in view.',
    ],
  },
  {
    id: 'money',
    title: 'Fees, earnings and payouts',
    body: [
      'Vendora charges commission on the goods subtotal of each package — never on delivery — at the rate frozen onto the order when it was placed. The current rates are published on the Seller Fees page and read from the same configuration the platform charges by.',
      'Earnings settle into your available balance as orders complete. You request payouts from your workspace; the standard rail is free and the instant rail charges the fee shown before you confirm. Vendora may hold a payout that is under review (for example, a disputed order) and will say so on the payout itself.',
    ],
  },
  {
    id: 'standing',
    title: 'Account standing',
    body: [
      'Stores that repeatedly ship late, misdescribe goods, or ignore returns accumulate strikes on their account. Enough strikes, or a single serious breach such as selling counterfeit goods as genuine, can suspend a store; suspended stores cannot trade until the Vendora team reinstates them.',
      'Reviews on your products are written by verified buyers after delivery. You can reply to any review on your products; you cannot edit or remove a buyer\'s review.',
    ],
  },
];

/**
 * Seller Policy (/seller-policy). Written from the marketplace's actual
 * mechanics — application review, the package flow, the return workflow and
 * the strike system — so the rules a seller reads are the rules the system
 * enforces.
 */
export const SellerPolicyPage: React.FC = () => (
  <div className="bg-slate-50 pb-20 font-sans text-slate-800 antialiased selection:bg-orange-200">
    <section className="border-b border-slate-200 bg-white">
      <div className={`${CONTAINER} py-10 sm:py-14`}>
        <span className="text-[10px] font-black tracking-widest text-sun-orange uppercase">
          Selling on Vendora
        </span>
        <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Seller Policy
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          The rules of trading on Vendora, written the way the platform actually works.
          For what it costs, see{' '}
          <Link to="/seller-fees" className="font-bold text-sun-orange hover:underline">
            Seller Fees
          </Link>
          .
        </p>
      </div>
    </section>

    <div className={`${CONTAINER} mt-10`}>
      <div className="space-y-4">
        {SECTIONS.map((section, i) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8"
          >
            <h2 className="font-outfit text-lg font-black text-slate-900">
              <span className="mr-2 text-sun-orange">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </h2>
            {section.body.map((paragraph, j) => (
              <p key={j} className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                {paragraph}
              </p>
            ))}
          </article>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Questions about this policy? Reach the team through the{' '}
        <Link to="/contact" className="font-bold text-sun-orange hover:underline">
          contact page
        </Link>
        . Applying to sell means you accept this policy alongside the platform{' '}
        <Link to="/terms" className="font-bold text-sun-orange hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  </div>
);

export default SellerPolicyPage;
