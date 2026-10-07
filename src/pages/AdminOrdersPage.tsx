import React, { useState } from 'react';
import {
  ShoppingBag,
  Clock,
  Truck,
  AlertTriangle,
  Search,
  ChevronDown,
  Download,
  TrendingUp,
  CheckCircle2,
  PackageCheck,
  ShieldAlert,
  ArrowRight,
  ArrowUpDown,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  vendorName: string;
  itemsSummary: string;
  amount: string;
  status: 'Confirmed' | 'Placed' | 'Ready for Pickup' | 'Delivered' | 'In Transit' | 'Packed' | 'Disputed';
  date: string;
}

const ORDERS_LIST: AdminOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-98421',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com',
    vendorName: 'SoundWave Direct',
    itemsSummary: '2 items (Headphones, Cable)',
    amount: '$189.00',
    status: 'Confirmed',
    date: 'Today, 14:22',
  },
  {
    id: 'ord-2',
    orderNumber: 'ORD-98420',
    customerName: 'David Chen',
    customerEmail: 'david.c@example.com',
    vendorName: 'Vendora Direct',
    itemsSummary: '1 item (Smart Desk)',
    amount: '$328.00',
    status: 'Placed',
    date: 'Today, 13:10',
  },
  {
    id: 'ord-3',
    orderNumber: 'ORD-98419',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.r@example.com',
    vendorName: 'Artisan Kitchen',
    itemsSummary: '3 items (Ceramic Mugs)',
    amount: '$104.97',
    status: 'Ready for Pickup',
    date: 'Today, 12:45',
  },
  {
    id: 'ord-4',
    orderNumber: 'ORD-98418',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.r@example.com',
    vendorName: 'StudioCraft Assets',
    itemsSummary: '1 item (UI Kit Figma)',
    amount: '$59.00',
    status: 'Delivered',
    date: 'Yesterday, 19:45',
  },
  {
    id: 'ord-5',
    orderNumber: 'ORD-98417',
    customerName: 'Michael Scott',
    customerEmail: 'm.scott@dunder.com',
    vendorName: 'Aura Apparel',
    itemsSummary: '2 items (Handbag, Scarf)',
    amount: '$520.00',
    status: 'In Transit',
    date: 'Yesterday, 16:20',
  },
  {
    id: 'ord-6',
    orderNumber: 'ORD-98416',
    customerName: 'Liam Torres',
    customerEmail: 'liam.t@example.com',
    vendorName: 'Nova Electronics',
    itemsSummary: '1 item (Wireless IEM)',
    amount: '$149.99',
    status: 'Packed',
    date: 'Yesterday, 14:10',
  },
  {
    id: 'ord-7',
    orderNumber: 'ORD-98415',
    customerName: 'Mia Patel',
    customerEmail: 'mia.patel@example.com',
    vendorName: 'SoundWave Direct',
    itemsSummary: '1 item (Monitor Speakers)',
    amount: '$159.00',
    status: 'In Transit',
    date: 'Yesterday, 11:05',
  },
  {
    id: 'ord-8',
    orderNumber: 'ORD-98414',
    customerName: 'Noah Kim',
    customerEmail: 'noah.k@example.com',
    vendorName: 'Urban Nomad Living',
    itemsSummary: '1 item (Mesh Chair)',
    amount: '$249.99',
    status: 'Disputed',
    date: '2 days ago',
  },
];

export const AdminOrdersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredOrders = ORDERS_LIST.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Order Management"
      subtitle="Monitor all marketplace transactions, split vendor packages, fulfillment SLAs, and dispute flags."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Title & Header Action
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Order Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Monitor all marketplace transactions, split vendor packages, fulfillment SLAs, and dispute flags.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Orders</span>
          </button>
        </div>

        {/* =====================================================================
            2. Top 4 KPI Metric Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Total Orders</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                68,420
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12.1%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Fulfillment */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Pending Fulfillment</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                1,428
              </div>
              <div className="mt-1 text-xs text-slate-400">
                98.2% within vendor SLA
              </div>
            </div>
          </div>

          {/* Card 3: In Transit */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">In Transit</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Truck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                3,840
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Delivery within 48h avg
              </div>
            </div>
          </div>

          {/* Card 4: Disputed / Escalated */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Refunded / Disputed</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                42
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <span>0.06% dispute rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Fulfillment Channel Breakdown (3 Cards Row)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">3P Marketplace Orders</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">54,071</div>
            <div className="text-[11px] text-slate-400 mt-0.5">79.0% of total marketplace volume</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '79%' }} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">1P Direct Warehouse Orders</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">14,349</div>
            <div className="text-[11px] text-slate-400 mt-0.5">21.0% of direct fulfillment volume</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '21%' }} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">Avg Order Fulfillment Time</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">1.8 Days</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">-0.4d faster vs SLA target</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Search & Filter Bar + Export
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders by ID, customer, vendor..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Placed">Placed</option>
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="In Transit">In Transit</option>
                <option value="Packed">Packed</option>
                <option value="Delivered">Delivered</option>
                <option value="Disputed">Disputed</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            5. Orders Data Table
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedIds.length === filteredOrders.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>ORDER ID</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">CUSTOMER</th>
                  <th className="py-3 px-4">VENDOR / MERCHANT</th>
                  <th className="py-3 px-4">ITEMS</th>
                  <th className="py-3 px-4 text-right">AMOUNT</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-slate-50/90' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                        {order.orderNumber}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 text-xs leading-tight">
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {order.customerEmail}
                        </p>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {order.vendorName}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {order.itemsSummary}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-900 text-xs">
                        {order.amount}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            order.status === 'Confirmed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'Disputed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : order.status === 'In Transit'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-medium">
                        {order.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer">
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing 1-{filteredOrders.length} of 68,420 orders total
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs"
              >
                1
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                855
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            6. Bottom 3 Fulfillment SLA Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Delivery SLA Compliance</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                98.8% of multi-vendor sub-orders were confirmed and dispatched within their contractual window this billing cycle.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700">98.8% On-Time</span>
              <button type="button" className="font-semibold text-slate-900 hover:underline flex items-center gap-1">
                <span>View Logistics SLA</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Package Splitting Ratio</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Average checkout basket contains 1.32 vendor sub-orders with independent tracking and settlement reconciliation.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">1.32 pkgs / checkout</span>
              <button type="button" className="font-semibold text-slate-900 hover:underline flex items-center gap-1">
                <span>Split Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Escrow Release Safety</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Automated 7-day escrow hold safely prevents fraudulent payouts until delivery confirmation and dispute window expiry.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">7-Day Escrow Active</span>
              <button type="button" className="font-semibold text-slate-900 hover:underline flex items-center gap-1">
                <span>Escrow Policies</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
