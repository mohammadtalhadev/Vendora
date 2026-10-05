import React, { useState } from 'react';
import {
  Calculator,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { mockDb } from '../mocks/db';

export const AdminCommissionPage: React.FC = () => {
  const [globalRate, setGlobalRate] = useState<number>(() => {
    return Math.round((mockDb.commissionConfig.globalDefaultRate || 0.1) * 100);
  });
  const [digitalRate, setDigitalRate] = useState<number>(() => {
    return Math.round((mockDb.commissionConfig.categoryOverrides?.['cat-digital'] || 0.15) * 100);
  });
  const [vendorTechRate, setVendorTechRate] = useState<number>(() => {
    return Math.round((mockDb.commissionConfig.vendorOverrides?.['vendor-tech-1'] || 0.07) * 100);
  });

  // Simulator Calculator State
  const [simPrice, setSimPrice] = useState<number>(189.0);
  const [simVendor, setSimVendor] = useState<'standard' | 'soundwave'>('soundwave');
  const [simCategory, setSimCategory] = useState<'physical' | 'digital'>('physical');
  const [isSaved, setIsSaved] = useState(false);

  // Derive simulated fee
  const effectiveRate =
    simVendor === 'soundwave'
      ? vendorTechRate / 100
      : simCategory === 'digital'
      ? digitalRate / 100
      : globalRate / 100;

  const commissionFee = simPrice * effectiveRate;
  const netVendorPayout = simPrice - commissionFee;

  const handleSave = () => {
    mockDb.commissionConfig = {
      globalDefaultRate: globalRate / 100,
      categoryOverrides: { 'cat-digital': digitalRate / 100 },
      vendorOverrides: { 'vendor-tech-1': vendorTechRate / 100 },
    };
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Dynamic Commission Governance"
      subtitle="Configure global take-rates, category overrides, and negotiated vendor fee tiers."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Settings and Calculator 2-Column Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Commission Rules (7 cols) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-7 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Platform Fee Tier Configuration</h3>
              <p className="text-xs text-slate-500">
                Rule precedence: Vendor Specific &gt; Category Override &gt; Global Default
              </p>
            </div>

            {/* 1. Global Default Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Global Default Platform Take-Rate</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  {globalRate}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={globalRate}
                onChange={(e) => setGlobalRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Applies to all standard physical catalog products with no category or vendor exception.
              </p>
            </div>

            {/* 2. Category Overrides */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Category Level Overrides
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div>
                  <div className="text-xs font-bold text-slate-800">Digital Software & UI Licenses</div>
                  <div className="text-[11px] text-slate-500">Immediate download, zero physical shipping</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={digitalRate}
                    onChange={(e) => setDigitalRate(Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* 3. Negotiated Vendor Overrides */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Negotiated Vendor Contracts
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-orange-200/80 bg-orange-50/30">
                <div>
                  <div className="text-xs font-bold text-slate-800">SoundWave Direct (Top Tier Flagship)</div>
                  <div className="text-[11px] text-orange-700 font-medium">Negotiated 7% enterprise partnership rate</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={vendorTechRate}
                    onChange={(e) => setVendorTechRate(Number(e.target.value))}
                    className="w-16 rounded-lg border border-orange-200 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-orange-900"
                  />
                  <span className="text-xs font-bold text-orange-700">%</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {isSaved ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Commission configuration active in MSW engine!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Updates persist to in-browser storage</span>
              )}
              <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 text-xs rounded-xl">
                <Save className="h-4 w-4" />
                <span>Save Commission Rules</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Live Simulated Calculator (5 cols) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Commission Simulator</h3>
                  <p className="text-[11px] text-slate-500">Test exact checkout split calculation</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Simulated Item Gross Price ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={simPrice}
                      onChange={(e) => setSimPrice(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-7 pr-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Seller Tier
                  </label>
                  <select
                    value={simVendor}
                    onChange={(e) => setSimVendor(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 font-medium"
                  >
                    <option value="soundwave">SoundWave Direct (7% override)</option>
                    <option value="standard">Standard Partner Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category Type
                  </label>
                  <select
                    value={simCategory}
                    onChange={(e) => setSimCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 font-medium"
                  >
                    <option value="physical">Physical Catalog Item</option>
                    <option value="digital">Digital Assets (15% override)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculation Output Box */}
            <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Effective Take Rate:</span>
                <span className="font-mono font-bold text-slate-900">{(effectiveRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Platform Commission:</span>
                <span className="font-mono font-bold text-emerald-600">+${commissionFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">Net Vendor Payout:</span>
                <span className="font-mono text-slate-900 text-sm">${netVendorPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
