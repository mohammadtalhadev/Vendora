import React from 'react';
import { Sparkles, Shield, ListFilter } from 'lucide-react';

export interface KeyFactItem {
  label: string;
  value: string;
}

interface ProductDossierSectionProps {
  title?: string;
  category?: string;
  mechanismHeadline?: string;
  mechanismText?: string;
  keyFacts?: KeyFactItem[];
  verifiedBadgeText?: string;
}

export const ProductDossierSection: React.FC<ProductDossierSectionProps> = ({
  title = 'Full Product Description',
  category: _category,
  mechanismHeadline = 'Product Highlights & Specifications',
  mechanismText = 'Every product on Vendora is authenticated, quality-inspected, and backed by comprehensive buyer protection. Specifications reflect verified manufacturer details and merchant fulfillment standards.',
  keyFacts,
}) => {
  const defaultKeyFacts: KeyFactItem[] = [
    { label: 'Authenticity', value: '100% Genuine & Verified by Vendora' },
    { label: 'Condition', value: 'Brand New (Original Factory Packaging)' },
    { label: 'Return Policy', value: '30-Day Hassle-Free Returns' },
    { label: 'Warranty', value: '1 Year Manufacturer / Vendor Coverage' },
    { label: 'Shipping', value: 'Tracked & Insured Delivery' },
    { label: 'Fulfillment', value: 'Vendora Verified Merchant' },
    { label: 'Support', value: '24/7 Dedicated Customer Assistance' },
    { label: 'Payment Protection', value: 'Secured Escrow Checkout' },
  ];

  const factsToRender = keyFacts && keyFacts.length > 0 ? keyFacts : defaultKeyFacts;

  return (
    <section className="mt-12 rounded-3xl border border-slate-200/80 bg-white/90 p-6 sm:p-9 shadow-2xs backdrop-blur-md space-y-8">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="border-b border-slate-100 pb-6">
        <h3 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h3>
      </div>

      {/* ── Sub-Section 1: Formula Mechanism & Biological Action ──── */}
      <div className="space-y-3">
        <h4 className="font-outfit flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 tracking-tight">
          <Sparkles className="h-4 w-4 text-sun-orange" />
          <span>{mechanismHeadline}</span>
        </h4>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-600 font-normal">
          {mechanismText}
        </p>
      </div>

      {/* ── Sub-Section 2: Vendora 3-Step Buyer Assurance ──────────── */}
      <div className="space-y-4">
        <h4 className="font-outfit flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 tracking-tight">
          <Shield className="h-4 w-4 text-emerald-600" />
          <span>Vendora 3–Step Buyer Assurance</span>
        </h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 space-y-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-[10px] font-extrabold tracking-widest text-sun-orange uppercase">
              STEP 01
            </span>
            <h5 className="font-bold text-slate-900 text-sm">
              Order &amp; Escrow Deposit
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Funds are securely locked in buyer escrow until delivery is confirmed.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 space-y-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-[10px] font-extrabold tracking-widest text-sun-orange uppercase">
              STEP 02
            </span>
            <h5 className="font-bold text-slate-900 text-sm">
              Doorstep Verification
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect sealed authentic package directly upon arrival before accepting.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 space-y-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-[10px] font-extrabold tracking-widest text-sun-orange uppercase">
              STEP 03
            </span>
            <h5 className="font-bold text-slate-900 text-sm">
              30–Day Protected Support
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enjoy full marketplace backing, dispute resolution, and return coverage.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 3: Technical Specifications & Key Facts ───── */}
      <div className="space-y-4 pt-2">
        <h4 className="font-outfit flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 tracking-tight">
          <ListFilter className="h-4 w-4 text-sun-orange" />
          <span>Technical Specifications &amp; Key Facts</span>
        </h4>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Column 1 */}
            <div className="divide-y divide-slate-100 text-xs">
              {factsToRender.slice(0, Math.ceil(factsToRender.length / 2)).map((fact, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <span className="font-semibold text-slate-500">{fact.label}</span>
                  <span className="font-bold text-slate-900 text-right max-w-[60%]">
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="divide-y divide-slate-100 text-xs">
              {factsToRender.slice(Math.ceil(factsToRender.length / 2)).map((fact, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <span className="font-semibold text-slate-500">{fact.label}</span>
                  <span className="font-bold text-slate-900 text-right max-w-[60%]">
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
