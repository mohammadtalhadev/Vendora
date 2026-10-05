import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Headphones, RotateCcw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-[#0F172A] text-slate-300">
      {/* 1. Value Pillars Strip */}
      <div className="border-b border-slate-800/80 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-[#FF7A1A]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Express Delivery</h4>
              <p className="text-xs text-slate-400">Free shipping on orders over $100</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-[#00B8C8]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Safe & Secure</h4>
              <p className="text-xs text-slate-400">Simulated Card & Cash on Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-[#FF4D6D]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Buyer Protection</h4>
              <p className="text-xs text-slate-400">Dispute triage & return lifecycle</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-[#FFD43B]">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Dedicated Support</h4>
              <p className="text-xs text-slate-400">Integrated agent dispute center</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Links */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
          {/* Brand & Newsletter */}
          <div className="md:col-span-2">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Vendora<span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A] ml-0.5" />
            </span>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-slate-400">
              The modern multi-vendor marketplace frontend demonstrating clean React architecture,
              server state separation, split-order lifecycles, and role-based access control.
            </p>

            <div className="mt-5">
              <span className="text-xs font-semibold text-white">Subscribe for Exclusive Deals</span>
              <div className="mt-2 flex max-w-sm items-center rounded-full border border-slate-700 bg-slate-800/80 p-1">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-transparent px-4 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button className="rounded-full bg-[#FF7A1A] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#EA6C13]">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Marketplace</h5>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li><Link to="/products" className="hover:text-white">All Products</Link></li>
              <li><Link to="/products?category=cat-audio" className="hover:text-white">Audio Gear</Link></li>
              <li><Link to="/products?category=cat-computing" className="hover:text-white">Computing</Link></li>
              <li><Link to="/products?type=digital" className="hover:text-white">Digital Licenses</Link></li>
              <li><Link to="/products?seller=platform" className="hover:text-white">Sold by Vendora</Link></li>
            </ul>
          </div>

          {/* User Account */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Customer Portal</h5>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li><Link to="/cart" className="hover:text-white">Shopping Cart</Link></li>
              <li><Link to="/orders" className="hover:text-white">Order Tracking</Link></li>
              <li><Link to="/wishlist" className="hover:text-white">Saved Wishlist</Link></li>
              <li><Link to="/disputes" className="hover:text-white">Dispute Center</Link></li>
              <li><Link to="/become-a-seller" className="hover:text-white">Apply as Vendor</Link></li>
            </ul>
          </div>

          {/* Role Portals */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Staff & Partners</h5>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li><Link to="/vendor" className="hover:text-white">Vendor Workspace</Link></li>
              <li><Link to="/admin" className="hover:text-white">Admin Control Panel</Link></li>
              <li><Link to="/rider" className="hover:text-white">Delivery Rider Portal</Link></li>
              <li><Link to="/support" className="hover:text-white">Support Agent Hub</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-slate-800/80 pt-6 text-[11px] text-slate-500 sm:flex-row">
          <p>© 2026 Vendora Marketplace. Built with React 19, TypeScript, TanStack Query & MSW.</p>
          <p className="mt-2 sm:mt-0">Frontend Architecture Demonstration · Zero External Backend Required</p>
        </div>
      </div>
    </footer>
  );
};
