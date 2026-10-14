import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Headphones,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { subscribeToNewsletter } from '../../features/forms/api/public-forms';

type NewsletterState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'subscribed' }
  | { kind: 'already' }
  | { kind: 'error'; message: string };

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<NewsletterState>({ kind: 'idle' });

  // The signup is stored in newsletter_subscribers for real — a success
  // state is only shown after the row lands, and a repeat address gets an
  // honest "already subscribed" instead of a second fake success.
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || newsletterState.kind === 'sending') return;
    setNewsletterState({ kind: 'sending' });
    try {
      const result = await subscribeToNewsletter(newsletterEmail);
      setNewsletterState({ kind: result === 'subscribed' ? 'subscribed' : 'already' });
      if (result === 'subscribed') setNewsletterEmail('');
    } catch (err) {
      setNewsletterState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not subscribe you right now.',
      });
    }
  };

  const isSubscribed = newsletterState.kind === 'subscribed';

  return (
    <footer className="relative mt-0 overflow-hidden backdrop-blur-2xl bg-white/80 dark:bg-slate-900/85 border-t border-slate-200/70 dark:border-white/10 shadow-[0_-20px_50px_rgba(15,23,42,0.03)] text-slate-700 dark:text-slate-300 font-sans selection:bg-sun-orange/20 selection:text-sun-orange">
      {/* Ethereal Ambient Glowing Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-sun-orange-200/35 via-sun-orange-100/40 to-transparent blur-[110px] dark:from-sun-orange/10 pointer-events-none" />
        <div className="absolute -bottom-28 -right-20 w-72 h-72 rounded-full bg-gradient-to-bl from-aqua-100/40 via-[#F1F5F9]/60 to-transparent blur-[100px] dark:from-aqua/10 pointer-events-none" />
      </div>



      {/* 4. Newsletter Signup Strip (Homepage Ambient Background) */}
      <div className="relative z-10 border-b border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 backdrop-blur-xl py-8 overflow-hidden">
        {/* Radiant ambient glow orbs (Matching Homepage) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-gradient-to-tr from-sun-orange-200/65 via-sun-orange-100/70 to-sun-orange-200/40 blur-[90px] dark:from-sun-orange/15 pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[90px] dark:from-aqua/15 pointer-events-none" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-sun-orange/10 dark:bg-sun-orange/20 flex items-center justify-center text-sun-orange border border-sun-orange/20 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Subscribe to the Vendora Dispatch
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Receive weekly deals, exclusive discount vouchers, and new product highlights.
              </p>
            </div>
          </div>

          {/* Subscription Form */}
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex w-full max-w-md items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="email"
                required
                aria-label="Email address for the Vendora Dispatch newsletter"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-800/90 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-sun-orange focus:ring-2 focus:ring-orange-500/20 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={newsletterState.kind === 'sending'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sun-orange hover:bg-sun-orange-600 active:scale-[0.98] px-5 py-2.5 text-xs font-outfit font-bold text-white shadow-[0_4px_16px_color-mix(in_srgb,var(--color-sun-orange)_30%,transparent)] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  <span>Subscribed!</span>
                </>
              ) : (
                <>
                  <span>{newsletterState.kind === 'sending' ? 'Subscribing…' : 'Subscribe'}</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
          {newsletterState.kind === 'already' && (
            <p role="status" className="w-full text-center text-xs font-semibold text-slate-600 dark:text-slate-300 lg:text-right">
              This email is already subscribed to the Vendora Dispatch.
            </p>
          )}
          {newsletterState.kind === 'error' && (
            <p role="alert" className="w-full text-center text-xs font-semibold text-rose-600 lg:text-right">
              {newsletterState.message}
            </p>
          )}
        </div>
      </div>

      {/* 5. Main 4-Column Navigation */}
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
          {/* Column 1: Let Us Help You */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Let Us Help You</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/orders" className="hover:text-sun-orange transition-colors">Your Orders</Link></li>
              <li><Link to="/returns" className="hover:text-sun-orange transition-colors">Returns &amp; Replacements</Link></li>
              <li><Link to="/shipping" className="hover:text-sun-orange transition-colors">Shipping Rates &amp; Policies</Link></li>
              <li><Link to="/refund-policy" className="hover:text-sun-orange transition-colors">Refund &amp; Return Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-sun-orange transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-sun-orange transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-sun-orange transition-colors">Cookie Policy</Link></li>
              <li><Link to="/faq" className="hover:text-sun-orange transition-colors">Help Center &amp; FAQ</Link></li>
            </ul>
          </div>

          {/* Column 2: Make Money with Us */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Make Money with Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/become-a-seller" className="hover:text-sun-orange transition-colors">Sell on Vendora</Link></li>
              <li><Link to="/affiliates" className="hover:text-sun-orange transition-colors">Become an Affiliate</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-sun-orange transition-colors">Open Brand Store</Link></li>
              <li><Link to="/seller-fees" className="hover:text-sun-orange transition-colors">Seller Fees</Link></li>
              <li><Link to="/seller-policy" className="hover:text-sun-orange transition-colors">Seller Policy</Link></li>
            </ul>
          </div>

          {/* Column 3: Get to Know Us */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Get to Know Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/about" className="hover:text-sun-orange transition-colors">About Vendora</Link></li>
              <li><Link to="/careers" className="hover:text-sun-orange transition-colors">Careers &amp; Opportunities</Link></li>
              <li><Link to="/brands" className="hover:text-sun-orange transition-colors">Official Brand Stores</Link></li>
              <li><Link to="/categories" className="hover:text-sun-orange transition-colors">All Categories</Link></li>
              <li><Link to="/new-arrivals" className="hover:text-sun-orange transition-colors">New Arrivals</Link></li>
              <li><Link to="/coupons" className="hover:text-sun-orange transition-colors">Coupon Centre</Link></li>
              <li><Link to="/deals" className="hover:text-sun-orange transition-colors">Flash Deals &amp; Discounts</Link></li>
              <li><Link to="/blog" className="hover:text-sun-orange transition-colors">The Vendora Journal</Link></li>
            </ul>
          </div>

          {/* Column 4: Customer Support & Live Contacts */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Customer Support</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-sun-orange shrink-0" />
                <a href="tel:+923005558363" className="font-bold text-sun-orange hover:underline">
                  +92 300 555 8363
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@vendora.market"
                  className="flex items-center gap-2 hover:text-sun-orange transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-sun-orange shrink-0" />
                  <span>support@vendora.market</span>
                </a>
              </li>
              <li>
                <Link
                  to="/disputes"
                  className="flex items-center gap-2 hover:text-sun-orange transition-colors"
                >
                  <Headphones className="h-3.5 w-3.5 text-sun-orange shrink-0" />
                  <span>Disputes &amp; Claims Desk</span>
                </Link>
              </li>
              <li className="pt-1">
                <Link to="/faq" className="hover:text-sun-orange transition-colors">
                  Knowledge Base &amp; FAQ
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-sun-orange transition-colors">
                  Track Your Package
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-sun-orange transition-colors">
                  Contact Support Desk
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* 6. Bottom Copyright Strip */}
      <div className="relative z-10 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/70 py-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="font-outfit font-extrabold text-slate-900 dark:text-white">Vendora</span>
            <span>•</span>
            <p>
              Copyright 2026 © Vendora Multi-Vendor Marketplace. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <Link to="/privacy" className="hover:text-sun-orange transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-sun-orange transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-sun-orange transition-colors">Buyer Protection</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
