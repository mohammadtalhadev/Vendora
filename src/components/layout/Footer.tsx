import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Headphones,
  Send,
  MessageCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
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
    <footer className="mt-20 bg-[#0071DC] text-white">
      {/* 1. Value Pillars Strip (Translucent white bar) */}
      <div className="border-b border-white/15 bg-white/5 py-7">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-6 px-4 sm:px-6 lg:px-8 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Express Delivery</h4>
              <p className="text-xs text-blue-100">Free shipping on orders over $100</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Safe & Secure</h4>
              <p className="text-xs text-blue-100">Encrypted payments & buyer escrow</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Buyer Protection</h4>
              <p className="text-xs text-blue-100">Dispute triage & 30-day refund guarantee</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Dedicated Support</h4>
              <p className="text-xs text-blue-100">24/7 expert customer service</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Newsletter Signup Strip */}
      <div className="border-b border-white/15 bg-black/10 py-8 backdrop-blur-xs">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md shadow-xs">
              <Mail className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">Subscribe to our newsletter</h3>
                <span className="rounded-full bg-[#FFC220] px-2.5 py-0.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wide">
                  Get 15% Off
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-1">
                Receive weekly drops, exclusive discount vouchers, and verified merchant highlights.
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
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs text-white placeholder-blue-200/70 backdrop-blur-md outline-hidden focus:border-white focus:bg-white/20 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FFC220] hover:bg-[#eab308] px-5 py-2.5 text-xs font-extrabold text-slate-900 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800" />
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

      {/* 3. Main 5-Column Navigation */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: Let Us Help You */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Let Us Help You</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/orders" className="hover:text-white transition-colors">Your Orders</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Returns &amp; Replacements</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Shipping Rates &amp; Policies</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Refund &amp; Return Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Help Center &amp; FAQ</Link></li>
            </ul>
          </div>

          {/* Column 2: Make Money with Us (Clean customer/vendor onboarding links - NO internal admin links) */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Make Money with Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Sell on Vendora</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Advertise Your Products</Link></li>
              <li><Link to="/products?type=digital" className="hover:text-white transition-colors">Sell Digital Downloads</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Fulfillment by Vendora</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Vendor Guidelines &amp; Fees</Link></li>
            </ul>
          </div>

          {/* Column 3: Get to Know Us */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Get to Know Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/about" className="hover:text-white transition-colors">About Vendora</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Careers &amp; Opportunities</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Investor Relations</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Vendora Devices</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Customer Reviews</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Sustainability &amp; Ethics</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Store Locations</Link></li>
            </ul>
          </div>

          {/* Column 4: Customer Support & Live Contacts */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Customer Support</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                <a href="tel:+18005558363" className="font-bold text-white hover:underline">
                  +1 (800) 555-VENDORA
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@vendora.internal"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                  <span>support@vendora.internal</span>
                </a>
              </li>
              <li>
                <Link
                  to="/disputes"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Headphones className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                  <span>Disputes &amp; Claims Desk</span>
                </Link>
              </li>
              <li className="pt-1.5">
                <div className="flex items-center gap-2 text-[11px] text-blue-200">
                  <span>Chat Channels:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://t.me"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-all shadow-2xs"
                      title="Telegram Support"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://whatsapp.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-all shadow-2xs"
                      title="WhatsApp Support"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </li>
              <li className="pt-1">
                <Link to="/faq" className="hover:text-white transition-colors">
                  Knowledge Base &amp; FAQ
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white transition-colors">
                  Track Your Package
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: App Download & Social Media */}
          <div className="col-span-2 md:col-span-1">
            <h5 className="text-sm font-bold tracking-tight text-white">Experience Vendora App</h5>
            <p className="mt-2 text-xs leading-relaxed text-blue-100">
              Get 10% off your first mobile order with the Vendora App.
            </p>

            {/* Authentic App Store & Google Play Badges */}
            <div className="mt-4 space-y-2.5">
              {/* Apple App Store Badge */}
              <a
                href="#app-store"
                className="group flex items-center justify-between rounded-xl bg-slate-950 px-3.5 py-2.5 text-white border border-white/20 shadow-lg transition-transform hover:scale-[1.02] hover:border-white/40"
              >
                <div className="flex items-center gap-3">
                  {/* Apple SVG Logo */}
                  <svg className="h-6 w-6 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.1-1.92.98-3.04-.95.04-2.1.63-2.78 1.43-.6.69-1.12 1.81-.98 2.9 1.06.08 2.13-.53 2.78-1.29" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 leading-tight">
                      Download on the
                    </div>
                    <div className="text-xs font-extrabold tracking-tight text-white leading-tight">
                      App Store
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                  10% OFF
                </span>
              </a>

              {/* Google Play Store Badge */}
              <a
                href="#google-play"
                className="group flex items-center justify-between rounded-xl bg-slate-950 px-3.5 py-2.5 text-white border border-white/20 shadow-lg transition-transform hover:scale-[1.02] hover:border-white/40"
              >
                <div className="flex items-center gap-3">
                  {/* Google Play 4-Color SVG Logo */}
                  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                    <path d="M3.6 1.4c-.3.3-.5.8-.5 1.4v18.4c0 .6.2 1.1.5 1.4l9.6-9.6L3.6 1.4z" fill="#4285F4" />
                    <path d="M16.8 9.6L13.2 6 3.6 1.4c.4-.2.8-.2 1.2 0l12 8.2z" fill="#EA4335" />
                    <path d="M13.2 18l3.6-3.6-12 8.2c-.4.2-.8.2-1.2 0l9.6-4.6z" fill="#34A853" />
                    <path d="M20.8 11.2l-4 2.3-3.6-3.5 3.6-3.6 4 2.3c.7.4.7 2.1 0 2.5z" fill="#FBBC05" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 leading-tight">
                      GET IT ON
                    </div>
                    <div className="text-xs font-extrabold tracking-tight text-white leading-tight">
                      Google Play
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                  10% OFF
                </span>
              </a>
            </div>

            {/* Social Media Vector Icons (High Contrast & Sharp Render) */}
            <div className="mt-5">
              <div className="text-[11px] font-bold text-blue-100/90 mb-2">Connect With Us</div>
              <div className="flex items-center gap-2">
                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071DC] shadow-sm transition-all hover:bg-yellow-300 hover:text-slate-900 hover:scale-110"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* X / Twitter */}
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071DC] shadow-sm transition-all hover:bg-yellow-300 hover:text-slate-900 hover:scale-110"
                  aria-label="X (formerly Twitter)"
                  title="X (Twitter)"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071DC] shadow-sm transition-all hover:bg-yellow-300 hover:text-slate-900 hover:scale-110"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071DC] shadow-sm transition-all hover:bg-yellow-300 hover:text-slate-900 hover:scale-110"
                  aria-label="YouTube"
                  title="YouTube"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>

                {/* Pinterest */}
                <a
                  href="https://pinterest.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071DC] shadow-sm transition-all hover:bg-yellow-300 hover:text-slate-900 hover:scale-110"
                  aria-label="Pinterest"
                  title="Pinterest"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.268-.399.167-1.49-.693-2.42-2.87-2.42-4.62 0-3.774 2.743-7.239 7.901-7.239 4.146 0 7.37 2.955 7.37 6.902 0 4.12-2.597 7.437-6.202 7.437-1.211 0-2.349-.629-2.739-1.374l-.746 2.846c-.27 1.033-1.001 2.327-1.492 3.123 1.12.345 2.308.532 3.539.532 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Payment Badges & Trust Strip */}
      <div className="border-t border-white/15 bg-white/5 py-4">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="text-xs font-semibold text-blue-100/90">
            Accepted Payment Methods &amp; Secured Gateways:
          </div>

          {/* Crisp Vector Payment Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Visa */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1 shadow-xs transition-transform hover:scale-105"
              title="Visa"
            >
              <svg className="h-3.5 w-auto" viewBox="0 0 36 12" fill="none">
                <path
                  d="M14.07 0.35L9.22 11.65H6.05L3.69 2.79C3.55 2.23 3.4 2.03 2.97 1.8C2.26 1.42 1.06 1.07 0 0.84L0.07 0.35H5.16C5.82 0.35 6.41 0.79 6.56 1.57L7.81 8.21L11.59 0.35H14.07ZM26.4 7.89C26.42 4.88 22.25 4.72 22.28 3.37C22.29 2.96 22.68 2.52 23.57 2.41C24.01 2.35 25.24 2.3 26.62 2.94L27.16 0.44C26.42 0.17 25.47 0 24.28 0C21.34 0 19.28 1.56 19.26 3.79C19.23 5.44 20.74 6.36 21.87 6.91C23.03 7.48 23.42 7.84 23.41 8.35C23.4 9.13 22.48 9.48 21.63 9.49C20.12 9.51 19.23 9.08 18.53 8.76L17.97 11.38C18.73 11.73 20.13 12 21.57 12.01C24.69 12.01 26.39 10.47 26.4 7.89ZM34.2 11.65H36.36L34.47 0.35H32.48C31.98 0.35 31.57 0.64 31.39 1.07L26.83 11.65H29.83L30.43 10.02H34.09L34.2 11.65ZM31.25 7.8L32.74 3.72L33.6 7.8H31.25ZM18.79 0.35L16.42 11.65H13.56L15.93 0.35H18.79Z"
                  fill="#1A1F71"
                />
              </svg>
            </div>

            {/* Mastercard */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1 shadow-xs transition-transform hover:scale-105"
              title="Mastercard"
            >
              <svg className="h-4 w-auto" viewBox="0 0 32 20" fill="none">
                <circle cx="11" cy="10" r="9" fill="#EB001B" />
                <circle cx="21" cy="10" r="9" fill="#F79E1B" fillOpacity="0.9" />
                <path
                  d="M16 3.7A8.99 8.99 0 0 1 19.3 10A8.99 8.99 0 0 1 16 16.3A8.99 8.99 0 0 1 12.7 10A8.99 8.99 0 0 1 16 3.7Z"
                  fill="#FF5F00"
                />
              </svg>
            </div>

            {/* American Express */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-[#006FCF] px-1 text-[8px] font-black tracking-tighter text-white shadow-xs transition-transform hover:scale-105"
              title="American Express"
            >
              AMEX
            </div>

            {/* PayPal */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1 shadow-xs transition-transform hover:scale-105"
              title="PayPal"
            >
              <svg className="h-3.5 w-auto" viewBox="0 0 28 16" fill="none">
                <path
                  d="M7.8 1.5H3.5C3.2 1.5 2.9 1.8 2.8 2.1L0.8 14.2C0.8 14.4 0.9 14.6 1.1 14.6H3.3C3.6 14.6 3.8 14.4 3.9 14.1L4.6 9.7C4.6 9.4 4.9 9.2 5.2 9.2H6.6C10 9.2 12.2 7.6 12.7 4.4C13 2.8 11.9 1.5 7.8 1.5Z"
                  fill="#003087"
                />
                <path
                  d="M16.8 4.5H12.5C12.2 4.5 11.9 4.8 11.8 5.1L10.3 14.2C10.3 14.4 10.4 14.6 10.6 14.6H12.8C13.1 14.6 13.3 14.4 13.4 14.1L14.1 9.7C14.1 9.4 14.4 9.2 14.7 9.2H16.1C19.5 9.2 21.7 7.6 22.2 4.4C22.5 2.8 21.4 1.5 17.3 1.5H16.8V4.5Z"
                  fill="#0079C1"
                />
              </svg>
            </div>

            {/* Apple Pay */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-slate-900 px-1 text-white shadow-xs transition-transform hover:scale-105"
              title="Apple Pay"
            >
              <svg className="h-3.5 w-auto fill-current" viewBox="0 0 24 16">
                <path d="M4.5 6.8c-.3.4-.8.7-1.3.6-.1-.5.2-1.1.5-1.4.3-.4.8-.6 1.3-.6.1.5-.2 1-.5 1.4M6.2 9.9c-.3.5-.6.9-1.1.9-.4 0-.6-.3-1.1-.3-.5 0-.7.3-1.1.3-.5 0-.8-.5-1.2-1-.7-1-1.3-2.6-.5-3.9.4-.6 1.1-1 1.7-1 .5 0 .8.3 1.2.3.3 0 .7-.3 1.2-.3.6 0 1.2.3 1.6.8-.5.3-.8.8-.8 1.5 0 .9.8 1.4.8 1.4-.2.6-.4 1-.7 1.4" />
                <text x="8.5" y="10.8" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">
                  Pay
                </text>
              </svg>
            </div>

            {/* Google Pay */}
            <div
              className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1 shadow-xs transition-transform hover:scale-105"
              title="Google Pay"
            >
              <span className="text-[10px] font-bold tracking-tight text-slate-700">
                <span className="text-[#4285F4]">G</span>Pay
              </span>
            </div>

            {/* Cash on Delivery (COD) */}
            <div
              className="flex h-7 items-center justify-center rounded-md bg-emerald-600 px-2 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-xs transition-transform hover:scale-105"
              title="Cash on Delivery Available"
            >
              COD Available
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Copyright & Safety Notice */}
      <div className="border-t border-white/10 bg-black/15 py-4 text-center text-xs text-blue-100/80">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p>
            Copyright 2026 © Vendora Multi-Vendor Marketplace. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-blue-200/90 font-medium">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/support" className="hover:text-white transition-colors">Safety Center</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
