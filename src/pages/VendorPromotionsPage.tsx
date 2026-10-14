import React, { useMemo, useRef, useState } from 'react';
import {
  Tag,
  Plus,
  Calendar,
  Copy,
  Check,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Pause,
  Play,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Input } from '../components/ui/input';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';
import { useCurrency } from '../store/currency-store';
import {
  useCreatePromotion,
  useDeletePromotion,
  useSetPromotionActive,
  useVendorPromotions,
  type VendorPromotion,
} from '../features/vendor/hooks/useVendorPromotions';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type PromoStatus = 'live' | 'scheduled' | 'exhausted' | 'expired' | 'off';

/**
 * `quote_checkout` refuses a code that is inactive, outside its window, or already at its
 * usage cap, so a campaign is only claimable when none of those apply.
 */
function statusOf(promo: VendorPromotion, now: number): PromoStatus {
  if (!promo.active) return 'off';
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 'scheduled';
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return 'expired';
  if (promo.usageCount >= promo.usageLimit) return 'exhausted';
  return 'live';
}

const STATUS_STYLE: Record<PromoStatus, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  exhausted: 'border-amber-200 bg-amber-50 text-amber-800',
  expired: 'border-slate-200 bg-slate-100 text-slate-600',
  off: 'border-slate-200 bg-slate-100 text-slate-600',
};

const STATUS_TEXT: Record<PromoStatus, string> = {
  live: 'Claimable',
  scheduled: 'Not open yet',
  exhausted: 'Cap reached',
  expired: 'Window closed',
  off: 'Switched off',
};

type Tab = 'all' | 'live' | 'scheduled' | 'exhausted' | 'off';

/** The tab order, shared by the tablist markup and its arrow-key handler. */
const PROMO_TABS: Tab[] = ['all', 'live', 'scheduled', 'exhausted', 'off'];

function isoFromLocalInput(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const VendorPromotionsPage: React.FC = () => {
  const promotions = useVendorPromotions();
  const create = useCreatePromotion();
  const setActive = useSetPromotionActive();
  const remove = useDeletePromotion();
  // Amounts are stored in USD on `promotions`; every one of them is rendered through
  // formatPrice so the page never hard-codes a currency symbol.
  const { formatPrice } = useCurrency();

  const money = (value: number) => formatPrice(value);

  /** `promotions.discount_value` read according to `discount_type`. */
  const discountLabel = (promo: VendorPromotion) =>
    promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `${money(promo.discountValue)} off`;

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  // Deleting a coupon is irreversible, so the row waits here until the seller confirms.
  const [deleteTarget, setDeleteTarget] = useState<VendorPromotion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('10');
  const [formMinOrder, setFormMinOrder] = useState('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('1000');
  const [formStarts, setFormStarts] = useState('');
  const [formEnds, setFormEnds] = useState('');
  const [formActive, setFormActive] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 4500);
  };

  const rows = useMemo(() => promotions.data ?? [], [promotions.data]);
  const now = Date.now();
  const statuses = rows.map((p) => statusOf(p, now));

  const countOf = (tab: Tab) =>
    tab === 'all' ? rows.length : statuses.filter((s) => s === tab).length;

  const filtered = rows.filter((p, idx) => {
    if (activeTab !== 'all' && statuses[idx] !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
  });


  /**
   * Campaign columns for DataTable. The status pill carries a `bg-current`
   * status dot inside the pill, which StatusBadge cannot render, so it keeps
   * its local markup and the STATUS_STYLE / STATUS_TEXT maps (the
   * AdminReportsPage pattern; the same pill is reused by the most-redeemed
   * list below).
   */
  const campaignColumns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: 'code',
      header: 'CODE & CAMPAIGN',
      sortValue: (promo) => promo.code,
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => (
        <>
          <div className="font-bold text-slate-900">
            {promo.title || 'Untitled campaign'}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
              {promo.code}
            </span>
            <button
              type="button"
              onClick={() => void handleCopyCode(promo.code)}
              className="rounded text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
              aria-label={
                copiedCode === promo.code
                  ? `${promo.code} copied to the clipboard`
                  : `Copy ${promo.code} to the clipboard`
              }
              title="Copy code"
            >
              {copiedCode === promo.code ? (
                <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          </div>
          {promo.description && (
            <div className="mt-1 max-w-xs text-[11px] text-slate-400">
              {promo.description}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'discount',
      header: 'DISCOUNT',
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => (
        <>
          <div className="font-bold text-slate-900">{discountLabel(promo)}</div>
          {promo.maxDiscount !== undefined && (
            <div className="text-[11px] text-slate-500">
              Capped at {money(promo.maxDiscount)}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'minimum',
      header: 'MINIMUM / CAP',
      sortValue: (promo) => promo.minimumOrder,
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => (
        <>
          <div className="text-slate-700">
            {promo.minimumOrder > 0
              ? `Spend ${money(promo.minimumOrder)}`
              : 'No minimum'}
          </div>
          <div className="text-[11px] text-slate-500">
            Cap {promo.usageLimit.toLocaleString()} claim(s)
          </div>
        </>
      ),
    },
    {
      key: 'window',
      header: 'WINDOW',
      sortValue: (promo) => (promo.startsAt ? new Date(promo.startsAt).getTime() : null),
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => (
        <>
          <div className="font-semibold text-slate-900">
            {promo.startsAt || promo.endsAt ? 'Scheduled window' : 'Always open'}
          </div>
          <div className="text-[11px] text-slate-500">
            {promo.startsAt ? dateLabel(promo.startsAt) : 'from creation'}
            {' → '}
            {promo.endsAt ? dateLabel(promo.endsAt) : 'no end'}
          </div>
        </>
      ),
    },
    {
      key: 'redemptions',
      header: 'REDEMPTIONS',
      sortValue: (promo) => promo.usageCount,
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => {
        const pct = promo.usageLimit
          ? Math.min(100, Math.round((promo.usageCount / promo.usageLimit) * 100))
          : 0;
        return (
          <>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>
                {promo.usageCount} / {promo.usageLimit.toLocaleString()}
              </span>
              <span className="text-slate-400">{pct}%</span>
            </div>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => {
        const status = statusOf(promo, now);
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {STATUS_TEXT[status]}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'py-3.5',
      cell: (promo) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => void handleToggle(promo)}
            disabled={setActive.isPending}
            aria-label={`${promo.active ? 'Switch off' : 'Switch on'} ${promo.code}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {promo.active ? (
              <>
                <Pause className="h-3 w-3" aria-hidden="true" /> Switch off
              </>
            ) : (
              <>
                <Play className="h-3 w-3" aria-hidden="true" /> Switch on
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => askDelete(promo)}
            disabled={remove.isPending}
            aria-label={`Delete ${promo.code}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const redemptions = rows.reduce((sum, p) => sum + p.usageCount, 0);
  const caps = rows.reduce((sum, p) => sum + p.usageLimit, 0);
  const claimable = statuses.filter((s) => s === 'live').length;

  const topRedeemed = [...rows].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3);

  const handleCopyCode = async (code: string) => {
    setFormError(null);
    try {
      if (!navigator.clipboard) throw new Error('This browser blocks clipboard writes, so the code was not copied.');
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      // The tick icon only appears once the write actually landed.
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Park the campaign and open the confirm step; no query reaches the database yet. */
  const askDelete = (promo: VendorPromotion) => {
    setFormError(null);
    setToastMessage(null);
    setDeleteError(null);
    setDeleteTarget(promo);
  };

  const closeDelete = () => {
    if (remove.isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      // Real server write: `deletePromotion` issues a Supabase DELETE on `promotions` scoped by
      // vendor_id and throws when the row count coming back is zero.
      await remove.mutateAsync(deleteTarget.id);
      showToast(
        `Deleted ${deleteTarget.code}. Its ${deleteTarget.usageCount} recorded redemption(s) went with the row; orders it cheapened keep their booked totals.`,
      );
      setDeleteTarget(null);
    } catch (err) {
      // Queries refetch only after a successful delete, so the campaign stays in the table and the
      // server's reason is shown instead of a "Deleted" toast.
      setDeleteError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggle = async (promo: VendorPromotion) => {
    setFormError(null);
    try {
      const next = await setActive.mutateAsync({
        promotionId: promo.id,
        active: !promo.active,
      });
      showToast(
        next.active
          ? `${next.code} is switchable on again - checkout will accept it while it is inside its window.`
          : `${next.code} is off. Buyers typing it now get "Invalid or expired coupon code".`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreate = async () => {
    setFormError(null);
    const code = formCode.trim().toUpperCase();
    const value = Number.parseFloat(formDiscountValue);
    if (!code) {
      setFormError('A coupon needs a code - that is what buyers type at checkout.');
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setFormError('Discount value must be zero or more.');
      return;
    }
    try {
      const created = await create.mutateAsync({
        code,
        title: formTitle.trim(),
        description: formDescription.trim(),
        discountType: formDiscountType,
        discountValue: value,
        minimumOrder: Number.parseFloat(formMinOrder) || 0,
        maxDiscount: formMaxDiscount.trim() === '' ? null : Number.parseFloat(formMaxDiscount),
        usageLimit: Number.parseInt(formUsageLimit, 10) || 0,
        active: formActive,
        startsAt: isoFromLocalInput(formStarts),
        endsAt: isoFromLocalInput(formEnds),
      });
      setIsCreateOpen(false);
      setFormCode('');
      setFormTitle('');
      setFormDescription('');
      showToast(`Created ${created.code}. It is live on this store's seller group only.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      setFormError('Nothing to export - this filter has no campaigns, so no file was written.');
      return;
    }
    const data = filtered.map((p) => ({
      code: p.code,
      title: p.title,
      discount: discountLabel(p),
      minimumOrder: money(p.minimumOrder),
      maxDiscount: p.maxDiscount === undefined ? '' : money(p.maxDiscount),
      usageCount: p.usageCount,
      usageLimit: p.usageLimit,
      window:
        p.startsAt || p.endsAt
          ? `${p.startsAt ? dateLabel(p.startsAt) : 'open'} - ${p.endsAt ? dateLabel(p.endsAt) : 'open'}`
          : 'always open',
      status: statusOf(p, now),
      active: p.active ? 'yes' : 'no',
    }));
    try {
      exportToCsv(`vendor-promotions-${new Date().toISOString().split('T')[0]}.csv`, data, {
        code: 'Code',
        title: 'Campaign',
        discount: 'Discount',
        minimumOrder: 'Minimum order',
        maxDiscount: 'Max discount',
        usageCount: 'Redemptions',
        usageLimit: 'Usage cap',
        window: 'Window',
        status: 'Status',
        active: 'Switched on',
      });
      // A local browser download, not a server action - so the wording says exactly that.
      showToast(`Wrote ${data.length} campaign row(s) to a CSV file on this device.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Roving focus for the tablist: the tabs are one stop in the tab order, arrows move it. */
  const tabListRef = useRef<HTMLDivElement>(null);
  const moveTabFocus = (index: number) => {
    const next = PROMO_TABS[(index + PROMO_TABS.length) % PROMO_TABS.length];
    setActiveTab(next);
    tabListRef.current
      ?.querySelector<HTMLButtonElement>(`#promo-tab-${next}`)
      ?.focus();
  };

  const onTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = PROMO_TABS.indexOf(activeTab);
    if (index === -1) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTabFocus(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTabFocus(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTabFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTabFocus(PROMO_TABS.length - 1);
    }
  };

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              MARKETING <span className="text-slate-300">/</span> PROMOTIONS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Coupon Codes
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              A code you create here is matched by <code className="font-mono">quote_checkout</code>.
              It discounts only your own seller group, only once per order, and only when your cart
              subtotal reaches its minimum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 sm:self-auto"
            >
              <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Campaign windows
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 sm:self-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New coupon code
            </button>
          </div>
        </div>

        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {/* ── KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              CLAIMABLE RIGHT NOW
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {promotions.isPending ? '—' : claimable}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {rows.length} campaign(s) on this store
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              REDEMPTIONS BOOKED
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{redemptions}</div>
            <div className="mt-2 text-xs text-slate-500">
              Counted by checkout when a code discounted an order
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              CAP CONSUMED
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {caps ? `${Math.min(100, Math.round((redemptions / caps) * 100))}%` : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {redemptions} of {caps} claimed units
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SWITCHED OFF
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {statuses.filter((s) => s === 'off').length}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {statuses.filter((s) => s === 'expired').length} past their window,{' '}
              {statuses.filter((s) => s === 'exhausted').length} at cap
            </div>
          </div>
        </div>

        {/* ── Tabs + search ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="Filter campaigns by status"
              onKeyDown={onTabListKeyDown}
              className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0"
              data-lenis-prevent
            >
              {PROMO_TABS.map((tab) => (
                <button
                  key={tab}
                  id={`promo-tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls="promo-campaigns-panel"
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="capitalize">{tab === 'off' ? 'Switched off' : tab}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {countOf(tab)}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="w-full">
            <label htmlFor="promo-search" className="sr-only">
              Filter campaigns by code or title
            </label>
            <Input
              id="promo-search"
              type="text"
              placeholder="Filter by code or campaign title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              className="h-9 rounded-lg text-xs text-slate-700 focus:bg-white"
            />
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────── */}
        <div
          id="promo-campaigns-panel"
          role="tabpanel"
          aria-labelledby={`promo-tab-${activeTab}`}
          tabIndex={-1}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
        >
          {promotions.isError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-2 p-5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{(promotions.error as Error).message}</span>
            </div>
          )}

          {!promotions.isError && rows.length === 0 && (
            <div className="space-y-2 p-8 text-center">
              <Tag className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <div className="text-sm font-bold text-slate-900">No coupon codes yet</div>
              <p className="mx-auto max-w-xl text-xs text-slate-500">
                Create one and it is immediately readable by checkout. Codes are unique across the
                whole marketplace, so a popular string may already belong to another store.
              </p>
            </div>
          )}

          {!promotions.isError && rows.length > 0 && (
            <>
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-sm font-bold text-slate-900">Your campaigns</h2>
                <p className="text-xs text-slate-500">{filtered.length} shown of {rows.length}</p>
              </div>

              <DataTable
                ariaLabel="Coupon campaigns on this store"
                columns={campaignColumns}
                rows={filtered}
                getRowKey={(promo) => promo.id}
                emptyState={
                  <div className="space-y-2 px-4 py-10 text-center">
                    <Tag className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <div className="text-sm font-bold text-slate-900">
                      No campaigns match this view
                    </div>
                    <p className="mx-auto max-w-md text-xs text-slate-500">
                      Your store has campaigns on its books, but none of them sit in the tab or
                      search you have open. Switch tabs or clear the search to see the rest.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                }
              />

              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                No order stores which code was typed. Checkout freezes the discounted subtotal onto the
                package and increments the campaign, so deleting a code loses its redemption count
                while the orders it cheapened keep the totals they were booked with.
              </div>
            </>
          )}
        </div>

        {/* ── Bottom: most redeemed + how it applies ──────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-700" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-900">Most redeemed codes</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Ranked on <code className="font-mono">usage_count</code>, which only checkout can
                increment
              </p>
            </div>

            {topRedeemed.length === 0 && <p className="text-xs text-slate-500">Nothing to rank yet.</p>}

            <div className="space-y-3">
              {topRedeemed.map((promo, idx) => (
                <div
                  key={promo.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-slate-900">{promo.code}</div>
                      <div className="text-[11px] text-slate-400">
                        {discountLabel(promo)} · {promo.usageCount} claim(s)
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[statusOf(promo, now)]}`}
                  >
                    {STATUS_TEXT[statusOf(promo, now)]}
                  </span>
                </div>
              ))}
            </div>

            <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              There is no revenue-attribution table behind this list. The database records that a code
              was applied and how many times, not what the discounted order earned.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
            <div>
              <h2 className="text-base font-bold text-slate-900">What happens when a buyer types your code</h2>
              <p className="mt-1 text-xs text-slate-500">
                Straight from <code className="font-mono">quote_checkout</code> and{' '}
                <code className="font-mono">place_order</code>
              </p>
            </div>

            <ol className="space-y-3 text-xs">
              {[
                [
                  'The code must exist, be switched on, and sit inside its window.',
                  'Otherwise checkout raises "Invalid or expired coupon code" - a code past its end date is refused even when it is still switched on.',
                ],
                [
                  'It has to have cap left.',
                  'A claim is only possible while usage_count is below the limit you set.',
                ],
                [
                  'It discounts your seller group only.',
                  'A code created by your store is ignored for another store\'s lines in the same cart, and the minimum order is measured against your subtotal, not the whole basket. A platform code (no vendor) applies to any group.',
                ],
                [
                  'One code per order, and it is taken off the goods.',
                  'A percentage is applied to your subtotal and can be held down by the max discount; a fixed amount is subtracted once. The discount never exceeds the subtotal and freight is untouched, and the platform commission is then charged on the discounted number - so a coupon lowers your fee as well.',
                ],
                [
                  'The redemption is counted when the order is booked.',
                  'Quoting alone does not consume a claim; placing the order increments usage_count inside the same transaction.',
                ],
              ].map(([title, body], idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>
                    <span className="block font-bold text-slate-900">{title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              There is no flash-deal engine, product-scope filter, or nomination programme wired into
              this build. <code className="font-mono">promotions</code> has no column for which SKUs a
              code covers, so every code here is storewide.
            </p>
          </div>
        </div>

        {/* ── Create modal ────────────────────────────────────────── */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-slate-700" aria-hidden="true" />
                New coupon code
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                These are the columns on <code className="font-mono">promotions</code>. Anything you
                leave blank keeps its database default. Amounts are stored in USD and shown in your
                selected display currency.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-title" className="mb-1 block font-bold text-slate-700">
                    Campaign title
                  </label>
                  <input
                    id="promo-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Autumn audio deal"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="promo-code" className="mb-1 block font-bold text-slate-700">
                    Code (unique, uppercase)
                  </label>
                  <input
                    id="promo-code"
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="AUTUMN15"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="promo-description" className="mb-1 block font-bold text-slate-700">
                  Description for your own log
                </label>
                <input
                  id="promo-description"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Week-one push on audio listings"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-discount-type" className="mb-1 block font-bold text-slate-700">
                    Discount type
                  </label>
                  <select
                    id="promo-discount-type"
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="native-select w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  >
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="promo-discount-value" className="mb-1 block font-bold text-slate-700">
                    {formDiscountType === 'percentage' ? 'Percent' : 'Amount off (USD)'}
                  </label>
                  <input
                    id="promo-discount-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-min-order" className="mb-1 block font-bold text-slate-700">
                    Minimum order (USD)
                  </label>
                  <input
                    id="promo-min-order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="promo-max-discount" className="mb-1 block font-bold text-slate-700">
                    Max discount in USD (optional)
                  </label>
                  <input
                    id="promo-max-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="no cap"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-usage-limit" className="mb-1 block font-bold text-slate-700">
                    Usage cap
                  </label>
                  <input
                    id="promo-usage-limit"
                    type="number"
                    min="0"
                    step="1"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="promo-starts" className="mb-1 block font-bold text-slate-700">
                    Opens
                  </label>
                  <input
                    id="promo-starts"
                    type="datetime-local"
                    value={formStarts}
                    onChange={(e) => setFormStarts(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="promo-closes" className="mb-1 block font-bold text-slate-700">
                  Closes
                </label>
                <input
                  id="promo-closes"
                  type="datetime-local"
                  value={formEnds}
                  onChange={(e) => setFormEnds(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  <span className="block font-bold text-slate-900">Switched on</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    An inactive row still exists, but checkout rejects it outright.
                  </span>
                </span>
              </label>

              {formError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800"
                >
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={create.isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {create.isPending ? 'Writing…' : 'Create coupon'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Windows modal ───────────────────────────────────────── */}
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-700" aria-hidden="true" />
                Campaign windows
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Sorted by when each code opens. Codes with no window are always claimable.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-80 space-y-3 overflow-y-auto py-2 text-xs">
              {rows.length === 0 && (
                <p className="text-slate-500">No campaigns to schedule yet.</p>
              )}
              {[...rows]
                .sort((a, b) =>
                  (a.startsAt ?? a.createdAt).localeCompare(b.startsAt ?? b.createdAt),
                )
                .map((promo) => (
                  <div key={promo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="font-mono">{promo.code}</span>
                      <span className="text-[10px] uppercase text-slate-500">
                        {STATUS_TEXT[statusOf(promo, now)]}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {promo.startsAt ? dateLabel(promo.startsAt) : 'from creation'}
                      {' → '}
                      {promo.endsAt ? dateLabel(promo.endsAt) : 'no end date'}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Confirm step: deleting a coupon is irreversible ─────────── */}
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) closeDelete();
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            onEscapeKeyDown={(event) => {
              if (remove.isPending) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (remove.isPending) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (remove.isPending) event.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Trash2 className="h-5 w-5 text-rose-600" aria-hidden="true" />
                Delete this coupon code?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {deleteTarget ? (
                  <>
                    1 campaign will be removed: <code className="font-mono font-bold">{deleteTarget.code}</code>{' '}
                    <span className="text-slate-700">({deleteTarget.title || 'Untitled campaign'}, {discountLabel(deleteTarget)})</span>.
                    Its <strong className="text-slate-800">{deleteTarget.usageCount}</strong> recorded redemption(s) of a{' '}
                    {deleteTarget.usageLimit.toLocaleString()} cap go with the row. This is a real{' '}
                    <code className="font-mono">DELETE</code> on <code className="font-mono">promotions</code> and it cannot
                    be undone; from that moment checkout answers the code with “Invalid or expired coupon code”. Orders it
                    already cheapened keep the totals they were booked with.
                  </>
                ) : (
                  'Nothing has been deleted yet.'
                )}
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800"
              >
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={remove.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={remove.isPending || !deleteTarget}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {remove.isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
