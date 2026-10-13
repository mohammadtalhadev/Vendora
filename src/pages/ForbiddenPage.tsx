import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useAuth } from '../lib/auth-context';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { signInAsDemo } = useAuth();
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleSwitchAndGo = async (roleKey: 'admin' | 'vendor' | 'rider' | 'support') => {
    setSwitchError(null);
    try {
      await signInAsDemo(roleKey);
      navigate(`/${roleKey}`);
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : 'Could not sign in as that role.');
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-16 bg-slate-50/70 dark:bg-[#0b1120] overflow-hidden transition-colors">
      {/* Ambient luminous glow orbs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb-orange top-1/4 left-1/4 opacity-40" />
        <div className="ambient-orb-indigo bottom-1/4 right-1/4 opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Shield Icon Container */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-xl shadow-rose-500/20 mb-6 border border-rose-200/80 dark:border-rose-900/40 animate-in zoom-in-95">
          <ShieldAlert className="h-12 w-12" />
        </div>

        <span className="inline-block rounded-full bg-rose-100 dark:bg-rose-950/60 px-4 py-1 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 mb-3 shadow-xs">
          Access Policy 403: Restricted
        </span>

        <h1 className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Restricted Workspace
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          You don't have the required administrative or staff permissions to access this workspace panel.
          {user ? (
            <span className="block mt-2 font-medium text-slate-800 dark:text-slate-200">
              Active account roles: <span className="uppercase text-sun-orange font-bold">{user.roles.join(', ')}</span>
            </span>
          ) : (
            <span className="block mt-2 font-medium text-slate-800 dark:text-slate-200">
              You are currently viewing as a <strong className="text-slate-900 dark:text-white">Guest Buyer</strong>.
            </span>
          )}
        </p>

        {/* Demo Persona Switcher Card — local development only */}
        {import.meta.env.DEV && (
        <div className="glass-panel-elevated mt-8 rounded-3xl p-6 text-left border border-white/90 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <h3 className="font-outfit text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Switch to an authorized role:
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => void handleSwitchAndGo('admin')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/90 dark:hover:bg-purple-900/40 transition-colors font-extrabold text-purple-900 dark:text-purple-200 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Platform Admin</span>
              <span className="text-[10px] bg-purple-200/80 dark:bg-purple-900/80 px-2 py-0.5 rounded-full font-mono">/admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('vendor')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-900/40 transition-colors font-extrabold text-amber-900 dark:text-amber-200 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Approved Seller</span>
              <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-full font-mono">/vendor</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('support')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100/90 dark:hover:bg-cyan-900/40 transition-colors font-extrabold text-cyan-900 dark:text-cyan-200 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Support Agent</span>
              <span className="text-[10px] bg-cyan-200/80 dark:bg-cyan-900/80 px-2 py-0.5 rounded-full font-mono">/support</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('rider')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40 transition-colors font-extrabold text-emerald-900 dark:text-emerald-200 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Delivery Courier</span>
              <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full font-mono">/rider</span>
            </button>
          </div>

          {switchError && (
            <p className="mt-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              {switchError}
            </p>
          )}
        </div>
        )}

        {/* Back and Alternate Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 px-6 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Storefront</span>
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-sun-orange-600 transition-colors active:scale-95"
          >
            <UserCheck className="h-4 w-4" />
            <span>Sign In with Credentials</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
