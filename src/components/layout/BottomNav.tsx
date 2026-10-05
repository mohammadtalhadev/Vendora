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

  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[94%] max-w-md -translate-x-1/2 md:hidden">
      <nav className="glass-pill flex items-center justify-around border border-white/60 bg-white/85 py-2 px-3 shadow-2xl backdrop-blur-xl">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center gap-0.5 rounded-full px-3 py-1 transition-all ${
                isActive ? 'text-[#FF7A1A]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF7A1A] text-[9px] font-bold text-white">
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
