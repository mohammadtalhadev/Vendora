import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Calculator,
  ChevronDown,
} from 'lucide-react';
import { PolicyShell } from '../components/common/PolicyShell';

export const RefundPolicyPage: React.FC = () => {
  // Refund Estimator State
  const [origPrice, setOrigPrice] = useState<number>(150);
  const [returnType, setReturnType] = useState<'defective' | 'remorse'>('defective');
  const [payoutDest, setPayoutDest] = useState<'card' | 'credit'>('credit');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>('ref-faq-1');

  // Calculate Net Refund
  const shippingDeduction = returnType === 'remorse' && payoutDest !== 'credit' ? 4.99 : 0.0;
  const storeCreditBonus = payoutDest === 'credit' ? origPrice * 0.05 : 0.0;
  const netRefund = origPrice - shippingDeduction + storeCreditBonus;

  const refundMethods = [
    {
      method: 'Vendora Store Credit',
      time: 'Instant (0 seconds)',
      perk: '+5% Extra Cash Bonus',
      badge: 'RECOMMENDED',
      badgeColor: 'bg-orange-100 text-sun-orange border-orange-200',
      note: 'Available in your wallet the moment courier scans return parcel. Never expires.',
    },
    {
      method: 'Credit Card (Visa, MC, Amex)',
      time: '3 - 5 Business Days',
      perk: 'Direct to Card Statement',
      badge: 'ORIGINAL METHOD',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      note: 'Depends on your issuing bank’s standard clearing and settlement schedule.',
    },
    {
      method: 'Debit Card',
      time: '2 - 4 Business Days',
      perk: 'Direct Bank Settlement',
      badge: 'BANK DEBIT',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      note: 'Credited directly back into the connected bank checking account.',
    },
    {
      method: 'PayPal / Digital Wallets',
      time: '24 - 48 Hours',
      perk: 'Fast Electronic Transfer',
      badge: 'DIGITAL WALLET',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      note: 'Reimbursed directly into your PayPal account balance or wallet.',
    },
    {
      method: 'Apple Pay / Google Pay',
      time: '1 - 3 Business Days',
      perk: 'Tokenized Card Route',
      badge: 'MOBILE WALLET',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      note: 'Returned automatically to the underlying card tokenized in your device wallet.',
    },
    {
      method: 'Cash on Delivery (COD)',
      time: '48 Hours via Bank Wire',
      perk: 'EFT Direct Wire',
      badge: 'CASH REFUND',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      note: 'Provide your routing & account number via secure portal for instant electronic wire.',
    },
  ];

  const conditionTiers = [
    {
      condition: 'Unopened & Brand New in Box',
      refundPct: '100% Full Refund',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      desc: 'All factory shrink-wrap, seals, tags, and accessories intact.',
    },
    {
      condition: 'Opened but Unused with Packaging',
      refundPct: '100% Full Refund',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      desc: 'Inspected or tried on for fit with all original boxes, cords, and manuals included.',
    },
    {
      condition: 'Tested / Lightly Used Within 30 Days',
      refundPct: '100% Store Credit or Refund',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      desc: 'Normal functional testing. Cleaned and repacked with original hardware.',
    },
    {
      condition: 'Missing Accessories or Customer Damage',
      refundPct: 'Partial Refund (Up to 50%)',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      desc: 'Missing cords, remotes, or visible scratches. Assessed by neutral platform arbitration.',
    },
  ];

  const policyFAQs = [
    {
      id: 'ref-faq-1',
      question: 'When is return shipping completely free?',
      answer:
        'Return shipping is 100% FREE whenever an item arrives defective, damaged during courier transit, incorrect color or model, or materially different from the seller’s product listing. We provide a prepaid shipping label or paperless QR code drop-off pass.',
    },
    {
      id: 'ref-faq-2',
      question: 'What happens if I return an item because I simply changed my mind?',
      answer:
        'For discretionary returns (buyer remorse, no longer wanted), you still receive a full refund for the item! A flat $4.99 return courier fee is deducted from the refund amount. However, if you choose Vendora Store Credit, we completely waive the $4.99 return fee and add a 5% bonus credit to your balance!',
    },
    {
      id: 'ref-faq-3',
      question: 'How does Vendora Buyer Protection safeguard my refund?',
      answer:
        'Card payments are captured by Vendora, and the seller\'s earnings for your order settle only after delivery. If a return is accepted, your refund is issued to your original payment method. If the seller declines and you believe the return is eligible, raise a dispute from the order — the dispute desk reviews the record and decides.',
    },
    {
      id: 'ref-faq-4',
      question: 'Can I cancel an order before it ships for an immediate refund?',
      answer:
        'Yes! You can cancel any sub-order within 30 minutes of checkout or before the vendor marks the item as "Packed for Dispatch". Canceled orders receive an instantaneous 100% refund with zero cancellation fees.',
    },
    {
      id: 'ref-faq-5',
      question: 'What items are considered non-returnable Final Sale?',
      answer:
        'Customized engraved items, intimate hygiene and opened cosmetic products, perishable groceries, and digital downloadable software keys (once redeemed) cannot be returned due to hygiene and software copyright regulations.',
    },
  ];

  return (
    <>
      <PolicyShell
        eyebrow="Consumer Protection"
        title="Refund & Return Policy"
        intro={
          <p>
            Every purchase is covered by the 30-day return window: if something is wrong, start a return and the seller reviews it — and if a seller refuses an eligible return, the dispute desk steps in.
          </p>
        }
        action={
          <>
            <Link
              to="/returns"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4 text-sun-orange" />
              Start a Return
            </Link>
            <Link
              to="/disputes"
              className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <ShieldCheck className="h-4 w-4" />
              Disputes &amp; Claims Desk
            </Link>
          </>
        }
      >
          {/* ── 30-Day Buyer Protection Hero Card ──────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    30-DAY RETURN WINDOW
                  </div>
                  <h2 className="font-outfit text-lg font-black text-slate-900">
                    The Vendora 30-Day Money-Back Guarantee
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-extrabold text-emerald-800">
                  30-Day Window
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              Your payment does not sit with an unverified stranger: card payments are captured by Vendora and a seller&apos;s earnings settle after delivery, while cash-on-delivery is paid at your door. If a return is accepted, the refund is issued to your original payment method — and if a seller refuses an eligible return, you can escalate to the dispute desk, which reviews the full record.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>30 Days to Inspect</span>
                </div>
                <p className="text-slate-500">
                  Test, try on, and verify authentic condition in the comfort of your home.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Seller Review First</span>
                </div>
                <p className="text-slate-500">
                  Your refund is processed once the seller accepts the return and the goods are on their way back.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Platform Mediation</span>
                </div>
                <p className="text-slate-500">
                  If a seller refuses an eligible return, our claims team steps in to refund you directly.
                </p>
              </div>
            </div>
          </div>

          {/* ── Interactive Net Refund Estimator ─────────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5 text-[10px] font-bold text-sun-orange uppercase tracking-wider mb-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Interactive Transparency Tool
                </div>
                <h3 className="font-outfit text-lg font-black text-slate-900">
                  Live Net Refund &amp; Bonus Estimator
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Zero restocking fees on all standard returns
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Inputs (7 cols) */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Original Item Purchase Price: <strong className="text-slate-900">${origPrice}</strong>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={origPrice}
                    onChange={(e) => setOrigPrice(Number(e.target.value))}
                    className="w-full accent-sun-orange mt-1 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>$10</span>
                    <span>$250</span>
                    <span>$500</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Return Reason */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Return Reason</label>
                    <select
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value as any)}
                      className="native-select w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-sun-orange"
                    >
                      <option value="defective">Defective / Damaged / Seller Error ($0 Return Fee)</option>
                      <option value="remorse">Changed Mind / Remorse ($4.99 Courier Fee)</option>
                    </select>
                  </div>

                  {/* Payout Destination */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Refund Method</label>
                    <select
                      value={payoutDest}
                      onChange={(e) => setPayoutDest(e.target.value as any)}
                      className="native-select w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-sun-orange"
                    >
                      <option value="credit">Vendora Store Credit (+5% Cash Bonus)</option>
                      <option value="card">Original Credit / Debit Card (Standard)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Net Payout Card (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Net Refund Amount
                  </span>
                  {payoutDest === 'credit' && (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-2xs">
                      +5% BONUS APPLIED
                    </span>
                  )}
                </div>

                <div className="font-outfit text-3xl font-black text-slate-900">
                  ${netRefund.toFixed(2)}
                </div>

                <div className="space-y-2 border-t border-emerald-200/60 pt-3 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Price:</span>
                    <strong className="text-slate-900">${origPrice.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Return Courier Label:</span>
                    <strong className={shippingDeduction > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {shippingDeduction > 0 ? `-$${shippingDeduction.toFixed(2)}` : 'FREE ($0.00)'}
                    </strong>
                  </div>
                  {storeCreditBonus > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>+5% Store Credit Cash Bonus:</span>
                      <span>+${storeCreditBonus.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Link
                  to="/returns"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 py-2.5 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                >
                  <span>Start Return with This Option</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Refund Methods & Timeline Table ──────────────────────── */}
          <div className="space-y-4">
            <div>
              <h3 className="font-outfit text-lg font-black text-slate-900">
                Refund Processing Timeframes by Payment Gateway
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact clearing timelines once the carrier confirms physical handoff at the return counter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {refundMethods.map((m) => (
                <div
                  key={m.method}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{m.method}</h4>
                    <div className="font-outfit text-lg font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-sun-orange" />
                      <span>{m.time}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-700">{m.perk}</div>
                  </div>

                  <p className="pt-2 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
                    {m.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Item Condition & Eligibility Tiers ───────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
            <h3 className="font-outfit text-lg font-black text-slate-900">
              Item Condition &amp; Refund Percentage Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {conditionTiers.map((tier) => (
                <div
                  key={tier.condition}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${tier.color}`}>
                      {tier.refundPct}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs">{tier.condition}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{tier.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Policy FAQs ──────────────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
            <h3 className="font-outfit text-lg font-black text-slate-900">
              Refund &amp; Return Policy FAQ
            </h3>

            <div className="space-y-3 pt-2">
              {policyFAQs.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-slate-200/80 bg-white/90 overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFAQ(isExpanded ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition-transform ${
                          isExpanded ? 'rotate-180 text-sun-orange' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
      </PolicyShell>
    </>
  );
};

export default RefundPolicyPage;
