import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  ArrowLeftRight,
  LayoutGrid,
  Store,
  Truck,
  Headphones,
  LogOut,
} from 'lucide-react';
import { useAuthStore, DEMO_ACCOUNTS } from '../../store/auth-store';
import { useCartStore, useCartCalculations } from '../../store/cart-store';
import { useWishlistStore } from '../../store/wishlist-store';
import { useCompareStore } from '../../store/compare-store';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSearchSuggestions } from '../../features/catalog/hooks/useProducts';
import { MegaMenu } from './MegaMenu';
import { NotificationDropdown } from '../common/NotificationDropdown';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginAsDemoRole, logout } = useAuthStore();
  const { mergeGuestCartIntoUser } = useCartStore();
  const { itemCount } = useCartCalculations();
  const { items: wishlistItems } = useWishlistStore();
  const wishlistCount = wishlistItems.length;
  const { items: compareItems } = useCompareStore();
  const compareCount = compareItems.length;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState('All');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: suggestionsData } = useSearchSuggestions(debouncedSearch);

  // All Categories mega-dropdown state
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const allCategoriesRef = useRef<HTMLDivElement>(null);

  // Role Switcher modal/dropdown state
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
        setIsCategoryPickerOpen(false);
      }
      if (
        allCategoriesRef.current &&
        !allCategoriesRef.current.contains(event.target as Node)
      ) {
        setIsAllCategoriesOpen(false);
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
    const catQuery = searchCategory !== 'All' ? `&category=${encodeURIComponent(searchCategory.toLowerCase())}` : '';
    navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}${catQuery}`);
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
    } else if (roleKey === 'rider') {
      navigate('/rider');
    } else if (roleKey === 'support') {
      navigate('/support');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0071DC]/95 backdrop-blur-xl border-b border-white/15 shadow-md text-white transition-all">
      {/* =========================================================================
          1. Top Utility Micro-Bar
          ========================================================================= */}
      <div className="border-b border-white/10 bg-black/10 py-1.5 text-[11px] text-white/90">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left links matching Bevesi top bar */}
          <div className="flex items-center gap-4 sm:gap-6 font-medium">
            <Link to="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link to="/account/profile" className="hover:text-white transition-colors">
              My account
            </Link>
            <Link to="/downloads" className="hover:text-white transition-colors">
              Downloads
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          {/* Right Utility Links */}
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/orders" className="hidden sm:inline hover:text-white transition-colors">
              Order Tracking
            </Link>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline text-white/80 hover:text-white cursor-pointer transition-colors">
              English ▾
            </span>
            <span className="hidden sm:inline text-white/80 font-semibold hover:text-white cursor-pointer transition-colors">
              USD ▾
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Main Header Bar (Logo, All Categories, Search Bar, Quick Actions)
          ========================================================================= */}
      <div className="w-full">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          {/* Left: Brand Logo & All Categories Outlined Button */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Mobile Hamburger Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo: Spark Icon + "Vendora" in bold white */}
            <Link to="/" className="flex items-center gap-2 group">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFC220] fill-current shrink-0 transition-transform group-hover:rotate-12 duration-300" viewBox="0 0 24 24">
                <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0v-3.5A1.5 1.5 0 0 1 12 2zm0 13.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0V17a1.5 1.5 0 0 1 1.5-1.5zm8.5-4.5a1.5 1.5 0 0 1-1.5 1.5h-3.5a1.5 1.5 0 0 1 0-3H19a1.5 1.5 0 0 1 1.5 1.5zM7 12.5a1.5 1.5 0 0 1-1.5 1.5H2a1.5 1.5 0 0 1 0-3h3.5A1.5 1.5 0 0 1 7 12.5zm10.78-6.72a1.5 1.5 0 0 1 0 2.12l-2.47 2.47a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm-8.2 8.2a1.5 1.5 0 0 1 0 2.12L7.1 18.57a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm8.2 2.12a1.5 1.5 0 0 1-2.12 0l-2.47-2.47a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47a1.5 1.5 0 0 1 0 2.12zM8.78 5.78a1.5 1.5 0 0 1-2.12 2.12L4.19 5.43a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47z"/>
              </svg>
              <span className="text-2xl sm:text-[26px] font-black tracking-tight text-white leading-none">
                Vendora
              </span>
            </Link>

            {/* "All Categories" Button with Full Mega Menu */}
            <div className="relative hidden md:block" ref={allCategoriesRef}>
              <button
                type="button"
                onClick={() => setIsAllCategoriesOpen(!isAllCategoriesOpen)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-[13px] font-bold text-white shadow-2xs transition-all cursor-pointer backdrop-blur-xs ${
                  isAllCategoriesOpen
                    ? 'border-white bg-white/25 shadow-md'
                    : 'border-white/40 bg-white/10 hover:bg-white/20'
                }`}
                aria-expanded={isAllCategoriesOpen}
                aria-haspopup="true"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>All Categories</span>
                <ChevronDown
                  className={`h-3 w-3 text-white/80 transition-transform duration-200 ${
                    isAllCategoriesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Mega Dropdown Menu */}
              <MegaMenu
                isOpen={isAllCategoriesOpen}
                onClose={() => setIsAllCategoriesOpen(false)}
              />
            </div>
          </div>

          {/* Center: Wide White Search Capsule with Category Selector & Yellow Submit Button */}
          <div className="relative flex-1 max-w-2xl lg:max-w-3xl" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="flex w-full items-center rounded-xl bg-white shadow-md overflow-hidden h-11 sm:h-12 border border-white/20 transition-all focus-within:ring-2 focus-within:ring-[#FFC220]">
                {/* Category Dropdown Pill */}
                <div className="relative shrink-0 hidden sm:block h-full">
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                    className="flex h-full items-center gap-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                  >
                    <span>{searchCategory}</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>

                  {isCategoryPickerOpen && (
                    <div className="absolute left-0 top-12 z-50 w-52 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in text-slate-800">
                      {[
                        'All',
                        'Electronics',
                        'Audio & Wearables',
                        'Cameras & Photo',
                        'Fashion',
                        'Shoes',
                        'Bags & Luggage',
                        'Jewelry & Watches',
                        'Beauty & Personal Care',
                        'Home & Kitchen',
                        'Kids & Baby',
                        'Sports & Outdoors',
                        'Digital Products',
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSearchCategory(cat);
                            setIsCategoryPickerOpen(false);
                          }}
                          className="flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0071DC]"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider Line */}
                <div className="hidden sm:block h-6 w-px bg-slate-200 shrink-0" />

                {/* Search Text Input */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search everything at vendora online and in store..."
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden px-3.5"
                />

                {/* Yellow Search Button (#FFC220 matching Mockup) */}
                <button
                  type="submit"
                  className="flex h-full w-11 sm:w-12 shrink-0 items-center justify-center bg-[#FFC220] hover:bg-[#eab308] text-slate-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Search"
                >
                  <Search className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>
            </form>

            {/* Autocomplete Suggestions Dropdown */}
            {isSearchOpen && (suggestionsData?.suggestions?.length ?? 0) > 0 && (
              <div className="absolute left-0 top-14 z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in text-slate-800">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Search Suggestions
                </div>
                {suggestionsData?.suggestions.map((s) => (
                  <button
                    key={`${s.type}-${s.id}`}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      if (s.type === 'category') {
                        navigate(`/products?category=${s.id}`);
                      } else {
                        navigate(`/products/${s.id}`);
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          s.type === 'category'
                            ? 'bg-blue-50 text-[#0071DC]'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {s.type}
                      </span>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">{s.title}</span>
                    </div>
                    {s.price !== undefined && (
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        ${s.price.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Items: Wishlist, Exchange, Account, Cart matching Mockup */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* Wishlist with 2-line label */}
            <Link
              to="/wishlist"
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors shrink-0 group"
              title="Wishlist"
            >
              <div className="relative flex items-center justify-center">
                <Heart className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-white/75 font-normal">Reorder</span>
                <span className="text-xs font-bold text-white">Wishlist</span>
              </div>
            </Link>

            {/* In-App Notification Center Dropdown */}
            <NotificationDropdown />

            {/* Compare / Exchange Icon matching Mockup */}
            <Link
              to="/compare"
              className="relative hidden lg:flex items-center text-white hover:text-yellow-300 transition-colors p-1"
              title="Compare Products"
            >
              <ArrowLeftRight className="h-5 w-5 text-white/90" />
              {compareCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-900 shadow-xs">
                  {compareCount}
                </span>
              )}
            </Link>

            {/* Sign In / Account with Profile Dropdown */}
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-2 text-white hover:text-white/80 transition-colors cursor-pointer shrink-0 group"
                aria-expanded={isRoleMenuOpen}
              >
                <User className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
                <div className="hidden xl:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-white/75 font-normal">
                    {user ? 'Welcome,' : 'Sign In'}
                  </span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    {user ? user.name.split(' ')[0] : 'Account'}
                    <ChevronDown className="h-3 w-3 text-white/70" />
                  </span>
                </div>
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800">
                  {/* Account Header with Role Badge inside dropdown */}
                  {user ? (
                    <div className="border-b border-slate-100 pb-3 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-900 truncate">{user.name}</div>
                        <span className="shrink-0 rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-[#0071DC] uppercase tracking-wide">
                          {user.roles[0]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                    </div>
                  ) : (
                    <div className="border-b border-slate-100 pb-3 mb-2">
                      <div className="text-xs font-bold text-slate-800 mb-2">Welcome to Vendora</div>
                      <div className="flex gap-2">
                        <Link
                          to="/login"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex-1 text-center rounded-xl bg-[#0071DC] py-2 text-xs font-bold text-white hover:bg-[#005bb5] shadow-xs"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex-1 text-center rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Register
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Customer Portal Links */}
                  <div className="space-y-1 mb-2">
                    <Link
                      to="/account/profile"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>Profile &amp; Addresses</span>
                      <span className="text-[10px] text-slate-400">Settings</span>
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>Track Orders</span>
                      <span className="text-[10px] text-slate-400">History</span>
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>My Wishlist</span>
                      <span className="text-[10px] text-rose-500 font-bold">{wishlistCount} items</span>
                    </Link>
                    <Link
                      to="/downloads"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>My Downloads</span>
                      <span className="text-[10px] text-purple-600 font-bold">Licenses</span>
                    </Link>
                    <Link
                      to="/disputes"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>Disputes &amp; Claims</span>
                      <span className="text-[10px] text-blue-600 font-bold">Support</span>
                    </Link>
                  </div>

                  {/* Internal Workspace Quick Access if User has permission */}
                  {user && (user.roles.includes('admin') || user.roles.includes('vendor') || user.roles.includes('rider') || user.roles.includes('support')) && (
                    <div className="border-t border-slate-100 pt-2 mb-2 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                        Workspace Access
                      </div>
                      {user.roles.includes('admin') && (
                        <Link
                          to="/admin"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            <span>Admin Governance</span>
                          </span>
                          <span className="text-[10px] uppercase">Control</span>
                        </Link>
                      )}
                      {user.roles.includes('vendor') && (
                        <Link
                          to="/vendor"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5" />
                            <span>Vendor Portal</span>
                          </span>
                          <span className="text-[10px] uppercase">Store</span>
                        </Link>
                      )}
                      {user.roles.includes('rider') && (
                        <Link
                          to="/rider"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            <span>Rider Deliveries</span>
                          </span>
                          <span className="text-[10px] uppercase">Active</span>
                        </Link>
                      )}
                      {user.roles.includes('support') && (
                        <Link
                          to="/support"
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Headphones className="h-3.5 w-3.5" />
                            <span>Support Desk</span>
                          </span>
                          <span className="text-[10px] uppercase">Triage</span>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Sign Out (Inside Profile Menu, consistent with design guidelines) */}
                  {user && (
                    <div className="border-t border-slate-100 pt-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsRoleMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Logout</span>
                      </button>
                    </div>
                  )}

                  {/* Demo Persona Switcher (Clean compact section for testing) */}
                  <div className="border-t border-slate-100 pt-2">
                    <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Demo Persona
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { key: 'customer', label: 'Customer' },
                          { key: 'newuser', label: 'New User' },
                          { key: 'vendor', label: 'Vendor' },
                          { key: 'admin', label: 'Admin' },
                          { key: 'support', label: 'Support' },
                          { key: 'rider', label: 'Rider' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleRoleSelect(key)}
                          className={`rounded-lg px-2 py-1 text-center text-[11px] font-medium transition-colors hover:bg-slate-100 cursor-pointer ${
                            user?.roles.includes(key as any) ? 'bg-blue-50 font-bold text-[#0071DC]' : 'text-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart with red count badge */}
            <Link
              to="/cart"
              className="relative flex items-center justify-center p-1 text-white hover:text-white/80 transition-colors shrink-0 group"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1.5 flex h-4 w-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-extrabold text-white shadow-xs">
                {itemCount}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. Bottom Sub-Bar: Announcement & Main Links (matching Mockup Tier 3)
          ========================================================================= */}
      <div className="w-full border-t border-white/15 bg-black/5 text-white text-xs font-semibold">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          {/* Left Announcement Pill */}
          <div className="flex items-center gap-2 text-xs font-normal">
            <span className="text-white/90">Your order is at your door in</span>
            <strong className="text-white font-extrabold">2 hours with fast shipping.</strong>
            <ChevronRight className="h-4 w-4 text-white/80 shrink-0" />
          </div>

          {/* Center Navigation Links matching Mockup */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link to="/" className="flex items-center gap-1 text-white hover:text-yellow-200 transition-colors font-bold">
              <span>Home</span>
              <ChevronDown className="h-3 w-3 text-white/70" />
            </Link>
            <Link to="/products" className="flex items-center gap-1 text-white hover:text-yellow-200 transition-colors font-bold">
              <span>Shop</span>
              <ChevronDown className="h-3 w-3 text-white/70" />
            </Link>
            <Link to="/products?category=electronics" className="text-white/90 hover:text-white transition-colors">
              Electronics
            </Link>
            <Link to="/products?category=home-kitchen" className="text-white/90 hover:text-white transition-colors">
              Home &amp; Furniture
            </Link>
            <Link to="/contact" className="text-white/90 hover:text-white transition-colors">
              Contact
            </Link>
            <Link to="/about" className="text-white/90 hover:text-white transition-colors">
              Blog
            </Link>
          </div>

          {/* Right Action: Today's Deal matching Mockup */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to="/products"
              className="flex items-center gap-1 font-extrabold text-white hover:text-yellow-300 transition-colors cursor-pointer"
            >
              <span>Today's Deal</span>
              <ChevronDown className="h-3.5 w-3.5 text-white/80" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. Mobile Menu Drawer
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/15 bg-[#005bb5] px-4 py-4 text-white animate-in slide-in-from-top-2">
          <div className="space-y-2 text-sm font-semibold">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Shop Catalog
            </Link>
            <Link
              to="/products?category=electronics"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Electronics
            </Link>
            <Link
              to="/products?category=home-kitchen"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Home &amp; Furniture
            </Link>
            <Link
              to="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Order Tracking
            </Link>
            <Link
              to="/notifications"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Notifications
            </Link>
            <Link
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              About &amp; Blog
            </Link>
            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
