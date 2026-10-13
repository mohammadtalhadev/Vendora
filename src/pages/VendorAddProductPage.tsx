import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Layers,
  Sparkles,
  Trash2,
  Download,
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
  Percent,
  Loader2,
  ChevronDown,
  Store,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { ProductType, Variant } from '../types/domain';
import { useCategories } from '../features/catalog/hooks/useProducts';
import { useCreateVendorProduct } from '../features/vendor/hooks/useVendorProducts';
import type { VendorProductDraft } from '../features/vendor/api/products';
import { useVendorData } from '../features/vendor/hooks/useVendorData';
import { useUploadMedia } from '../features/vendor/hooks/useVendorMedia';
import { cn } from '../lib/utils';

export const VendorAddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { vendorId, storeName } = useVendorData();
  const { data: categoryData } = useCategories();
  const categories = categoryData?.categories ?? [];
  const createListing = useCreateVendorProduct();
  const upload = useUploadMedia();

  // Basic Information
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');

  // Media
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing & Inventory
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [costPerItem, setCostPerItem] = useState('');
  const [chargeTax, setChargeTax] = useState(true);

  // Stock
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [trackQuantity, setTrackQuantity] = useState(true);
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  // Fulfillment
  const [productType, setProductType] = useState<ProductType>('physical');
  const [weightKg, setWeightKg] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);
  const [licenseType, setLicenseType] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [optionName, setOptionName] = useState('Color');
  const [optionValues, setOptionValues] = useState('Matte Black, Lunar Silver, Glacier Blue');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isOptionDropdownOpen, setIsOptionDropdownOpen] = useState(false);
  const optionDropdownRef = useRef<HTMLDivElement>(null);

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
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [collection, setCollection] = useState('');

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

  // Auto-generate slug when title changes
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
    showToast('Asset image URL added to media gallery.');
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

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let uploadedCount = 0;
    let failure: string | null = null;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const asset = await upload.mutateAsync({ file, folder: 'products' });
          setImages((prev) => [...prev, asset.cdnUrl]);
          uploadedCount++;
        } catch (cause) {
          // A file that did not reach the bucket is reported, not swapped for a local
          // blob URL that would break the moment anyone else opens the listing.
          failure = cause instanceof Error ? cause.message : String(cause);
        }
      }
      if (uploadedCount > 0) showToast(`${uploadedCount} image(s) uploaded to your media library.`);
      if (failure) showToast(failure);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
    const code = brand.slice(0, 2).toUpperCase();
    const newSku = `${code}-${random}`;
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
        sku: `${sku || 'PROD'}-${slugVal}-${index + 1}`,
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
    Boolean(categoryId.trim()),
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

  const handleSaveProduct = async (targetStatus: 'pending_review' | 'draft' = 'pending_review') => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a product title before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!categoryId) {
      setErrorMessage('Choose the category this listing belongs in.');
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

    // `seller_id` is stamped by the database from the session, and the rating columns
    // belong to the review triggers, so neither is sent here.
    const draft: VendorProductDraft = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || headline.trim(),
      categoryId,
      brand: brand.trim() || storeName,
      images,
      price: priceNum,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      type: productType,
      variants: hasVariants ? variants : [],
      stock: stockNum,
      shippingSettings:
        productType === 'physical'
          ? {
              standardFee: freeShipping ? 0 : parseFloat(shippingFee) || 0,
              freeShipping: freeShipping || (parseFloat(shippingFee) || 0) === 0,
              weightKg: parseFloat(weightKg) || undefined,
            }
          : undefined,
      digitalAssetInfo:
        productType === 'digital'
          ? { licenseType: licenseType || undefined, downloadUrl: downloadUrl.trim() || undefined }
          : undefined,
      status: targetStatus,
    };

    try {
      const saved = await createListing.mutateAsync(draft);
      showToast(
        targetStatus === 'draft'
          ? `Draft "${saved.title}" saved. It stays out of the catalogue until you submit it for review.`
          : `Listing "${saved.title}" sent to moderation. It goes live once the platform approves it.`,
      );
      setTimeout(() => {
        navigate('/vendor/products');
      }, 800);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save the listing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VERIFIED SELLER"
      title="Add New Product"
      subtitle="Configure your product listing, pricing, stock levels, variants, and fulfillment options."
      sidebar={<VendorNav />}
    >
      <div className="space-y-6 pb-20 font-sans text-slate-900">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/vendor/products"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
              title="Back to products list"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-outfit">
                Add New Product
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Create and publish a product listing to your storefront catalog.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/vendor/products')}
              className="text-xs rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Discard
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveProduct('draft')}
              disabled={createListing.isPending}
              className="text-xs rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Save as Draft
            </Button>
            <button
              type="button"
              onClick={() => handleSaveProduct('pending_review')}
              disabled={createListing.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5 text-white stroke-[2.5]" aria-hidden="true" />
              <span className="text-white">
                {createListing.isPending ? 'Saving…' : 'Submit for Review'}
              </span>
            </button>
          </div>
        </div>

        {/* Validation Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-sun-orange">
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
                  placeholder="e.g. KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard"
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
                    placeholder="keebcraft-pro-75"
                    className="flex-1 bg-transparent px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Brand Name
                  </label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. SoundWave Direct"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Catchy Headline / Summary
                </label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. CNC aluminum chassis, hot-swappable PCB, and sound-dampening foam"
                  className="rounded-xl text-xs py-2 border-slate-200 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Product Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail product features, build materials, box contents, and manufacturer specifications..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Media & Visual Assets Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Product Photography &amp; Assets</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{images.length} assets attached</span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
              />

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void uploadFiles(e.dataTransfer.files);
                }}
                className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-slate-400 hover:bg-slate-50/80 transition-all bg-slate-50/50"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Loader2 className="h-8 w-8 animate-spin text-sun-orange" aria-hidden="true" />
                    <p className="mt-2 text-xs font-bold text-slate-800">
                      Uploading to Supabase Storage...
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">Please wait</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <p className="mt-2 text-xs font-bold text-slate-800">
                      Click to browse or drag & drop high-res photography here
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      PNG, JPG or WebP. Each file is stored under your store's own folder in the{' '}
                      <span className="font-mono">vendor-assets</span> bucket and recorded in your
                      media library as pending review.
                    </p>
                  </>
                )}
              </div>

              {/* Fast URL input */}
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Or paste external asset image URL (https://...)"
                  className="rounded-xl text-xs py-2 border-slate-200 focus:border-slate-900 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                  className="text-xs rounded-xl border-slate-200"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  <span>Add URL</span>
                </Button>
              </div>

              {/* Image Previews Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square"
                  >
                    <img
                      src={img}
                      alt={`Product asset ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Cover badge */}
                    {idx === 0 ? (
                      <span className="absolute top-2 left-2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      >
                        Set as Cover
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 rounded-md bg-white/90 p-1 text-slate-600 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:text-rose-600"
                      title="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Pricing & Margins Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Pricing &amp; Margins</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  The listing stores the selling price and compare-at price; cost and tax are
                  planning figures for this draft only.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Selling Price ($) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="189.00"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Compare-At Price ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    placeholder="229.00"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Cost Per Item ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPerItem}
                    onChange={(e) => setCostPerItem(e.target.value)}
                    placeholder="95.00"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Profit & Margin Calculator Banner */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Estimated Gross Profit: </span>
                  <strong className="text-slate-900 font-bold">${grossProfit.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Profit Margin: </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold">
                    <Percent className="h-3 w-3" aria-hidden="true" />
                    {profitMargin}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Standard platform fee: 7.0% (${(priceNum * 0.07).toFixed(2)})
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chargeTax"
                  checked={chargeTax}
                  onChange={(e) => setChargeTax(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="chargeTax" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
                  Charge sales tax on this product in applicable jurisdictions
                </label>
              </div>
            </div>

            {/* 4. Inventory & Warehouse Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Box className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Inventory &amp; Warehousing</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateSku}
                  className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  <span>Generate SKU</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    SKU (Stock Keeping Unit)
                  </label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SW-AUD-8801"
                    className="rounded-xl text-xs py-2.5 font-mono border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Barcode (UPC, ISBN, or GTIN)
                  </label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="840192841029"
                    className="rounded-xl text-xs py-2.5 font-mono border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Available Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="45"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Low Stock Alert Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="5"
                    className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="trackQuantity"
                  checked={trackQuantity}
                  onChange={(e) => setTrackQuantity(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="trackQuantity" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
                  Continue selling when out of stock (Backorders permitted)
                </label>
              </div>
            </div>

            {/* 5. Fulfillment & Shipping Mode Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Fulfillment &amp; Delivery</h3>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setProductType('physical')}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-bold transition-all',
                      productType === 'physical'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Physical Good
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('digital')}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-bold transition-all',
                      productType === 'digital'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Digital Asset
                  </button>
                </div>
              </div>

              {productType === 'physical' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Package Weight (kg)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="0.45"
                        className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Standard Shipping Fee ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={freeShipping}
                        value={freeShipping ? '0.00' : shippingFee}
                        onChange={(e) => setShippingFee(e.target.value)}
                        placeholder="8.50"
                        className="rounded-xl text-xs py-2.5 border-slate-200 focus:border-slate-900 disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="freeShipping"
                      checked={freeShipping}
                      onChange={(e) => setFreeShipping(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="freeShipping" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
                      Offer Free Shipping on this item (absorb courier postage)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl bg-sky-50/60 border border-sky-100 p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      License Type
                    </label>
                    <select
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full admin-select h-9"
                    >
                      <option value="Commercial Single-Store License">Commercial Single-Store License</option>
                      <option value="Single Commercial License">Single Commercial License</option>
                      <option value="Personal Single-Use License">Personal Single-Use License</option>
                      <option value="Extended Developer Multi-Seat">Extended Developer Multi-Seat</option>
                      <option value="Enterprise Multi-Seat License">Enterprise Multi-Seat License</option>
                      <option value="Royalty-Free Lifetime License">Royalty-Free Lifetime License</option>
                      <option value="Personal Non-Commercial">Personal Non-Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Asset Download URL / Package Location
                    </label>
                    <Input
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="/downloads/package-v1.zip"
                      className="rounded-xl text-xs py-2 border-slate-200 focus:border-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Variants & Options Generator Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Variants &amp; Options</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Has multiple options</span>
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                </div>
              </div>

              {hasVariants && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      Quick Variant Matrix Builder
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
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
                            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform", isOptionDropdownOpen && "rotate-180")} aria-hidden="true" />
                          </button>

                          {isOptionDropdownOpen && (
                            <div className="absolute top-10 left-0 w-full min-w-[260px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-0.5">
                              {[
                                { label: 'Color (e.g. Black, White, Silver)', value: 'Color', defaultValues: 'Matte Black, Lunar Silver, Glacier Blue' },
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
                                        ? "bg-orange-50 dark:bg-orange-950/40 text-sun-orange font-bold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                                    )}
                                  >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-sun-orange shrink-0 ml-1.5" aria-hidden="true" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Values (comma separated)
                        </label>
                        <Input
                          value={optionValues}
                          onChange={(e) => setOptionValues(e.target.value)}
                          placeholder="e.g. Matte Black, Lunar Silver, Gold"
                          className="rounded-xl text-xs py-1.5 border-slate-200 focus:border-slate-900"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateVariants}
                        className="text-xs rounded-xl gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Build Variant Matrix</span>
                      </Button>
                    </div>
                  </div>

                  {variants.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Variant Name</th>
                            <th className="py-2.5 px-3 font-semibold">SKU</th>
                            <th className="py-2.5 px-3 font-semibold">Price ($)</th>
                            <th className="py-2.5 px-3 font-semibold">Stock</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {variants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{v.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{v.sku}</td>
                              <td className="py-2 px-3 text-slate-700">${v.price.toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-700">{v.stock}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(v.id)}
                                  className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
              )}
            </div>
          </div>

          {/* =====================================================================
              Right / Sidebar Column (lg:col-span-4)
              ===================================================================== */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. Official Store Identity Card */}
            <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-orange text-white">
                    <Store className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Store Identity</h3>
                </div>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  Verified Merchant
                </span>
              </div>

              <div className="rounded-xl bg-white border border-orange-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Storefront:</span>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    {storeName}
                    <span className="inline-block h-2 w-2 rounded-full bg-sun-orange" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Merchant ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 font-bold">{vendorId}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Products created here will be published directly to your official store catalog with instant live indexing across search facets.
              </p>
            </div>

            {/* 2. Listing Quality & Completeness Score Meter */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Listing Completeness</h3>
                <span className="text-xs font-black text-slate-900">{completionScore}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                A 100% score guarantees optimal search ranking and higher conversion rates across marketplace facets.
              </p>
            </div>

            {/* 3. Search Engine Optimization (SEO) Preview Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">SEO Search Engine Preview</h3>
                  <p className="text-xs text-slate-400">
                    Preview only - the catalogue has no SEO columns, so this text is not saved.
                  </p>
                </div>
                <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>

              {/* Google Result Preview Snippet */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1 text-xs">
                <span className="text-[11px] text-slate-500 font-mono block truncate">
                  https://vendora.shop/products/{slug || 'product-handle'}
                </span>
                <h4 className="text-sm font-semibold text-blue-700 truncate hover:underline cursor-pointer">
                  {seoTitle || title || 'Product Title'} | Vendora Marketplace
                </h4>
                <p className="text-slate-600 text-[11px] line-clamp-2">
                  {seoDescription || description || 'Product description will appear in search results across Google and marketplace queries.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Custom Search Meta Description
                </label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Custom snippet for search engines (defaults to product description)..."
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Organization & Taxonomy Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Organization &amp; Taxonomy</h3>
                <p className="text-xs text-slate-400">
                  Not saved yet - the catalogue stores title, category, price, stock and media.
                  Collections and tags stay in this draft only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Store Collection
                </label>
                <select
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                >
                  <option value="Featured Equipment">Featured Equipment</option>
                  <option value="New Arrivals">New Arrivals</option>
                  <option value="Studio Reference">Studio Reference</option>
                  <option value="Bestsellers">Bestsellers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Product Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
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
                <div className="flex gap-1.5">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag and press Enter"
                    className="rounded-xl text-xs py-1.5 border-slate-200 focus:border-slate-900 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTag}
                    className="rounded-xl text-xs bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] text-white font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 border-0"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
