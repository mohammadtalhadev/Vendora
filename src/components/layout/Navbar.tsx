import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Shield,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore, DEMO_ACCOUNTS } from '../../store/auth-store';
import { useCartStore, useCartCalculations } from '../../store/cart-store';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSearchSuggestions } from '../../features/catalog/hooks/useProducts';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginAsDemoRole, logout } = useAuthStore();
  const { mergeGuestCartIntoUser } = useCartStore();
  const { grandTotal, itemCount } = useCartCalculations();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: suggestionsData } = useSearchSuggestions(debouncedSearch);

  // Role Switcher modal/dropdown state
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(event.target as Node)
      ) {
        setIsRoleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearchOpen(false);
    navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleRoleSelect = (roleKey: 'customer' | 'newuser' | 'vendor' | 'admin' | 'support' | 'rider') => {
    loginAsDemoRole(roleKey);
    const selectedUser = DEMO_ACCOUNTS[roleKey];
    if (selectedUser) {
      mergeGuestCartIntoUser(selectedUser.id);
    }
    setIsRoleMenuOpen(false);
    if (roleKey === 'admin') {
      navigate('/admin');
    } else if (roleKey === 'vendor') {
      navigate('/vendor');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-2 pb-1 transition-all md:px-6 md:pt-3">
      {/* 1. Top Micro Bar */}
      <div className="mx-auto mb-2 flex max-w-7xl items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Deliver to: <strong className="text-slate-800">New York, 10001</strong>
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Free express shipping on orders over $100</span>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3" ref={roleMenuRef}>
          {/* Quick Direct Workspace Links */}
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs transition-all hover:bg-slate-800"
            title="Open Platform Admin Governance Dashboard"
          >
            <Shield className="h-3 w-3 text-emerald-400" />
            <span>Admin</span>
          </Link>
          <Link
            to="/vendor"
            className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-[#EA6C13] shadow-xs transition-all hover:bg-orange-200"
            title="Open Seller Partner Dashboard"
          >
            <span>Seller</span>
          </Link>

          {/* Demo Role Switcher Badge */}
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-2.5 py-1 font-medium text-orange-700 shadow-sm transition-all hover:bg-orange-100"
            title="Switch demo user roles instantly"
          >
            <Shield className="h-3 w-3 text-orange-600" />
            <span>Role: <strong>{user ? user.roles[0].toUpperCase() : 'GUEST'}</strong></span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Role Switcher Menu */}
          {isRoleMenuOpen && (
            <div className="absolute right-0 top-8 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                1-Click Demo Accounts
              </div>
              <div className="py-1">
                {(
                  [
                    { key: 'customer', label: 'Customer (Order History)', email: 'customer@demo.test' },
                    { key: 'newuser', label: 'New Customer (Apply Flow)', email: 'newuser@demo.test' },
                    { key: 'vendor', label: 'Vendor (Store & Listings)', email: 'vendor@demo.test' },
                    { key: 'admin', label: 'Admin (Full Platform Control)', email: 'admin@demo.test' },
                    { key: 'support', label: 'Support Agent (Disputes)', email: 'support@demo.test' },
                    { key: 'rider', label: 'Delivery Rider (Deliveries)', email: 'rider@demo.test' },
                  ] as const
                ).map(({ key, label, email }) => (
                  <button
                    key={key}
                    onClick={() => handleRoleSelect(key)}
                    className={`flex w-full flex-col rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 ${
                      user?.email === email ? 'bg-orange-50 font-semibold text-orange-700' : 'text-slate-700'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-slate-400">{email}</span>
                  </button>
                ))}

                {user && (
                  <button
                    onClick={() => {
                      logout();
                      setIsRoleMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center justify-between border-t border-slate-100 px-2.5 pt-2 text-left text-xs text-rose-600 hover:text-rose-700"
                  >
                    <span>Log out to Guest</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Floating Glass Pill Navbar */}
      <nav className="glass-pill mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 pr-2">
          <span className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
            Vendora
            <span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A] ml-0.5" />
          </span>
        </Link>

        {/* Central Search Capsule */}
        <div className="relative mx-2 hidden flex-1 max-w-2xl md:block" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search 20,000+ products, categories, and sellers..."
              className="w-full rounded-full border border-slate-200/80 bg-white/90 py-2.5 pl-5 pr-12 text-sm text-slate-800 placeholder-slate-400 shadow-inner focus:border-[#FF7A1A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/20"
            />
            <button
              type="submit"
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A1A] text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Autocomplete Dropdown Suggestions */}
          {isSearchOpen && (suggestionsData?.suggestions?.length ?? 0) > 0 && (
            <div className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suggestions
              </div>
              {suggestionsData?.suggestions.map((s) => (
                <button
                  key={`${s.type}-${s.id}`}
                  onClick={() => {
                    setIsSearchOpen(false);
                    if (s.type === 'category') {
                      navigate(`/products?category=${s.id}`);
                    } else {
                      navigate(`/products/${s.id}`);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s.type === 'category'
                          ? 'bg-cyan-50 text-cyan-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {s.type}
                    </span>
                    <span>{s.title}</span>
                  </div>
                  {s.price !== undefined && (
                    <span className="font-semibold text-slate-900">${s.price.toFixed(2)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wishlist Pill */}
          <Link
            to="/wishlist"
            className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-white hover:text-rose-600 sm:flex"
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Wishlist</span>
          </Link>

          {/* Cart Pill */}
          <Link
            to="/cart"
            className="flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-[#FF7A1A]" />
            <span>${grandTotal.toFixed(2)}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF7A1A] text-[10px] font-bold text-white">
              {itemCount}
            </span>
          </Link>

          {/* User Account / Workspaces pill */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-1.5">
                {user.roles.includes('vendor') && (
                  <Link
                    to="/vendor"
                    className="hidden rounded-full border border-orange-200 bg-orange-50/90 px-2.5 py-1 text-xs font-semibold text-[#EA6C13] hover:bg-orange-100 md:inline-flex"
                  >
                    Vendor Hub
                  </Link>
                )}
                {user.roles.includes('admin') && (
                  <Link
                    to="/admin"
                    className="hidden rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 md:inline-flex"
                  >
                    Admin Panel
                  </Link>
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
                  {user.name.charAt(0)}
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleRoleSelect('customer')}
                className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
              >
                <User className="h-3.5 w-3.5" />
                <span>Log in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 3. Sub-Navbar Links */}
      <div className="mx-auto mt-1 flex max-w-7xl items-center justify-between px-3 text-xs text-slate-600 sm:px-6">
        <div className="flex items-center gap-5 overflow-x-auto py-1 no-scrollbar">
          <Link to="/products" className="font-semibold text-slate-900 hover:text-[#FF7A1A]">
            All Products
          </Link>
          <Link to="/products?category=cat-audio" className="hover:text-[#FF7A1A]">
            Audio & Sound
          </Link>
          <Link to="/products?category=cat-computing" className="hover:text-[#FF7A1A]">
            Computers
          </Link>
          <Link to="/products?type=digital" className="hover:text-[#FF7A1A]">
            Digital Assets
          </Link>
          <Link to="/products?seller=platform" className="hover:text-[#00B8C8] flex items-center gap-1 font-medium text-cyan-800">
            Sold by Vendora
          </Link>
        </div>

        <Link
          to="/become-a-seller"
          className="hidden items-center gap-1 text-xs font-semibold text-[#FF7A1A] hover:underline md:flex"
        >
          <span>Become a Seller</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </header>
  );
};
