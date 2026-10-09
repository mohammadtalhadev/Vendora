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
import { useMarketplaceStore } from '../store/marketplace-store';
import { exportToCsv } from '../lib/export-csv';
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
  priceNum: number;
  originalPrice?: string;
  inventoryCount: number;
  inventoryStatusText: string;
  inventoryStatusColor: string;
  inventoryProgress: number;
  salesCount: string;
  revenue: string;
}

export const VendorProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const storeProducts = useMarketplaceStore((state) => state.products);
  const addProduct = useMarketplaceStore((state) => state.addProduct);
  const updateProduct = useMarketplaceStore((state) => state.updateProduct);
  const deleteProduct = useMarketplaceStore((state) => state.deleteProduct);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [stockLevelFilter, setStockLevelFilter] = useState('All Stock Levels');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showHealthBanner, setShowHealthBanner] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter products belonging to this vendor (exclude platform 1P Vendora products)
  const myStoreProducts = useMemo(() => {
    return storeProducts.filter((p) => {
      if (p.sellerId) {
        return p.sellerId === vendorId || p.sellerId === user?.id;
      }
      return p.sellerName !== 'Vendora' && p.sellerName !== 'Vendora Direct' && p.sellerType !== 'platform';
    });
  }, [storeProducts, vendorId, user?.id]);

  // Build reactive table items from vendor's store products
  const tableProducts: TableProduct[] = useMemo(() => {
    return myStoreProducts.map((p) => {
      let statusText: TableProduct['status'] = 'Active';
      if (p.status === 'draft') statusText = 'Draft';
      else if (p.status === 'pending_review') statusText = 'Pending Review';
      else if (p.status === 'rejected') statusText = 'Rejected';
      else if (p.stock === 0) statusText = 'Out of Stock';
      else if (p.stock <= 5) statusText = 'Low Stock';

      let invColor = 'bg-emerald-500';
      if (p.stock === 0) invColor = 'bg-rose-500';
      else if (p.stock <= 5) invColor = 'bg-amber-500';

      const progress = Math.min(100, Math.max(0, Math.round((p.stock / 50) * 100)));
      const sku = p.variants?.[0]?.sku || `SKU-${p.id.slice(-6).toUpperCase()}`;

      return {
        id: p.id,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
        title: p.title,
        sku,
        category: p.category.replace('cat-', '').replace('-', ' ').toUpperCase(),
        fulfillmentType: p.type === 'digital' ? 'Digital Key' : 'Physical Parcel',
        status: statusText,
        price: `$${p.price.toFixed(2)}`,
        priceNum: p.price,
        originalPrice: p.compareAtPrice ? `$${p.compareAtPrice.toFixed(2)}` : undefined,
        inventoryCount: p.stock,
        inventoryStatusText: p.stock === 0 ? '0 in stock (Restock)' : `${p.stock} in stock`,
        inventoryStatusColor: invColor,
        inventoryProgress: progress,
        salesCount: `${p.reviewCount || 12} sold`,
        revenue: `$${((p.reviewCount || 12) * p.price).toLocaleString()}`,
      };
    });
  }, [myStoreProducts]);

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
    const exists = storeProducts.some((p) => p.id === savedProduct.id);
    if (exists) {
      updateProduct(savedProduct.id, savedProduct);
      showNotification(`Product "${savedProduct.title}" updated successfully`);
    } else {
      addProduct({
        ...savedProduct,
        sellerId: vendorId,
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
      });
      showNotification(`Product "${savedProduct.title}" added to inventory`);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId);
    setSelectedIds((prev) => prev.filter((i) => i !== productId));
    showNotification('Product deleted from catalog');
  };

  const handleExportCsv = () => {
    const exportData = filteredProducts.map((p) => ({
      ID: p.id,
      Title: p.title,
      SKU: p.sku,
      Category: p.category,
      Fulfillment: p.fulfillmentType,
      Price: p.price,
      Stock: p.inventoryCount,
      Status: p.status,
      Sales: p.salesCount,
      Revenue: p.revenue,
    }));

    exportToCsv(`vendor-products-${new Date().toISOString().split('T')[0]}.csv`, exportData, {
      ID: 'Product ID',
      Title: 'Product Title',
      SKU: 'SKU Code',
      Category: 'Category',
      Fulfillment: 'Fulfillment Type',
      Price: 'Price',
      Stock: 'Stock Count',
      Status: 'Moderation Status',
      Sales: 'Estimated Sales',
      Revenue: 'Estimated Revenue',
    });
    showNotification('Product catalog exported to CSV successfully');
  };

  const handleImportClick = () => {
    showNotification('Product CSV template ready for import');
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      deleteProduct(id);
    }
    showNotification(`Deleted ${selectedIds.length} selected products`);
    setSelectedIds([]);
  };

  const filteredProducts = useMemo(() => {
    return tableProducts.filter((product) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        product.title.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Category filter
      if (categoryFilter !== 'All Categories') {
        const catNorm = categoryFilter.toLowerCase();
        if (!product.category.toLowerCase().includes(catNorm)) {
          return false;
        }
      }

      // Stock Level filter
      if (stockLevelFilter === 'In Stock' && product.inventoryCount <= 5) return false;
      if (stockLevelFilter === 'Low Stock' && (product.inventoryCount === 0 || product.inventoryCount > 5)) return false;
      if (stockLevelFilter === 'Out of Stock' && product.inventoryCount > 0) return false;

      // Tab filter
      if (activeTab === 'active' && product.status !== 'Active') return false;
      if (activeTab === 'draft' && product.status !== 'Draft') return false;
      if (activeTab === 'low_stock' && product.status !== 'Low Stock') return false;
      if (activeTab === 'out_of_stock' && product.status !== 'Out of Stock') return false;
      if (activeTab === 'pending' && product.status !== 'Pending Review') return false;
      if (activeTab === 'rejected' && product.status !== 'Rejected') return false;

      return true;
    });
  }, [tableProducts, activeTab, searchQuery, categoryFilter, stockLevelFilter]);

  // Dynamic counts
  const countAll = tableProducts.length;
  const countActive = tableProducts.filter((p) => p.status === 'Active').length;
  const countLowStock = tableProducts.filter((p) => p.status === 'Low Stock').length;
  const countPending = tableProducts.filter((p) => p.status === 'Pending Review' || p.status === 'Draft').length;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

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
            {feedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {feedback}
              </span>
            )}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              Import
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
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
                <strong>Catalog Health: 96%</strong> of your listings comply with Vendora Express shipping &amp; 4K multi-angle asset criteria.
              </span>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
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
              <span className="text-3xl font-extrabold text-slate-900">{countAll}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                +100% in sync
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
              <span className="text-3xl font-extrabold text-slate-900">{countActive}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {countAll > 0 ? `${Math.round((countActive / countAll) * 100)}% live` : '0%'}
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
              <span className="text-3xl font-extrabold text-slate-900">{countLowStock}</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Needs Restock
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-amber-500 rounded-full" />
          </div>

          {/* Card 4: Pending / Review */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>PENDING / REJECTED</span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{countPending}</span>
              <span className="text-xs text-rose-600 font-bold">
                {countPending} in queue
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-rose-500 rounded-full" />
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span> <span className="opacity-70">{countAll}</span>
            </button>
            <button
              onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active</span> <span className="opacity-70">{countActive}</span>
            </button>
            <button
              onClick={() => { setActiveTab('low_stock'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'low_stock'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Low Stock</span>{' '}
              <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">{countLowStock}</span>
            </button>
            <button
              onClick={() => { setActiveTab('out_of_stock'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'out_of_stock'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Out of Stock</span>
            </button>
            <button
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
            </button>
            <button
              onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Rejected</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search product title, SKU, barcode..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option>All Categories</option>
                <option>Audio</option>
                <option>Computing</option>
                <option>Gaming</option>
                <option>Digital</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={stockLevelFilter}
                onChange={(e) => { setStockLevelFilter(e.target.value); setCurrentPage(1); }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option>All Stock Levels</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <span className="text-xs text-slate-400 font-medium">
                {selectedIds.length} selected
              </span>
              <button
                disabled={selectedIds.length === 0}
                onClick={handleBatchDelete}
                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
              >
                Delete Selected
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
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
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
                {paginatedProducts.map((p) => {
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
                              const found = storeProducts.find((pr) => pr.id === p.id);
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

          {/* Table Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div>
              Showing{' '}
              <strong>
                {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
              </strong>{' '}
              of <strong>{filteredProducts.length}</strong> items
              {filteredProducts.length !== countAll && ` (filtered from ${countAll})`}
            </div>
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-xs font-bold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white'
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
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Product Create / Edit Modal */}
        <ProductFormModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingProduct(null);
          }}
          initialProduct={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </WorkspaceLayout>
  );
};
