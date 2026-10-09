import React, { useState } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Search,
  CheckCircle2,
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
import { exportToCsv } from '../lib/export-csv';

interface LedgerRecord {
  id: string;
  datetime: string;
  refOrder: string;
  type: 'Sale' | 'Refund' | 'Fee' | 'Promotion Reimb.';
  gross: number;
  fee: number;
  net: number;
  status: 'Settled' | 'Processing';
}

export const VendorEarningsPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isTaxDocModalOpen, setIsTaxDocModalOpen] = useState(false);
  const [statementFormat, setStatementFormat] = useState<'pdf' | 'csv'>('csv');
  const [activeTab, setActiveTab] = useState<'All' | 'Sales' | 'Refunds' | 'Fees'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'ytd'>('30d');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadTaxPdf = (year: string) => {
    const element = document.createElement('a');
    const content = `IRS FORM 1099-K (${year})\nRecipient: Nova Electronics\nTIN: ***-**-4921\nGross Payment Volume: $34,820.00\nPlatform: Vendora Marketplace Inc.\nStatus: Certified\nGenerated: ${new Date().toLocaleDateString()}`;
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Form-1099-K-${year}-Nova-Electronics.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloaded ${year} Form 1099-K`);
  };

  const ledgerRecords: LedgerRecord[] = [
    {
      id: 'TXN-884929-81',
      datetime: 'May 28, 2024 • 14:32',
      refOrder: '#ORD-9821',
      type: 'Sale',
      gross: 349.0,
      fee: -41.88,
      net: 307.12,
      status: 'Settled',
    },
    {
      id: 'TXN-884918-84',
      datetime: 'May 28, 2024 • 11:15',
      refOrder: '#ORD-9820',
      type: 'Sale',
      gross: 129.5,
      fee: -15.54,
      net: 113.96,
      status: 'Settled',
    },
    {
      id: 'TXN-884893-89',
      datetime: 'May 27, 2024 • 19:04',
      refOrder: '#ORD-9812',
      type: 'Refund',
      gross: -210.0,
      fee: 25.2,
      net: -184.8,
      status: 'Settled',
    },
    {
      id: 'TXN-884852-82',
      datetime: 'May 27, 2024 • 09:20',
      refOrder: '#ORD-9807',
      type: 'Sale',
      gross: 890.0,
      fee: -106.8,
      net: 783.2,
      status: 'Processing',
    },
    {
      id: 'TXN-884799-81',
      datetime: 'May 26, 2024 • 16:48',
      refOrder: '#ORD-9799',
      type: 'Sale',
      gross: 450.0,
      fee: -54.0,
      net: 396.0,
      status: 'Settled',
    },
    {
      id: 'TXN-884743-89',
      datetime: 'May 26, 2024 • 10:11',
      refOrder: '#ORD-9788',
      type: 'Promotion Reimb.',
      gross: 45.0,
      fee: 0.0,
      net: 45.0,
      status: 'Settled',
    },
  ];

  const filteredRecords = ledgerRecords.filter((r) => {
    if (activeTab === 'Sales' && r.type !== 'Sale') return false;
    if (activeTab === 'Refunds' && r.type !== 'Refund') return false;
    if (activeTab === 'Fees' && r.type !== 'Fee') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.refOrder.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumb & Page Header ────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              FINANCIAL MANAGEMENT <span className="text-slate-300">/</span> EARNINGS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Earnings &amp; Financial Analytics
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Review gross merchandise value, marketplace commissions, tax deductions, and net seller profit margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last 12 Months</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="USD">$ (USD)</option>
              <option value="EUR">€ (EUR)</option>
              <option value="GBP">£ (GBP)</option>
            </select>

            <button
              onClick={() => setIsStatementModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Statement PDF/CSV
            </button>
          </div>
        </div>

        {/* ── 4 Top KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Gross Merchandise Value */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>GROSS MERCHANDISE VALUE</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                +18.2%
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$14,923.40</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              342 total customer orders
            </div>
          </div>

          {/* Card 2: Net Profit Disbursable */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>NET PROFIT DISBURSABLE</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                +19.4%
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$12,431.89</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              83.3% net seller margin rate
            </div>
          </div>

          {/* Card 3: Marketplace Fees & Comm */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>MARKETPLACE FEES &amp; COMM</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                12.0% blended
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">-$1,790.81</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Platform commission &amp; handling
            </div>
          </div>

          {/* Card 4: Refunds & Chargebacks */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>REFUNDS &amp; CHARGEBACKS</span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                ↓ -4.7%
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">-$700.70</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              4 approved return claims deducted
            </div>
          </div>
        </div>

        {/* ── Mid Section: Velocity Chart & Fee Breakdown (7 cols / 5 cols) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Revenue & Net Profit Velocity (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Revenue &amp; Net Profit Velocity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily volume comparison between Gross Sales and Net Settled Payouts
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <span className="h-2.5 w-2.5 rounded-xs bg-slate-900" />
                    <span>Gross GMV</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full border border-slate-400 bg-slate-200" />
                    <span>Net Disbursed</span>
                  </div>
                </div>
              </div>

              {/* Area SVG Chart */}
              <div className="mt-6 h-56 w-full">
                <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="160" x2="500" y2="160" stroke="#e2e8f0" />

                  {/* Gross GMV Area & Line */}
                  <path
                    d="M 0,140 Q 60,130 100,105 T 200,90 T 300,70 T 400,45 T 500,35 L 500,160 L 0,160 Z"
                    fill="url(#grossGradient)"
                  />
                  <path
                    d="M 0,140 Q 60,130 100,105 T 200,90 T 300,70 T 400,45 T 500,35"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Net Disbursed Area & Dashed Line */}
                  <path
                    d="M 0,150 Q 60,145 100,125 T 200,110 T 300,90 T 400,70 T 500,55 L 500,160 L 0,160 Z"
                    fill="url(#netGradient)"
                  />
                  <path
                    d="M 0,150 Q 60,145 100,125 T 200,110 T 300,90 T 400,70 T 500,55"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />

                  {/* Point circles */}
                  <circle cx="300" cy="70" r="4" fill="#0f172a" />
                  <circle cx="300" cy="90" r="3.5" fill="#64748b" />
                  <circle cx="500" cy="35" r="4" fill="#0f172a" />
                  <circle cx="500" cy="55" r="3.5" fill="#64748b" />
                </svg>

                {/* X Axis Labels */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                  <span>May 01</span>
                  <span>May 06</span>
                  <span>May 12</span>
                  <span>May 18</span>
                  <span>May 24</span>
                  <span>May 30</span>
                </div>
              </div>
            </div>

            {/* 3 Metric Pills at bottom */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily Average Gross
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">$497.44</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Peak Single Day
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">$1,284.10</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Avg Net Order Realization
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">$36.35</div>
              </div>
            </div>
          </div>

          {/* Right: Fee & Cost Breakdown (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Fee &amp; Cost Breakdown</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Normalized
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Waterfall deduction analysis from gross sales
              </p>

              {/* Waterfall items */}
              <div className="mt-5 space-y-3.5 text-xs">
                {/* 1 */}
                <div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Product Gross Sales</span>
                    <span>$14,923.40 (100%)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* 2 */}
                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Marketplace Category Commission</span>
                    <span className="font-bold text-rose-600">-$1,790.81 (12.0%)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>

                {/* 3 */}
                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Payment Processing (2.9% + $0.30)</span>
                    <span className="font-bold text-rose-600">-$432.78 (2.9%)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: '2.9%' }} />
                  </div>
                </div>

                {/* 4 */}
                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Shipping Label Subsidies</span>
                    <span className="font-bold text-rose-600">-$210.00 (1.4%)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: '1.4%' }} />
                  </div>
                </div>

                {/* 5 */}
                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Tax Collected &amp; Remitted (Vendora Marketplace)</span>
                    <span className="text-slate-500">-$980.20 (Pass-through)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: '6.5%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Total realized payout highlight */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    NET REALIZED PAYOUT
                  </div>
                  <div className="text-2xl font-black text-slate-900">$12,431.89</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-emerald-700">
                    Effective take-home conversion
                  </div>
                  <span className="inline-block mt-0.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                    83.3% Conversion
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form 1099-K Compliance Banner ───────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  Form 1099-K Compliance Status
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  ✓ TIN Verified
                </span>
              </div>
              <p className="mt-0.5 text-slate-500 text-[11px] leading-relaxed">
                YTD Threshold: <strong className="text-slate-700">$12,431.89</strong> / $20,000.00 reporting limit (62.1% utilized). State sales tax remitted automatically under Marketplace Facilitator Laws.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTaxDocModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 shrink-0 self-start sm:self-auto"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>View Tax Documents</span>
          </button>
        </div>

        {/* ── Ledger Table: Earnings Ledger & Order Line Items ─────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Earnings Ledger &amp; Order Line Items
              </h2>
              <p className="text-xs text-slate-500">
                Auditable settlement record of credits, marketplace commissions, and disbursements
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter Order ID or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                  {(['All', 'Sales', 'Refunds', 'Fees'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-md px-3 py-1 transition-all ${
                        activeTab === tab
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    exportToCsv({
                      filename: `vendor-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
                      columns: [
                        { header: 'Transaction ID', key: 'id' },
                        { header: 'Datetime', key: 'datetime' },
                        { header: 'Reference Order', key: 'refOrder' },
                        { header: 'Type', key: 'type' },
                        { header: 'Gross ($)', key: 'gross' },
                        { header: 'Fee ($)', key: 'fee' },
                        { header: 'Net Payout ($)', key: 'net' },
                        { header: 'Settlement Status', key: 'status' },
                      ],
                      data: filteredRecords,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                  title="Export filtered records"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">DATE &amp; TIME</th>
                  <th className="px-4 py-3">TRANSACTION ID</th>
                  <th className="px-4 py-3">REFERENCE ORDER</th>
                  <th className="px-4 py-3">TYPE</th>
                  <th className="px-4 py-3">GROSS AMOUNT</th>
                  <th className="px-4 py-3">FEE / COMM.</th>
                  <th className="px-4 py-3">NET CREDITED</th>
                  <th className="px-4 py-3 text-right">SETTLEMENT STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {r.datetime}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-900 font-bold">
                      {r.id}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <span className="hover:underline cursor-pointer">{r.refOrder}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.type === 'Sale' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          Sale
                        </span>
                      )}
                      {r.type === 'Refund' && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          Refund
                        </span>
                      )}
                      {r.type === 'Fee' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Fee
                        </span>
                      )}
                      {r.type === 'Promotion Reimb.' && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Promotion Reimb.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {r.gross < 0 ? `-$${Math.abs(r.gross).toFixed(2)}` : `$${r.gross.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-rose-600">
                      {r.fee === 0 ? '$0.00' : r.fee < 0 ? `-$${Math.abs(r.fee).toFixed(2)}` : `+$${r.fee.toFixed(2)}`}
                    </td>
                    <td className={`px-4 py-3.5 font-bold ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {r.net >= 0 ? `+$${r.net.toFixed(2)}` : `-$${Math.abs(r.net).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.status === 'Settled' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Processing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 gap-3">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} ledger records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
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

        {/* ── Statement PDF/CSV Modal ─────────────────────────────── */}
        <Dialog open={isStatementModalOpen} onOpenChange={setIsStatementModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                Download Account Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Generate official financial reconciliation statements for accounting and bookkeeping.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Statement Period</label>
                <select className="w-full rounded-lg border border-slate-200 p-2 text-xs">
                  <option>May 2024 (Monthly Consolidated)</option>
                  <option>April 2024 (Monthly Consolidated)</option>
                  <option>Q1 2024 (Quarterly Summary)</option>
                  <option>Full Year 2023 Comprehensive</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setStatementFormat('pdf')}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      statementFormat === 'pdf' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      checked={statementFormat === 'pdf'}
                      onChange={() => setStatementFormat('pdf')}
                    />
                    <span className="font-semibold text-slate-800">PDF Report</span>
                  </label>
                  <label
                    onClick={() => setStatementFormat('csv')}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      statementFormat === 'csv' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      checked={statementFormat === 'csv'}
                      onChange={() => setStatementFormat('csv')}
                    />
                    <span className="font-semibold text-slate-800">CSV Spreadsheet</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (statementFormat === 'csv') {
                    exportToCsv({
                      filename: `vendor-statement-${new Date().toISOString().slice(0, 10)}.csv`,
                      columns: [
                        { header: 'Transaction ID', key: 'id' },
                        { header: 'Datetime', key: 'datetime' },
                        { header: 'Reference Order', key: 'refOrder' },
                        { header: 'Type', key: 'type' },
                        { header: 'Gross ($)', key: 'gross' },
                        { header: 'Fee ($)', key: 'fee' },
                        { header: 'Net Payout ($)', key: 'net' },
                        { header: 'Settlement Status', key: 'status' },
                      ],
                      data: filteredRecords,
                    });
                  } else {
                    window.print();
                  }
                  setIsStatementModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Generate &amp; Download
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Tax Documents Modal ─────────────────────────────────── */}
        <Dialog open={isTaxDocModalOpen} onOpenChange={setIsTaxDocModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Tax Documents &amp; Form 1099-K
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Access official IRS tax forms and state sales tax reporting records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">2023 Form 1099-K</div>
                  <div className="text-[11px] text-slate-500">Issued Jan 31, 2024 • TIN ending in 4921</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTaxPdf('2023')}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Download
                </button>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">2022 Form 1099-K</div>
                  <div className="text-[11px] text-slate-500">Issued Jan 30, 2023 • TIN ending in 4921</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTaxPdf('2022')}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTaxDocModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />

        {/* ── Floating Toast Notification ───────────────────────────── */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
