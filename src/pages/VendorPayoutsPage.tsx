import React, { useState } from 'react';
import {
  Building2,
  Zap,
  Lock,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Info,
  AlertCircle,
  Trash2,
  Star,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { StatusBadge } from '../components/ui/status-badge';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';
import {
  useAddBankAccount,
  useBankAccounts,
  usePayoutHistory,
  useRemoveBankAccount,
  useRequestPayout,
  useSetDefaultBankAccount,
  useVendorBalance,
} from '../features/vendor/hooks/useVendorEarnings';
import { useVendorStore } from '../features/vendor/hooks/useVendorStore';
import type { PayoutReceipt } from '../features/vendor/api/earnings';

const money = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CUTOFF_DAYS: Record<'all' | '30d' | '90d' | 'ytd', number | null> = {
  all: null,
  '30d': 30,
  '90d': 90,
  ytd: null,
};

/** `request_payout` charges this on the instant rail and nothing on standard. */
const INSTANT_FEE_RATE = 0.015;

export const VendorPayoutsPage: React.FC = () => {
  const balance = useVendorBalance();
  const history = usePayoutHistory(100);
  const banks = useBankAccounts();
  const store = useVendorStore();

  const requestPayout = useRequestPayout();
  const addBank = useAddBankAccount();
  const removeBank = useRemoveBankAccount();
  const setDefaultBank = useSetDefaultBankAccount();

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '90d' | 'ytd'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'instant' | 'standard'>('instant');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PayoutReceipt | null>(null);

  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [routing, setRouting] = useState('');
  const [accountType, setAccountType] = useState('Business Checking');
  const [bankError, setBankError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const wallet = balance.data;
  const payouts = history.data ?? [];
  const accounts = banks.data ?? [];
  const profile = store.data;
  const defaultAccount = accounts.find((a) => a.isDefault) ?? null;
  const pendingPayouts = payouts.filter((p) => p.status === 'processing');
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    const days = CUTOFF_DAYS[timeFilter];
    if (timeFilter === 'ytd') {
      return new Date(p.createdAt).getFullYear() === new Date().getFullYear();
    }
    if (days !== null) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return new Date(p.createdAt).getTime() >= cutoff;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage) || 1;
  const pagedPayouts = filteredPayouts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /**
   * Payout-history columns for DataTable. The processing pill carries a
   * status dot inside the pill, which StatusBadge cannot render, so it keeps
   * its local markup (the AdminReportsPage pattern); completed and failed
   * are plain pills and go through StatusBadge.
   */
  const payoutColumns: DataTableColumn<(typeof payouts)[number]>[] = [
    {
      key: 'requested',
      header: 'REQUESTED',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 text-slate-600 font-medium',
      cell: (row) =>
        new Date(row.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'reference',
      header: 'REFERENCE',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 font-mono font-bold text-slate-900 text-[11px]',
      cell: (row) => (
        <button
          onClick={() => row.reference && handleCopyRef(row.reference)}
          className="inline-flex items-center gap-1 hover:text-slate-700"
          title="Copy reference"
        >
          <span>{row.reference ?? row.id.slice(0, 8)}</span>
          {copiedRef === (row.reference ?? row.id) ? (
            <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3 text-slate-400" aria-hidden="true" />
          )}
        </button>
      ),
    },
    {
      key: 'rail',
      header: 'RAIL',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 font-medium text-slate-700',
      cell: (row) => row.method,
    },
    {
      key: 'amount',
      header: 'AMOUNT',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 font-bold text-slate-900',
      cell: (row) => money(row.amount),
    },
    {
      key: 'fee',
      header: 'FEE',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 font-semibold text-rose-600',
      cell: (row) => (row.fee === 0 ? '$0.00' : `-${money(row.fee)}`),
    },
    {
      key: 'deposit',
      header: 'DEPOSIT',
      headerClassName: 'text-[11px]',
      className: 'py-3.5 font-semibold text-slate-900',
      cell: (row) => money(row.deposit),
    },
    {
      key: 'status',
      header: 'STATUS',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (row) => (
        <>
          {row.status === 'processing' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              Processing
            </span>
          )}
          {row.status === 'completed' && <StatusBadge status="completed" className="text-[11px]" />}
          {row.status === 'failed' && <StatusBadge status="failed" className="text-[11px]" />}
        </>
      ),
    },
  ];

  const requestedAmount = Math.max(0, Number.parseFloat(payoutAmount || '0') || 0);
  const feePreview = payoutMethod === 'instant' ? Math.round(requestedAmount * INSTANT_FEE_RATE * 100) / 100 : 0;
  const depositPreview = Math.round((requestedAmount - feePreview) * 100) / 100;
  const available = wallet?.available ?? 0;

  const handleRequestPayout = async () => {
    setPayoutError(null);
    if (requestedAmount <= 0) {
      setPayoutError('Enter an amount above zero.');
      return;
    }
    if (requestedAmount > available) {
      setPayoutError(`The database will refuse this: ${money(available)} is available.`);
      return;
    }
    try {
      const result = await requestPayout.mutateAsync({ amount: requestedAmount, method: payoutMethod });
      setReceipt(result);
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      showToast(
        `Payout of ${money(result.amount)} booked (${money(result.fee)} fee, ${money(result.deposit)} to deposit).`,
      );
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddBank = async () => {
    setBankError(null);
    try {
      await addBank.mutateAsync({
        holderName,
        bankName,
        maskedAccount: last4,
        maskedRouting: routing ? `•••• ${routing.slice(-4)}` : undefined,
        accountType: accountType.toLowerCase().replace(/\s+/g, '_'),
      });
      setIsBankModalOpen(false);
      setHolderName('');
      setBankName('');
      setLast4('');
      setRouting('');
      showToast('Deposit account saved. Only the last digits are stored.');
    } catch (err) {
      setBankError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveBank = async (id: string, label: string) => {
    setBankError(null);
    try {
      await removeBank.mutateAsync(id);
      showToast(`Removed ${label}.`);
    } catch (err) {
      setBankError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSetDefault = async (id: string) => {
    setBankError(null);
    try {
      await setDefaultBank.mutateAsync(id);
      showToast('Default deposit account updated.');
    } catch (err) {
      setBankError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleExportCsv = () => {
    const data = filteredPayouts.map((p) => ({
      reference: p.reference ?? p.id,
      createdAt: new Date(p.createdAt).toLocaleString('en-US'),
      method: p.method,
      amount: p.amount.toFixed(2),
      fee: p.fee.toFixed(2),
      deposit: p.deposit.toFixed(2),
      status: p.status,
      balanceAfter: p.balanceAfter === undefined ? '' : p.balanceAfter.toFixed(2),
    }));
    exportToCsv(`vendor-payout-ledger-${new Date().toISOString().split('T')[0]}.csv`, data, {
      reference: 'Reference',
      createdAt: 'Requested At',
      method: 'Rail',
      amount: 'Amount ($)',
      fee: 'Fee ($)',
      deposit: 'Deposit ($)',
      status: 'Status',
      balanceAfter: 'Balance After ($)',
    });
    showToast(`Exported ${data.length} payout${data.length === 1 ? '' : 's'}.`);
  };

  const reservePct = profile ? profile.payoutReservePct * 100 : null;
  const isLoading = balance.isPending || history.isPending || banks.isPending;
  const loadError = balance.error ?? history.error ?? banks.error ?? store.error;

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              FINANCIAL MANAGEMENT <span className="text-slate-300">/</span> PAYOUTS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Payouts &amp; Deposit Accounts
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Your balance is what the database has earned for you, minus what has left and the
              reserve it holds back. Money moves only when you request it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Add Deposit Account
            </button>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={available <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              Request a Payout
            </button>
          </div>
        </div>

        {loadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span>{loadError instanceof Error ? loadError.message : String(loadError)}</span>
            <button
              type="button"
              onClick={() => {
                void balance.refetch();
                void history.refetch();
                void banks.refetch();
              }}
              className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 hover:bg-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {receipt && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-bold">Payout {receipt.reference} booked</div>
                <div className="text-emerald-800/80 mt-0.5">
                  {money(receipt.amount)} requested · {money(receipt.fee)} fee ·{' '}
                  {money(receipt.deposit)} to deposit · status processing
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleCopyRef(receipt.reference)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                {copiedRef === receipt.reference ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                Copy reference
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                AVAILABLE NOW
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">
                {wallet ? money(wallet.available) : '—'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                earned − paid out − reserve, computed in Postgres
              </div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full"
                  style={{
                    width: `${wallet && wallet.lifetimeNet > 0 ? Math.min(100, (wallet.available / wallet.lifetimeNet) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                of {wallet ? money(wallet.lifetimeNet) : '—'} lifetime net earned
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  HELD IN RESERVE
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                  {reservePct === null ? '—' : `${reservePct.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">
                {wallet ? money(wallet.reserve) : '—'}
              </div>
              <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {profile
                    ? `${reservePct?.toFixed(1)}% of your lifetime net, set in Store Settings`
                    : 'Reading your reserve rate…'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                TOTAL PAID OUT
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">
                {wallet ? money(wallet.paidOut) : '—'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {payouts.length} payout{payouts.length === 1 ? '' : 's'} on record
              </div>
            </div>
            <div className="mt-4 pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Awaiting the bank</span>
              <span className="font-bold text-slate-900">
                {wallet ? `${pendingPayouts.length} · ${money(pendingAmount)}` : '—'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                PAYOUT CADENCE
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                {profile ? profile.payoutSchedule || 'Not set' : '—'}
              </div>
              <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 font-medium">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {defaultAccount
                    ? `${defaultAccount.bankName} (•••• ${defaultAccount.maskedAccount})`
                    : 'No default account saved yet'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              The label is your own setting; nothing here leaves the platform until you request a
              payout.
            </div>
          </div>
        </div>

        {/* ── Main 2-Column Section ─────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Current position */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Where Your Balance Stands
                  </h2>
                  <p className="text-xs text-slate-500">
                    Every number below is what <code>vendor_balance()</code> returns for your store.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
                  {wallet ? `${wallet.pendingPayouts} payout${wallet.pendingPayouts === 1 ? '' : 's'} processing` : 'Reading…'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Nothing is scheduled to leave on its own
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                      This marketplace has no automated ACH runner: a payout row is created only
                      when you ask for one, and it starts life as <em>processing</em>.
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    AVAILABLE TO REQUEST
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {wallet ? money(wallet.available) : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {wallet ? `${money(wallet.lifetimeNet)} earned · ${money(wallet.paidOut)} out · ${money(wallet.reserve)} reserved` : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="font-bold text-slate-900">1 · Request</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    <code>request_payout</code> re-reads your available balance and refuses more
                    than it holds.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="font-bold text-slate-900">2 · Fee</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Instant costs {money(INSTANT_FEE_RATE * 100).replace('.00', '')}% of the
                    amount; standard ACH costs nothing. The database sets it, not this page.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="font-bold text-slate-900">3 · Bank leg</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No bank rail is connected in this build, so nothing marks a payout completed.
                  </p>
                </div>
              </div>
            </div>

            {/* Payout history */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Payout History</h2>
                  <p className="text-xs text-slate-500">
                    Rows in your <code>payouts</code> table, newest first
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <label htmlFor="payout-period-filter" className="sr-only">
                    Filter payouts by period
                  </label>
                  <Select
                    value={timeFilter}
                    onValueChange={(value) => { setTimeFilter(value as 'all' | '30d' | '90d' | 'ytd'); setCurrentPage(1); }}
                  >
                    <SelectTrigger id="payout-period-filter" aria-label="Filter payouts by period" className="h-8 w-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Time</SelectItem>
                      <SelectItem value="30d" className="text-xs">Last 30 Days</SelectItem>
                      <SelectItem value="90d" className="text-xs">Last 90 Days</SelectItem>
                      <SelectItem value="ytd" className="text-xs">Year to Date</SelectItem>
                    </SelectContent>
                  </Select>

                  <label htmlFor="payout-status-filter" className="sr-only">
                    Filter payouts by status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => { setStatusFilter(value as 'all' | 'processing' | 'completed' | 'failed'); setCurrentPage(1); }}
                  >
                    <SelectTrigger id="payout-status-filter" aria-label="Filter payouts by status" className="h-8 w-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Status: All</SelectItem>
                      <SelectItem value="processing" className="text-xs">Processing</SelectItem>
                      <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                      <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    onClick={handleExportCsv}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer"
                    title="Export payout history"
                    aria-label="Export payout history"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <DataTable
                ariaLabel="Payout history"
                columns={payoutColumns}
                rows={isLoading ? [] : pagedPayouts}
                getRowKey={(row) => row.id}
                emptyState={
                  <div className="px-4 py-10 text-center text-slate-500">
                    {isLoading ? (
                      <p role="status" aria-live="polite" className="font-semibold text-slate-700">Reading your payouts…</p>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-700">
                          {payouts.length === 0 ? 'No payouts requested yet' : 'Nothing matches these filters'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {payouts.length === 0
                            ? 'Request one when your available balance is above zero.'
                            : 'Widen the period or status filter to see the rest.'}
                        </p>
                      </>
                    )}
                  </div>
                }
              />

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <span>
                  Showing {filteredPayouts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredPayouts.length)} of{' '}
                  {filteredPayouts.length} payouts · {payouts.length} in total
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Deposit Accounts</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {accounts.length} SAVED
                </span>
              </div>

              {bankError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800 flex items-start gap-2"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                  <span>{bankError}</span>
                </div>
              )}

              <div className="space-y-3">
                {banks.isPending && (
                  <p role="status" aria-live="polite" className="text-xs text-slate-400">
                    Reading your accounts…
                  </p>
                )}
                {!banks.isPending && accounts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                    <Building2 className="h-5 w-5 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-700">No deposit account yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add one so a payout has somewhere to be sent.
                    </p>
                  </div>
                )}
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      acc.isDefault
                        ? 'border-slate-300 bg-slate-50/50 shadow-2xs'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{acc.bankName}</span>
                          {acc.isDefault && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {acc.holderName} · {acc.accountType} · •••• {acc.maskedAccount}
                        </div>
                        {acc.maskedRouting && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Routing {acc.maskedRouting}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Saved {new Date(acc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {acc.isDefault ? (
                        <span className="font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <Star className="h-3 w-3" aria-hidden="true" /> Used for payouts
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => void handleSetDefault(acc.id)}
                            className="font-bold text-slate-900 hover:underline cursor-pointer"
                          >
                            Set default
                          </button>
                          <button
                            onClick={() => void handleRemoveBank(acc.id, acc.bankName)}
                            disabled={removeBank.isPending}
                            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold cursor-pointer disabled:opacity-40"
                            title="Remove this account"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsBankModalOpen(true)}
                className="w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-center text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                + Add Deposit Account
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">Reserve Rules</h2>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Reserve rate</div>
                    <div className="text-[11px] text-slate-500">
                      Held from lifetime net earnings
                    </div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">
                    {reservePct === null ? '—' : `${reservePct.toFixed(1)}%`}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Reserve held</div>
                    <div className="text-[11px] text-slate-500">Not requestable yet</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">
                    {wallet ? money(wallet.reserve) : '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Instant rail fee</div>
                    <div className="text-[11px] text-slate-500">Set by request_payout</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">1.5%</div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Payout label</div>
                    <div className="text-[11px] text-slate-500">Store Settings text</div>
                  </div>
                  <div className="text-right font-black text-slate-900 text-sm">
                    {profile?.payoutSchedule || 'Not set'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-500">
                <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] leading-relaxed">
                  Changing the reserve rate or the payout label is a Store Settings write. No
                  deposit network, FDIC coverage or tax form is wired into this build, so nothing
                  here promises a bank arrival date.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Request Payout Modal ──────────────────────────────── */}
        <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 fill-amber-500 text-amber-500" aria-hidden="true" />
                Request a Payout
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                The database re-checks your available balance and sets the fee; this preview is an
                estimate, not what gets booked.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Available to withdraw</span>
                  <span className="font-bold text-slate-900">{wallet ? money(wallet.available) : '—'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{payoutMethod === 'instant' ? 'Instant transfer fee (1.5%)' : 'Standard ACH fee'}</span>
                  <span className="font-bold text-rose-600">-{money(feePreview)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Estimated deposit</span>
                  <span className="text-emerald-700">{money(depositPreview)}</span>
                </div>
              </div>

              <div>
                <label htmlFor="payout-amount" className="block font-bold text-slate-700 mb-1">
                  Amount (USD)
                </label>
                <input
                  id="payout-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={available}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={wallet ? wallet.available.toFixed(2) : '0.00'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => wallet && setPayoutAmount(wallet.available.toFixed(2))}
                  className="mt-1 text-[11px] font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Use all {wallet ? money(wallet.available) : '—'}
                </button>
              </div>

              <div>
                <label htmlFor="payout-method" className="block font-bold text-slate-700 mb-1">
                  Rail
                </label>
                <select
                  id="payout-method"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'instant' | 'standard')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="instant">Instant · 1.5% fee</option>
                  <option value="standard">Standard ACH · no fee</option>
                </select>
              </div>

              <div>
                <span className="block font-bold text-slate-700 mb-1">Destination</span>
                <div className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-900">
                  {defaultAccount ? (
                    `${defaultAccount.bankName} · ${defaultAccount.holderName} (•••• ${defaultAccount.maskedAccount})`
                  ) : (
                    <span className="text-amber-700 text-xs font-semibold">
                      No default account saved. Add one first — the payout row still records the
                      rail, but there is no destination on file.
                    </span>
                  )}
                </div>
              </div>

              {payoutError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
                  <span>{payoutError}</span>
                </div>
              )}

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
                <span>
                  Booking this writes a <code>payouts</code> row and an audit entry. No banking
                  integration exists in this build, so it stays <em>processing</em> — funds do not
                  move anywhere.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRequestPayout()}
                disabled={requestPayout.isPending || available <= 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {requestPayout.isPending ? 'Booking…' : 'Confirm Payout'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Add Bank Account Modal ────────────────────────────── */}
        <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-700" aria-hidden="true" />
                Add Deposit Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Only the last digits are stored, so a leaked row can never expose an account
                number.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddBank();
              }}
              className="space-y-3.5 py-2 text-xs"
            >
              <div>
                <label htmlFor="holder-name" className="block font-bold text-slate-700 mb-1">
                  Account Holder
                </label>
                <input
                  id="holder-name"
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Your registered business name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="bank-name" className="block font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  id="bank-name"
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Bank of America"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="account-last4" className="block font-bold text-slate-700 mb-1">
                  Last 4 digits of the account number
                </label>
                <input
                  id="account-last4"
                  type="text"
                  required
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="4821"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="routing-last4" className="block font-bold text-slate-700 mb-1">
                  Routing number (optional — only the last 4 are kept)
                </label>
                <input
                  id="routing-last4"
                  type="text"
                  value={routing}
                  onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  maxLength={9}
                  placeholder="021000021"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="account-type" className="block font-bold text-slate-700 mb-1">
                  Account Type
                </label>
                <select
                  id="account-type"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option>Business Checking</option>
                  <option>Corporate Treasury</option>
                  <option>Operating Reserve</option>
                </select>
              </div>

              {bankError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
                  <span>{bankError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBank.isPending}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {addBank.isPending ? 'Saving…' : 'Save Account'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Toast ─────────────────────────────────────────────── */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
