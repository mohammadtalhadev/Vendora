import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Shield,
  ChevronDown,
  Menu,
  ArrowLeftRight,
  LayoutGrid,
  Store,
  Truck,
  Headphones,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import type { DemoRoleKey } from '../../lib/demo-accounts';
import { useAuth } from '../../lib/auth-context';
import { useCartStore, useCartCalculations } from '../../store/cart-store';
import { useWishlistStore } from '../../store/wishlist-store';
import { useCompareStore } from '../../store/compare-store';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSearchSuggestions, useCategories } from '../../features/catalog/hooks/useProducts';
import { formatPrice } from '../../store/currency-store';
import { CartDrawer } from '../../features/cart/components/CartDrawer';
import { MegaMenu } from './MegaMenu';
import { NotificationDropdown } from '../common/NotificationDropdown';

/**
 * THE navbar icon-button treatment (Batch 22L). Every icon button in the
 * header — menu, wishlist, notifications, compare, cart — shares this one
 * hover/focus recipe: frosted white wash, soft shadow, sun-orange icon,
 * visible focus ring, and the icon scales via `group`. The notification bell
 * used to be the odd one out (no focus ring, no icon motion, and a different
 * default inside NotificationDropdown); there are no exceptions now.
 */
const NAV_ICON_BUTTON_CLASS =
  'relative h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-all group shrink-0 cursor-pointer hover:bg-white hover:shadow-md hover:ring-1 hover:ring-orange-200 hover:text-sun-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { signInAsDemo, signOut } = useAuth();
  const { mergeGuestCartIntoUser } = useCartStore();
  const { itemCount } = useCartCalculations();
  const { items: wishlistItems } = useWishlistStore();
  const wishlistCount = wishlistItems.length;
  const { items: compareItems } = useCompareStore();
  const compareCount = compareItems.length;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Store the real seeded slug (never a display label) so `?category=` filters resolve.
  const [searchCategorySlug, setSearchCategorySlug] = useState('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: suggestionsData } = useSearchSuggestions(debouncedSearch);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories ?? [];
  const suggestions = suggestionsData?.suggestions ?? [];
  const showSuggestions = isSearchOpen && suggestions.length > 0;
  const searchCategoryLabel =
    searchCategorySlug === ''
      ? 'All'
      : categories.find((c) => c.slug === searchCategorySlug)?.name ?? 'All';

  // Keep the input + category picker in sync with the URL (?q=&category=) so a
  // refresh or Back button restores the active query.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('q') ?? '');
    setSearchCategorySlug(params.get('category') ?? '');
  }, [location.search]);

  // Derive the highlighted suggestion so a shrunk list can never leave a stale index.
  const activeSuggestion = activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] ?? null : null;

  // All Categories mega-dropdown state
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const allCategoriesRef = useRef<HTMLDivElement>(null);
  const allCategoriesTriggerRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mega menu and returns focus to its trigger button.
  useEffect(() => {
    if (!isAllCategoriesOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAllCategoriesOpen(false);
        allCategoriesTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isAllCategoriesOpen]);

  // Role Switcher modal/dropdown state
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Frosted pill elevation + utility strip collapse on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  // Expandable mobile search overlay
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Stable identities: CartDrawer's scroll-lock/Escape effect keys off onClose,
  // so a fresh inline closure on every Navbar render kept tearing that effect
  // down and re-registering it while the drawer was open.
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [isMobileSearchOpen]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const next = window.scrollY > 16;
          setIsScrolled((prev) => (prev === next ? prev : next));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    setActiveSuggestionIndex(-1);
    // Posts the real seeded slug (e.g. "audio-wearables"), never a display label.
    const catQuery = searchCategorySlug ? `&category=${encodeURIComponent(searchCategorySlug)}` : '';
    navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}${catQuery}`);
  };

  const activateSuggestion = (index: number) => {
    const s = suggestions[index];
    if (!s) return;
    setIsSearchOpen(false);
    setActiveSuggestionIndex(-1);
    if (s.type === 'category') {
      const match = categories.find((c) => c.id === s.id) ?? categories.find((c) => c.name === s.title);
      // Navigate with a real slug when we can resolve one; otherwise fall back
      // to an honest text search instead of an id the catalog can't resolve.
      if (match) {
        navigate(`/products?category=${encodeURIComponent(match.slug)}`);
      } else {
        navigate(`/products?q=${encodeURIComponent(s.title)}`);
      }
    } else {
      navigate(`/products/${s.id}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeSuggestion) {
      e.preventDefault();
      activateSuggestion(activeSuggestionIndex);
    }
  };

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileSearchTerm.trim()) return;
    setIsMobileSearchOpen(false);
    navigate(`/products?q=${encodeURIComponent(mobileSearchTerm.trim())}`);
  };

  const handleRoleSelect = async (roleKey: DemoRoleKey) => {
    setPersonaError(null);
    try {
      const signedIn = await signInAsDemo(roleKey);
      mergeGuestCartIntoUser(signedIn.id);
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
    } catch (error) {
      setPersonaError(error instanceof Error ? error.message : 'Could not sign in as that persona.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setIsRoleMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full pt-2 sm:pt-3">
      <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-8">
        {/* =========================================================================
            0. Slim Utility Strip (collapses on scroll)
            ========================================================================= */}
        <div
          className={`header-utility-strip mx-auto flex w-full items-center justify-between px-4 py-1.5 text-[11px] text-slate-500 font-medium ${
            isScrolled ? 'is-collapsed' : ''
          }`}
        >
          {/* Left links — the marketplace shortcuts (Batch 22K): sell, deals,
              tracking and help, the set big marketplaces put on this strip.
              Every target is a real route in the router. */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/become-a-seller" className="font-semibold text-sun-orange-700 hover:text-sun-orange transition-colors">
              Sell on Vendora
            </Link>
            <Link to="/deals" className="hover:text-sun-orange transition-colors">
              Flash Deals
            </Link>
            <Link to="/track-order" className="hidden md:inline hover:text-sun-orange transition-colors">
              Track Order
            </Link>
            <Link to="/faq" className="hover:text-sun-orange transition-colors">
              Help
            </Link>
          </div>

          {/* Right Utility Links */}
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/account/profile" className="hover:text-sun-orange transition-colors">
              My account
            </Link>
            <Link to="/downloads" className="hidden sm:inline hover:text-sun-orange transition-colors">
              Downloads
            </Link>
            <Link to="/contact" className="hidden sm:inline hover:text-sun-orange transition-colors">
              Contact
            </Link>
            <span className="hidden sm:inline text-slate-300">|</span>
            {/* PKR-only lock: the currency selector is unmounted while the lock
                is on (see CURRENCY_LOCKED_TO_PKR); a static market label takes
                its slot so shoppers still see where prices are quoted. */}
            <span className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-slate-600">
              <span className="text-sm leading-none">🇵🇰</span>
              <span>
                Pakistan · PKR <span className="font-medium text-slate-400">(Rs)</span>
              </span>
            </span>
          </div>
        </div>

        {/* =========================================================================
            1. Floating Frosted Pill — Brand, All Categories, Search, Quick Actions
            ========================================================================= */}
        <div className={`header-pill-shell ${isScrolled ? 'is-scrolled' : ''}`}>
          <div className="flex w-full items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
            {/* Left: Brand Logo & All Categories Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Mobile Hamburger Drawer Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden flex ${NAV_ICON_BUTTON_CLASS}`}
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>

              {/* Logo: "Vendora" in bold navy with interactive dot */}
              <Link to="/" className="flex items-center group pl-1 sm:pl-2">
                <span className="font-outfit text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 leading-none group-hover:text-sun-orange transition-colors">
                  Vendora<span className="inline-block h-2 w-2 rounded-full bg-sun-orange group-hover:bg-slate-900 ml-0.5 transition-colors" />
                </span>
              </Link>

              {/* "All Categories" Button with Full Mega Menu */}
              <div className="relative hidden md:block" ref={allCategoriesRef}>
                <button
                  ref={allCategoriesTriggerRef}
                  type="button"
                  onClick={() => setIsAllCategoriesOpen(!isAllCategoriesOpen)}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs sm:text-[13px] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
                    isAllCategoriesOpen
                      ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25'
                      : 'bg-slate-900/5 text-slate-700 hover:bg-sun-orange/10 hover:text-sun-orange'
                  }`}
                  aria-expanded={isAllCategoriesOpen}
                  aria-haspopup="true"
                  aria-controls="all-categories-menu"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>All Categories</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${
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

            {/* Center: Frosted Search Capsule with Category Selector & Orange Submit Button */}
            <div className="relative flex-1 max-w-2xl lg:max-w-3xl hidden sm:block" ref={searchContainerRef}>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="flex w-full items-center rounded-full bg-white/75 shadow-inner overflow-hidden h-11 sm:h-12 border border-white/80 transition-all focus-within:border-sun-orange/60 focus-within:bg-white/95 focus-within:shadow-md">
                  {/* Category Dropdown Pill — backed by the real seeded categories */}
                  <div className="relative shrink-0 hidden sm:block h-full">
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                      className="flex h-full items-center gap-1.5 px-4 bg-transparent hover:bg-slate-900/5 text-xs font-semibold text-slate-700 cursor-pointer transition-colors rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                      aria-expanded={isCategoryPickerOpen}
                      aria-controls="navbar-search-category-picker"
                    >
                      <span>{searchCategoryLabel}</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </button>

                    {isCategoryPickerOpen && (
                      <div
                        id="navbar-search-category-picker"
                        className="absolute left-2 top-13 z-50 w-52 max-h-80 overflow-y-auto rounded-2xl border border-white/70 bg-white/90 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in text-slate-800"
                      >
                        {[{ id: 'all', name: 'All', slug: '' }, ...categories].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSearchCategorySlug(cat.slug);
                              setIsCategoryPickerOpen(false);
                              searchInputRef.current?.focus();
                            }}
                            className="flex w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-sun-orange transition-colors"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divider Line */}
                  <div className="hidden sm:block h-6 w-px bg-slate-900/10 shrink-0" />

                  {/* Search Text Input */}
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="combobox"
                    aria-label="Search Vendora products and categories"
                    aria-expanded={showSuggestions}
                    aria-controls="navbar-search-suggestions"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      showSuggestions && activeSuggestion
                        ? `navbar-search-opt-${activeSuggestionIndex}`
                        : undefined
                    }
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search products, brands and stores…"
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden px-4"
                  />

                  {/* Orange Search Button */}
                  <button
                    type="submit"
                    className="flex h-full w-12 sm:w-14 shrink-0 items-center justify-center bg-sun-orange hover:bg-sun-orange-600 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                    title="Search"
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </div>
              </form>

              {/* Autocomplete Suggestions Dropdown (keyboard-operable) */}
              {showSuggestions && (
                <div
                  id="navbar-search-suggestions"
                  role="listbox"
                  aria-label="Search suggestions"
                  className="absolute left-0 top-14 z-50 w-full overflow-hidden rounded-2xl border border-white/70 bg-white/90 backdrop-blur-xl p-2 shadow-2xl animate-in fade-in text-slate-800"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Search Suggestions
                  </div>
                  {suggestions.map((s, index) => (
                    <button
                      key={`${s.type}-${s.id}`}
                      id={`navbar-search-opt-${index}`}
                      role="option"
                      aria-selected={index === activeSuggestionIndex}
                      type="button"
                      onClick={() => activateSuggestion(index)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
                        index === activeSuggestionIndex ? 'bg-orange-50 text-sun-orange' : 'text-slate-700 hover:bg-orange-50 hover:text-sun-orange'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            s.type === 'category'
                              ? 'bg-orange-50 text-sun-orange'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {s.type}
                        </span>
                        <span className="font-medium text-slate-800 text-xs sm:text-sm">{s.title}</span>
                      </div>
                      {s.price !== undefined && (
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {formatPrice(s.price)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Action Items: Mobile Search, Wishlist, Exchange, Account, Cart */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Mobile search toggle — opens the frosted search overlay below the pill */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((v) => !v)}
                className={`sm:hidden flex h-10 w-10 items-center justify-center rounded-full transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
                  isMobileSearchOpen
                    ? 'bg-orange-50 text-sun-orange shadow-xs'
                    : 'text-slate-700 hover:bg-white/80 hover:shadow-sm hover:text-sun-orange'
                }`}
                title="Search products"
                aria-expanded={isMobileSearchOpen}
                aria-label="Search products"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className={`flex ${NAV_ICON_BUTTON_CLASS}`}
                title="Wishlist"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5 transition-transform group-hover:scale-110" />
                {wishlistCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E11D48] text-[9px] font-bold text-white shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* In-App Notification Center Dropdown */}
              <NotificationDropdown triggerClassName={`hidden sm:flex ${NAV_ICON_BUTTON_CLASS}`} />

              {/* Compare / Exchange Icon */}
              <Link
                to="/compare"
                className={`hidden lg:flex ${NAV_ICON_BUTTON_CLASS}`}
                title="Compare Products"
                aria-label="Compare Products"
              >
                <ArrowLeftRight className="h-5 w-5 transition-transform group-hover:scale-110" />
                {compareCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-xs">
                    {compareCount}
                  </span>
                )}
              </Link>

              {/* Sign In / Account with Profile Dropdown */}
              <div className="relative" ref={roleMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center gap-2 rounded-full pl-1.5 pr-2 sm:pr-3 py-1.5 text-slate-700 hover:text-sun-orange hover:bg-white/80 hover:shadow-sm transition-all cursor-pointer shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                  aria-expanded={isRoleMenuOpen}
                  aria-controls="navbar-account-menu"
                  aria-label="Account and personas menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900/5 group-hover:bg-sun-orange/10 group-hover:text-sun-orange text-slate-700 transition-colors">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <div className="hidden xl:flex flex-col text-left leading-tight">
                    <span className="text-[10px] text-slate-400 font-normal">
                      {user ? 'Welcome,' : 'Sign In'}
                    </span>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-sun-orange flex items-center gap-1 transition-colors">
                      {user ? user.name.split(' ')[0] : 'Account'}
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </span>
                  </div>
                </button>

                {isRoleMenuOpen && (
                  <div id="navbar-account-menu" className="absolute right-0 top-13 z-50 w-72 rounded-2xl border border-white/70 bg-white/90 backdrop-blur-xl p-3 shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800">
                  {/* Account Header with Role Badge inside dropdown */}
                  {user ? (
                    <div className="border-b border-slate-100 pb-3 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-900 truncate">{user.name}</div>
                        <span className="shrink-0 rounded-full bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[10px] font-bold text-sun-orange uppercase tracking-wide">
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
                          className="flex-1 text-center rounded-xl bg-sun-orange py-2 text-xs font-bold text-white hover:bg-sun-orange-600 shadow-xs transition-colors"
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
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{wishlistCount} items</span>
                    </Link>
                    <Link
                      to="/downloads"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>My Downloads</span>
                      <span className="text-[10px] text-slate-400">Licenses</span>
                    </Link>
                    <Link
                      to="/disputes"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>Disputes &amp; Claims</span>
                      <span className="text-[10px] text-slate-400">Support</span>
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
                        onClick={() => void handleSignOut()}
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

                  {/* Demo Persona Switcher — local development only, never in production builds */}
                  {import.meta.env.DEV && (
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
                      ).map(({ key, label }) => {
                        const roleKeys: readonly string[] = user?.roles ?? [];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => void handleRoleSelect(key)}
                            className={`rounded-lg px-2 py-1 text-center text-[11px] font-medium transition-colors hover:bg-slate-100 cursor-pointer ${
                              roleKeys.includes(key) ? 'bg-orange-50 font-bold text-sun-orange' : 'text-slate-600'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {personaError && (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">
                        {personaError}
                      </p>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart with Orange Count Badge */}
            <button
              type="button"
              onClick={openCart}
              className={`flex ${NAV_ICON_BUTTON_CLASS}`}
              title="Shopping Cart"
              aria-label="Open shopping cart"
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" />
              {itemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sun-orange px-0.5 text-[10px] font-extrabold text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* =========================================================================
            1A. Expandable Mobile Search Overlay (frosted glass)
            ========================================================================= */}
        {isMobileSearchOpen && (
          <form
            onSubmit={handleMobileSearchSubmit}
            className="header-pill-shell mt-2 flex items-center gap-2 px-3 py-2 sm:hidden animate-in fade-in slide-in-from-top-1"
          >
            <input
              ref={mobileSearchInputRef}
              type="text"
              aria-label="Search products"
              value={mobileSearchTerm}
              onChange={(e) => setMobileSearchTerm(e.target.value)}
              placeholder="Search products, brands and more..."
              className="w-full bg-white/80 rounded-full border border-white/80 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sun-orange/60 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="flex h-10 w-11 shrink-0 items-center justify-center rounded-full bg-sun-orange hover:bg-sun-orange-600 text-white transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
              title="Search"
              aria-label="Search"
            >
              <Search className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          </form>
        )}


        {/* =========================================================================
            3. Mobile Menu Drawer
            ========================================================================= */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-2 rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl px-4 py-4 text-slate-800 shadow-2xl animate-in slide-in-from-top-2">
            <div className="space-y-1 text-sm font-semibold">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Home
              </Link>
              <Link
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Shop Catalog
              </Link>
              <Link
                to="/products?category=electronics"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Electronics
              </Link>
              <Link
                to="/products?category=home-kitchen"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Home &amp; Furniture
              </Link>
              <Link
                to="/track-order"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Order Tracking
              </Link>
              <Link
                to="/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Notifications
              </Link>
              <Link
                to="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                About Vendora
              </Link>
              <Link
                to="/blog"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Blog
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-full px-4 py-2 text-slate-800 hover:bg-orange-50 hover:text-sun-orange transition-colors"
              >
                Contact Us
              </Link>
              <div className="pt-2 border-t border-slate-200/60">
                {/* PKR-only lock: static market row instead of the selector. */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Market Currency
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span className="text-base leading-none">🇵🇰</span>
                      PKR <span className="font-medium text-slate-500">(Rs)</span>
                    </span>
                  </div>
                  <p className="px-1 pt-1.5 text-[11px] font-medium text-slate-500">
                    All prices on Vendora are quoted in Pakistani Rupees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </header>
  );
};
