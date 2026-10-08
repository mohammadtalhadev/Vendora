import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  ChevronDown,
  Edit2,
  Trash2,
  Box,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { getVendorProducts } from '../features/vendor/vendorData';
import { mockDb } from '../mocks/db';
import type { Product } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

interface TableProduct {
  id: string;
  image: string;
  title: string;
  sku: string;
  category: string;
  fulfillmentType: string;
  status: 'Active' | 'Low Stock' | 'Pending Review' | 'Rejected' | 'Out of Stock' | 'Draft';
  price: string;
  originalPrice?: string;
  inventoryCount: number;
  inventoryStatusText: string;
  inventoryStatusColor: string;
  inventoryProgress: number;
  salesCount: string;
  revenue: string;
}

const STITCH_PRODUCTS: TableProduct[] = [
  {
    id: 'prod-1',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
    title: 'Sony WH-1000XM5 Wireless Headphones',
    sku: 'SNY-WH-1000XM5-BLK',
    category: 'Audio',
    fulfillmentType: 'Physical Parcel',
    status: 'Active',
    price: '$349.99',
    originalPrice: '$399.99',
    inventoryCount: 42,
    inventoryStatusText: '42 in stock Optimal',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 85,
    salesCount: '184 sold',
    revenue: '$64,398',
  },
  {
    id: 'prod-2',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=120&q=80',
    title: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    sku: 'KEY-Q1P-RED',
    category: 'Keyboards',
    fulfillmentType: 'Physical Parcel',
    status: 'Active',
    price: '$199.00',
    inventoryCount: 18,
    inventoryStatusText: '18 in stock Medium',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 50,
    salesCount: '92 sold',
    revenue: '$18,308',
  },
  {
    id: 'prod-3',
    image: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=120&q=80',
    title: 'Anker 737 Power Bank (PowerCore 24K, 140W)',
    sku: 'ANK-737-140W',
    category: 'Power',
    fulfillmentType: 'Physical Parcel',
    status: 'Low Stock',
    price: '$109.99',
    originalPrice: '$149.99',
    inventoryCount: 3,
    inventoryStatusText: '3 remaining Critical',
    inventoryStatusColor: 'bg-rose-500',
    inventoryProgress: 15,
    salesCount: '312 sold',
    revenue: '$34,316',
  },
  {
    id: 'prod-4',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=120&q=80',
    title: 'Logitech MX Master 3S Wireless Performance Mouse',
    sku: 'LOG-MXM3S-GR',
    category: 'Accessories',
    fulfillmentType: 'Physical Parcel',
    status: 'Active',
    price: '$99.99',
    inventoryCount: 64,
    inventoryStatusText: '64 in stock Healthy',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 90,
    salesCount: '540 sold',
    revenue: '$53,994',
  },
  {
    id: 'prod-5',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80',
    title: 'BenQ ScreenBar Halo Wireless Controller LED Light',
    sku: 'BNQ-HL-LIGHT',
    category: 'Workspace',
    fulfillmentType: 'Physical Parcel',
    status: 'Active',
    price: '$179.00',
    inventoryCount: 27,
    inventoryStatusText: '27 in stock Normal',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 60,
    salesCount: '78 sold',
    revenue: '$13,962',
  },
  {
    id: 'prod-6',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=120&q=80',
    title: 'Elgato Stream Deck MK.2 White Edition (15 LCD Keys)',
    sku: 'ELG-SDMK2-WHT',
    category: 'Audio & Video',
    fulfillmentType: 'Physical Parcel',
    status: 'Pending Review',
    price: '$149.99',
    inventoryCount: 50,
    inventoryStatusText: '50 staged Awaiting Approval',
    inventoryStatusColor: 'bg-blue-500',
    inventoryProgress: 70,
    salesCount: '0 sold',
    revenue: '$0 rev',
  },
  {
    id: 'prod-7',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=120&q=80',
    title: 'Magnetic Smart Folio Case for 11" M2 Tablet',
    sku: 'APL-FOL-11M2',
    category: 'Accessories',
    fulfillmentType: 'Physical Parcel',
    status: 'Rejected',
    price: '$49.00',
    inventoryCount: 0,
    inventoryStatusText: 'Blocked (15) In warehouse',
    inventoryStatusColor: 'bg-rose-500',
    inventoryProgress: 0,
    salesCount: 'Unlisted',
    revenue: '0 sold',
  },
  {
    id: 'prod-8',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=120&q=80',
    title: 'Vendora Pro 240W Braided USB-C Cable (2m)',
    sku: 'VND-CBL-240W',
    category: 'Cables',
    fulfillmentType: 'Physical Parcel',
    status: 'Out of Stock',
    price: '$19.99',
    inventoryCount: 0,
    inventoryStatusText: '0 in stock Restock ASAP',
    inventoryStatusColor: 'bg-rose-500',
    inventoryProgress: 0,
    salesCount: '840 sold',
    revenue: '$16,791',
  },
  {
    id: 'prod-9',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=120&q=80',
    title: 'Solid Walnut Ergonomic Desk Riser Shelf',
    sku: 'GRV-SHLF-WLNT',
    category: 'Workspace',
    fulfillmentType: 'Physical Parcel',
    status: 'Active',
    price: '$240.00',
    inventoryCount: 11,
    inventoryStatusText: '11 in stock Normal',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 40,
    salesCount: '47 sold',
    revenue: '$11,280',
  },
  {
    id: 'prod-10',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=120&q=80',
    title: 'Thunderbolt 4 Station 18-Port Pro Dock',
    sku: 'CDG-TS4-PRO',
    category: 'Hubs & Docks',
    fulfillmentType: 'Physical Parcel',
    status: 'Draft',
    price: '$399.95',
    inventoryCount: 0,
    inventoryStatusText: 'Unpublished 0 initial',
    inventoryStatusColor: 'bg-slate-300',
    inventoryProgress: 0,
    salesCount: '—',
    revenue: '—',
  },
  {
    id: 'prod-test',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=120&q=80',
    title: 'Aura Precision Studio Reference In-Ear Monitors',
    sku: 'AUR-IEM-REF',
    category: 'Audio',
    fulfillmentType: 'Physical',
    status: 'Active',
    price: '$289.00',
    inventoryCount: 35,
    inventoryStatusText: '35 in stock Optimal',
    inventoryStatusColor: 'bg-emerald-500',
    inventoryProgress: 75,
    salesCount: '42 sold',
    revenue: '$12,138',
  },
];

export const VendorProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const [products, setProducts] = useState<Product[]>(() => getVendorProducts(vendorId));
  const [tableProducts, setTableProducts] = useState<TableProduct[]>(STITCH_PRODUCTS);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [stockLevelFilter, setStockLevelFilter] = useState('All Stock Levels');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showHealthBanner, setShowHealthBanner] = useState(true);

  const toggleSelectAll = () => {
    if (selectedIds.length === tableProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tableProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleProductSaved = (savedProduct: Product) => {
    setProducts((prev) => {
      const existsIndex = prev.findIndex((p) => p.id === savedProduct.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = savedProduct;
        return next;
      }
      return [savedProduct, ...prev];
    });

    // Also append to table view
    setTableProducts((prev) => [
      {
        id: savedProduct.id,
        image: savedProduct.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
        title: savedProduct.title,
        sku: savedProduct.variants[0]?.sku || 'SKU-NEW',
        category: savedProduct.category || 'Electronics',
        fulfillmentType: savedProduct.type === 'digital' ? 'Digital Key' : 'Physical Parcel',
        status: 'Active',
        price: `$${savedProduct.price.toFixed(2)}`,
        inventoryCount: savedProduct.stock,
        inventoryStatusText: `${savedProduct.stock} in stock`,
        inventoryStatusColor: 'bg-emerald-500',
        inventoryProgress: 75,
        salesCount: '0 sold',
        revenue: '$0 rev',
      },
      ...prev,
    ]);
  };

  const handleDeleteProduct = (productId: string) => {
    mockDb.products = mockDb.products.filter((p) => p.id !== productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setTableProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const filteredProducts = useMemo(() => {
    return tableProducts.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'active' && product.status !== 'Active') return false;
      if (activeTab === 'draft' && product.status !== 'Draft') return false;
      if (activeTab === 'low_stock' && product.status !== 'Low Stock') return false;
      if (activeTab === 'out_of_stock' && product.status !== 'Out of Stock') return false;
      if (activeTab === 'pending' && product.status !== 'Pending Review') return false;
      if (activeTab === 'rejected' && product.status !== 'Rejected') return false;

      return true;
    });
  }, [tableProducts, activeTab, searchQuery]);

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={handleOpenAddModal} />}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Products</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Manage your product inventory, pricing, catalog approvals, and stock levels.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              <Download className="h-4 w-4 text-slate-500" />
              Export CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              <Upload className="h-4 w-4 text-slate-500" />
              Import
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              + Add New Product
            </button>
          </div>
        </div>

        {/* Catalog Health Callout Banner */}
        {showHealthBanner && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-slate-700">
                <strong>Catalog Health: 94%</strong> of your active listings comply with Vendora Express shipping &amp; 4K multi-angle asset criteria. 6 listings can be improved for better search positioning.
              </span>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button className="font-bold text-slate-900 hover:underline">
                Review 6 Listings
              </button>
              <button
                onClick={() => setShowHealthBanner(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Products */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>TOTAL PRODUCTS</span>
              <Box className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">148</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                +12 this month
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-900 rounded-full" />
          </div>

          {/* Card 2: Active Listings */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>ACTIVE LISTINGS</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">136</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                91.8% live
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-emerald-500 rounded-full" />
          </div>

          {/* Card 3: Low / Out of Stock */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>LOW / OUT OF STOCK</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">7</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Needs Restock
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-amber-500 rounded-full" />
          </div>

          {/* Card 4: Pending / Rejected */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>PENDING / REJECTED</span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">5</span>
              <span className="text-xs text-rose-600 font-bold">
                3 review • 2 rejected
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-rose-500 rounded-full" />
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span> <span className="opacity-70">148</span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active</span> <span className="opacity-70">136</span>
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'draft'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Draft</span> <span className="opacity-70">4</span>
            </button>
            <button
              onClick={() => setActiveTab('low_stock')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'low_stock'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Low Stock</span>{' '}
              <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">7</span>
            </button>
            <button
              onClick={() => setActiveTab('out_of_stock')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'out_of_stock'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Out of Stock</span> <span className="opacity-70">2</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>{' '}
              <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-800">3</span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Rejected</span>{' '}
              <span className="rounded bg-rose-100 px-1 text-[10px] text-rose-800">2</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-slate-400">Sort:</span>
            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 font-semibold text-slate-800 focus:outline-hidden">
                <option>Newest Added</option>
                <option>Highest Sales</option>
                <option>Lowest Stock</option>
                <option>Price: High to Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product title, SKU, barcode..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option>All Categories</option>
                <option>Audio</option>
                <option>Keyboards</option>
                <option>Power</option>
                <option>Accessories</option>
                <option>Workspace</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={stockLevelFilter}
                onChange={(e) => setStockLevelFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option>All Stock Levels</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>Brand: All</option>
                <option>Sony</option>
                <option>Keychron</option>
                <option>Anker</option>
                <option>Logitech</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <span className="text-xs text-slate-400 font-medium">
                {selectedIds.length} items selected
              </span>
              <button
                disabled={selectedIds.length === 0}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
              >
                Bulk Edit
              </button>
            </div>
          </div>
        </div>

        {/* Products Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === tableProducts.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3.5">Product Details</th>
                  <th className="px-4 py-3.5">Fulfillment Type</th>
                  <th className="px-4 py-3.5">Moderation Status</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Stock Level</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isChecked = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-slate-50/90' : ''}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* Product Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="min-w-0 max-w-sm">
                            <span className="font-bold text-slate-900 line-clamp-1">
                              {p.title}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>{p.sku}</span>
                              <span>•</span>
                              <span className="font-sans text-slate-500">{p.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fulfillment Type */}
                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {p.fulfillmentType}
                      </td>

                      {/* Moderation Status */}
                      <td className="px-4 py-3.5">
                        {p.status === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                        {p.status === 'Low Stock' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Low Stock
                          </span>
                        )}
                        {p.status === 'Pending Review' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Pending Review
                          </span>
                        )}
                        {p.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Rejected
                          </span>
                        )}
                        {p.status === 'Out of Stock' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            Out of Stock
                          </span>
                        )}
                        {p.status === 'Draft' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{p.price}</div>
                        {p.originalPrice && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {p.originalPrice}
                          </div>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-800">
                          {p.inventoryStatusText}
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.inventoryStatusColor}`}
                            style={{ width: `${p.inventoryProgress}%` }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const found = products.find((pr) => pr.id === p.id);
                              if (found) {
                                setEditingProduct(found);
                              }
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit Product"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong>1 to 10</strong> of <strong>148</strong> listings
              </span>
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                &lt;
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
                1
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                2
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                15
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingProduct(null);
        }}
        initialProduct={editingProduct}
        onSave={handleProductSaved}
      />
    </WorkspaceLayout>
  );
};
