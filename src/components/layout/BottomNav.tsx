import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Package } from 'lucide-react';
import { useCartStore } from '../../store/cart-store';
import { useAuthStore } from '../../store/auth-store';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { items } = useCartStore();
  const { user } = useAuthStore();
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/products', icon: Search, label: 'Search' },
    { to: '/cart', icon: ShoppingBag, label: 'Cart', badge: totalCount },
    { to: user ? '/orders' : '/login', icon: Package, label: 'Orders' },
    { to: '/account/profile', icon: User, label: 'Account' },
  ];

  // Segment-aware match so nested routes stay active: /orders/123 marks "Orders",
  // while '/' only matches the exact root path.
  const isItemActive = (to: string): boolean =>
    to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 md:hidden">
      <nav className="flex items-center justify-between rounded-full border border-white/70 bg-white/92 px-2 py-1.5 shadow-[0_8px_30px_-6px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = isItemActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
                isActive ? 'text-sun-orange' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sun-orange text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
