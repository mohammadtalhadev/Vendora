import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';

const EXPECTATIONS = [
  {
    icon: Zap,
    tint: 'bg-[#FFF7ED] text-[#EA6C13] ring-[#FFEDD5]',
    title: 'Faster shopping',
    text: 'A streamlined storefront that opens instantly, with your cart, wishlist and addresses right where you left them.',
  },
  {
    icon: BellRing,
    tint: 'bg-[#ECFEFF] text-[#0891A6] ring-[#CFFAFE]',
    title: 'Live order updates',
    text: 'Follow every order from placement to your doorstep, and hear about it the moment anything changes.',
  },
  {
    icon: ShieldCheck,
    tint: 'bg-[#FFF7ED] text-[#EA6C13] ring-[#FFEDD5]',
    title: 'Secure by design',
    text: 'The same protected, escrow-backed checkout you already trust on the web — now in your pocket.',
  },
];

/**
 * App Coming Soon (/app-coming-soon) — the destination of the home page app
 * promo banner's Start Shopping button (Batch 123). Vendora has no native app
 * yet, so this page says exactly that, professionally: what the app will do,
 * and the honest alternative that already works today (the mobile browser).
 * No store badges, no release date and no notify signup — nothing here is
 * promised that the product cannot already stand behind.
 */
export const AppComingSoonPage: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#ECFEFF] px-4 py-1.5 font-outfit text-xs font-bold uppercase tracking-[0.14em] text-[#0891A6] ring-1 ring-[#CFFAFE]">
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          Coming Soon
        </span>

        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(160deg,#FF8A2A,#F1601E)] shadow-[0_18px_35px_rgba(241,96,30,0.35)]">
          <Smartphone className="h-10 w-10 text-white" aria-hidden="true" />
        </div>

        <h1 className="font-outfit mt-8 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
          The Vendora App is <span className="text-[#F1601E]">on its way</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#64748B] sm:text-lg">
          We are building a faster, more personal way to shop Vendora — one app for browsing,
          secure checkout and live order tracking, designed around the way you already shop with
          us. The finishing touches are under way, and the app will be available right here the
          moment it is ready.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {EXPECTATIONS.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] bg-white p-6 text-left shadow-sm ring-1 ring-black/5"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${item.tint}`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="font-outfit mt-4 text-lg font-bold text-[#0F172A]">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[28px] bg-white p-7 text-center shadow-sm ring-1 ring-black/5 sm:p-10">
        <h2 className="font-outfit text-2xl font-bold text-[#0F172A]">
          Until then, Vendora already works beautifully in your browser
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base">
          Every product, every order and live delivery tracking are available right now on the
          mobile web — no download, no install, nothing to wait for. Pick up right where you left
          off.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="orange-cta" size="lg">
            <Link to="/products">
              Start Shopping
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/track-order">Track Your Order</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-[#94A3B8]">
          No release date to promise — we would rather launch it right than launch it early.
        </p>
      </div>
    </div>
  );
};
