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
      badgeColor: 'bg-orange-100 text-[#FF7A1A] border-orange-200',
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
      question: 'How does the Vendora Escrow Buyer Protection safeguard my refund?',
      answer:
        'When you pay on Vendora, your funds are held in a secure escrow account and are not released to the third-party merchant until delivery is confirmed and your 30-day inspection period concludes. If a return is accepted, your funds are refunded directly from the escrow pool without having to wait for the merchant to pay.',
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
    <div className="relative">
      {/* ── Ambient Glow Background ───────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
          {/* ── Breadcrumb & Header ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CONSUMER PROTECTION <span className="text-slate-300">/</span> FAIR RETURN STANDARDS
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 font-display">
                Refund &amp; Return Policy
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                Backed by the Vendora 30-Day Escrow Buyer Guarantee: every purchase is protected from arrival to satisfaction.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/returns"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-glass-pill hover:bg-white transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4 text-[#FF7A1A]" />
                Start a Return
              </Link>
              <Link
                to="/disputes"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] hover:bg-[#EA6C13] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-orange-glow transition-all active:scale-95"
              >
                <ShieldCheck className="h-4 w-4" />
                Disputes &amp; Claims Desk
              </Link>
            </div>
          </div>

          {/* ── 30-Day Escrow Buyer Protection Hero Card ─────────────── */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-10 shadow-glass backdrop-blur-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    BANK-GRADE ESCROW SAFEGUARD
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    The Vendora 30-Day Money-Back Guarantee
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-extrabold text-emerald-800">
                  100% Escrow Protected
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
              Unlike traditional marketplaces where your payment goes immediately to an unverified third party, Vendora holds buyer funds in a segregated escrow account. The merchant does not receive payout settlement until your package is delivered and the inspection window on your order clears without dispute.
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
                  <span>Instant Scan Trigger</span>
                </div>
                <p className="text-slate-500">
                  Your refund begins processing immediately when the courier scans the parcel.
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
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-10 shadow-glass backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5 text-[10px] font-bold text-[#FF7A1A] uppercase tracking-wider mb-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Interactive Transparency Tool
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
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
                    className="w-full accent-[#FF7A1A] mt-1 cursor-pointer"
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
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-[#FF7A1A]"
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
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-[#FF7A1A]"
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

                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-display">
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange hover:bg-[#EA6C13] py-2.5 text-xs font-bold text-white transition-all shadow-md hover:shadow-orange-glow active:scale-95"
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
              <h3 className="text-xl font-black text-slate-900 font-display">
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
                  className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-glass backdrop-blur-xl flex flex-col justify-between space-y-3 hover:shadow-glass-hover transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{m.method}</h4>
                    <div className="text-lg font-black text-slate-900 font-display flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-[#FF7A1A]" />
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
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 shadow-glass backdrop-blur-xl space-y-4">
            <h3 className="text-xl font-black text-slate-900 font-display">
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
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 shadow-glass backdrop-blur-xl space-y-4">
            <h3 className="text-xl font-black text-slate-900 font-display">
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
                          isExpanded ? 'rotate-180 text-[#FF7A1A]' : ''
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
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
