import React, { useState } from 'react';
import {
  Calendar,
  RotateCw,
  Plus,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ShieldCheck,
  Check,
  ArrowUpRight,
  PieChart,
  Landmark,
  FileText,
  Truck,
  Percent,
  Layers,
  Download,
  Search,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';

interface ReportArchive {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  fileSize: string;
  authorInitials: string;
  authorName: string;
  status: 'Ready' | 'Processing';
}

const REPORT_ARCHIVES: ReportArchive[] = [
  {
    id: 'rep-1',
    name: 'Oct_2026_Platform_GMV_Reconciliation.csv',
    type: 'Monthly Financial',
    dateRange: 'Oct 01, 2026 – Oct 31, 2026',
    fileSize: '14.8 MB',
    authorInitials: 'AU',
    authorName: 'Admin User',
    status: 'Ready',
  },
  {
    id: 'rep-2',
    name: 'Q3_2026_Vendor_1099K_Tax_Summary.pdf',
    type: 'Quarterly Tax',
    dateRange: 'Jul 01, 2026 – Sep 30, 2026',
    fileSize: '4.2 MB',
    authorInitials: 'SY',
    authorName: 'Automated Cron',
    status: 'Ready',
  },
  {
    id: 'rep-3',
    name: 'Weekly_Moderation_Dispute_Log.csv',
    type: 'Weekly SLA / Trust',
    dateRange: 'Oct 21, 2026 – Oct 28, 2026',
    fileSize: '860 KB',
    authorInitials: 'AU',
    authorName: 'Admin User',
    status: 'Processing',
  },
  {
    id: 'rep-4',
    name: 'FY2026_Category_Fee_Yield_Analysis.csv',
    type: 'Custom Analytics',
    dateRange: 'Jan 01, 2026 – Oct 28, 2026',
    fileSize: '28.4 MB',
    authorInitials: 'MK',
    authorName: 'M. Kross (Finance)',
    status: 'Ready',
  },
  {
    id: 'rep-5',
    name: 'Vendor_KYC_Compliance_Deficiencies.csv',
    type: 'Vendor Compliance',
    dateRange: 'Oct 01, 2026 – Oct 28, 2026',
    fileSize: '1.1 MB',
    authorInitials: 'DR',
    authorName: 'D. Rivera (Trust)',
    status: 'Ready',
  },
  {
    id: 'rep-6',
    name: 'SKU_Velocity_And_Stockout_Audit_W43.csv',
    type: 'Inventory Catalog',
    dateRange: 'Oct 14, 2026 – Oct 21, 2026',
    fileSize: '3.9 MB',
    authorInitials: 'SY',
    authorName: 'Automated Cron',
    status: 'Ready',
  },
];

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportArchive[]>(REPORT_ARCHIVES);
  const [searchReport, setSearchReport] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [customReportName, setCustomReportName] = useState('');
  const [customReportType, setCustomReportType] = useState('Monthly Financial');
  const [customDateRange, setCustomDateRange] = useState('Last 30 Days');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [reportPage, setReportPage] = useState(1);

  const filteredReports = reports.filter((rep) => {
    const matchesSearch =
      rep.name.toLowerCase().includes(searchReport.toLowerCase()) ||
      rep.authorName.toLowerCase().includes(searchReport.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedType !== 'All Types' && !rep.type.includes(selectedType)) return false;

    return true;
  });

  const reportsPerPage = 5;
  const totalReportPages = Math.ceil(filteredReports.length / reportsPerPage) || 1;
  const paginatedReports = filteredReports.slice(
    (reportPage - 1) * reportsPerPage,
    reportPage * reportsPerPage
  );

  const handleDownloadPreset = (presetName: string) => {
    exportToCsv({
      filename: `${presetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Period', key: 'period' },
        { header: 'Scope', key: 'scope' },
        { header: 'Volume Metric ($)', key: 'volume' },
        { header: 'Compliance Rate', key: 'compliance' },
        { header: 'Status', key: 'status' },
      ],
      data: [
        { period: 'October 2026', scope: presetName, volume: '$1,489,200', compliance: '98.8%', status: 'Audited' },
        { period: 'September 2026', scope: presetName, volume: '$1,257,800', compliance: '97.9%', status: 'Audited' },
        { period: 'August 2026', scope: presetName, volume: '$1,190,400', compliance: '98.4%', status: 'Audited' },
      ],
    });
  };

  const handleDownloadArchive = (rep: ReportArchive) => {
    exportToCsv({
      filename: rep.name,
      columns: [
        { header: 'Report ID', key: 'id' },
        { header: 'Report Name', key: 'name' },
        { header: 'Report Type', key: 'type' },
        { header: 'Date Range', key: 'dateRange' },
        { header: 'Author', key: 'authorName' },
        { header: 'Status', key: 'status' },
      ],
      data: [rep],
    });
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReportName.trim()) return;
    const cleanFilename = customReportName.trim().endsWith('.csv')
      ? customReportName.trim()
      : `${customReportName.trim().replace(/\s+/g, '_')}.csv`;
    const newRep: ReportArchive = {
      id: `rep-${Date.now()}`,
      name: cleanFilename,
      type: customReportType,
      dateRange: customDateRange,
      fileSize: '1.2 MB',
      authorInitials: 'SA',
      authorName: 'Super Admin',
      status: 'Ready',
    };
    setReports([newRep, ...reports]);
    handleDownloadArchive(newRep);
    setCustomReportName('');
    setIsGenerateModalOpen(false);
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Reports & Analytics" sidebar={<AdminNav />}>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
                Reports & Marketplace Analytics
              </h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-700">
                AUDIT READY
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Generate financial audits, tax summaries, vendor payout reconciliation, and cross-channel sales analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer focus:outline-hidden"
              >
                <option value="7d">Date Range: Last 7 Days</option>
                <option value="30d">Date Range: Last 30 Days</option>
                <option value="90d">Date Range: Last 90 Days</option>
                <option value="ytd">Date Range: Year to Date</option>
              </select>
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() => handleDownloadPreset('Platform Analytics Reconciliation')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Refresh and export summary"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">Generate Custom Report</span>
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Gross Marketplace GMV */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>GROSS MARKETPLACE GMV</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$1,489,200</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +18.4%
              </span>
              <span className="text-xs text-slate-500">vs last period</span>
            </div>
          </div>

          {/* Card 2: Net Platform Revenue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>NET PLATFORM REVENUE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$178,704</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +16.1%
              </span>
              <span className="text-xs text-slate-500">net take rate (12.0%)</span>
            </div>
          </div>

          {/* Card 3: Avg Order Value (AOV) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>AVG ORDER VALUE (AOV)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$142.80</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +4.2%
              </span>
              <span className="text-xs text-slate-500">basket size expansion</span>
            </div>
          </div>

          {/* Card 4: Refund & Dispute Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>REFUND & DISPUTE RATE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">1.18%</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                ↓ -0.32%
              </span>
              <span className="text-xs text-slate-500">improvement MoM</span>
            </div>
          </div>
        </div>

        {/* 2-Column Middle Row: Flow Chart & Take Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Disbursement & Gross Sales Flow */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Disbursement & Gross Sales Flow
                  </h2>
                  <p className="text-xs text-slate-500">
                    Reconciliation of gross merchant capture versus platform escrow releases
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span>GMV Payouts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    <span>Retained Fees</span>
                  </div>
                </div>
              </div>

              {/* Weekly bar chart */}
              <div className="pt-4">
                <div className="grid grid-cols-5 gap-3 items-end h-48 border-b border-slate-100 pb-3">
                  {/* Oct 01-07 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-12 flex flex-col rounded-t-sm overflow-hidden bg-slate-100">
                      <div className="h-4 bg-slate-200" />
                      <div className="h-24 bg-slate-900" />
                    </div>
                    <span className="text-[11px] text-slate-500">Oct 01-07</span>
                  </div>
                  {/* Oct 08-14 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-12 flex flex-col rounded-t-sm overflow-hidden bg-slate-100">
                      <div className="h-5 bg-slate-200" />
                      <div className="h-28 bg-slate-900" />
                    </div>
                    <span className="text-[11px] text-slate-500">Oct 08-14</span>
                  </div>
                  {/* Oct 15-21 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-12 flex flex-col rounded-t-sm overflow-hidden bg-slate-100">
                      <div className="h-4 bg-slate-200" />
                      <div className="h-22 bg-slate-900" />
                    </div>
                    <span className="text-[11px] text-slate-500">Oct 15-21</span>
                  </div>
                  {/* Oct 22-28 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-12 flex flex-col rounded-t-sm overflow-hidden bg-slate-100">
                      <div className="h-6 bg-slate-200" />
                      <div className="h-32 bg-slate-900" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900">Oct 22-28</span>
                  </div>
                  {/* Oct 29-31 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-12 flex flex-col rounded-t-sm overflow-hidden bg-slate-100">
                      <div className="h-6 bg-slate-200" />
                      <div className="h-32 bg-slate-900/80" />
                    </div>
                    <span className="text-[11px] text-slate-500">Oct 29-31</span>
                  </div>
                </div>
              </div>

              {/* Settlement Notice */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="h-4 w-4" />
                  <span>Next automatic settlement clearance in <strong>3 days (Nov 03)</strong></span>
                </div>
                <button className="flex items-center gap-1 font-semibold text-slate-900 hover:underline">
                  <span>Download Forecast Ledger</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Platform Take Distribution */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Platform Take Distribution
                  </h2>
                  <p className="text-xs text-slate-500">Realized margin retention by category</p>
                </div>
                <PieChart className="h-4 w-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                    <span>Consumer Electronics (8.5%)</span>
                    <strong className="text-slate-900">$72,400</strong>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                    <span>Apparel & Accessories (15.0%)</span>
                    <strong className="text-slate-900">$54,210</strong>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                    <span>Home, Decor & Living (12.0%)</span>
                    <strong className="text-slate-900">$32,094</strong>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '38%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                    <span>Direct 1P Catalog Sales (100% margin)</span>
                    <strong className="text-slate-900">$20,000</strong>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
              </div>

              {/* State Tax Escrow Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      STATE TAX ESCROW
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      $94,228.12 <span className="text-xs font-normal text-slate-500">Accrued</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('State Tax Escrow Audit Summary')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  Audit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Templates & Quick Exports */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Templates & Quick Exports</h2>
              <p className="text-xs text-slate-500">
                Instant standardized exports configured for accounting compliance and vendor reviews
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Monthly Financial */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    FINANCE
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-sm">
                  Monthly Financial & Tax Settlement
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Comprehensive report of sales, state tax collected, gateway fees, and net vendor disbursements.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('Monthly Financial and Tax Settlement')}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('Monthly Financial and Tax Settlement')}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  PDF
                </button>
              </div>
            </div>

            {/* Card 2: Vendor Performance */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    OPERATIONS
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-sm">
                  Vendor Performance & SLA Audit
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  On-time shipping, cancellation rates, return frequency, and KYC compliance scores.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('Vendor Performance and SLA Audit')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Card 3: Commission & Margins */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Percent className="h-4 w-4" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    COMMISSIONS
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-sm">
                  Commission & Platform Margins
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Breakdown of fee earnings by category, merchant volume tiers, and promotional rebates.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('Commission and Platform Margins')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Card 4: Inventory Health */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    CATALOG
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-sm">
                  Inventory & Catalog Health
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Out of stock velocities, high return rate SKUs, and counterfeit moderation logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDownloadPreset('Inventory and Catalog Health')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Generated & Scheduled Reports */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Generated & Scheduled Reports</h2>
            <p className="text-xs text-slate-500">
              Audit trail of exports created by marketplace administrators and automated schedules
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Filter bar */}
            <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchReport}
                  onChange={(e) => setSearchReport(e.target.value)}
                  placeholder="Filter reports..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
                >
                  <option>All Types</option>
                  <option>Financial</option>
                  <option>Tax</option>
                  <option>Trust</option>
                  <option>Compliance</option>
                  <option>Catalog</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">REPORT NAME</th>
                    <th className="px-4 py-3">FREQUENCY / TYPE</th>
                    <th className="px-4 py-3">DATE RANGE GENERATED</th>
                    <th className="px-4 py-3">FILE SIZE</th>
                    <th className="px-4 py-3">GENERATED BY</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900 font-mono text-[11px]">
                            {report.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {report.type}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {report.dateRange}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {report.fileSize}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {report.authorInitials}
                          </div>
                          <span className="text-slate-700 font-medium">{report.authorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {report.status === 'Ready' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                            Processing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadArchive(report)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3 text-slate-500" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>
                Showing {filteredReports.length === 0 ? 0 : (reportPage - 1) * reportsPerPage + 1} to{' '}
                {Math.min(reportPage * reportsPerPage, filteredReports.length)} of {filteredReports.length} generated audit archives
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                  disabled={reportPage === 1}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalReportPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setReportPage(page)}
                    className={`h-6 w-6 rounded text-center text-xs font-bold transition-colors cursor-pointer ${
                      reportPage === page
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                  disabled={reportPage === totalReportPages || totalReportPages === 0}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Custom Report Modal */}
        <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Generate Custom Analytics Report
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure parameters to generate and export an audited marketplace report.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateReport} className="space-y-3 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Name / Description</label>
                <input
                  type="text"
                  required
                  value={customReportName}
                  onChange={(e) => setCustomReportName(e.target.value)}
                  placeholder="e.g. Q4_2026_Dispute_Reconciliation_Log.csv"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Category</label>
                <select
                  value={customReportType}
                  onChange={(e) => setCustomReportType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="Monthly Financial">Monthly Financial</option>
                  <option value="Quarterly Tax">Quarterly Tax</option>
                  <option value="Vendor Performance">Vendor Performance</option>
                  <option value="Dispute & Escrow">Dispute & Escrow</option>
                  <option value="Inventory Velocity">Inventory Velocity</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date Range</label>
                <select
                  value={customDateRange}
                  onChange={(e) => setCustomDateRange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Quarter to Date">Quarter to Date</option>
                  <option value="Year to Date">Year to Date</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  Generate &amp; Download
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
