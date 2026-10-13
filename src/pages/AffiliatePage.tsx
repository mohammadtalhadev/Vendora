import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Store, ShoppingBag, Mail } from 'lucide-react';

/**
 * Creator & Affiliate Program — honest placeholder.
 *
 * This page used to present a fully fictional program: invented payout
 * totals, a fake live earnings dashboard, invented commission rates and
 * testimonials, and an application form whose only effect was a success
 * toast — no affiliate backend exists anywhere in the schema
 * (zero matches for "affiliate" in supabase/migrations or the generated
 * database types), so every one of those claims was fabricated.
 *
 * Until a real program exists, this page says exactly that: no rates, no
 * stats, no testimonials, no estimator, no application form and no
 * submission promise. The routes (/affiliates, /creator-program) and the
 * footer link keep working; when a program launches, its real terms
 * belong here.
 */
export const AffiliatePage: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-[#EA6C13] ring-1 ring-orange-200">
        <Clock className="h-3.5 w-3.5" />
        <span>Creator &amp; Affiliate Program</span>
      </div>

      <h1 className="font-outfit mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
        This program hasn&apos;t launched yet
      </h1>

      <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base">
        <p>
          Vendora is not running an affiliate or creator program right now, and
          applications are not open. There are currently no commission rates,
          payout schedules, or creator earnings on Vendora — so this page
          quotes none.
        </p>
        <p>
          When a program does launch, its real terms will be published here
          first: the actual rates, how referrals are tracked, and how and when
          payouts are made — before any application opens.
        </p>
        <p>
          This page previously showed sample earnings figures and an
          application form. Those numbers were illustrative placeholders, not
          a live program, and the form did not create an account. Both have
          been removed rather than presented as real.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/sell"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
        >
          <Store className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">Sell on Vendora</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Selling is open today — open a real store and list products now.
          </p>
        </Link>
        <Link
          to="/products"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
        >
          <ShoppingBag className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">Browse the catalogue</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Shop the live marketplace while the creator program is built.
          </p>
        </Link>
        <Link
          to="/contact"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
        >
          <Mail className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">Ask a question</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Partnership questions are welcome through the contact page.
          </p>
        </Link>
      </div>
    </div>
  );
};
