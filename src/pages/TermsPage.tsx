import React, { useState } from 'react';
import {
  ChevronRight,
  ShieldCheck,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Scale,
  Building2,
  UserCheck,
  Store,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/common/Toast';
import { PolicyShell } from '../components/common/PolicyShell';
import { STANDARD_DELIVERY_BUSINESS_DAYS } from '../lib/delivery-estimate';

export const TermsPage: React.FC = () => {
  const { toast, hideToast } = useToast();
  const [activeClause, setActiveClause] = useState<string>('clause-1');

  const clauses = [
    { id: 'clause-1', num: '01', title: 'User Agreement & Platform Scope' },
    { id: 'clause-2', num: '02', title: 'Buyer Protection & Payment Terms' },
    { id: 'clause-3', num: '03', title: 'Vendor Guidelines & Commission Structure' },
    { id: 'clause-4', num: '04', title: 'Delivery Terms & Conditions' },
    { id: 'clause-5', num: '05', title: 'Returns, Refunds & Inspection Audit Period' },
    { id: 'clause-6', num: '06', title: 'Privacy Policy & Consumer Data Rights' },
    { id: 'clause-7', num: '07', title: 'Anti-Counterfeiting & Intellectual Property' },
    { id: 'clause-8', num: '08', title: 'Dispute Arbitration & Territorial Jurisdiction' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const scrollToClause = (id: string) => {
    setActiveClause(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {toast && <Toast toast={toast} onDismiss={hideToast} />}
      <PolicyShell
        eyebrow="Legal & Policies"
        title="Vendora Legal Framework & Trust Policies"
        intro={
          <p>
            Protecting consumer welfare, protecting sellers, and preserving institutional integrity across all transactions.
          </p>
        }
        action={
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print / Save as PDF</span>
          </button>
        }
      >
        {/* Meta Information Bar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2">
              <span className="text-xs font-bold text-slate-500 uppercase block">LAST REVISED</span>
              <span className="font-bold text-slate-900">January 15, 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase block">EFFECTIVE DATE</span>
              <span className="font-bold text-slate-900">February 1, 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase block">LAST UPDATED</span>
              <span className="font-bold text-indigo-600">12 October 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase block">JURISDICTION</span>
              <span className="font-bold text-emerald-600">Contractual Treaty &amp; Arbitration</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Sticky Table of Clauses + Detailed Clauses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sticky Clauses Nav */}
          <div className="lg:col-span-4 sticky top-32 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-black text-slate-500">
                  TABLE OF CLAUSES
                </span>
                <span className="rounded-full bg-orange-100 text-sun-orange px-2 py-0.5 text-[9px] font-black">
                  8 SECTIONS
                </span>
              </div>

              <div className="space-y-1">
                {clauses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => scrollToClause(c.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                      activeClause === c.id
                        ? 'bg-orange-50 text-sun-orange border border-orange-200/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-slate-500">{c.num}</span>
                      <span className="truncate">{c.title}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Published version card — no cryptographic claim is made the app cannot keep */}
            <div className="rounded-3xl border border-blue-200/70 bg-blue-50/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700">
                <Lock className="h-4 w-4" />
                <span>Published Version</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This page is the terms currently in force. Material changes are dated here and announced to registered members before they take effect.
              </p>
              <div className="text-xs font-mono bg-white p-2 rounded-xl border border-blue-100 text-slate-500">
                Effective 12 October 2026
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Clauses */}
          <div className="lg:col-span-8 space-y-6">
            {/* Clause 1.0 */}
            <div id="clause-1" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black uppercase text-slate-600">
                  CLAUSE 1.0
                </span>
                <span className="text-xs font-bold text-slate-500">FOUNDATIONAL FRAMEWORK</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                1. User Agreement &amp; Platform Scope
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                This Marketplace Governance Agreement constitutes a legally binding contract between you and Vendora Global Technologies ("Vendora", "Platform", "we"). By creating an account, browsing, ordering, or listing items on Vendora, you explicitly consent to strict adherence to these terms.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <UserCheck className="h-4 w-4 text-sun-orange" />
                    <span>Verified Buyer</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Any registered account possessing clean identity verification and adherence to fair return conduct guidelines.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Store className="h-4 w-4 text-indigo-600" />
                    <span>Verified Merchant</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Commercial seller executing KYC verification, authentic inventory sourcing, and compliance with Vendora&apos;s published seller standards.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 2.0 */}
            <div id="clause-2" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 2.0
                </span>
                <span className="text-xs font-bold text-slate-500">FINANCIAL PROTECTION</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                2. Buyer Protection &amp; Payment Terms
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When you pay by card, your payment is captured by Vendora and the seller&apos;s earnings settle only after the order is delivered; cash-on-delivery orders are paid to the rider at your door. If something goes wrong, you can raise a dispute from the order and the Vendora dispute desk reviews the full record before any refund is decided.
              </p>

              {/* Buyer Protection 3-Stage Timeline */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-black text-slate-500 block">
                  HOW BUYER PROTECTION WORKS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-xs font-black text-sun-orange block">1. Order &amp; Pay</span>
                    <span className="text-xs text-slate-500">Card payment captured by Vendora, or cash on delivery</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-xs font-black text-indigo-600 block">2. Delivery &amp; 30-Day Window</span>
                    <span className="text-xs text-slate-500">Check the goods; the return window runs from delivery</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-xs font-black text-emerald-600 block">3. Dispute Desk Review</span>
                    <span className="text-xs text-slate-500">Raise a case from the order if anything is wrong</span>
                  </div>
                </div>
              </div>

              {/* Money-Back Guarantee Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-slate-700">
                  <strong className="font-outfit font-black text-emerald-800 block">
                    Money-Back Guarantee
                  </strong>
                  <span>
                    Full refund or replacement is guaranteed if a product is counterfeit, materially different than listed, or damaged in transit.
                  </span>
                </div>
              </div>
            </div>

            {/* Clause 3.0 */}
            <div id="clause-3" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-orange-100 text-sun-orange px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 3.0
                </span>
                <span className="text-xs font-bold text-slate-500">MERCHANT ECONOMICS &amp; CONDUCT</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                3. Vendor Guidelines &amp; Commission Structure
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Listing on Vendora is free. A category-based commission applies to completed sales and is deducted before settlement; the rates in force are published in the seller fee schedule.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-outfit text-lg font-black text-sun-orange">Listing Fee: None</span>
                  <p className="text-xs text-slate-500">
                    Commission is charged only on settled orders, at the rate published for the product's category.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-outfit text-lg font-black text-indigo-600">Weekly Payouts</span>
                  <p className="text-xs text-slate-500">
                    Sellers request payouts from their workspace to their registered bank account; the standard rail is free.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 4.0 */}
            <div id="clause-4" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 4.0
                </span>
                <span className="text-xs font-bold text-slate-500">DISPATCH &amp; FULFILLMENT</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                4. Delivery Terms &amp; Conditions
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Vendora sellers dispatch nationwide across Pakistan. Standard delivery takes{' '}
                {STANDARD_DELIVERY_BUSINESS_DAYS.min}–{STANDARD_DELIVERY_BUSINESS_DAYS.max}{' '}
                business days from dispatch, and every package carries its own tracking from
                the seller&apos;s door to yours.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">STANDARD WINDOW</span>
                  <span className="font-outfit font-black text-slate-900 text-sm">
                    {STANDARD_DELIVERY_BUSINESS_DAYS.min}–{STANDARD_DELIVERY_BUSINESS_DAYS.max} Business Days
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">DISPATCH</span>
                  <span className="font-outfit font-black text-sun-orange text-sm">Per-Package Tracking</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">DELIVERY PROOF</span>
                  <span className="font-outfit font-black text-emerald-600 text-sm">4-Digit Delivery Code</span>
                </div>
              </div>
            </div>

            {/* Clause 5.0 */}
            <div id="clause-5" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 5.0
                </span>
                <span className="text-xs font-bold text-slate-500">RETURNS &amp; REFUNDS</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                5. Returns, Refunds &amp; Inspection Audit Period
              </h2>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <span><strong>Start From Your Order:</strong> Open the return from the order in your account and follow the seller&apos;s return instructions.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <span><strong>Send the Item Back:</strong> The seller arranges a pickup or asks you to courier the item back, as confirmed on your return.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <span><strong>Refund on Approval:</strong> Once the seller accepts the return and the goods are on their way back, the refund is issued to your original payment method; timelines follow the Refund Policy.</span>
                </div>
              </div>
            </div>

            {/* Clause 6.0 */}
            <div id="clause-6" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-100 text-cyan-700 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 6.0
                </span>
                <span className="text-xs font-bold text-slate-500">DATA PRIVACY &amp; SECURITY</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                6. Privacy Policy &amp; Consumer Data Rights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-outfit font-black text-slate-900 text-sm">
                    Zero Third-Party Data Monetization
                  </span>
                  <p className="text-xs text-slate-500">
                    We never sell customer identities, telemetry logs, or purchasing records to third-party ad brokers.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-outfit font-black text-slate-900 text-sm">
                    Right to Erasure &amp; Data Export
                  </span>
                  <p className="text-xs text-slate-500">
                    Users can download a full archive of their order receipts or request permanent GDPR-compliant erasure at any time.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 7.0 */}
            <div id="clause-7" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 7.0
                </span>
                <span className="text-xs font-bold text-slate-500">BRAND PROTECTION &amp; IP</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                7. Anti-Counterfeiting &amp; Intellectual Property Enforcement
              </h2>
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Mandatory Three-Strike Expulsion Protocol</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-xl">
                    <strong className="block text-amber-700 font-black">Strike 1</strong>
                    <span className="text-xs text-slate-500">Listing Removed</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl">
                    <strong className="block text-orange-600 font-black">Strike 2</strong>
                    <span className="text-xs text-slate-500">14-Day Suspension</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl">
                    <strong className="block text-rose-600 font-black">Strike 3</strong>
                    <span className="text-xs text-slate-500">Permanent Ban</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clause 8.0 */}
            <div id="clause-8" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black uppercase text-slate-600">
                  CLAUSE 8.0
                </span>
                <span className="text-xs font-bold text-slate-500">LEGAL JURISDICTION</span>
              </div>
              <h2 className="font-outfit text-lg font-black text-slate-900">
                8. Dispute Arbitration &amp; Territorial Jurisdiction
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Disputes are settled under the Commercial Arbitration Rules of the Karachi Centre for Dispute Resolution (KCDR) or DIFC-LCIA Arbitration Centre, with legal recourse backed by international trade conventions.
              </p>
            </div>

            {/* Contact Legal & Compliance Team */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-sun-orange block">
                    DIRECT INSTITUTIONAL CHANNELS
                  </span>
                  <h3 className="font-outfit text-lg font-black text-slate-900">
                    Contact Legal &amp; Compliance Team
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-extrabold border border-emerald-200">
                  Active Legal Registry
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Scale className="h-4 w-4 text-sun-orange" />
                    <span>Legal Counsel</span>
                  </div>
                  <a href="mailto:legal@vendora.market" className="text-sun-orange font-semibold text-xs hover:underline block">
                    legal@vendora.market
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Merchant Audit</span>
                  </div>
                  <a href="mailto:compliance@vendora.market" className="text-indigo-600 font-semibold text-xs hover:underline block">
                    compliance@vendora.market
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Building2 className="h-4 w-4 text-slate-700" />
                    <span>Registered Office</span>
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Vendora Multivendor HQ, Karachi &amp; Dubai
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PolicyShell>
    </>
  );
};

export default TermsPage;
