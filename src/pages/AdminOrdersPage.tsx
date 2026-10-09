import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  Truck,
  AlertTriangle,
  Search,
  ChevronDown,
  Download,
  TrendingUp,
  ArrowUpDown,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';

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
    vendorName: 'Vendora Soundwave',
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
    vendorName: 'Vendora Soundwave',
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
  const [orders, setOrders] = useState<AdminOrder[]>(ORDERS_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportOrders = () => {
    exportToCsv({
      filename: `admin-marketplace-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Order Number', key: 'orderNumber' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customerName' },
        { header: 'Email', key: 'customerEmail' },
        { header: 'Vendor', key: 'vendorName' },
        { header: 'Items Summary', key: 'itemsSummary' },
        { header: 'Amount', key: 'amount' },
        { header: 'Status', key: 'status' },
      ],
      data: filteredOrders,
    });
  };

  const handleAdvanceStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nextMap: Record<string, AdminOrder['status']> = {
          Placed: 'Confirmed',
          Confirmed: 'Packed',
          Packed: 'Ready for Pickup',
          'Ready for Pickup': 'In Transit',
          'In Transit': 'Delivered',
          Disputed: 'Delivered',
          Delivered: 'Delivered',
        };
        return { ...o, status: nextMap[o.status] || 'Delivered' };
      })
    );
  };

  const handleBatchDeliver = () => {
    if (selectedIds.length === 0) return;
    setOrders((prev) =>
      prev.map((o) => (selectedIds.includes(o.id) ? { ...o, status: 'Delivered' } : o))
    );
    setSelectedIds([]);
  };

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
            onClick={handleExportOrders}
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
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

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBatchDeliver}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs hover:bg-emerald-700 transition-colors"
              >
                <span>Mark {selectedIds.length} Delivered</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportOrders}
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
                  <th className="py-3 px-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => {
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
                        <Link
                          to={`/admin/orders/${order.orderNumber}`}
                          className="hover:text-[#0071DC] hover:underline transition-colors"
                        >
                          {order.orderNumber}
                        </Link>
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

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(order.id)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          title="Advance Order Status"
                        >
                          {order.status === 'Delivered' ? 'Completed' : 'Advance'}
                        </button>
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
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                {filteredOrders.length !== orders.length && ` (filtered from ${orders.length})`}
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
