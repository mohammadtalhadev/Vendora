import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertCircle, ArrowUpRight } from 'lucide-react';
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
import type { Product } from '../../../types/domain';
import { useCategories } from '../../catalog/hooks/useProducts';
import { useCreateVendorProduct } from '../hooks/useVendorProducts';
import type { VendorProductDraft } from '../api/products';

export interface ProductFormModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onSave?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
}

interface QuickAddContentProps {
  onSave?: (product: Product) => void;
  onClose: () => void;
  vendorId?: string;
  vendorName?: string;
}

/**
 * Quick add (Batch 48) — deliberately NOT a second product form.
 *
 * This modal used to be a full three-tab clone of VendorAddProductPage
 * (details / pricing & delivery / variant generator), so every field rule
 * lived twice and the two editors could drift. There is now ONE complete
 * form — the page at `/vendor/products/new` (create) and
 * `/vendor/products/:id/edit` (edit) — and this modal is only the fast
 * path into the same write: the essential fields, submitted through the
 * same `useCreateVendorProduct` hook and the same `VendorProductDraft`
 * shape, entering moderation as `pending_review` exactly as a full-form
 * submission does. Anything beyond the essentials (variants, digital
 * delivery, shipping settings, media uploads) lives in the full form,
 * and the footer says so.
 */
const QuickAddContent: React.FC<QuickAddContentProps> = ({ onSave, onClose }) => {
  const { data: categoryData } = useCategories();
  const categories = categoryData?.categories ?? [];
  const createListing = useCreateVendorProduct();

  // Form fields start empty: a prefilled price or brand would be a value the
  // seller never chose, and it would land in the database as if they had.
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stock, setStock] = useState('');

  // Validation Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Product title is required.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Choose the category this listing belongs in.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please enter a valid price greater than zero.');
      return;
    }

    const stockNum = stock.trim() === '' ? 0 : parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMessage('Please enter a valid stock quantity.');
      return;
    }

    // The seller supplies the listing; `seller_id`, `status`, `rating` and
    // `review_count` are set by the database, so a new listing enters
    // moderation as pending_review. Quick add is a plain physical listing
    // with no variants — both are full-form territory.
    const draft: VendorProductDraft = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      brand: brand.trim(),
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      price: priceNum,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      type: 'physical',
      variants: [],
      stock: stockNum,
    };

    try {
      const saved = await createListing.mutateAsync(draft);
      onSave?.(saved);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save the listing.');
    }
  };

  const labelClass =
    'block text-xs font-bold text-slate-600 mb-1.5';

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sun-orange">
            <Package className="h-4 w-4" aria-hidden="true" />
          </span>
          <DialogTitle>Quick Add Product</DialogTitle>
        </div>
        <DialogDescription>
          The essentials only — title, category, price and opening stock. The listing enters
          moderation as a submission for review, exactly as a full-form submission does.
        </DialogDescription>
      </DialogHeader>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        <div>
          <label htmlFor="listing-title" className={labelClass}>
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
            <label htmlFor="listing-category" className={labelClass}>
              Category <span className="text-coral">*</span>
            </label>
            <select
              id="listing-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="native-select flex h-11 w-full rounded-full border border-slate-200 bg-white/95 px-5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
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
            <label htmlFor="listing-brand" className={labelClass}>
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
          <label htmlFor="listing-image-url" className={labelClass}>
            Image URL
          </label>
          <Input
            id="listing-image-url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Tip: a clean white-background front photo looks best on product cards.
          </p>
        </div>

        <div>
          <label htmlFor="listing-description" className={labelClass}>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="listing-price" className={labelClass}>
              Price <span className="text-coral">*</span>
            </label>
            <Input
              id="listing-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="listing-compare-at-price" className={labelClass}>
              Compare-at Price
            </label>
            <Input
              id="listing-compare-at-price"
              type="number"
              min="0"
              step="0.01"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="listing-stock" className={labelClass}>
              Opening Stock
            </label>
            <Input
              id="listing-stock"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/vendor/products/new"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-bold text-sun-orange hover:underline"
            >
              <span>Variants, digital delivery or shipping options? Open the full form</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="orange-cta"
                size="sm"
                disabled={createListing.isPending}
              >
                {createListing.isPending ? 'Adding…' : 'Add Product'}
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
        <QuickAddContent
          key={isModalOpen ? 'new' : 'idle'}
          onSave={handleSave}
          onClose={() => handleOpenChange(false)}
          vendorId={vendorId}
          vendorName={vendorName}
        />
      </DialogContent>
    </Dialog>
  );
};
