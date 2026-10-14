import React from 'react';
import { Link } from 'react-router-dom';
import { PolicyShell, PolicySection } from '../components/common/PolicyShell';

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
  <PolicyShell
    eyebrow="Selling on Vendora"
    title="Seller Policy"
    intro={
      <p>
        The rules of trading on Vendora, written the way the platform actually works.
        For what it costs, see{' '}
        <Link to="/seller-fees" className="font-bold text-sun-orange hover:underline">
          Seller Fees
        </Link>
        .
      </p>
    }
  >
    {SECTIONS.map((section, i) => (
      <PolicySection key={section.id} id={section.id} index={i + 1} title={section.title}>
        {section.body.map((paragraph, j) => (
          <p key={j}>{paragraph}</p>
        ))}
      </PolicySection>
    ))}

    <p className="text-xs text-slate-500">
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
  </PolicyShell>
);

export default SellerPolicyPage;
