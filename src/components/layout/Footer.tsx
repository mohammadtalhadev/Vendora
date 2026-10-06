import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Headphones,
  Send,
  MessageSquare,
  MessageCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 bg-[#0066FF] text-white">
      {/* 1. Value Pillars Strip (Subtle translucent white bar) */}
      <div className="border-b border-white/15 bg-white/5 py-7">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4">
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
              <p className="text-xs text-blue-100">Simulated Card & Cash on Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Buyer Protection</h4>
              <p className="text-xs text-blue-100">Dispute triage & return lifecycle</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Dedicated Support</h4>
              <p className="text-xs text-blue-100">Integrated agent dispute center</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 5-Column Navigation (Matching Image 5) */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: Let Us Help You */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Let Us Help You</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/orders" className="hover:text-white transition-colors">Your Orders</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Returns & Replacements</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Shipping Rates & Policies</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Refund and Returns Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
              <li><button type="button" className="text-left hover:text-white transition-colors">Cookie Settings</button></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>

          {/* Column 2: Make Money with Us */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Make Money with Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Sell on Vendora</Link></li>
              <li><Link to="/vendor" className="font-bold text-orange-200 hover:text-white transition-colors">Seller Portal (/vendor)</Link></li>
              <li><Link to="/admin" className="font-bold text-emerald-300 hover:text-white transition-colors">Admin Governance (/admin)</Link></li>
              <li><Link to="/products?type=digital" className="hover:text-white transition-colors">Sell Your Apps</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Advertise Your Products</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-white transition-colors">Become a Vendora Vendor</Link></li>
            </ul>
          </div>

          {/* Column 3: Get to Know Us */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">Get to Know Us</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/about" className="hover:text-white transition-colors">Careers for Vendora</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Investor Relations</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Vendora Devices</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Customer Reviews</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Social Responsibility</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Store Locations</Link></li>
            </ul>
          </div>

          {/* Column 4: For Buyers */}
          <div>
            <h5 className="text-sm font-bold tracking-tight text-white">For Buyers</h5>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/90 font-medium">
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">My Account</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
              <li><Link to="/wishlist" className="hover:text-white transition-colors">Saved Wishlist</Link></li>
            </ul>
          </div>

          {/* Column 5: Download & Socials */}
          <div className="col-span-2 md:col-span-1">
            <h5 className="text-sm font-bold tracking-tight text-white">Download</h5>
            <p className="mt-3 text-xs leading-relaxed text-blue-100">
              You can download our mobile application from app stores
            </p>

            {/* App Badges */}
            <div className="mt-4 space-y-2.5">
              {/* Google Play */}
              <a
                href="#google-play"
                className="flex items-center gap-3 rounded-xl bg-slate-950 px-3.5 py-2 text-white shadow-md transition-transform hover:scale-[1.02]"
              >
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.6 1.4c-.3.3-.5.8-.5 1.4v18.4c0 .6.2 1.1.5 1.4l9.6-9.6L3.6 1.4z" fill="#4285F4" />
                  <path d="M16.8 9.6L13.2 6 3.6 1.4c.4-.2.8-.2 1.2 0l12 8.2z" fill="#EA4335" />
                  <path d="M13.2 18l3.6-3.6-12 8.2c-.4.2-.8.2-1.2 0l9.6-4.6z" fill="#34A853" />
                  <path d="M20.8 11.2l-4 2.3-3.6-3.5 3.6-3.6 4 2.3c.7.4.7 2.1 0 2.5z" fill="#FBBC05" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider text-slate-300">Download App Get</div>
                  <div className="text-xs font-bold leading-tight text-white">10% Discount</div>
                </div>
              </a>

              {/* App Store */}
              <a
                href="#app-store"
                className="flex items-center gap-3 rounded-xl bg-slate-950 px-3.5 py-2 text-white shadow-md transition-transform hover:scale-[1.02]"
              >
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.1-1.92.98-3.04-.95.04-2.1.63-2.78 1.43-.6.69-1.12 1.81-.98 2.9 1.06.08 2.13-.53 2.78-1.29" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider text-slate-300">Download App Get</div>
                  <div className="text-xs font-bold leading-tight text-white">10% Discount</div>
                </div>
              </a>
            </div>

            {/* Social Media Circular Buttons */}
            <div className="mt-5 flex items-center gap-2.5">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0066FF] shadow-sm transition-transform hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0066FF] shadow-sm transition-transform hover:scale-110"
                aria-label="Instagram"
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0066FF] shadow-sm transition-transform hover:scale-110"
                aria-label="YouTube"
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0066FF] shadow-sm transition-transform hover:scale-110"
                aria-label="Pinterest"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.268-.399.167-1.49-.693-2.42-2.87-2.42-4.62 0-3.774 2.743-7.239 7.901-7.239 4.146 0 7.37 2.955 7.37 6.902 0 4.12-2.597 7.437-6.202 7.437-1.211 0-2.349-.629-2.739-1.374l-.746 2.846c-.27 1.033-1.001 2.327-1.492 3.123 1.12.345 2.308.532 3.539.532 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Footer Contact Channels Strip (Matching Image 5) */}
      <div className="border-t border-white/15 bg-black/10 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-4 text-xs font-medium text-white sm:gap-10 sm:px-6">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-200" />
            <span className="font-bold tracking-wide">+375 25 522 18 48</span>
          </div>

          <a href="mailto:support@vendora.internal" className="flex items-center gap-2 hover:text-blue-100 transition-colors">
            <Mail className="h-4 w-4 text-blue-200" />
            <span>Send Mail</span>
          </a>

          <Link to="/support" className="flex items-center gap-2 hover:text-blue-100 transition-colors">
            <Headphones className="h-4 w-4 text-blue-200" />
            <span>Write to us</span>
          </Link>

          <a href="https://t.me" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-blue-100 transition-colors">
            <Send className="h-4 w-4 text-blue-200" />
            <span>Telegram</span>
          </a>

          <a href="#viber" className="flex items-center gap-2 hover:text-blue-100 transition-colors">
            <MessageSquare className="h-4 w-4 text-blue-200" />
            <span>Viber</span>
          </a>

          <a href="https://whatsapp.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-blue-100 transition-colors">
            <MessageCircle className="h-4 w-4 text-blue-200" />
            <span>Whatsapp</span>
          </a>
        </div>
      </div>

      {/* 4. Bottom Copyright Bar (Matching Image 5) */}
      <div className="border-t border-white/10 py-4 text-center text-xs text-blue-100/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p>
            Copyright 2026 © Vendora Multi-Vendor Marketplace. All rights reserved. Powered by React 19 & MSW Engine.
          </p>
        </div>
      </div>
    </footer>
  );
};
