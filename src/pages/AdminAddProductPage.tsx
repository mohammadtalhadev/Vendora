import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Layers,
  Sparkles,
  Trash2,
  Box,
  Plus,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Upload,
  UploadCloud,
  DollarSign,
  Globe,
  Image as ImageIcon,
  Check,
  Shield,
  Tag,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { Product, ProductType, Variant } from '../types/domain';
import { mockDb } from '../mocks/db';
import { useMarketplaceStore } from '../store/marketplace-store';
import { supabaseStorage } from '../lib/supabase-service';
import { cn } from '../lib/utils';

export const AdminAddProductPage: React.FC = () => {
  const navigate = useNavigate();

  // Basic Information
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('cat-electronics');
  const [brand, setBrand] = useState('Vendora');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');

  // Media
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Pricing & Financials
  const [price, setPrice] = useState('199.00');
  const [compareAtPrice, setCompareAtPrice] = useState('249.00');
  const [costPerItem, setCostPerItem] = useState('85.00');
  const [chargeTax, setChargeTax] = useState(true);

  // Stock & Inventory
  const [sku, setSku] = useState('VEN-1P-1001');
  const [barcode, setBarcode] = useState('840992817201');
  const [trackQuantity, setTrackQuantity] = useState(true);
  const [stock, setStock] = useState('50');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');

  // Fulfillment
  const [productType, setProductType] = useState<ProductType>('physical');
  const [weightKg, setWeightKg] = useState('0.60');
  const [shippingFee, setShippingFee] = useState('0.00');
  const [freeShipping, setFreeShipping] = useState(true);
  const [licenseType, setLicenseType] = useState('Commercial Platform License');
  const [downloadUrl, setDownloadUrl] = useState('/downloads/vendora-suite.zip');

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [optionName, setOptionName] = useState('Color');
  const [optionValues, setOptionValues] = useState('Midnight Black, Space Silver, Alpine White');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isOptionDropdownOpen, setIsOptionDropdownOpen] = useState(false);
  const optionDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionDropdownRef.current && !optionDropdownRef.current.contains(e.target as Node)) {
        setIsOptionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Organization & Visibility
  const [tags, setTags] = useState<string[]>(['1P Official', 'Vendora Choice', 'Express Delivery', 'Warranty']);
  const [newTagInput, setNewTagInput] = useState('');
  const [collection, setCollection] = useState('Vendora Flagship');
  const [isFeaturedOnStore, setIsFeaturedOnStore] = useState(true);

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Toast & Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
    if (!seoTitle) setSeoTitle(val);
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    showToast('Image URL added to media gallery.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const { url, error } = await supabaseStorage.uploadProductImage(file);
      if (error || !url) {
        const localUrl = URL.createObjectURL(file);
        setImages((prev) => [...prev, localUrl]);
        showToast('Image attached locally (Storage fallback).');
      } else {
        setImages((prev) => [...prev, url]);
        showToast('Image uploaded directly to Supabase Storage!');
      }
    } catch {
      const localUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, localUrl]);
      showToast('Image attached locally.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCover = (index: number) => {
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      return [chosen, ...copy];
    });
    showToast('Primary cover image updated.');
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTagInput.trim() || tags.includes(newTagInput.trim())) return;
    setTags((prev) => [...prev, newTagInput.trim()]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleGenerateSku = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const newSku = `VEN-1P-${random}`;
    setSku(newSku);
    showToast(`Generated SKU: ${newSku}`);
  };

  const handleGenerateVariants = () => {
    const rawValues = optionValues
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (rawValues.length === 0) return;

    const basePriceNum = parseFloat(price) || 0;
    const baseStockNum = parseInt(stock, 10) || 10;
    const optLabel = optionName.trim() || 'Option';

    const generated: Variant[] = rawValues.map((val, index) => {
      const slugVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return {
        id: `var-${Date.now()}-${index}`,
        name: `${optLabel}: ${val}`,
        sku: `${sku || 'VEN-PROD'}-${slugVal}-${index + 1}`,
        price: basePriceNum,
        stock: Math.max(1, Math.floor(baseStockNum / rawValues.length)),
        attributes: { [optLabel]: val },
      };
    });

    setVariants((prev) => [...prev, ...generated]);
    showToast(`Generated ${generated.length} variants in matrix.`);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // Margin calculation
  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(costPerItem) || 0;
  const grossProfit = priceNum > 0 ? priceNum - costNum : 0;
  const profitMargin = priceNum > 0 ? ((grossProfit / priceNum) * 100).toFixed(1) : '0';

  // Completion calculation for Health Score based on actual filled fields
  const completionFields = [
    Boolean(title.trim()),
    Boolean(slug.trim()),
    Boolean(category.trim()),
    Boolean(brand.trim()),
    Boolean(description.trim()),
    images.length > 0,
    priceNum > 0,
    Boolean(sku.trim()),
    Boolean(barcode.trim()),
    parseInt(stock, 10) > 0,
    productType === 'digital' ? Boolean(downloadUrl.trim()) : Boolean(weightKg.trim()),
    tags.length > 0,
    Boolean(collection.trim()),
    Boolean(seoTitle.trim()),
    Boolean(seoDescription.trim()),
  ];
  const filledFieldsCount = completionFields.filter(Boolean).length;
  const completionScore = Math.round((filledFieldsCount / completionFields.length) * 100);

  const handleSaveProduct = (targetStatus: 'approved' | 'draft' = 'approved') => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a product title before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please specify a valid product selling price greater than $0.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMessage('Please enter a valid stock quantity.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Product is created by Admin and strictly marked as sold by Vendora
    const newProduct: Product = {
      id: `prod-1p-${Date.now()}`,
      title: title.trim(),
      slug: slug || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description.trim() || headline.trim() || title.trim(),
      category,
      brand: brand.trim() || 'Vendora',
      images: images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      ],
      price: priceNum,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
      type: productType,
      sellerId: 'platform',
      sellerName: 'Vendora',
      sellerType: 'platform',
      variants: hasVariants && variants.length > 0 ? variants : [],
      stock: stockNum,
      shippingSettings:
        productType === 'physical'
          ? {
              standardFee: freeShipping ? 0 : parseFloat(shippingFee) || 0,
              freeShipping: freeShipping || parseFloat(shippingFee) === 0,
              weightKg: parseFloat(weightKg) || 0.5,
            }
          : undefined,
      digitalAssetInfo:
        productType === 'digital'
          ? {
              licenseType,
              downloadUrl: downloadUrl || '/downloads/package.zip',
            }
          : undefined,
      rating: 5.0,
      reviewCount: 0,
      status: targetStatus,
      createdAt: new Date().toISOString(),
    };

    // 1. Commit to mockDb
    mockDb.products.unshift(newProduct);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vd:v1:products', JSON.stringify(mockDb.products));
      } catch {
        // ignore
      }
    }

    // 2. Commit to Zustand Marketplace Store
    try {
      useMarketplaceStore.getState().addProduct(newProduct);
    } catch {
      // Ignore if unseeded
    }

    showToast(
      targetStatus === 'approved'
        ? `Official product "${newProduct.title}" published as Sold by Vendora!`
        : `Product "${newProduct.title}" saved as draft.`
    );

    setTimeout(() => {
      navigate('/admin/products');
    }, 800);
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Add Product"
      subtitle="Create and publish catalog products with instant indexing."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-20 font-sans text-slate-900">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
              title="Back to product moderation"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Add Product
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/products')}
              className="text-xs rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Discard
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveProduct('draft')}
              className="text-xs rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              Save as Draft
            </Button>
            <button
              type="button"
              onClick={() => handleSaveProduct('approved')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Upload className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">Publish Product</span>
            </button>
          </div>
        </div>

        {/* Validation Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* =====================================================================
              Left / Main Column (lg:col-span-8)
              ===================================================================== */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Basic Information Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[#FF7A1A]">
                    <Package className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Basic Information</h3>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Product Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{title.length}/120 characters</span>
                </div>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Vendora Studio Series ANC Wireless Flagship Headphones"
                  className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Product Slug &amp; Permalink
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden text-xs">
                  <span className="bg-slate-100 px-3 py-2 text-slate-500 border-r border-slate-200 select-none">
                    vendora.shop/products/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="vendora-studio-series-anc"
                    className="flex-1 px-3 py-2 bg-transparent text-slate-800 outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Category Taxonomy <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full admin-select h-10"
                  >
                    <option value="cat-electronics">Electronics &amp; Smart Tech</option>
                    <option value="cat-audio">Audio &amp; Pro Acoustics</option>
                    <option value="cat-hardware">Hardware &amp; Computing</option>
                    <option value="cat-apparel">Apparel &amp; Fashion</option>
                    <option value="cat-home">Home &amp; Living</option>
                    <option value="cat-digital">Digital Licenses &amp; Software</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Brand Name
                  </label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Vendora"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Marketing Headline / Summary
                </label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Official 1P flagship release with extended manufacturer warranty"
                  className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Detailed Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe product highlights, technical specifications, warranty coverage, package contents, and official authenticity guarantees..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-none resize-y"
                />
              </div>
            </div>

            {/* 2. Media & Image Gallery Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Media &amp; Imagery</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {images.length} Image{images.length !== 1 ? 's' : ''} Uploaded
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or paste image CDN URL"
                  className="rounded-xl text-xs py-2 border-slate-200 focus:border-slate-900 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                  className="rounded-xl text-xs shrink-0 bg-slate-50 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add URL
                </Button>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square flex flex-col justify-between"
                  >
                    <img
                      src={img}
                      alt={`Product media #${idx + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {idx === 0 && (
                      <span className="absolute top-2 left-2 rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs backdrop-blur-xs">
                        Primary Cover
                      </span>
                    )}

                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(idx)}
                          className="rounded-lg bg-white/90 p-1.5 text-slate-800 hover:bg-white text-[10px] font-bold"
                          title="Set as cover image"
                        >
                          Make Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="rounded-lg bg-rose-600/90 p-1.5 text-white hover:bg-rose-700"
                        title="Delete image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="rounded-xl border border-dashed border-slate-300 p-4 aspect-square flex flex-col items-center justify-center text-center hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <UploadCloud className={cn("h-6 w-6 text-slate-400 mb-1 transition-transform group-hover:scale-110", isUploadingImage && "animate-bounce text-[#FF7A1A]")} />
                  <span className="text-[11px] font-bold text-slate-700">
                    {isUploadingImage ? 'Uploading...' : 'Upload Asset'}
                  </span>
                  <span className="text-[10px] text-slate-400">Direct to Supabase</span>
                </button>
              </div>
            </div>

            {/* 3. Pricing, Margins & Financials Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Pricing &amp; Margins</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Selling Price ($) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="199.00"
                      className="rounded-xl text-xs py-2.5 pl-7 border-slate-200 focus:border-slate-900 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Compare-at Price ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="249.00"
                      className="rounded-xl text-xs py-2.5 pl-7 border-slate-200 focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Unit Procurement Cost ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={costPerItem}
                      onChange={(e) => setCostPerItem(e.target.value)}
                      placeholder="85.00"
                      className="rounded-xl text-xs py-2.5 pl-7 border-slate-200 focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Live Profit Margin Strip */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-slate-500 font-medium">Estimated Gross Profit: </span>
                    <strong className="text-emerald-700 font-bold">${grossProfit.toFixed(2)}</strong>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div>
                    <span className="text-slate-500 font-medium">Profit Margin: </span>
                    <strong className="text-slate-900 font-bold">{profitMargin}%</strong>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={chargeTax}
                    onChange={(e) => setChargeTax(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Automated Regional Sales Tax Calculation</span>
                </label>
              </div>
            </div>

            {/* 4. Inventory & Stock Controls Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Box className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Inventory &amp; Warehousing</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSku}
                  className="rounded-lg text-[11px] h-7 border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                  Auto-Gen SKU
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VEN-1P-1001"
                    className="rounded-xl text-xs py-2.5 font-mono uppercase border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Barcode (ISBN, UPC, GTIN)
                  </label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="840992817201"
                    className="rounded-xl text-xs py-2.5 font-mono border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Physical Stock Units <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Low Stock Alert Ceiling
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="10"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={trackQuantity}
                  onChange={(e) => setTrackQuantity(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Track real-time inventory decrement across Vendora fulfillment centers</span>
              </label>
            </div>

            {/* 5. Variants & Matrix Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Product Variants &amp; Matrix</h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Has multiple options (e.g. Size, Color)</span>
                </label>
              </div>

              {hasVariants ? (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Option Name
                      </label>
                      <div className="relative" ref={optionDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsOptionDropdownOpen(!isOptionDropdownOpen)}
                          className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer h-9 text-left"
                        >
                          <span className="truncate">
                            {[
                              { label: 'Color (e.g. Black, White, Silver)', value: 'Color' },
                              { label: 'Size (e.g. S, M, L, XL)', value: 'Size' },
                              { label: 'Storage Capacity (e.g. 128GB, 256GB)', value: 'Storage Capacity' },
                              { label: 'Material (e.g. Aluminum, Leather)', value: 'Material' },
                              { label: 'Style (e.g. Modern, Vintage)', value: 'Style' },
                              { label: 'Weight (e.g. 500g, 1kg)', value: 'Weight' },
                              { label: 'Pack Quantity (e.g. 1-Pack, 2-Pack)', value: 'Pack Quantity' },
                              { label: 'Custom Option', value: 'Custom Option' },
                            ].find((o) => o.value === optionName)?.label || optionName}
                          </span>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform", isOptionDropdownOpen && "rotate-180")} />
                        </button>

                        {isOptionDropdownOpen && (
                          <div className="absolute top-10 left-0 w-full min-w-[260px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-0.5">
                            {[
                              { label: 'Color (e.g. Black, White, Silver)', value: 'Color', defaultValues: 'Midnight Black, Space Silver, Alpine White' },
                              { label: 'Size (e.g. S, M, L, XL)', value: 'Size', defaultValues: 'Small, Medium, Large, XL' },
                              { label: 'Storage Capacity (e.g. 128GB, 256GB)', value: 'Storage Capacity', defaultValues: '128GB, 256GB, 512GB, 1TB' },
                              { label: 'Material (e.g. Aluminum, Leather)', value: 'Material', defaultValues: 'Aluminum, Stainless Steel, Leather' },
                              { label: 'Style (e.g. Modern, Vintage)', value: 'Style', defaultValues: 'Classic, Modern, Minimalist' },
                              { label: 'Weight (e.g. 500g, 1kg)', value: 'Weight', defaultValues: '500g, 1kg, 2kg' },
                              { label: 'Pack Quantity (e.g. 1-Pack, 2-Pack)', value: 'Pack Quantity', defaultValues: '1-Pack, 2-Pack, 4-Pack' },
                              { label: 'Custom Option', value: 'Custom Option', defaultValues: '' },
                            ].map((opt) => {
                              const isSelected = optionName === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setOptionName(opt.value);
                                    if (opt.defaultValues) setOptionValues(opt.defaultValues);
                                    setIsOptionDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
                                    isSelected
                                      ? "bg-orange-50 dark:bg-orange-950/40 text-[#FF7A1A] font-bold"
                                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                                  )}
                                >
                                  <span className="truncate">{opt.label}</span>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-[#FF7A1A] shrink-0 ml-1.5" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Values (comma separated)
                      </label>
                      <Input
                        value={optionValues}
                        onChange={(e) => setOptionValues(e.target.value)}
                        placeholder="Midnight Black, Space Silver, Alpine White"
                        className="rounded-xl text-xs py-2 border-slate-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGenerateVariants}
                        className="w-full rounded-xl text-xs bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] text-white font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 border-0"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  {variants.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Variant</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3">Price ($)</th>
                            <th className="py-2.5 px-3">Stock Units</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {variants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{v.name}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{v.sku}</td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={v.price}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setVariants((prev) =>
                                      prev.map((item) => (item.id === v.id ? { ...item, price: val } : item))
                                    );
                                  }}
                                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 0;
                                    setVariants((prev) =>
                                      prev.map((item) => (item.id === v.id ? { ...item, stock: val } : item))
                                    );
                                  }}
                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(v.id)}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  This product has standard single inventory. Enable variants above if it comes in multiple colors, editions, or dimensions.
                </p>
              )}
            </div>

            {/* 6. Fulfillment & Logistics Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Fulfillment &amp; Delivery</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProductType('physical')}
                  className={cn(
                    'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all',
                    productType === 'physical'
                      ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <span className="text-xs font-bold">Physical Package</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Dispatched from central logistics hubs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductType('digital')}
                  className={cn(
                    'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all',
                    productType === 'digital'
                      ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <span className="text-xs font-bold">Digital License / Asset</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Instant secure download delivery</span>
                </button>
              </div>

              {productType === 'physical' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Parcel Weight (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="0.60"
                      className="rounded-xl text-xs py-2 border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Shipping Fee ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={freeShipping}
                      value={freeShipping ? '0.00' : shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      placeholder="0.00"
                      className="rounded-xl text-xs py-2 border-slate-200 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={freeShipping}
                        onChange={(e) => setFreeShipping(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>Free Express Shipping</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Digital License Type
                    </label>
                    <select
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full admin-select h-9"
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
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Protected Asset URL
                    </label>
                    <Input
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="/downloads/vendora-suite.zip"
                      className="rounded-xl text-xs py-2 border-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =====================================================================
              Right / Sidebar Column (lg:col-span-4)
              ===================================================================== */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. Official Platform Vendor Status Card (Strictly Vendora) */}
            <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF7A1A] text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Seller Identity</h3>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  1P Official
                </span>
              </div>

              <div className="rounded-xl bg-white border border-orange-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Sold &amp; Shipped By:</span>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    Vendora
                    <span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A]" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Seller ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 font-bold">platform (1P)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Products created in this section represent <strong>official Vendora 1P merchandise</strong>. They carry full platform buyer protection, 0% third-party commission deductions, and immediate public indexing.
              </p>
            </div>

            {/* 2. Listing Quality & Health Score Meter */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Listing Completeness</h3>
                <span className="text-xs font-black text-slate-900">{completionScore}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                A 100% score guarantees optimal SEO placement and higher conversion rates across marketplace facets.
              </p>
            </div>

            {/* 3. Search Engine Optimization (SEO) Preview */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900">Search Engine Listing Preview</h3>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-blue-700 truncate hover:underline cursor-pointer">
                  {seoTitle || title || 'Product Title on Vendora'} - Sold by Vendora
                </p>
                <p className="text-[10px] font-mono text-emerald-700 truncate">
                  https://vendora.shop/products/{slug || 'product-slug'}
                </p>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {seoDescription || description || headline || 'Official authentic product backed by Vendora 100% Quality Assurance Guarantee. Includes premium packaging and express delivery.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  SEO Meta Title Override
                </label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || 'Product Title'}
                  className="rounded-xl text-xs py-2 border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Summary for search crawlers..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* 4. Tags & Collections Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Tag className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900">Collections &amp; Tags</h3>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Primary Collection
                </label>
                <select
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  className="w-full admin-select h-9 text-xs"
                >
                  <option value="Vendora Flagship">Vendora Flagship</option>
                  <option value="Official Best Sellers">Official Best Sellers</option>
                  <option value="Seasonal Highlights">Seasonal Highlights</option>
                  <option value="New Platform Releases">New Platform Releases</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Product Tags
                </label>
                <div className="flex gap-1.5 mb-2">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag and press Enter"
                    className="rounded-xl text-xs py-1.5 border-slate-200"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTag}
                    className="rounded-xl text-xs bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] text-white font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 border-0"
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isFeaturedOnStore}
                    onChange={(e) => setIsFeaturedOnStore(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Feature on Marketplace Homepage &amp; Deals Banner</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
