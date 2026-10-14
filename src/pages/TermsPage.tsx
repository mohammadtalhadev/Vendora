import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

export const TermsPage: React.FC = () => {
  const { toast, hideToast } = useToast();
  const [activeClause, setActiveClause] = useState<string>('clause-1');

  const clauses = [
    { id: 'clause-1', num: '01', title: 'User Agreement & Platform Scope' },
    { id: 'clause-2', num: '02', title: 'Buyer Protection & Escrow Terms' },
    { id: 'clause-3', num: '03', title: 'Vendor Guidelines & Commission Structure' },
    { id: 'clause-4', num: '04', title: 'Express Delivery (3–6 Hour) Terms & Conditions' },
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
    <div className="pb-16 pt-4 sm:pt-6">
      {toast && <Toast toast={toast} onDismiss={hideToast} />}

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-slate-500">Legal &amp; Policies</span>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white">Marketplace Governance &amp; Terms</span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-sun-orange">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>INSTITUTIONAL COMPLIANCE REGIME 2026</span>
              </div>
              <h1 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                Vendora Legal Framework &amp; Trust Policies
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Protecting consumer welfare, protecting sellers, and preserving institutional integrity across all transactions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Meta Information Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-100 dark:border-white/5 text-xs">
            <div className="p-2">
              <span className="text-xs font-bold text-slate-500 uppercase block">LAST REVISED</span>
              <span className="font-bold text-slate-900 dark:text-white">January 15, 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-500 uppercase block">EFFECTIVE DATE</span>
              <span className="font-bold text-slate-900 dark:text-white">February 1, 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-500 uppercase block">LAST UPDATED</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">12 October 2026</span>
            </div>
            <div className="p-2 border-l border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-500 uppercase block">JURISDICTION</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Contractual Treaty &amp; Arbitration</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Sticky Table of Clauses + Detailed Clauses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sticky Clauses Nav */}
          <div className="lg:col-span-4 sticky top-32 space-y-4">
            <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <span className="text-xs font-black text-slate-500">
                  TABLE OF CLAUSES
                </span>
                <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 text-sun-orange px-2 py-0.5 text-[9px] font-black">
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
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-sun-orange border border-orange-200/80 dark:border-orange-800/40 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
            <div className="rounded-3xl border border-blue-200/70 dark:border-blue-900/30 bg-blue-50/70 dark:bg-blue-950/30 p-5 backdrop-blur-xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-400">
                <Lock className="h-4 w-4" />
                <span>Published Version</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This page is the terms currently in force. Material changes are dated here and announced to registered members before they take effect.
              </p>
              <div className="text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded-xl border border-blue-100 dark:border-white/5 text-slate-500">
                Effective 12 October 2026
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Clauses */}
          <div className="lg:col-span-8 space-y-6">
            {/* Clause 1.0 */}
            <div id="clause-1" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                  CLAUSE 1.0
                </span>
                <span className="text-xs font-bold text-slate-500">FOUNDATIONAL FRAMEWORK</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                1. User Agreement &amp; Platform Scope
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                This Marketplace Governance Agreement constitutes a legally binding contract between you and Vendora Global Technologies ("Vendora", "Platform", "we"). By creating an account, browsing, ordering, or listing items on Vendora, you explicitly consent to strict adherence to these terms.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                    <UserCheck className="h-4 w-4 text-sun-orange" />
                    <span>Verified Buyer</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Any registered account possessing clean identity verification and adherence to fair return conduct guidelines.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                    <Store className="h-4 w-4 text-indigo-600" />
                    <span>Verified Merchant</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Commercial seller executing KYC verification, authentic inventory sourcing, and compliance with Vendora SafeVault SLAs.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 2.0 */}
            <div id="clause-2" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 2.0
                </span>
                <span className="text-xs font-bold text-slate-500">FINANCIAL PROTECTION</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                2. Buyer Protection &amp; SafeVault™ Escrow Terms
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Every transaction completed on Vendora is routed through our escrow ledger. Merchants do not receive disbursement until the buyer verifies delivery condition upon arrival.
              </p>

              {/* Escrow 3-Stage Progress Timeline */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-3">
                <span className="text-xs font-black text-slate-500 block">
                  SAFEVAULT ESCROW RESOLUTION CYCLE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/5">
                    <span className="text-xs font-black text-sun-orange block">1. Inspection Guarantee</span>
                    <span className="text-xs text-slate-500">Immediate deposit into escrow</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/5">
                    <span className="text-xs font-black text-indigo-600 block">2. 7 to 30 Day Inspection</span>
                    <span className="text-xs text-slate-500">Window to report any discrepancies</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/5">
                    <span className="text-xs font-black text-emerald-600 block">3. Merchant Release</span>
                    <span className="text-xs text-slate-500">Automated payout upon clean verification</span>
                  </div>
                </div>
              </div>

              {/* 100% Money-Back Escrow Guarantee Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                  <strong className="font-outfit font-black text-emerald-800 dark:text-emerald-300 block">
                    100% Money-Back Escrow Application Guarantee
                  </strong>
                  <span>
                    Full refund or replacement is guaranteed if a product is counterfeit, materially different than listed, damaged in transit, or fails within warranty.
                  </span>
                </div>
              </div>
            </div>

            {/* Clause 3.0 */}
            <div id="clause-3" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-orange-100 text-sun-orange dark:bg-orange-950/60 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 3.0
                </span>
                <span className="text-xs font-bold text-slate-500">MERCHANT ECONOMICS &amp; CONDUCT</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                3. Vendor Guidelines &amp; Commission Structure
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Listing on Vendora is free. A category-based commission applies to completed sales and is deducted before settlement; the rates in force are published in the seller fee schedule.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="font-outfit text-lg font-black text-sun-orange">Listing Fee: $0</span>
                  <p className="text-xs text-slate-500">
                    Commission is charged only on settled orders, at the rate published for the product's category.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="font-outfit text-lg font-black text-indigo-600">14-Day Payout SLA</span>
                  <p className="text-xs text-slate-500">
                    Cleared funds automatically disburse to your local IBAN or Stripe Connect account bi-weekly.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 4.0 */}
            <div id="clause-4" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 4.0
                </span>
                <span className="text-xs font-bold text-slate-500">DISPATCH &amp; FULFILLMENT</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                4. Express Delivery (3–6 Hour) Terms &amp; Conditions
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Express deliveries operate across metropolitan regional clusters (Karachi, Lahore, Islamabad/Rawalpindi). Orders qualify for sub-6-hour delivery under strict dispatch criteria.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">EXECUTION WINDOW</span>
                  <span className="font-outfit font-black text-slate-900 dark:text-white text-sm">7:00 AM – 4:00 PM</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">CUT-OFF BENCHMARK</span>
                  <span className="font-outfit font-black text-sun-orange text-sm">PKR 4,500</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">TELEMETRY SECURITY</span>
                  <span className="font-outfit font-black text-emerald-600 text-sm">4-Digit Dynamic OTP</span>
                </div>
              </div>
            </div>

            {/* Clause 5.0 */}
            <div id="clause-5" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 5.0
                </span>
                <span className="text-xs font-bold text-slate-500">RETURNS &amp; REFUNDS</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                5. Returns, Refunds &amp; Inspection Audit Period
              </h2>
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <span><strong>Initiate Through Self-Service Resolution:</strong> Request digital QR drop-off pass or doorstep pickup in your account.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <span><strong>Complimentary Courier Pickup:</strong> We dispatch a carrier rider directly to your address with zero transit fees.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <span><strong>Rapid Settlement SLA:</strong> Instant store credit or direct bank card reversal within 24 to 48 hours of scan receipt.</span>
                </div>
              </div>
            </div>

            {/* Clause 6.0 */}
            <div id="clause-6" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 6.0
                </span>
                <span className="text-xs font-bold text-slate-500">DATA PRIVACY &amp; SECURITY</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                6. Privacy Policy &amp; Consumer Data Rights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="font-outfit font-black text-slate-900 dark:text-white text-sm">
                    Zero Third-Party Data Monetization
                  </span>
                  <p className="text-xs text-slate-500">
                    We never sell customer identities, telemetry logs, or purchasing records to third-party ad brokers.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="font-outfit font-black text-slate-900 dark:text-white text-sm">
                    Right to Erasure &amp; Data Export
                  </span>
                  <p className="text-xs text-slate-500">
                    Users can download a full archive of their order receipts or request permanent GDPR-compliant erasure at any time.
                  </p>
                </div>
              </div>
            </div>

            {/* Clause 7.0 */}
            <div id="clause-7" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 text-xs font-black uppercase">
                  CLAUSE 7.0
                </span>
                <span className="text-xs font-bold text-slate-500">BRAND PROTECTION &amp; IP</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                7. Anti-Counterfeiting &amp; Intellectual Property Enforcement
              </h2>
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Mandatory Three-Strike Expulsion Protocol</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                    <strong className="block text-amber-700 font-black">Strike 1</strong>
                    <span className="text-xs text-slate-500">Listing Removed</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                    <strong className="block text-orange-600 font-black">Strike 2</strong>
                    <span className="text-xs text-slate-500">14-Day Suspension</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                    <strong className="block text-rose-600 font-black">Strike 3</strong>
                    <span className="text-xs text-slate-500">Permanent Ban</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clause 8.0 */}
            <div id="clause-8" className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                  CLAUSE 8.0
                </span>
                <span className="text-xs font-bold text-slate-500">LEGAL JURISDICTION</span>
              </div>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                8. Dispute Arbitration &amp; Territorial Jurisdiction
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Disputes are settled under the Commercial Arbitration Rules of the Karachi Centre for Dispute Resolution (KCDR) or DIFC-LCIA Arbitration Centre, with legal recourse backed by international trade conventions.
              </p>
            </div>

            {/* Contact Legal & Compliance Team */}
            <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_15px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-sun-orange block">
                    DIRECT INSTITUTIONAL CHANNELS
                  </span>
                  <h3 className="font-outfit text-xl font-black text-slate-900 dark:text-white">
                    Contact Legal &amp; Compliance Team
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-extrabold border border-emerald-200">
                  Active Legal Registry
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Scale className="h-4 w-4 text-sun-orange" />
                    <span>Legal Counsel</span>
                  </div>
                  <a href="mailto:legal@vendora.market" className="text-sun-orange font-semibold text-xs hover:underline block">
                    legal@vendora.market
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Merchant Audit</span>
                  </div>
                  <a href="mailto:compliance@vendora.market" className="text-indigo-600 font-semibold text-xs hover:underline block">
                    compliance@vendora.market
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
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
      </div>
    </div>
  );
};

export default TermsPage;
