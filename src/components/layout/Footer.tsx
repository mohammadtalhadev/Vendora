import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Headphones,
  Send,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setIsSubscribed(true);
    setTimeout(() => {
      setNewsletterEmail('');
      setIsSubscribed(false);
    }, 4000);
  };

  return (
    <footer className="relative mt-0 overflow-hidden backdrop-blur-2xl bg-white/80 dark:bg-slate-900/85 border-t border-slate-200/70 dark:border-white/10 shadow-[0_-20px_50px_rgba(15,23,42,0.03)] text-slate-700 dark:text-slate-300 font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A]">
      {/* 1. Multi-tone Gradient Top Stripe matching Sign In & Register Glass Panels */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF7A1A] via-[#00B8C8] to-[#FFD43B]" />

      {/* 2. Ethereal Ambient Glowing Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-[#FED7AA]/35 via-[#FFEDD5]/40 to-transparent blur-[110px] dark:from-[#FF7A1A]/10 pointer-events-none" />
        <div className="absolute -bottom-28 -right-20 w-72 h-72 rounded-full bg-gradient-to-bl from-[#CFFAFE]/40 via-[#F1F5F9]/60 to-transparent blur-[100px] dark:from-[#00B8C8]/10 pointer-events-none" />
      </div>



      {/* 4. Newsletter Signup Strip (Homepage Ambient Background) */}
      <div className="relative z-10 border-b border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 backdrop-blur-xl py-8 overflow-hidden">
        {/* Radiant ambient glow orbs (Matching Homepage) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-gradient-to-tr from-[#FED7AA]/65 via-[#FFEDD5]/70 to-[#FED7AA]/40 blur-[90px] dark:from-[#FF7A1A]/15 pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gradient-to-bl from-[#CFFAFE]/70 via-[#F1F5F9]/80 to-[#FFEDD5]/50 blur-[90px] dark:from-[#00B8C8]/15 pointer-events-none" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#FF7A1A]/10 dark:bg-[#FF7A1A]/20 flex items-center justify-center text-[#FF7A1A] border border-[#FF7A1A]/20 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Subscribe to the Vendora Dispatch
                </h3>
                <span className="rounded-full bg-gradient-to-r from-[#FF7A1A] to-[#FFA057] px-2.5 py-0.5 text-[10px] font-outfit font-black text-white uppercase tracking-wider shadow-xs">
                  Get 15% Off
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Receive weekly curated drops, exclusive discount vouchers, and verified merchant highlights.
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
                className="w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-800/90 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FF7A1A] focus:ring-2 focus:ring-orange-500/20 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FF7A1A] hover:bg-[#EA6C13] active:scale-[0.98] px-5 py-2.5 text-xs font-outfit font-bold text-white shadow-[0_4px_16px_rgba(255,122,26,0.3)] transition-all cursor-pointer"
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  <span>Subscribed!</span>
                </>
              ) : (
                <>
                  <span>Subscribe</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 5. Main 5-Column Navigation */}
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: Let Us Help You */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Let Us Help You</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/orders" className="hover:text-[#FF7A1A] transition-colors">Your Orders</Link></li>
              <li><Link to="/returns" className="hover:text-[#FF7A1A] transition-colors">Returns &amp; Replacements</Link></li>
              <li><Link to="/shipping" className="hover:text-[#FF7A1A] transition-colors">Shipping Rates &amp; Policies</Link></li>
              <li><Link to="/refund-policy" className="hover:text-[#FF7A1A] transition-colors">Refund &amp; Return Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-[#FF7A1A] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#FF7A1A] transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/faq" className="hover:text-[#FF7A1A] transition-colors">Help Center &amp; FAQ</Link></li>
            </ul>
          </div>

          {/* Column 2: Make Money with Us */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Make Money with Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/sell" className="hover:text-[#FF7A1A] transition-colors">Sell on Vendora</Link></li>
              <li><Link to="/affiliates" className="hover:text-[#FF7A1A] transition-colors">Become an Affiliate</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-[#FF7A1A] transition-colors">Open Brand Store</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-[#FF7A1A] transition-colors">Vendor Guidelines &amp; Fees</Link></li>
            </ul>
          </div>

          {/* Column 3: Get to Know Us */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Get to Know Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li><Link to="/about" className="hover:text-[#FF7A1A] transition-colors">About Vendora</Link></li>
              <li><Link to="/careers" className="hover:text-[#FF7A1A] transition-colors">Careers &amp; Opportunities</Link></li>
              <li><Link to="/brands" className="hover:text-[#FF7A1A] transition-colors">Official Brand Stores</Link></li>
              <li><Link to="/deals" className="hover:text-[#FF7A1A] transition-colors">Flash Deals &amp; Discounts</Link></li>
              <li><Link to="/blog" className="hover:text-[#FF7A1A] transition-colors">The Vendora Journal</Link></li>
            </ul>
          </div>

          {/* Column 4: Customer Support & Live Contacts */}
          <div>
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Customer Support</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#FF7A1A] shrink-0" />
                <a href="tel:+923005558363" className="font-bold text-[#FF7A1A] hover:underline">
                  +92 (300) 555-VENDORA
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@vendora.market"
                  className="flex items-center gap-2 hover:text-[#FF7A1A] transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-[#FF7A1A] shrink-0" />
                  <span>support@vendora.market</span>
                </a>
              </li>
              <li>
                <Link
                  to="/disputes"
                  className="flex items-center gap-2 hover:text-[#FF7A1A] transition-colors"
                >
                  <Headphones className="h-3.5 w-3.5 text-[#FF7A1A] shrink-0" />
                  <span>Disputes &amp; Claims Desk</span>
                </Link>
              </li>
              <li className="pt-1.5">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Chat Channels:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://t.me"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white transition-all shadow-2xs"
                      title="Telegram Support"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://whatsapp.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white transition-all shadow-2xs"
                      title="WhatsApp Support"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </li>
              <li className="pt-1">
                <Link to="/faq" className="hover:text-[#FF7A1A] transition-colors">
                  Knowledge Base &amp; FAQ
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-[#FF7A1A] transition-colors">
                  Track Your Package
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#FF7A1A] transition-colors">
                  Contact Support Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Social Media */}
          <div className="col-span-2 md:col-span-1">
            <h5 className="font-outfit text-sm font-bold tracking-tight text-slate-900 dark:text-white">Follow Vendora</h5>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Product drops, merchant spotlights, and community news on our official channels.
            </p>

            {/* Social Media Vector Icons */}
            <div className="mt-5">
              <div className="font-outfit text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">Connect With Us</div>
              <div className="flex items-center gap-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white shadow-2xs transition-all hover:scale-110"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white shadow-2xs transition-all hover:scale-110"
                  aria-label="X (formerly Twitter)"
                  title="X (Twitter)"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white shadow-2xs transition-all hover:scale-110"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-[#FF7A1A] text-slate-700 hover:text-white dark:bg-white/10 dark:text-white shadow-2xs transition-all hover:scale-110"
                  aria-label="YouTube"
                  title="YouTube"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>
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
            <Link to="/privacy" className="hover:text-[#FF7A1A] transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#FF7A1A] transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-[#FF7A1A] transition-colors">Buyer Protection</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
