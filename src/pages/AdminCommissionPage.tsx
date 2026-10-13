import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Percent,
  Wallet,
  BarChart3,
  Download,
  TrendingUp,
  History,
  Store,
  Tag,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import { useCommissionOverview } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import { setCategoryCommission } from '../features/admin/api/categories';

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

/**
 * Commission console, read from the `admin_commission_overview` RPC.
 *
 * This replaces the legacy page wholesale: it rendered hardcoded category
 * overrides, a fictional "recent adjustments" ledger (invented merchants,
 * approvers and contract terms), invented tier rules and totals derived from
 * the mock store with hardcoded fallbacks ($18,423.19 etc.). None of that had a
 * backend. What the schema does have — a global default rate, per-category and
 * per-vendor overrides, the booked ledger, and an audit trail of rate changes —
 * is exactly what this page now shows and edits.
 */
export const AdminCommissionPage: React.FC = () => {
  const [days, setDays] = useState(30);
  const overview = useCommissionOverview(days);
  const actions = useAdminActions();
  const queryClient = useQueryClient();

  const [globalRateInput, setGlobalRateInput] = useState('');
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSaved, setRateSaved] = useState<string | null>(null);
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});

  const data = overview.data;

  const categoryRateMutation = useMutation({
    mutationFn: ({ categoryId, rate }: { categoryId: string; rate: number | null }) =>
      setCategoryCommission(categoryId, rate),
    onSuccess: () => {
      setRateError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void overview.refetch();
    },
    onError: (err) => setRateError(err instanceof Error ? err.message : 'Could not save the category rate.'),
  });

  const handleSetGlobalRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(globalRateInput);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setRateError('Enter a rate between 0 and 100 (percent).');
      return;
    }
    setRateError(null);
    actions.setGlobalCommission.mutate(parsed / 100, {
      onSuccess: () => {
        setRateSaved(`Global default rate set to ${parsed.toFixed(2)}%.`);
        setGlobalRateInput('');
        void overview.refetch();
      },
      onError: (err) => setRateError(err instanceof Error ? err.message : 'Could not set the platform rate.'),
    });
  };

  const handleExportLedger = () => {
    if (!data) return;
    exportToCsv(
      `vendora-commission-ledger-${days}d.csv`,
      data.byVendor.map((v) => ({
        store: v.storeName,
        overridePct: v.override === null ? '' : (v.override * 100).toFixed(2),
        gross: v.gross.toFixed(2),
        commission: v.commission.toFixed(2),
      })),
      { store: 'Store', overridePct: 'Override %', gross: 'Gross', commission: 'Commission' },
    );
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Commission & Fees" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Commission &amp; Platform Fees
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rates and earnings from the live order ledger — every figure below is computed by the database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Reporting window">
              {[7, 30, 90].map((window) => (
                <button
                  key={window}
                  type="button"
                  onClick={() => setDays(window)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    days === window ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {window}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExportLedger}
              disabled={!data}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export Ledger CSV
            </button>
          </div>
        </div>

        {overview.isLoading && (
          <p className="text-sm text-slate-500" role="status">
            Loading commission data…
          </p>
        )}
        {overview.isError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-900" role="alert">
            {overview.error instanceof Error ? overview.error.message : 'Commission data could not be loaded.'}
            <button type="button" onClick={() => void overview.refetch()} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}
        {rateError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-900" role="alert">
            {rateError}
          </div>
        )}
        {rateSaved && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-900">
            {rateSaved}
          </div>
        )}

        {data && (
          <>
            {/* KPI cards — ledger figures for the selected window */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-blue-600" /> Booked GMV ({data.days}d)
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1.5">{formatPrice(data.earned.gross)}</div>
                <span className="text-slate-500 text-[11px]">Across {data.earned.packages} packages</span>
              </div>
              <div className="rounded-2xl border border-purple-200/60 bg-purple-50 p-5">
                <span className="text-purple-600 font-bold uppercase text-[10px] flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Earned Commission
                </span>
                <div className="text-2xl font-black text-purple-900 mt-1.5">{formatPrice(data.earned.commission)}</div>
                <span className="text-purple-700 text-[11px]">Retained by the platform in this window</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Effective Rate
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1.5">
                  {data.effectiveRatePct === null ? '—' : `${data.effectiveRatePct.toFixed(2)}%`}
                </div>
                <span className="text-slate-500 text-[11px]">Commission ÷ booked volume for the window</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-orange-500" /> Global Default Rate
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1.5">{pct(data.globalDefaultRate)}</div>
                <span className="text-slate-500 text-[11px]">Applies where no override is set</span>
              </div>
            </div>

            {/* Global rate editor */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="h-4 w-4 text-orange-500" />
                Set the Global Default Rate
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                New packages are charged this rate unless their category or vendor carries an override. The change is
                written to the platform settings and recorded in the audit trail below.
              </p>
              <form onSubmit={handleSetGlobalRate} className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={globalRateInput}
                    onChange={(e) => setGlobalRateInput(e.target.value)}
                    placeholder={(data.globalDefaultRate * 100).toFixed(2)}
                    aria-label="New global commission rate in percent"
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
                <button
                  type="submit"
                  disabled={actions.setGlobalCommission.isPending || !globalRateInput}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {actions.setGlobalCommission.isPending ? 'Saving…' : 'Save Rate'}
                </button>
              </form>
            </div>

            {/* By category */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  Commission by Category
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set a per-category override, or clear it to fall back to the global default.
                </p>
              </div>
              {data.byCategory.length === 0 ? (
                <p className="p-5 text-xs text-slate-400">No category activity in this window.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Sellers</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Commission</th>
                      <th className="p-3 text-right">Effective</th>
                      <th className="p-3">Override %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byCategory.map((cat) => (
                      <tr key={cat.id}>
                        <td className="p-3">
                          <span className="font-bold text-slate-900">{cat.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{cat.slug}</span>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">{cat.sellers}</td>
                        <td className="p-3 text-right font-mono">{formatPrice(cat.gross)}</td>
                        <td className="p-3 text-right font-mono font-bold text-purple-700">{formatPrice(cat.commission)}</td>
                        <td className="p-3 text-right font-semibold text-slate-700">{pct(cat.effective)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              aria-label={`Commission override for ${cat.name} in percent`}
                              value={categoryInputs[cat.id] ?? (cat.override === null ? '' : String(+(cat.override * 100).toFixed(2)))}
                              onChange={(e) =>
                                setCategoryInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                              }
                              placeholder="Default"
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                            />
                            <button
                              type="button"
                              disabled={categoryRateMutation.isPending}
                              onClick={() => {
                                const raw = categoryInputs[cat.id];
                                if (raw === undefined || raw === '') {
                                  categoryRateMutation.mutate({ categoryId: cat.id, rate: null });
                                  return;
                                }
                                const parsed = parseFloat(raw);
                                if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
                                  setRateError(`"${cat.name}": enter a rate between 0 and 100, or clear the field to use the default.`);
                                  return;
                                }
                                categoryRateMutation.mutate({ categoryId: cat.id, rate: parsed / 100 });
                              }}
                              className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By vendor */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  Commission by Vendor
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Per-vendor overrides are managed from each vendor&apos;s console page; this is the booked result.
                </p>
              </div>
              {data.byVendor.length === 0 ? (
                <p className="p-5 text-xs text-slate-400">No vendor activity in this window.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Store</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Commission</th>
                      <th className="p-3 text-right">Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byVendor.map((vendor) => (
                      <tr key={vendor.id}>
                        <td className="p-3 font-bold text-slate-900">{vendor.storeName}</td>
                        <td className="p-3 text-right font-mono">{formatPrice(vendor.gross)}</td>
                        <td className="p-3 text-right font-mono font-bold text-purple-700">{formatPrice(vendor.commission)}</td>
                        <td className="p-3 text-right font-semibold text-slate-700">
                          {vendor.override === null ? '—' : pct(vendor.override)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Audit trail of rate changes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                Rate Change History
              </h3>
              {data.changes.length === 0 ? (
                <p className="text-xs text-slate-400 mt-3">No commission changes recorded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {data.changes.map((change) => (
                    <li key={change.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/60 px-3.5 py-2.5 text-xs">
                      <span className="font-bold text-slate-800">{change.action}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {JSON.stringify(change.before)} → {JSON.stringify(change.after)}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {change.actor ?? 'System'} • {new Date(change.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
