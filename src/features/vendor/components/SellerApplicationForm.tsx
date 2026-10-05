import { useState } from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
import { z } from 'zod';
import {
  Store,
  Mail,
  Tag,
  CheckCircle2,
  Clock,
  Loader2,
  Globe,
  Sparkles,
  Info,
  Building2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';
import type { User } from '../../../types/domain';

export const CATEGORY_OPTIONS = [
  { value: 'electronics', label: 'Electronics & Audio' },
  { value: 'computing', label: 'Computers & Tech Accessories' },
  { value: 'digital', label: 'Digital Assets & Software' },
  { value: 'apparel', label: 'Fashion & Apparel' },
  { value: 'home', label: 'Home, Living & Decor' },
  { value: 'beauty', label: 'Beauty & Personal Care' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'books', label: 'Books & Creative Media' },
] as const;

export const sellerApplicationSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(80, 'Business name must be 80 characters or fewer'),
  storeSlug: z
    .string()
    .trim()
    .min(3, 'Store slug must be at least 3 characters')
    .max(40, 'Store slug must be 40 characters or fewer')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Store slug must contain only lowercase letters, numbers, and hyphens',
    ),
  categoryFocus: z
    .string()
    .trim()
    .min(1, 'Please select a primary category focus'),
  businessEmail: z
    .string()
    .trim()
    .email('Please enter a valid business email address'),
  storeDescription: z
    .string()
    .trim()
    .min(10, 'Store description must be at least 10 characters')
    .max(1000, 'Store description must be 1000 characters or fewer'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the seller terms and conditions',
  }),
});

export type SellerApplicationFormData = z.infer<typeof sellerApplicationSchema>;

export interface FormErrors {
  businessName?: string;
  storeSlug?: string;
  categoryFocus?: string;
  businessEmail?: string;
  storeDescription?: string;
  termsAccepted?: string;
  general?: string;
}

export interface SellerApplicationFormProps {
  onSuccess?: (data: SellerApplicationFormData) => void;
  onSubmit?: (data: SellerApplicationFormData) => Promise<void> | void;
  initialValues?: Partial<SellerApplicationFormData>;
  apiDelayMs?: number;
  className?: string;
  forceShowForm?: boolean;
}

export interface ApplicationPendingCardProps {
  estimatedTime?: string;
  businessName?: string;
  categoryFocus?: string;
  onRefresh?: () => void;
  className?: string;
}

export const ApplicationPendingCard: FC<ApplicationPendingCardProps> = ({
  estimatedTime = '24–48 business hours',
  businessName,
  categoryFocus,
  className,
}) => {
  return (
    <div
      data-testid="application-pending-card"
      className={cn(
        'card-solid overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-8 text-center shadow-lg',
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#FF7A1A] shadow-inner">
        <Clock className="h-8 w-8 animate-pulse" />
      </div>

      <div className="mt-5">
        <Badge variant="vendora-platform" size="lg" className="mb-2">
          Status: Pending Review
        </Badge>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Application Under Review
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Thank you for applying to sell on Vendora! Your application has been received and is currently being verified by our compliance team.
        </p>
      </div>

      {/* Review Time Badge */}
      <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-orange-200/90 bg-orange-50 px-4 py-2 text-xs font-semibold text-[#EA6C13] shadow-xs">
        <Clock className="h-4 w-4 shrink-0 text-[#FF7A1A]" />
        <span data-testid="estimated-review-time">
          Estimated review time: {estimatedTime}
        </span>
      </div>

      {/* Summary Box */}
      {(businessName || categoryFocus) && (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left text-xs">
          <div className="font-semibold text-slate-700">Submitted Information:</div>
          {businessName && (
            <div className="mt-1 text-slate-600">
              <span className="font-medium text-slate-800">Store:</span> {businessName}
            </div>
          )}
          {categoryFocus && (
            <div className="mt-0.5 text-slate-600">
              <span className="font-medium text-slate-800">Category:</span> {categoryFocus}
            </div>
          )}
        </div>
      )}

      {/* What happens next */}
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-100 bg-slate-50/60 p-5 text-left">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          What Happens Next
        </h3>
        <ul className="space-y-3 text-xs text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Document & Identity Verification:</strong> We confirm your business identity and tax information.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Product Catalog Standards:</strong> We ensure your product category aligns with marketplace guidelines.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Vendor Hub Activation:</strong> Upon approval, your store URL goes live and your dashboard unlocks.
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5" />
        <span>You will receive an automated notification once approved.</span>
      </div>
    </div>
  );
};

export const SellerApplicationForm: FC<SellerApplicationFormProps> = ({
  onSuccess,
  onSubmit,
  initialValues,
  apiDelayMs = 0,
  className,
  forceShowForm = false,
}) => {
  const { user, setUser } = useAuthStore();
  const [hasSubmittedLocal, setHasSubmittedLocal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [formData, setFormData] = useState<SellerApplicationFormData>({
    businessName: initialValues?.businessName ?? '',
    storeSlug: initialValues?.storeSlug ?? '',
    categoryFocus: initialValues?.categoryFocus ?? '',
    businessEmail: initialValues?.businessEmail ?? user?.email ?? '',
    storeDescription: initialValues?.storeDescription ?? '',
    termsAccepted: initialValues?.termsAccepted ?? false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // If user already has pending status and we are not forcing form display, render status card
  if (!forceShowForm && (user?.vendorStatus === 'pending' || hasSubmittedLocal)) {
    return (
      <ApplicationPendingCard
        businessName={formData.businessName || user?.name}
        categoryFocus={formData.categoryFocus}
        className={className}
      />
    );
  }

  const handleSlugify = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Auto-generate slug from business name if user hasn't typed in slug manually
      if (name === 'businessName' && !slugManuallyEdited) {
        next.storeSlug = handleSlugify(value);
      }

      return next;
    });

    if (name === 'storeSlug') {
      setSlugManuallyEdited(true);
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const result = sellerApplicationSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (field && !newErrors[field]) {
          newErrors[field] = issue.message;
        }
      }
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(result.data);
      } else {
        if (apiDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, apiDelayMs));
        }

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setUser({
            ...currentUser,
            vendorStatus: 'pending',
          });
        } else {
          const newApplicant: User = {
            id: `usr-seller-${Date.now()}`,
            name: result.data.businessName,
            email: result.data.businessEmail,
            roles: ['customer'],
            vendorStatus: 'pending',
          };
          setUser(newApplicant);
        }
      }

      setHasSubmittedLocal(true);
      onSuccess?.(result.data);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general:
          err instanceof Error
            ? err.message
            : 'Failed to submit application. Please check your network and try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        'card-solid rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-8 shadow-sm',
        className,
      )}
      aria-label="Seller Application Form"
    >
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A1A]">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Merchant Application
            </h2>
            <p className="text-xs text-slate-500">
              Complete your store profile to begin selling on Vendora.
            </p>
          </div>
        </div>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700"
        >
          {errors.general}
        </div>
      )}

      <div className="space-y-5">
        {/* 1. Business Name */}
        <div>
          <label
            htmlFor="businessName"
            className="block text-xs font-semibold text-slate-800 mb-1.5"
          >
            Business Name <span className="text-rose-500">*</span>
          </label>
          <Input
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            placeholder="e.g. Apex Audio Labs"
            leftIcon={<Building2 className="h-4 w-4" />}
            hasError={!!errors.businessName}
            aria-invalid={!!errors.businessName}
            aria-describedby={errors.businessName ? 'businessName-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.businessName && (
            <p
              id="businessName-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.businessName}
            </p>
          )}
        </div>

        {/* 2. Store Slug */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="storeSlug"
              className="block text-xs font-semibold text-slate-800"
            >
              Store Slug <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              vendora.com/vendors/{formData.storeSlug || '[slug]'}
            </span>
          </div>
          <Input
            id="storeSlug"
            name="storeSlug"
            value={formData.storeSlug}
            onChange={handleInputChange}
            placeholder="e.g. apex-audio-labs"
            leftIcon={<Globe className="h-4 w-4" />}
            hasError={!!errors.storeSlug}
            aria-invalid={!!errors.storeSlug}
            aria-describedby={errors.storeSlug ? 'storeSlug-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.storeSlug && (
            <p
              id="storeSlug-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.storeSlug}
            </p>
          )}
        </div>

        {/* 3. Category Focus */}
        <div>
          <label
            htmlFor="categoryFocus"
            className="block text-xs font-semibold text-slate-800 mb-1.5"
          >
            Category Focus <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="categoryFocus"
              name="categoryFocus"
              value={formData.categoryFocus}
              onChange={handleInputChange}
              disabled={isSubmitting}
              aria-invalid={!!errors.categoryFocus}
              aria-describedby={errors.categoryFocus ? 'categoryFocus-error' : undefined}
              className={cn(
                'flex h-11 w-full rounded-full border bg-white/95 px-5 py-2 text-sm text-ink transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer',
                errors.categoryFocus
                  ? 'border-[#FF4D6D] focus-visible:border-[#FF4D6D] focus-visible:ring-rose-200'
                  : 'border-slate-200 focus-visible:border-[#FF7A1A] focus-visible:ring-orange-200',
              )}
            >
              <option value="">Select a primary category focus...</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          {errors.categoryFocus && (
            <p
              id="categoryFocus-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.categoryFocus}
            </p>
          )}
        </div>

        {/* 4. Business Email */}
        <div>
          <label
            htmlFor="businessEmail"
            className="block text-xs font-semibold text-slate-800 mb-1.5"
          >
            Business Email <span className="text-rose-500">*</span>
          </label>
          <Input
            id="businessEmail"
            name="businessEmail"
            type="email"
            value={formData.businessEmail}
            onChange={handleInputChange}
            placeholder="seller@business.com"
            leftIcon={<Mail className="h-4 w-4" />}
            hasError={!!errors.businessEmail}
            aria-invalid={!!errors.businessEmail}
            aria-describedby={errors.businessEmail ? 'businessEmail-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.businessEmail && (
            <p
              id="businessEmail-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.businessEmail}
            </p>
          )}
        </div>

        {/* 5. Store Description */}
        <div>
          <label
            htmlFor="storeDescription"
            className="block text-xs font-semibold text-slate-800 mb-1.5"
          >
            Store Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="storeDescription"
            name="storeDescription"
            rows={4}
            value={formData.storeDescription}
            onChange={handleInputChange}
            placeholder="Tell buyers and our team about your brand, products, quality guarantees, and manufacturing standards..."
            disabled={isSubmitting}
            aria-invalid={!!errors.storeDescription}
            aria-describedby={errors.storeDescription ? 'storeDescription-error' : undefined}
            className={cn(
              'flex w-full rounded-2xl border bg-white/95 px-4 py-3 text-sm text-ink placeholder:text-slate-400 transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 resize-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              errors.storeDescription
                ? 'border-[#FF4D6D] focus-visible:border-[#FF4D6D] focus-visible:ring-rose-200'
                : 'border-slate-200 focus-visible:border-[#FF7A1A] focus-visible:ring-orange-200',
            )}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Minimum 10 characters</span>
            <span>{formData.storeDescription.length}/1000</span>
          </div>
          {errors.storeDescription && (
            <p
              id="storeDescription-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.storeDescription}
            </p>
          )}
        </div>

        {/* 6. Terms Acceptance */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="termsAccepted"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleInputChange}
              disabled={isSubmitting}
              aria-invalid={!!errors.termsAccepted}
              aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#FF7A1A] focus:ring-[#FF7A1A]"
            />
            <div className="text-xs text-slate-700">
              <span>I accept the </span>
              <a
                href="#terms"
                onClick={(e) => e.preventDefault()}
                className="font-medium text-[#FF7A1A] hover:underline"
              >
                Vendora Merchant Agreement
              </a>
              <span> and Seller Terms of Service, including the category commission structure and weekly automated payout terms.</span>
            </div>
          </label>
          {errors.termsAccepted && (
            <p
              id="termsAccepted-error"
              role="alert"
              className="mt-2 text-xs font-medium text-[#FF4D6D]"
            >
              {errors.termsAccepted}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="orange-cta"
            size="lg"
            disabled={isSubmitting}
            className="w-full text-base font-bold shadow-md hover:shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting Application...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Submit Merchant Application</span>
                <Sparkles className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
