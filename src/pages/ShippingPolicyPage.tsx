import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Globe2,
  Calculator,
  ChevronDown,
  ArrowRight,
  Compass,
} from 'lucide-react';

import { PolicyShell } from '../components/common/PolicyShell';

export const ShippingPolicyPage: React.FC = () => {
  // Calculator state
  const [destCountry, setDestCountry] = useState('US');
  const [packageWeight, setPackageWeight] = useState<'light' | 'standard' | 'heavy' | 'freight'>('standard');
  const [shippingTier, setShippingTier] = useState<'ground' | 'air' | 'overnight' | 'sameday'>('ground');
  const [orderSubtotal, setOrderSubtotal] = useState<number>(120);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>('ship-faq-1');

  // Calculate simulated rate & timeline
  const calculateResult = () => {
    let baseRate = 4.99;
    let days = '3 - 5 business days';
    let carrier = 'FedEx Ground / USPS Priority';

    if (shippingTier === 'air') {
      baseRate = 9.99;
      days = '2 business days guaranteed';
      carrier = 'UPS 2nd Day Air';
    } else if (shippingTier === 'overnight') {
      baseRate = 14.99;
      days = 'Next business day by 10:30 AM';
      carrier = 'FedEx Priority Overnight';
    } else if (shippingTier === 'sameday') {
      baseRate = 19.99;
      days = 'Today by 8:00 PM (Metro only)';
      carrier = 'Vendora Local Metro Express';
    }

    // Weight multiplier
    if (packageWeight === 'heavy') baseRate += 5.0;
    if (packageWeight === 'freight') baseRate += 25.0;

    // International multiplier
    if (destCountry !== 'US') {
      baseRate += 12.0;
      days = '5 - 9 business days (DDP customs cleared)';
      carrier = 'DHL Express Worldwide';
    }

    const isFree = shippingTier === 'ground' && orderSubtotal >= 100 && destCountry === 'US';
    return {
      rate: isFree ? 0 : baseRate,
      isFree,
      days,
      carrier,
    };
  };

  const calcResult = calculateResult();

  const rateTiers = [
    {
      name: 'Standard Ground',
      time: '3 - 5 Business Days',
      price: '$4.99 or FREE',
      priceSub: 'Free on orders $100+',
      desc: 'Dependable nationwide road delivery covering all 50 US states, P.O. boxes, and APO/FPO addresses.',
      badge: 'MOST POPULAR',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      carriers: 'FedEx Ground, USPS Priority, UPS Ground',
    },
    {
      name: 'Expedited 2-Day Air',
      time: '2 Business Days Guaranteed',
      price: '$9.99 Flat Rate',
      priceSub: 'Any package weight under 10 lbs',
      desc: 'Priority air transport with guaranteed 48-hour delivery window across continental United States.',
      badge: 'EXPEDITED',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      carriers: 'UPS 2nd Day Air, FedEx 2Day',
    },
    {
      name: 'Prime Overnight Express',
      time: 'Next Morning (10:30 AM)',
      price: '$14.99 Flat Rate',
      priceSub: 'Order by 2:00 PM CST',
      desc: 'Next morning priority delivery for time-critical orders, tech replacements, and luxury items.',
      badge: 'FASTEST AIR',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      carriers: 'FedEx Priority Overnight, UPS Next Day Air',
    },
    {
      name: 'Same-Day Metro Courier',
      time: 'Today by 8:00 PM',
      price: '$19.99 Metro',
      priceSub: 'Select 40+ US metropolitan areas',
      desc: 'Direct courier dispatch from local vendor hubs for same-day delivery right to your door or office.',
      badge: 'URGENT METRO',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      carriers: 'Vendora Metro Fleet, Local On-Demand Couriers',
    },
  ];

  const shippingFAQs = [
    {
      id: 'ship-faq-1',
      question: 'How does shipping work when I buy from different independent sellers?',
      answer:
        'Because Vendora is a multi-vendor marketplace, items from different independent sellers are dispatched from the individual seller’s warehouse. You will receive separate tracking links for each package. To save you money, Vendora applies an automatic Multi-Seller Consolidation Discount (50% off second and subsequent vendor shipping fees) on combined checkouts.',
    },
    {
      id: 'ship-faq-2',
      question: 'What is the cutoff time for same-day and next-day shipments?',
      answer:
        'Orders placed before 2:00 PM local merchant time are dispatched the very same day. Orders placed after the 2:00 PM cutoff will ship on the following business day.',
    },
    {
      id: 'ship-faq-3',
      question: 'Do you deliver to P.O. Boxes and APO/FPO military addresses?',
      answer:
        'Yes! Standard Ground shipping via the United States Postal Service (USPS) fully supports all residential P.O. Boxes and military APO/FPO/DPO destinations.',
    },
    {
      id: 'ship-faq-4',
      question: 'Are international orders subject to unexpected customs fees or VAT?',
      answer:
        'No. Vendora utilizes DDP (Delivered Duty Paid) technology. All applicable international import tariffs, VAT, and customs duties are calculated clearly at checkout, ensuring the courier delivers directly to your door without requesting additional cash upon delivery.',
    },
    {
      id: 'ship-faq-5',
      question: 'What happens if a package is marked delivered but I cannot find it?',
      answer:
        'Check nearby drop points (porch, building lobby, concierge desk, or neighbors). If not found within 24 hours of the delivery scan, report it via our Claims Desk. Open a dispute from the order and the dispute desk will review the delivery record with you.',
    },
  ];

  return (
    <>
      <PolicyShell
        eyebrow="Policies & Logistics"
        title="Shipping Rates & Policies"
        intro={
          <p>
            How delivery works on a multi-vendor marketplace: per-package dispatch, tracking on every parcel, and the standard delivery window shown at checkout.
          </p>
        }
        action={
          <>
            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
            >
              <Package className="h-4 w-4 text-sun-orange" />
              Track an Order
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <Compass className="h-4 w-4" />
              Help Center
            </Link>
          </>
        }
      >

          {/* ── Interactive Shipping Rates Calculator Widget ─────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5 text-[10px] font-bold text-sun-orange uppercase tracking-wider mb-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Real-Time Shipping Fee &amp; Timeline Estimator
                </div>
                <h2 className="font-outfit text-lg font-black text-slate-900">
                  Estimate Your Delivery Rate &amp; Arrival Window
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Free standard shipping on orders $100+
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Controls Column (7 cols) */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Destination Country</label>
                    <select
                      value={destCountry}
                      onChange={(e) => setDestCountry(e.target.value)}
                      className="native-select w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-sun-orange"
                    >
                      <option value="US">United States (All 50 States)</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="AU">Australia</option>
                      <option value="JP">Japan</option>
                    </select>
                  </div>

                  {/* Order Subtotal */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Order Subtotal: <strong className="text-slate-900">${orderSubtotal}</strong>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="10"
                      value={orderSubtotal}
                      onChange={(e) => setOrderSubtotal(Number(e.target.value))}
                      className="w-full accent-sun-orange mt-2 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>$20</span>
                      <span className="font-bold text-sun-orange">$100 (Free Ground Threshold)</span>
                      <span>$300+</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Weight */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Package Weight</label>
                    <select
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value as any)}
                      className="native-select w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-sun-orange"
                    >
                      <option value="light">Lightweight (&lt; 1 lb) - Accessories &amp; Small Tech</option>
                      <option value="standard">Standard (1 - 5 lbs) - Clothing, Shoes, Audio</option>
                      <option value="heavy">Bulky (5 - 20 lbs) - Monitors, Small Appliances</option>
                      <option value="freight">Heavy / Oversized (20+ lbs)</option>
                    </select>
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Shipping Speed</label>
                    <select
                      value={shippingTier}
                      onChange={(e) => setShippingTier(e.target.value as any)}
                      className="native-select w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-sun-orange"
                    >
                      <option value="ground">Standard Ground (3 - 5 days)</option>
                      <option value="air">Expedited 2-Day Air (48 hours)</option>
                      <option value="overnight">Prime Overnight Express (Next morning)</option>
                      <option value="sameday">Same-Day Metro Courier (By 8 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Estimate Result Card (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-amber-50/70 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sun-orange">
                    Estimated Shipping Cost
                  </span>
                  {calcResult.isFree && (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-2xs">
                      FREE SHIPPING QUALIFIED
                    </span>
                  )}
                </div>

                <div className="font-outfit text-3xl font-black text-slate-900">
                  {calcResult.isFree ? (
                    <span className="text-emerald-700">FREE</span>
                  ) : (
                    <span>${calcResult.rate.toFixed(2)}</span>
                  )}
                </div>

                <div className="space-y-2 border-t border-orange-200/60 pt-3 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Expected Delivery Window:</span>
                    <strong className="text-slate-900">{calcResult.days}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Primary Courier:</span>
                    <strong className="text-slate-900">{calcResult.carrier}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Buyer Protection:</span>
                    <strong className="text-emerald-700 font-bold">Dispute desk on every order</strong>
                  </div>
                </div>

                <Link
                  to="/products"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 py-2.5 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                >
                  <span>Explore Catalog Products</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── 4 Standard Delivery Tiers (Cards Grid) ───────────────── */}
          <div className="space-y-4">
            <div>
              <h3 className="font-outfit text-lg font-black text-slate-900">
                Vendora Delivery Speed Options
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Flat base rates per speed tier, with a stated surcharge for heavy and freight parcels — no fuel or handling surprises on domestic routes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rateTiers.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${tier.badgeColor}`}>
                        {tier.badge}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">{tier.name}</h4>
                    <div className="font-outfit text-2xl font-black text-slate-900">{tier.price}</div>
                    <div className="text-[11px] font-semibold text-sun-orange">{tier.priceSub}</div>

                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                      {tier.desc}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div>
                      Transit Window: <strong className="text-slate-800">{tier.time}</strong>
                    </div>
                    <div>
                      Couriers: <span className="text-slate-600">{tier.carriers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Multi-Vendor Split Shipping Explanation ──────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-sun-orange">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-outfit text-lg font-black text-slate-900">
                  How Multi-Vendor Marketplace Shipments Work
                </h3>
                <p className="text-xs text-slate-500">
                  Understanding package division, independent tracking, and combined shipping discounts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 text-sm">1. Independent Dispatches</div>
                <p className="text-slate-600 leading-relaxed">
                  When you checkout items from multiple verified sellers, each merchant prepares and packages their items separately from their respective fulfillment warehouse.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 text-sm">2. 50% Consolidation Discount</div>
                <p className="text-slate-600 leading-relaxed">
                  We reward multi-item checkouts! Your first vendor package pays standard shipping, and all subsequent merchant packages receive an automatic 50% reduction in shipping fees.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 text-sm">3. Unified Tracking Dashboard</div>
                <p className="text-slate-600 leading-relaxed">
                  Even though your order arrives in separate parcels, you can monitor every milestone under a single order number on your "Your Orders" dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* ── International Shipping & Customs Tariffs ─────────────── */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-white space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-outfit text-lg font-black text-white">
                  Cross-Border &amp; International Delivery (DDP Guaranteed)
                </h3>
                <p className="text-xs text-slate-300">
                  Delivering to over 65 countries worldwide with zero surprise customs fees at your doorstep.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white">Delivered Duty Paid (DDP)</div>
                <p>
                  All customs duties, tariffs, and local VAT are assessed transparently during checkout so you never face clearance fees upon delivery.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white">International Express Air</div>
                <p>
                  Partnership with DHL Express and FedEx International Priority ensures average international transit times of 5 to 9 business days.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white">Full Customs Compliance</div>
                <p>
                  Commercial invoices, HS commodity codes, and customs manifests are automatically synchronized by our logistics engine.
                </p>
              </div>
            </div>
          </div>

          {/* ── FAQs on Shipping ─────────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
            <h3 className="font-outfit text-lg font-black text-slate-900">
              Shipping &amp; Delivery Policies FAQ
            </h3>

            <div className="space-y-3 pt-2">
              {shippingFAQs.map((faq) => {
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

export default ShippingPolicyPage;
