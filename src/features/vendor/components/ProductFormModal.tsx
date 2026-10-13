import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Package,
  Layers,
  Sparkles,
  Trash2,
  Download,
  Box,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import type { Product, ProductType, Variant } from '../../../types/domain';
import { useCategories } from '../../catalog/hooks/useProducts';
import { useCreateVendorProduct, useUpdateVendorProduct } from '../hooks/useVendorProducts';
import type { VendorProductDraft } from '../api/products';
import { useCurrency } from '../../../store/currency-store';
import { cn } from '../../../lib/utils';

export interface ProductFormModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onSave?: (product: Product) => void;
  initialProduct?: Partial<Product> | null;
  vendorId?: string;
  vendorName?: string;
}

type TabType = 'details' | 'pricing' | 'variants';

interface ProductFormContentProps {
  initialProduct?: Partial<Product> | null;
  onSave?: (product: Product) => void;
  onClose: () => void;
  vendorId?: string;
  vendorName?: string;
}

const ProductFormContent: React.FC<ProductFormContentProps> = ({
  initialProduct,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const { formatPrice } = useCurrency();
  const { data: categoryData } = useCategories();
  const categories = categoryData?.categories ?? [];
  const createListing = useCreateVendorProduct();
  const updateListing = useUpdateVendorProduct();

  // Form fields start empty: a prefilled price or brand would be a value the seller
  // never chose, and it would land in the database as if they had.
  const [title, setTitle] = useState(initialProduct?.title || '');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [imageUrl, setImageUrl] = useState(initialProduct?.images?.[0] || '');
  const [productType, setProductType] = useState<ProductType>(
    initialProduct?.type || 'physical',
  );
  const [price, setPrice] = useState(
    initialProduct?.price !== undefined ? initialProduct.price.toString() : '',
  );
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialProduct?.compareAtPrice ? initialProduct.compareAtPrice.toString() : '',
  );
  const [stock, setStock] = useState(
    initialProduct?.stock !== undefined ? initialProduct.stock.toString() : '',
  );
  const [shippingFee, setShippingFee] = useState(
    initialProduct?.shippingSettings?.standardFee !== undefined
      ? initialProduct.shippingSettings.standardFee.toString()
      : '',
  );
  const [licenseType, setLicenseType] = useState(
    initialProduct?.digitalAssetInfo?.licenseType || 'Single Commercial License',
  );
  const [downloadUrl, setDownloadUrl] = useState(
    initialProduct?.digitalAssetInfo?.downloadUrl || '',
  );

  // An edited row carries the category *name*; the select is addressed by id.
  useEffect(() => {
    if (categoryId || !initialProduct?.category || categories.length === 0) return;
    const match = categories.find((cat) => cat.name === initialProduct.category);
    if (match) setCategoryId(match.id);
  }, [categories, initialProduct, categoryId]);

  // Variant Generator State
  const [optionName, setOptionName] = useState('Color');
  const [optionValues, setOptionValues] = useState('Matte Black, Lunar Silver');
  const [variants, setVariants] = useState<Variant[]>(initialProduct?.variants || []);

  // Validation Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle generating variants from comma-separated input
  const handleGenerateVariants = () => {
    const rawValues = optionValues
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (rawValues.length === 0) return;

    const basePriceNum = parseFloat(price) || 0;
    const baseStockNum = parseInt(stock, 10) || 0;
    const optLabel = optionName.trim() || 'Option';

    const generated: Variant[] = rawValues.map((val, index) => {
      const slugVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return {
        id: `var-${Date.now()}-${index}`,
        name: `${optLabel}: ${val}`,
        sku: `${slugVal}-${index + 1}`,
        price: basePriceNum,
        stock: Math.floor(baseStockNum / rawValues.length),
        attributes: { [optLabel]: val },
      };
    });

    setVariants((prev) => [...prev, ...generated]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Product title is required.');
      setActiveTab('details');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Choose the category this listing belongs in.');
      setActiveTab('details');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please enter a valid price greater than zero.');
      setActiveTab('pricing');
      return;
    }

    const stockNum = stock.trim() === '' ? 0 : parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMessage('Please enter a valid stock quantity.');
      setActiveTab('pricing');
      return;
    }

    // The seller supplies the listing; `seller_id`, `status`, `rating` and `review_count`
    // are set by the database, so a new listing enters moderation as pending_review.
    const draft: VendorProductDraft = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      brand: brand.trim(),
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      price: priceNum,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      type: productType,
      variants,
      stock: stockNum,
      shippingSettings:
        productType === 'physical'
          ? {
              standardFee: parseFloat(shippingFee) || 0,
              freeShipping: (parseFloat(shippingFee) || 0) === 0,
            }
          : undefined,
      digitalAssetInfo:
        productType === 'digital'
          ? { licenseType, downloadUrl: downloadUrl.trim() || undefined }
          : undefined,
    };

    try {
      const saved = initialProduct?.id
        ? await updateListing.mutateAsync({ productId: initialProduct.id, updates: draft })
        : await createListing.mutateAsync(draft);
      onSave?.(saved);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save the listing.');
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-[#FF7A1A]">
            <Package className="h-4 w-4" aria-hidden="true" />
          </span>
          <DialogTitle>
            {initialProduct ? 'Edit Vendor Product' : 'Add New Product'}
          </DialogTitle>
        </div>
        <DialogDescription>
          Configure your catalog listing, pricing rules, physical or digital fulfillment, and SKU variants.
        </DialogDescription>
      </DialogHeader>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1 border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          aria-pressed={activeTab === 'details'}
          className={cn(
            'flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150',
            activeTab === 'details'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          1. Listing Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          aria-pressed={activeTab === 'pricing'}
          className={cn(
            'flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150',
            activeTab === 'pricing'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          2. Pricing & Delivery
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          aria-pressed={activeTab === 'variants'}
          className={cn(
            'flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1',
            activeTab === 'variants'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          <span>3. Variant Generator</span>
          {variants.length > 0 && (
            <Badge variant="vendor-verified" size="sm" className="px-1.5 py-0">
              {variants.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        {/* TAB 1: Listing Details */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="listing-title" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Title <span className="text-coral">*</span>
              </label>
              <Input
                id="listing-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Aura Precision Studio Reference In-Ear Monitors"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="listing-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Category <span className="text-coral">*</span>
                </label>
                <select
                  id="listing-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-11 w-full rounded-full border border-slate-200 bg-white/95 px-5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
                >
                  <option value="">Choose a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="listing-brand" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Brand Name
                </label>
                <Input
                  id="listing-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. SoundWave Audio"
                />
              </div>
            </div>

            <div>
              <label htmlFor="listing-image-url" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Image URL
              </label>
              <Input
                id="listing-image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            <div>
              <label htmlFor="listing-description" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Description
              </label>
              <textarea
                id="listing-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
                placeholder="Describe key features, technical specifications, and acoustics..."
              />
            </div>
          </div>
        )}

        {/* TAB 2: Pricing & Delivery */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            {/* Physical vs Digital Toggle */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Fulfillment Type
              </span>
              <div role="group" aria-label="Fulfillment Type" className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProductType('physical')}
                  aria-pressed={productType === 'physical'}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-bold border transition-all duration-150',
                    productType === 'physical'
                      ? 'bg-sun-orange text-white border-sun-orange shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <Box className="h-4 w-4" aria-hidden="true" />
                  <span>Physical Good (Courier Pickup)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('digital')}
                  aria-pressed={productType === 'digital'}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-bold border transition-all duration-150',
                    productType === 'digital'
                      ? 'bg-sun-orange text-white border-sun-orange shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Digital Asset (Instant License)</span>
                </button>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="listing-price" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Price <span className="text-coral">*</span>
                </label>
                <Input
                  id="listing-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="189.00"
                />
              </div>
              <div>
                <label htmlFor="listing-compare-at-price" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Compare At
                </label>
                <Input
                  id="listing-compare-at-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="220.00"
                />
              </div>
              <div>
                <label htmlFor="listing-stock" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Total Stock <span className="text-coral">*</span>
                </label>
                <Input
                  id="listing-stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>

            {/* Physical vs Digital Specific Fields */}
            {productType === 'physical' ? (
                <div>
                  <label htmlFor="listing-shipping-fee" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Standard Shipping Fee
                  </label>
                  <Input
                    id="listing-shipping-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    placeholder="8.50"
                  />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-sky-50/70 border border-sky-100 p-3">
                  <div>
                    <label htmlFor="listing-license-type" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      License Type
                    </label>
                    <select
                      id="listing-license-type"
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full admin-select h-10"
                    >
                      <option value="Single Commercial License">Single Commercial License</option>
                      <option value="Personal Single-Use License">Personal Single-Use License</option>
                      <option value="Extended Developer License">Extended Developer License</option>
                      <option value="Enterprise Multi-Seat License">Enterprise Multi-Seat License</option>
                      <option value="Royalty-Free Lifetime License">Royalty-Free Lifetime License</option>
                      <option value="Editorial / Non-Commercial License">Editorial / Non-Commercial License</option>
                      <option value="Custom Enterprise Agreement">Custom Enterprise Agreement</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="listing-asset-url" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Asset Download URL
                    </label>
                    <Input
                      id="listing-asset-url"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="/downloads/asset-package.zip"
                    />
                  </div>
                </div>
            )}
          </div>
        )}

        {/* TAB 3: Variants */}
        {activeTab === 'variants' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#FF7A1A]" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Quick Variant Generator
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="variant-generator-option" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Option Name
                  </label>
                  <select
                    id="variant-generator-option"
                    value={optionName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptionName(val);
                      if (val === 'Color') setOptionValues('Matte Black, Lunar Silver, Alpine White');
                      else if (val === 'Size') setOptionValues('Small, Medium, Large, XL');
                      else if (val === 'Storage Capacity') setOptionValues('128GB, 256GB, 512GB, 1TB');
                      else if (val === 'Material') setOptionValues('Stainless Steel, Aluminum, Leather');
                      else if (val === 'Style') setOptionValues('Classic, Modern, Minimalist');
                      else if (val === 'Weight') setOptionValues('500g, 1kg, 2kg');
                      else if (val === 'Pack Quantity') setOptionValues('1-Pack, 2-Pack, 4-Pack');
                    }}
                    className="w-full admin-select h-10"
                  >
                    <option value="Color">Color (e.g. Black, White, Silver)</option>
                    <option value="Size">Size (e.g. S, M, L, XL)</option>
                    <option value="Storage Capacity">Storage Capacity (e.g. 128GB, 256GB)</option>
                    <option value="Material">Material (e.g. Aluminum, Leather)</option>
                    <option value="Style">Style (e.g. Modern, Vintage)</option>
                    <option value="Weight">Weight (e.g. 500g, 1kg)</option>
                    <option value="Pack Quantity">Pack Quantity (e.g. 1-Pack, 2-Pack)</option>
                    <option value="Custom Option">Custom Option</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="variant-generator-values" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Values (comma-separated)
                  </label>
                  <Input
                    id="variant-generator-values"
                    value={optionValues}
                    onChange={(e) => setOptionValues(e.target.value)}
                    placeholder="e.g. Matte Black, Lunar Silver, Gold"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateVariants}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Generate Variants</span>
                </Button>
              </div>
            </div>

            {/* Variants Listing Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Active Product Variants ({variants.length})
                </span>
              </div>

              {variants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  <Layers className="mx-auto h-6 w-6 text-slate-400 mb-1" aria-hidden="true" />
                  <p>No variants configured yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Use the quick generator above to create color or size combinations.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Variant Name</th>
                        <th className="py-2.5 px-3 font-semibold">SKU</th>
                        <th className="py-2.5 px-3 font-semibold">Price</th>
                        <th className="py-2.5 px-3 font-semibold">Stock</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {variants.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{v.name}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{v.sku}</td>
                          <td className="py-2 px-3 text-slate-700">{formatPrice(v.price)}</td>
                          <td className="py-2 px-3 text-slate-700">{v.stock}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(v.id)}
                              className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              aria-label={`Remove variant ${v.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100">
          <div className="flex w-full items-center justify-between">
            <div>
              {activeTab !== 'details' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setActiveTab(activeTab === 'variants' ? 'pricing' : 'details')
                  }
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              {activeTab !== 'variants' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setActiveTab(activeTab === 'details' ? 'pricing' : 'variants')
                  }
                >
                  Next Step
                </Button>
              ) : null}
              <Button
                type="submit"
                variant="orange-cta"
                size="sm"
                disabled={createListing.isPending || updateListing.isPending}
              >
                {createListing.isPending || updateListing.isPending ? 'Saving…' : 'Save Product'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </form>
    </>
  );
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onSuccess,
  onSave,
  initialProduct,
  vendorId,
  vendorName,
}) => {
  const isModalOpen = open ?? isOpen ?? false;
  const handleOpenChange = (val: boolean) => {
    onOpenChange?.(val);
    if (!val) {
      onClose?.();
    }
  };
  const handleSave = (prod: Product) => {
    onSave?.(prod);
    onSuccess?.();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ProductFormContent
          key={initialProduct?.id || (isModalOpen ? 'new' : 'idle')}
          initialProduct={initialProduct}
          onSave={handleSave}
          onClose={() => handleOpenChange(false)}
          vendorId={vendorId}
          vendorName={vendorName}
        />
      </DialogContent>
    </Dialog>
  );
};
