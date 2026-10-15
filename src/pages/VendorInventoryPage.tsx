import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Key,
  AlertTriangle,
  AlertCircle,
  Search,
  CheckCircle2,
  Save,
  Copy,
  Check,
  SlidersHorizontal,
  Banknote,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/ui/status-badge';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useVendorPackages } from '../features/vendor/hooks/useVendorPackages';
import { useSetProductStock, useVendorProducts } from '../features/vendor/hooks/useVendorProducts';
import { formatPrice } from '../store/currency-store';
import type { ModerationStatus } from '../types/domain';

/**
 * What this page calls low stock. `vendor_dashboard(p_low_stock)` counts the same way with
 * the same default, so the alert here matches the dashboard's - it is a view setting, not a
 * per-listing minimum the database stores.
 */
const LOW_STOCK_AT = 5;

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

const stockStatusOf = (stock: number): StockStatus =>
  stock === 0 ? 'out_of_stock' : stock <= LOW_STOCK_AT ? 'low_stock' : 'in_stock';

const MODERATION_LABEL: Record<ModerationStatus, string> = {
  draft: 'Draft',
  pending_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

/** Static classes per KPI count: Tailwind cannot generate an interpolated class name. */
const KPI_GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const VendorInventoryPage: React.FC = () => {
  const productsQuery = useVendorProducts();
  const packagesQuery = useVendorPackages();
  const setStock = useSetProductStock();

  const [activeTab, setActiveTab] = useState<'physical' | 'digital'>('physical');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  /** Stepper values that have not been written yet, keyed by product id. */
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});

  const [isKpiSelectorOpen, setIsKpiSelectorOpen] = useState(false);
  const [selectedKpis, setSelectedKpis] = useState<string[]>([
    'physical_listings',
    'low_stock',
    'total_valuation',
    'keys_issued',
  ]);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const listings = productsQuery.data ?? [];
  const packages = packagesQuery.data ?? [];

  /**
   * One row per physical listing you own, at its saved stock unless a stepper holds an
   * unsaved edit. Nothing here exists that the `products` table does not have a column for.
   */
  const rows = useMemo(() => {
    return listings
      .filter((p) => p.type === 'physical')
      .map((p) => {
        const savedStock = p.stock ?? 0;
        const shownStock = Math.max(0, stockEdits[p.id] ?? savedStock);
        return {
          id: p.id,
          // A listing without a variant SKU gets a display code derived from its own id.
          sku: p.variants?.[0]?.sku || `SKU-${p.id.slice(-6).toUpperCase()}`,
          title: p.title,
          category: p.category.replace('cat-', '').replace('-', ' '),
          savedStock,
          stock: shownStock,
          dirty: shownStock !== savedStock,
          status: stockStatusOf(shownStock),
          price: p.price,
          listingStatus: p.status,
          imageUrl: p.images?.[0],
        };
      });
  }, [listings, stockEdits]);

  const digitalPackages = useMemo(
    () =>
      packages
        .filter((o) => o.type === 'digital')
        .map((o) => ({
          id: o.id,
          title: o.items[0]?.title || 'Package contents unavailable',
          buyerEmail: o.buyerEmail || 'No buyer contact on this order',
          status: o.status,
          licenseKey: o.licenseKey,
          createdAt: o.createdAt,
        })),
    [packages],
  );

  const toggleKpi = (kpiId: string) => {
    setSelectedKpis((prev) => {
      if (prev.includes(kpiId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== kpiId);
      }
      return [...prev, kpiId];
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStockChange = (id: string, nextStock: number) => {
    setStockEdits((prev) => ({ ...prev, [id]: Math.max(0, nextStock) }));
  };

  /** Writes one listing's stock through `set_product_stock`, then reports what it answered. */
  const saveStock = async (productId: string, stock: number, label: string) => {
    await setStock.mutateAsync({ productId, stock });
    setStockEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    return `${label} → ${stock} units`;
  };

  const dirtyRows = rows.filter((row) => row.dirty);

  const handleUpdateRow = async (row: (typeof rows)[number]) => {
    setSaveErrors([]);
    setIsSaving(true);
    try {
      const saved = await saveStock(row.id, row.stock, row.title);
      showToast(`Saved ${saved}.`);
    } catch (err) {
      setSaveErrors([`${row.title}: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSave = async () => {
    if (dirtyRows.length === 0) {
      showToast('Nothing to save - every stock level is already up to date.');
      return;
    }
    setSaveErrors([]);
    setIsSaving(true);
    const failures: string[] = [];
    let savedCount = 0;
    for (const row of dirtyRows) {
      try {
        await saveStock(row.id, row.stock, row.title);
        savedCount += 1;
      } catch (err) {
        failures.push(`${row.title}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setIsSaving(false);
    setSaveErrors(failures);
    if (failures.length === 0) {
      showToast(`Saved ${savedCount} stock level${savedCount === 1 ? '' : 's'} to your catalog.`);
    } else {
      showToast(`${savedCount} saved, ${failures.length} could not be saved.`);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const lowStockCount = rows.filter((i) => i.status === 'low_stock').length;
  const outOfStockCount = rows.filter((i) => i.status === 'out_of_stock').length;
  const totalUnits = rows.reduce((acc, i) => acc + i.stock, 0);
  const totalValuation = rows.reduce((acc, i) => acc + i.stock * i.price, 0);
  const approvedCount = rows.filter((i) => i.listingStatus === 'approved').length;
  const keysIssued = digitalPackages.filter((k) => Boolean(k.licenseKey)).length;

  /**
   * License-keys columns for DataTable. (The physical stock table stays
   * hand-rolled: its rows ARE the editor - stepper inputs and per-row Update
   * buttons live inside the cells.) Every package status here wears the same
   * slate pill, so the status cell passes that treatment as an override
   * rather than taking the shared map's per-status tones, and passes the
   * label verbatim as the page renders the spaced token under `capitalize`.
   */
  const licenseColumns: DataTableColumn<(typeof digitalPackages)[number]>[] = [
    {
      key: 'product',
      header: 'Product',
      headerClassName: 'p-4 text-[11px]',
      className: 'p-4 font-bold text-slate-900',
      cell: (k) => k.title,
    },
    {
      key: 'buyer',
      header: 'Buyer',
      headerClassName: 'p-4 text-[11px]',
      className: 'p-4 text-slate-600',
      cell: (k) => k.buyerEmail,
    },
    {
      key: 'licenseKey',
      header: 'License key',
      headerClassName: 'p-4 text-[11px]',
      className: 'p-4 font-mono text-slate-800',
      cell: (k) =>
        k.licenseKey ?? <span className="text-slate-400 font-sans">Not issued yet</span>,
    },
    {
      key: 'status',
      header: 'Package status',
      headerClassName: 'p-4 text-[11px]',
      className: 'p-4',
      cell: (k) => (
        <StatusBadge
          status={k.status}
          label={k.status.replace(/_/g, ' ')}
          className="capitalize bg-slate-100 text-slate-600 border-transparent"
        />
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      headerClassName: 'p-4 text-[11px]',
      className: 'p-4',
      cell: (k) =>
        k.licenseKey ? (
          <button
            type="button"
            title="Copy key"
            onClick={() => handleCopyKey(k.licenseKey as string)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            {copiedKey === k.licenseKey ? (
              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3" aria-hidden="true" />
            )}
            {copiedKey === k.licenseKey ? 'Copied' : 'Copy'}
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        ),
    },
  ];

  const kpiItems = [
    {
      id: 'physical_listings',
      label: 'Physical Listings',
      value: `${rows.length} SKUs`,
      subtext: `${approvedCount} approved, ${rows.length - approvedCount} in review or draft`,
      color: 'text-slate-900',
      icon: Boxes,
    },
    {
      id: 'low_stock',
      label: 'Low-Stock Alerts',
      value: `${lowStockCount} Items`,
      subtext: `At or below ${LOW_STOCK_AT} units`,
      color: 'text-amber-600',
      icon: AlertTriangle,
    },
    {
      id: 'total_units',
      label: 'Total Units in Stock',
      value: `${totalUnits.toLocaleString()} Units`,
      subtext: 'Summed from your physical listings',
      color: 'text-blue-600',
      icon: Layers,
    },
    {
      id: 'total_valuation',
      label: 'Total Inventory Value',
      value: formatPrice(totalValuation),
      subtext: 'Units × your listed price, not a market value',
      color: 'text-emerald-600',
      icon: Banknote,
    },
    {
      id: 'out_of_stock',
      label: 'Sold Out SKUs',
      value: `${outOfStockCount} Items`,
      subtext: 'Zero stock recorded',
      color: 'text-rose-600',
      icon: AlertTriangle,
    },
    {
      id: 'keys_issued',
      label: 'Digital Keys Issued',
      value: `${keysIssued} Keys`,
      subtext: 'Generated by the platform when a digital order is paid',
      color: 'text-purple-600',
      icon: Key,
    },
  ];

  const visibleKpis = kpiItems.filter((kpi) => selectedKpis.includes(kpi.id));
  const gridClass = KPI_GRID[Math.min(4, Math.max(1, visibleKpis.length))] ?? KPI_GRID[1];

  const filteredRows = rows.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isLoading = productsQuery.isPending || packagesQuery.isPending;
  const loadError = productsQuery.error ?? packagesQuery.error;

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-outfit text-slate-900 tracking-tight">
              Inventory &amp; Stock Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Batch editor for your listings&apos; stock, read from and written back to your catalog.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dirtyRows.length > 0 && (
              <span role="status" aria-live="polite" className="text-xs font-bold text-amber-700">
                {dirtyRows.length} unsaved
              </span>
            )}

            {/* Customizable KPIs Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsKpiSelectorOpen(!isKpiSelectorOpen)}
                aria-expanded={isKpiSelectorOpen}
                aria-controls="kpi-selector-panel"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Customize KPIs</span>
              </button>

              {isKpiSelectorOpen && (
                <div
                  id="kpi-selector-panel"
                  role="group"
                  aria-label="Choose displayed metrics"
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-20 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Choose Displayed Metrics</span>
                    <button
                      type="button"
                      onClick={() => setIsKpiSelectorOpen(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                  <div className="space-y-1">
                    {kpiItems.map((kpi) => {
                      const isSelected = selectedKpis.includes(kpi.id);
                      return (
                        <button
                          key={kpi.id}
                          type="button"
                          onClick={() => toggleKpi(kpi.id)}
                          aria-pressed={isSelected}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected ? 'bg-orange-50/70 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            )}
                            <span>{kpi.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleBulkSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving…' : 'Save All Changes'}
            </Button>
          </div>
        </div>

        {/* Toast + write failures */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {toastMessage}
          </div>
        )}
        {saveErrors.length > 0 && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 space-y-1"
          >
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
              The database refused these writes:
            </div>
            <ul className="list-disc pl-6 space-y-0.5">
              {saveErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {loadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span>{loadError instanceof Error ? loadError.message : String(loadError)}</span>
            <button
              type="button"
              onClick={() => {
                void productsQuery.refetch();
                void packagesQuery.refetch();
              }}
              className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 hover:bg-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Customizable Metric Cards */}
        <div className={`grid gap-4 ${gridClass}`}>
          {visibleKpis.map((kpi) => {
            const IconComp = kpi.icon;
            return (
              <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <IconComp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className={`text-2xl font-black mt-2 ${kpi.color}`}>
                  {isLoading ? '—' : kpi.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{kpi.subtext}</div>
              </div>
            );
          })}
        </div>

        {/* Tab Toggle */}
        <div
          role="group"
          aria-label="Inventory views"
          className="flex border-b border-slate-200 gap-4 text-xs font-bold"
        >
          <button
            type="button"
            onClick={() => setActiveTab('physical')}
            aria-pressed={activeTab === 'physical'}
            aria-controls="inventory-physical-panel"
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'physical'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" aria-hidden="true" />
            Physical Stock Management
            {lowStockCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-2 py-0.2 text-[10px]">
                {lowStockCount} alerts
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('digital')}
            aria-pressed={activeTab === 'digital'}
            aria-controls="inventory-digital-panel"
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'digital'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="h-4 w-4" aria-hidden="true" />
            Digital Licenses ({keysIssued} issued)
          </button>
        </div>

        {/* TAB 1: Physical Inventory */}
        {activeTab === 'physical' && (
          <div id="inventory-physical-panel" className="space-y-4">
            {/* Low-Stock Alert Banner */}
            {lowStockCount > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold">Low-stock threshold:</span> {lowStockCount} listings
                    are at {LOW_STOCK_AT} units or fewer, including sold-out ones.
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-700">
                  Save to raise them in your catalog
                </span>
              </div>
            )}

            {/* Quick Filter Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <label htmlFor="inventory-search" className="sr-only">
                  Filter listings by SKU or product title
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <input
                  id="inventory-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by SKU or Product Title..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sun-orange"
                />
              </div>
            </div>

            {/* Table of SKUs */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs" aria-label="Physical listings and stock levels">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 font-bold text-slate-500 text-[11px]">
                    <th scope="col" className="p-4">
                      Product Details
                      <span className="sr-only">Product &amp; Variant</span>
                    </th>
                    <th scope="col" className="p-4">Category</th>
                    <th scope="col" className="p-4">Price &amp; Valuation</th>
                    <th scope="col" className="p-4 text-center">Stock Status</th>
                    <th scope="col" className="p-4 text-center">
                      Stock Stepper
                      <span className="sr-only">Quick Stock Stepper</span>
                    </th>
                    <th scope="col" className="p-4">Moderation</th>
                    <th scope="col" className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-pulse" aria-hidden="true" />
                        <p className="font-semibold text-slate-700">Reading your catalog…</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Stock levels come from your listings, not a local copy.
                        </p>
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                        <p className="font-semibold text-slate-700">
                          {rows.length === 0
                            ? 'No physical listings yet'
                            : 'No inventory items match this filter'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {rows.length === 0
                            ? 'Create a listing under Catalog to stock it here.'
                            : 'Try a different product name, SKU or category.'}
                        </p>
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-11 w-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50 shadow-2xs"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-xl border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                              <Boxes className="h-4 w-4 text-slate-300" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block leading-snug line-clamp-1">{item.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold border border-slate-200/80">
                                {item.sku}
                              </span>
                              <span className="text-[10px] text-slate-400">Alert at {LOW_STOCK_AT}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold capitalize border border-slate-200/60">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{formatPrice(item.price)}</span>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Valuation: {formatPrice(item.stock * item.price)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {item.status === 'out_of_stock' && (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold">
                            Sold Out
                          </span>
                        )}
                        {item.status === 'low_stock' && (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                            Low Stock (&lt;{LOW_STOCK_AT})
                          </span>
                        )}
                        {item.status === 'in_stock' && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            title="Decrement stock"
                            aria-label={`Decrement stock for ${item.title}`}
                            onClick={() => handleStockChange(item.id, item.stock - 1)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            aria-label={`Stock for ${item.title}`}
                            value={item.stock}
                            onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-14 text-center py-1 font-bold text-slate-900 bg-white border-x border-slate-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            title="Increment stock"
                            aria-label={`Increment stock for ${item.title}`}
                            onClick={() => handleStockChange(item.id, item.stock + 1)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {item.dirty ? (
                            <span className="font-bold text-amber-700">
                              Saved: {item.savedStock} · unsaved
                            </span>
                          ) : (
                            <span>Stock on record</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            item.listingStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.listingStatus === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {MODERATION_LABEL[item.listingStatus]}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleUpdateRow(item)}
                          disabled={!item.dirty || setStock.isPending}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400">
              Stock written here is the number buyers buy against. Cancelling an order does not
              return units to stock, and a sale decrements it in the same transaction that books
              the order.
            </p>
          </div>
        )}

        {/* TAB 2: Digital licenses the platform has issued */}
        {activeTab === 'digital' && (
          <div id="inventory-digital-panel" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-700 tracking-wider uppercase block">
                  DIGITAL SALES &amp; LICENSE KEYS
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Keys issued on your packages</h3>
                <p className="text-xs text-slate-500">
                  {keysIssued} of {digitalPackages.length} digital{" "}
                  {digitalPackages.length === 1 ? 'package carries' : 'packages carry'} a key.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 flex items-start gap-3">
              <Key className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                License keys are generated by the platform inside the checkout transaction that
                books a digital order, then delivered to the buyer. There is no seller-side key
                vault to deposit into: a list uploaded here would never reach a buyer, so this
                screen only shows the keys already issued on your packages.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <DataTable
                ariaLabel="License keys issued on your digital packages"
                columns={licenseColumns}
                rows={isLoading ? [] : digitalPackages}
                getRowKey={(k) => k.id}
                emptyState={
                  <div className="p-8 text-center text-slate-500">
                    {isLoading ? (
                      <>
                        <Key className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-pulse" aria-hidden="true" />
                        <p className="font-semibold text-slate-700">Reading your digital sales…</p>
                      </>
                    ) : (
                      <>
                        <Key className="h-8 w-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                        <p className="font-semibold text-slate-700">No digital packages yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          A key appears here once a buyer pays for one of your digital listings.
                        </p>
                      </>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
