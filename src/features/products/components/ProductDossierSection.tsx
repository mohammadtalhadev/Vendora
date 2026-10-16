import React, { useState } from 'react';

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
    { label: 'Shipping', value: 'Tracked & Insured Delivery' },
    { label: 'Fulfillment', value: 'Vendora Verified Merchant' },
    { label: 'Support', value: '24/7 Dedicated Customer Assistance' },
    { label: 'Payment', value: 'Card or Cash on Delivery' },
  ];

  const factsToRender = keyFacts && keyFacts.length > 0 ? keyFacts : defaultKeyFacts;

  // Batch 133 — long seller descriptions collapse behind a Read more
  // toggle so the dossier no longer reads as a wall of text (owner:
  // "text bht overload ha"). Nothing is removed: the full text is one
  // click away, and short descriptions render whole as before.
  const [descExpanded, setDescExpanded] = useState(false);
  const isLongDescription = mechanismText.length > 480;

  return (
    <section id="pdp-overview" className="reveal mt-12 scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white/90 p-6 sm:p-9 shadow-2xs backdrop-blur-md space-y-8">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="border-b border-slate-100 pb-6">
        <h3 className="font-outfit text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h3>
      </div>

      {/* ── Sub-Section 1: Formula Mechanism & Biological Action ──── */}
      <div className="space-y-3">
        <h4 className="font-outfit text-base sm:text-lg font-black text-slate-900 tracking-tight">
          {mechanismHeadline}
        </h4>
        <p
          className={`text-xs sm:text-sm leading-relaxed text-slate-600 font-normal ${
            isLongDescription && !descExpanded ? 'line-clamp-5' : ''
          }`}
        >
          {mechanismText}
        </p>
        {isLongDescription && (
          <button
            type="button"
            onClick={() => setDescExpanded((v) => !v)}
            aria-expanded={descExpanded}
            className="text-xs font-bold text-sun-orange hover:text-[#EA580C] hover:underline cursor-pointer"
          >
            {descExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* ── Sub-Section 2: Vendora 3-Step Buyer Assurance ──────────── */}
      <div className="space-y-4">
        <h4 className="font-outfit text-base sm:text-lg font-black text-slate-900 tracking-tight">
          Vendora 3–Step Buyer Assurance
        </h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 space-y-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-[10px] font-extrabold tracking-widest text-sun-orange uppercase">
              STEP 01
            </span>
            <h5 className="font-bold text-slate-900 text-sm">
              Order &amp; Payment
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pay by card or cash on delivery. The seller confirms your order
              before it is dispatched.
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
      <div id="pdp-specs" className="space-y-4 pt-2 scroll-mt-24">
        <h4 className="font-outfit text-base sm:text-lg font-black text-slate-900 tracking-tight">
          Technical Specifications &amp; Key Facts
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
