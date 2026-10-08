import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  Clock,
  Truck,
  TrendingDown,
  DollarSign,
  Search,
  ChevronDown,
  Download,
  SlidersHorizontal,
  CheckCircle2,
  Camera,
  Video,
  Lightbulb,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';

interface ReturnItem {
  id: string;
  rmaId: string;
  orderNumber: string;
  orderTime: string;
  customerName: string;
  customerCity: string;
  productImage: string;
  productName: string;
  productVariant: string;
  reason: string;
  badgeType?: 'photos' | 'video' | 'unopened' | 'dock' | 'restocked' | 'mismatch' | 'passed';
  badgeLabel?: string;
  serialNote?: string;
  refundAmount: string;
}

const RETURN_ITEMS: ReturnItem[] = [
  {
    id: 'rma-1',
    rmaId: 'RMA-4029',
    orderNumber: '#ORD-9784',
    orderTime: 'Yesterday, 4:15 PM',
    customerName: 'Elena Rostova',
    customerCity: 'Chicago, IL',
    productImage: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=120&q=80',
    productName: 'Anker 737 GaN Power Bank',
    productVariant: '140W (24,000mAh) • Space Gray',
    reason: 'Ports unresponsive',
    badgeType: 'photos',
    badgeLabel: '2 Photos',
    serialNote: 'Serial #AK-9921',
    refundAmount: '$89.99',
  },
  {
    id: 'rma-2',
    rmaId: 'RMA-4028',
    orderNumber: '#ORD-9740',
    orderTime: 'May 14, 11:20 AM',
    customerName: 'Marcus Vance',
    customerCity: 'Austin, TX',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
    productName: 'Sony WH-1000XM5 ANC',
    productVariant: 'Platinum Silver • Over-Ear',
    reason: 'Buyer remorse / remorse',
    badgeType: 'unopened',
    badgeLabel: 'Unopened box',
    refundAmount: '$348.00',
  },
  {
    id: 'rma-3',
    rmaId: 'RMA-4027',
    orderNumber: '#ORD-9612',
    orderTime: 'May 13, 09:04 AM',
    customerName: 'Sophia Lin',
    customerCity: 'Seattle, WA',
    productImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=120&q=80',
    productName: 'Keychron Q1 Pro Wireless',
    productVariant: 'Carbon Black • Gateron Banana',
    reason: 'Scratch on frame',
    badgeType: 'dock',
    badgeLabel: 'Dock Bay 4 • Arrived 2h ago',
    refundAmount: '$198.00',
  },
  {
    id: 'rma-4',
    rmaId: 'RMA-4025',
    orderNumber: '#ORD-9533',
    orderTime: 'May 11, 2:40 PM',
    customerName: 'Julian Thorne',
    customerCity: 'Boston, MA',
    productImage: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=120&q=80',
    productName: 'Logitech MX Master 3S',
    productVariant: 'Graphite • Ergonomic',
    reason: 'Accidental double order',
    badgeType: 'restocked',
    badgeLabel: 'Restocked 100%',
    refundAmount: '$99.00',
  },
  {
    id: 'rma-5',
    rmaId: 'RMA-4024',
    orderNumber: '#ORD-9480',
    orderTime: 'May 10, 5:12 PM',
    customerName: 'Amara Nwosu',
    customerCity: 'Atlanta, GA',
    productImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80',
    productName: 'Belkin BoostCharge Pro 3-in-1',
    productVariant: '15W Fast Charge • Black',
    reason: 'Apple Watch pad not working',
    badgeType: 'video',
    badgeLabel: '1 Video',
    refundAmount: '$149.99',
  },
  {
    id: 'rma-6',
    rmaId: 'RMA-4021',
    orderNumber: '#ORD-9304',
    orderTime: 'May 08, 1:18 PM',
    customerName: 'David K. Miller',
    customerCity: 'Denver, CO',
    productImage: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=120&q=80',
    productName: 'SanDisk Extreme 2TB SSD',
    productVariant: '1050MB/s • USB 3.2 Gen 2',
    reason: 'Mismatched serial code',
    badgeType: 'mismatch',
    badgeLabel: 'SN mismatch • Case escalated',
    refundAmount: '$159.00',
  },
  {
    id: 'rma-7',
    rmaId: 'RMA-4019',
    orderNumber: '#ORD-9280',
    orderTime: 'May 06, 10:14 AM',
    customerName: 'Rachel Green',
    customerCity: 'New York, NY',
    productImage: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=120&q=80',
    productName: 'CalDigit TS4 Thunderbolt Dock',
    productVariant: '18 Ports • 98W Power Delivery',
    reason: 'Incompatible with host machine',
    badgeType: 'passed',
    badgeLabel: 'Inspected & Passed',
    refundAmount: '$399.95',
  },
];

export const VendorReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'transit' | 'inspection' | 'completed' | 'disputed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(['rma-1', 'rma-5']);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === RETURN_ITEMS.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(RETURN_ITEMS.map((item) => item.id));
    }
  };

  const filteredItems = RETURN_ITEMS.filter((item) => {
    const q = searchQuery.toLowerCase();
    const match =
      item.rmaId.toLowerCase().includes(q) ||
      item.orderNumber.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q);
    return match;
  });

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Returns &amp; Refunds
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live RMA Queue
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Process return authorizations, inspect received merchandise, issue instantaneous buyer credits, and manage intelligent automated restocking workflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              Return Settings / Policy
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors">
              <Check className="h-4 w-4" />
              Bulk Approve (2)
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Active Return Requests */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>ACTIVE RETURN REQUESTS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">3</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Action Needed
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Avg resolution time: <strong className="text-slate-800">4.2 hrs</strong></span>
            </div>
          </div>

          {/* Card 2: In Transit to Warehouse */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>IN TRANSIT TO WAREHOUSE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">5</span>
              <span className="text-xs text-slate-500 font-medium">Via UPS / FedEx Ground</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              <strong className="text-slate-800">2</strong> expected delivery today
            </div>
          </div>

          {/* Card 3: Merchant Return Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>MERCHANT RETURN RATE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">1.8%</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                -0.4% vs benchmark
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cat. Benchmark: <strong>3.5% (Electronics)</strong></span>
            </div>
          </div>

          {/* Card 4: Total Refunded */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>TOTAL REFUNDED (30D)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">$490.50</span>
              <span className="text-xs text-slate-500 font-medium">4 Approved</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Recovery rate: <strong className="text-slate-800">76.4% via restock</strong>
            </div>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Returns <span className="opacity-75">23</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Action <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">3</span>
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'transit'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Transit <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-800">5</span>
          </button>
          <button
            onClick={() => setActiveTab('inspection')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'inspection'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Awaiting Inspection <span className="opacity-75">2</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'completed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed / Refunded <span className="opacity-75">16</span>
          </button>
          <button
            onClick={() => setActiveTab('disputed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'disputed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected / Disputed <span className="rounded bg-rose-100 px-1 text-[10px] text-rose-800">2</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RMA or order ID..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>All Reasons (Defective, Remorse, Damaged)</option>
                <option>Defective</option>
                <option>Remorse</option>
                <option>Damaged</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>All Resolutions</option>
                <option>Refund to Card</option>
                <option>Store Credit</option>
                <option>Replacement</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>Last 90 Days</option>
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors"
              title="Download Report"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Returns Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === RETURN_ITEMS.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3.5">RMA &amp; ORDER ID</th>
                  <th className="px-4 py-3.5">CUSTOMER</th>
                  <th className="px-4 py-3.5">RETURNED PRODUCT</th>
                  <th className="px-4 py-3.5">REASON &amp; VERIFICATION</th>
                  <th className="px-4 py-3.5 text-right">REFUND AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-slate-50/80' : ''}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* RMA & Order ID */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.rmaId}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-blue-600">{item.orderNumber}</span>
                          <span>•</span>
                          <span className="text-slate-400">{item.orderTime}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.customerName}</div>
                        <div className="text-[11px] text-slate-400">{item.customerCity}</div>
                      </td>

                      {/* Returned Product */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-400">{item.productVariant}</div>
                          </div>
                        </div>
                      </td>

                      {/* Reason & Verification */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{item.reason}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {item.badgeType === 'photos' && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                              <Camera className="h-3 w-3" />
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'video' && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                              <Video className="h-3 w-3" />
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'unopened' && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'dock' && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'restocked' && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'mismatch' && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'passed' && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.serialNote && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {item.serialNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Refund Amount */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {item.refundAmount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <span>
              Showing <strong>1-7</strong> of <strong>28</strong> return orders •{' '}
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-1">
              <button className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50">
                &lt; Prev
              </button>
              <button className="h-6 w-6 rounded bg-slate-900 text-center font-bold text-white">
                1
              </button>
              <button className="h-6 w-6 rounded border border-slate-200 bg-white text-center font-semibold text-slate-600 hover:bg-slate-50">
                2
              </button>
              <button className="h-6 w-6 rounded border border-slate-200 bg-white text-center font-semibold text-slate-600 hover:bg-slate-50">
                3
              </button>
              <button className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50">
                Next &gt;
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Bottom Analytics: Common Reasons & Return Rules */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Common Return Reasons Breakdown */}
          <div className="lg:col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Common Return Reasons Breakdown
                </h2>
                <p className="text-xs text-slate-500">Telemetry based on last 90 days RMA classifications</p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Sample: 124 returns
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Defective packaging / hardware issue</span>
                  <strong className="text-slate-900">42% (52 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Changed mind / Buyer remorse</span>
                  <strong className="text-slate-900">28% (35 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Item not as described / Spec mismatch</span>
                  <strong className="text-slate-900">18% (22 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Damaged in transit by carrier</span>
                  <strong className="text-slate-900">12% (15 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Tip: Updating power bank specs lowered return velocity by <strong>14%</strong>.</span>
              </div>
              <button className="font-bold text-slate-900 hover:underline self-start sm:self-auto">
                Download CSV report →
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Automated Return Rules */}
          <div className="lg:col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Automated Return Rules</h2>
                <p className="text-xs text-slate-500">System rules to accelerate merchant review</p>
              </div>
              <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Configure
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Rule 1 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Auto-approve items under $30</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Buyer receives label instantly without manual approval
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Enabled
                </span>
              </div>

              {/* Rule 2 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Camera className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Mandatory photo proof for defects</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Requires min. 1 serial image and 1 defect image
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Enabled
                </span>
              </div>

              {/* Rule 3 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-slate-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Standard Return Window</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      30 days from carrier delivery timestamp
                    </p>
                  </div>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  30 Days
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Last edited 3 days ago by vendor@demo.test</span>
              <button className="font-semibold text-slate-600 hover:text-slate-900">
                View Audit Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
