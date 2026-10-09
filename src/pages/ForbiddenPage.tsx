import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginAsDemoRole } = useAuthStore();

  const handleSwitchAndGo = (roleKey: 'admin' | 'vendor' | 'rider' | 'support') => {
    loginAsDemoRole(roleKey);
    navigate(`/${roleKey}`);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-50/50">
      <div className="w-full max-w-lg text-center">
        {/* Shield Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 shadow-xl shadow-rose-200/50 mb-6 animate-in zoom-in-95">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <span className="inline-block rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
          Error 403: Forbidden
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Restricted Platform Area
        </h1>

        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          You don't have the required administrative or staff permissions to view this workspace.
          {user ? (
            <span className="block mt-2 font-medium text-slate-800">
              Current account role: <span className="uppercase text-[#0071DC] font-bold">{user.roles.join(', ')}</span>
            </span>
          ) : (
            <span className="block mt-2 font-medium text-slate-800">
              You are currently browsing as a <span className="font-bold">Guest</span>.
            </span>
          )}
        </p>

        {/* Demo Persona Switcher for Quick Access */}
        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl p-5 shadow-lg shadow-slate-200/50 text-left">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Switch to an authorized role:
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSwitchAndGo('admin')}
              className="flex items-center justify-between p-3 rounded-2xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 transition-colors font-bold text-purple-900 cursor-pointer"
            >
              <span>Platform Admin</span>
              <span className="text-[10px] bg-purple-200/70 px-2 py-0.5 rounded-full">/admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('vendor')}
              className="flex items-center justify-between p-3 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition-colors font-bold text-amber-900 cursor-pointer"
            >
              <span>Approved Seller</span>
              <span className="text-[10px] bg-amber-200/70 px-2 py-0.5 rounded-full">/vendor</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('support')}
              className="flex items-center justify-between p-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100/80 transition-colors font-bold text-cyan-900 cursor-pointer"
            >
              <span>Support Agent</span>
              <span className="text-[10px] bg-cyan-200/70 px-2 py-0.5 rounded-full">/support</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAndGo('rider')}
              className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors font-bold text-emerald-900 cursor-pointer"
            >
              <span>Delivery Rider</span>
              <span className="text-[10px] bg-emerald-200/70 px-2 py-0.5 rounded-full">/rider</span>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Storefront
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#0071DC] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#005bb5] transition-colors"
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    </div>
  );
};
