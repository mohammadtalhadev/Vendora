import React, { useState } from 'react';
import {
  Building2,
  Zap,
  Lock,
  CheckCircle2,
  Clock,
  RotateCw,
  Download,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  Info,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface PayoutRecord {
  id: string;
  period: string;
  destination: string;
  amount: number;
  status: 'processing' | 'completed' | 'failed';
  traceId: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  last4: string;
  routing: string;
  isDefault: boolean;
  statusText: string;
}

export const VendorPayoutsPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isInstantPayoutModalOpen, setIsInstantPayoutModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '90d' | 'ytd'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed'>('all');
  const [autoWithdraw, setAutoWithdraw] = useState(true);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: 'bank-1',
      bankName: 'JPMorgan Chase Bank, N.A.',
      accountType: 'Business Checking',
      last4: '4821',
      routing: '021000021',
      isDefault: true,
      statusText: 'Direct Deposit Active',
    },
    {
      id: 'bank-2',
      bankName: 'Silicon Valley Bank / First Rep.',
      accountType: 'Treasury Reserve',
      last4: '9102',
      routing: '121140399',
      isDefault: false,
      statusText: 'Secondary Wire Account',
    },
  ]);

  const [payouts] = useState<PayoutRecord[]>([
    {
      id: 'TR-90412-ACH',
      period: 'Oct 01 – Oct 15, 2026',
      destination: 'Chase ••••4821',
      amount: 2450.0,
      status: 'processing',
      traceId: 'ACH-48192019',
    },
    {
      id: 'TR-89210-ACH',
      period: 'Sep 16 – Sep 30, 2026',
      destination: 'Chase ••••4821',
      amount: 2180.5,
      status: 'completed',
      traceId: 'ACH-48102911',
    },
    {
      id: 'TR-88195-ACH',
      period: 'Sep 01 – Sep 15, 2026',
      destination: 'Chase ••••4821',
      amount: 2890.0,
      status: 'completed',
      traceId: 'ACH-47981290',
    },
    {
      id: 'TR-87002-ACH',
      period: 'Aug 16 – Aug 31, 2026',
      destination: 'Chase ••••4821',
      amount: 1940.2,
      status: 'completed',
      traceId: 'ACH-47629103',
    },
    {
      id: 'TR-85940-ACH',
      period: 'Aug 01 – Aug 15, 2026',
      destination: 'Chase ••••4821',
      amount: 3120.0,
      status: 'completed',
      traceId: 'ACH-47209184',
    },
  ]);

  const handleCopyTrace = (traceId: string) => {
    navigator.clipboard?.writeText(traceId);
    setCopiedTraceId(traceId);
    setTimeout(() => setCopiedTraceId(null), 2000);
  };

  const handleSetDefaultBank = (accountId: string) => {
    setBankAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isDefault: acc.id === accountId,
      }))
    );
  };

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumbs & Page Header ───────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              FINANCIAL MANAGEMENT <span className="text-slate-300">/</span> PAYOUTS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Payouts &amp; Disbursements
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage bank settlement accounts, monitor upcoming scheduled disbursements, escrow reserves, and disbursement history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddBankModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Building2 className="h-4 w-4 text-slate-500" />
              Manage Bank Accounts
            </button>
            <button
              onClick={() => setIsInstantPayoutModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
              Request Instant Payout
            </button>
          </div>
        </div>

        {/* ── 4 Top KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Available for Payout */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>AVAILABLE FOR PAYOUT</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Cycle 72%
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">$2,450.00</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Ready to transfer • Scheduled Oct 15, 2026</span>
              </div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Escrow / Security Reserve */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>ESCROW / SECURITY RESERVE</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                  Normal Risk Tier
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">$1,200.00</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span>Held for 14-day rolling return buffer</span>
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
              <span>Auto-adjusts per volume</span>
              <span className="font-semibold text-slate-700">100% Retained</span>
            </div>
          </div>

          {/* Card 3: Total Disbursed (YTD) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>TOTAL DISBURSED (YTD)</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ↑ +24.8%
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">$86,420.00</div>
              <div className="mt-2 text-xs text-slate-500">
                28 total disbursements completed this cycle
              </div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }} />
              </div>
              <div className="mt-1.5 text-right text-[10px] text-slate-400">
                vs $69.2k 2025
              </div>
            </div>
          </div>

          {/* Card 4: Settlement Cadence */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>SETTLEMENT CADENCE</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ✓ Verified
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                Bi-Weekly (1st &amp; 15th)
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Chase Business (•••4821)</span>
              </div>
            </div>
            <div className="mt-4 pt-2 text-xs text-slate-400 border-t border-slate-100">
              Next: <strong className="text-slate-700">Oct 15, 2026</strong> Direct ACH
            </div>
          </div>
        </div>

        {/* ── Main 2-Column Section (8 cols / 4 cols) ──────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left Column (8 cols): Schedules & Payout History ──── */}
          <div className="space-y-6 lg:col-span-8">
            {/* Box 1: Disbursement Schedule & Upcoming Transfers */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Disbursement Schedule &amp; Upcoming Transfers
                  </h2>
                  <p className="text-xs text-slate-500">
                    Telemetry and pipeline status for the active settlement period
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
                  Batch Cycle #2026-20
                </span>
              </div>

              {/* Active Release Highlight Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Upcoming Release: Oct 15, 2026
                      </span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        In 3 Days
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Routing to JPMorgan Chase Business Checking (••••4821)
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    CALCULATED AMOUNT
                  </div>
                  <div className="text-2xl font-black text-slate-900">$2,450.00</div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-blue-600 font-semibold mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span>Pending Settlement Clearance</span>
                  </div>
                </div>
              </div>

              {/* Settlement Maturation Pipeline (Stepper) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>SETTLEMENT MATURATION PIPELINE</span>
                  <span className="text-slate-400 normal-case font-medium">
                    Estimated ACH Arrival: Oct 16, 2026
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {/* Step 1 */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        1
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-2 font-bold text-xs text-slate-900">Orders Cleared</div>
                    <div className="text-[11px] text-slate-500">Oct 1 – Oct 12</div>
                  </div>

                  {/* Step 2 */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        2
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-2 font-bold text-xs text-slate-900">Settlement Calc</div>
                    <div className="text-[11px] text-slate-500">Net of $120 fees</div>
                  </div>

                  {/* Step 3 */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        3
                      </div>
                      <RotateCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                    </div>
                    <div className="mt-2 font-bold text-xs text-slate-900">Bank ACH Trigger</div>
                    <div className="text-[11px] text-slate-500">Scheduled Oct 15</div>
                  </div>

                  {/* Step 4 */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[10px] font-bold">
                        4
                      </div>
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="mt-2 font-bold text-xs text-slate-700">Funds Deposited</div>
                    <div className="text-[11px] text-slate-400">Est. Oct 16, 2026</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Payout History & Transfer Archive */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Payout History &amp; Transfer Archive
                  </h2>
                  <p className="text-xs text-slate-500">
                    Reconciliation ledger of past merchant settlements
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
                  >
                    <option value="all">All Time</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="ytd">Year to Date (YTD)</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
                  >
                    <option value="all">Status: All</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>

                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs"
                    title="Export Ledger CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">TRANSFER REF</th>
                      <th className="px-4 py-3">SETTLEMENT PERIOD</th>
                      <th className="px-4 py-3">DESTINATION</th>
                      <th className="px-4 py-3">DISBURSED</th>
                      <th className="px-4 py-3">STATUS</th>
                      <th className="px-4 py-3 text-right">TRACE / ACH ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayouts.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {row.id}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {row.period}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {row.destination}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          ${row.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          {row.status === 'processing' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                              Processing
                            </span>
                          )}
                          {row.status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                          <button
                            onClick={() => handleCopyTrace(row.traceId)}
                            className="inline-flex items-center gap-1 hover:text-slate-900 text-[11px]"
                            title="Click to copy Trace ID"
                          >
                            <span>{row.traceId}</span>
                            {copiedTraceId === row.traceId ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <span>Showing 1-5 of 28 disbursements</span>
                <div className="flex items-center gap-2">
                  <button className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    Previous
                  </button>
                  <button className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column (4 cols): Bank Accounts & Reserves ──── */}
          <div className="space-y-6 lg:col-span-4">
            {/* Card 1: Linked Accounts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Linked Accounts</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {bankAccounts.length} CONNECTED
                </span>
              </div>

              <div className="space-y-3">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      acc.isDefault
                        ? 'border-slate-300 bg-slate-50/50 shadow-2xs'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">
                              {acc.bankName}
                            </span>
                            {acc.isDefault ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                Default
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                                Secondary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {acc.accountType} •••• {acc.last4}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400">
                        Routing: {acc.routing}
                      </span>
                      {acc.isDefault ? (
                        <span className="font-semibold text-emerald-600">
                          {acc.statusText}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultBank(acc.id)}
                          className="font-bold text-slate-900 hover:underline"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsAddBankModalOpen(true)}
                className="w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-center text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                + Add New Bank Account
              </button>
            </div>

            {/* Card 2: Reserve & Thresholds */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-slate-900">Reserve &amp; Thresholds</h2>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Rolling Buffer Window</div>
                    <div className="text-[11px] text-slate-500">Returns &amp; refunds protection</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">14 Days</div>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Security Reserve Hold</div>
                    <div className="text-[11px] text-slate-500">Chargeback coverage tier</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">$1,200.00</div>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Min. Payout Threshold</div>
                    <div className="text-[11px] text-slate-500">Disbursement minimum</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">$50.00</div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-slate-900">Auto-withdraw when above threshold</div>
                    <div className="text-[11px] text-slate-500">Initiate automatically on schedule</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoWithdraw(!autoWithdraw)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoWithdraw ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoWithdraw ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  FDIC insured through partnering custodial institutions. Reserves are recalculated at the close of every billing cycle.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Instant Payout Modal ─────────────────────────────────── */}
        <Dialog open={isInstantPayoutModalOpen} onOpenChange={setIsInstantPayoutModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 fill-amber-500 text-amber-500" />
                Request Instant Payout
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Disburse available settled balance directly to your primary bank debit rail within 30 minutes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Available Eligible Balance:</span>
                  <span className="font-bold text-slate-900">$2,450.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Instant Transfer Fee (1.5%):</span>
                  <span className="font-bold text-rose-600">-$36.75</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Net Estimated Deposit:</span>
                  <span className="text-emerald-700">$2,413.25</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destination Account
                </label>
                <div className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-900">
                  JPMorgan Chase Bank, N.A. (•••• 4821)
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Instant payouts are subject to bank risk monitoring and debit network availability.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsInstantPayoutModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Instant payout of $2,413.25 initiated to JPMorgan Chase Bank!');
                  setIsInstantPayoutModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Confirm Instant Transfer
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Add Bank Account Modal ──────────────────────────────── */}
        <Dialog open={isAddBankModalOpen} onOpenChange={setIsAddBankModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-700" />
                Add Settlement Bank Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Connect a verified commercial checking or treasury account for scheduled ACH deposits.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Bank account submitted for micro-deposit verification.');
                setIsAddBankModalOpen(false);
              }}
              className="space-y-3.5 py-2 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank of America, Wells Fargo"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Routing Number (9 Digits)</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{9}"
                  placeholder="021000021"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Type</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900">
                  <option>Business Checking</option>
                  <option>Corporate Treasury</option>
                  <option>Operating Reserve</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Save &amp; Verify Account
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />
      </div>
    </WorkspaceLayout>
  );
};
