import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Box,
  Download,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Layers,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { getVendorProducts } from '../features/vendor/vendorData';
import { mockDb } from '../mocks/db';
import type { Product, ModerationStatus } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

export const VendorProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const [products, setProducts] = useState<Product[]>(() => getVendorProducts(vendorId));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ModerationStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filter products by search and status
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesBrand = p.brand.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBrand && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [products, statusFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // Remove from mockDb
      mockDb.products = mockDb.products.filter((p) => p.id !== productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
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
  };

  const renderModerationBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="in-stock" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Approved</span>
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3" />
            <span>Under Review</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="discount-coral" className="gap-1">
            <Ban className="h-3 w-3" />
            <span>Rejected</span>
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="outline" className="gap-1 text-slate-500">
            <span>Draft</span>
          </Badge>
        );
    }
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      title="Product Inventory"
      subtitle="Manage your marketplace listings, catalog variants, and moderation status."
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-1 items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, category, brand..."
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ModerationStatus)}
              className="flex h-11 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_review">Under Review</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Button
            variant="orange-cta"
            size="default"
            onClick={handleOpenAddModal}
            className="gap-2 font-semibold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Product</span>
          </Button>
        </div>

        {/* Product Inventory Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Fulfillment Type</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4">Moderation Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No products match your criteria</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click "+ Add New Product" to list a new catalog item.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock = product.stock <= 5 && product.stock > 0;
                    const isOutOfStock = product.stock === 0;

                    return (
                      <tr
                        key={product.id}
                        data-testid={`product-row-${product.id}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Image & Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images[0] || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b'}
                              alt={product.title}
                              className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                            />
                            <div className="min-w-0 max-w-xs">
                              <h3 className="font-bold text-slate-900 truncate">
                                {product.title}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span>{product.brand}</span>
                                <span>•</span>
                                <span className="capitalize">{product.category.replace('cat-', '')}</span>
                                {product.variants && product.variants.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                                      <Layers className="h-3 w-3" />
                                      {product.variants.length} variants
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4">
                          {product.type === 'physical' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              <Box className="h-3 w-3 text-slate-500" />
                              <span>Physical</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
                              <Download className="h-3 w-3 text-cyan-600" />
                              <span>Digital Asset</span>
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            ${product.price.toFixed(2)}
                          </div>
                          {product.compareAtPrice && (
                            <div className="text-[11px] text-slate-400 line-through">
                              ${product.compareAtPrice.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">
                              {product.stock}
                            </span>
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-3 w-3" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-3 w-3" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Healthy
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Moderation Status */}
                        <td className="py-3.5 px-4">
                          {renderModerationBadge(product.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Edit product"
                              aria-label={`Edit ${product.title}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete product"
                              aria-label={`Delete ${product.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Modal */}
        <ProductFormModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          initialProduct={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </WorkspaceLayout>
  );
};
