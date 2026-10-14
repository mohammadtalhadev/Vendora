import React, { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Edit3,
  Heart,
  Home,
  Info,
  Key,
  Lock,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Trash2,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useWishlistStore } from '../store/wishlist-store';
import { useCurrency } from '../store/currency-store';
import { useSavedAddresses, useSavedAddressActions } from '../features/account/hooks/useSavedAddresses';
import {
  useSavedPaymentMethods,
  useSavedPaymentMethodActions,
} from '../features/account/hooks/useSavedPaymentMethods';
import type { AddressType, UserSavedAddress } from '../features/account/types';
import { detectCardBrand } from '../features/checkout/utils/luhn';
import { useAuth } from '../lib/auth-context';
import { useOrders, useUpdateSubOrderStatus } from '../features/orders/hooks/useOrders';
import { requestEmailChange, updatePassword, updateProfileIdentity } from '../features/auth/api/session';
import { uploadAvatar } from '../features/account/api/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import type { ShippingAddress, SubOrder, SubOrderStatus } from '../types/domain';

type AccountTab = 'profile' | 'orders' | 'returns' | 'addresses' | 'payments' | 'disputes' | 'security';

const ACCOUNT_TABS: AccountTab[] = ['profile', 'orders', 'returns', 'addresses', 'payments', 'disputes', 'security'];

type DisputeRow = Database['public']['Tables']['disputes']['Row'];

/** A mediation case this account is the customer on, read under `disputes_select_party`. */
interface AccountDispute {
  id: string;
  reason: string;
  status: DisputeRow['status'];
  urgency: DisputeRow['urgency'];
  vendorName: string;
  subOrderId?: string;
  orderGroupId?: string;
  resolutionNote?: string;
  resolutionAmount?: number;
  createdAt: string;
  updatedAt: string;
}

const DISPUTE_SELECT =
  'id, reason, status, urgency, vendor_name, sub_order_id, order_group_id, resolution_note, ' +
  'resolution_amount, created_at, updated_at';

const accountDisputeKeys = {
  all: ['account', 'disputes'] as const,
  for: (userId: string | null | undefined) => ['account', 'disputes', userId ?? 'anon'] as const,
};

/** Own cases only; the column filter is a second lock on top of the row-level policy. */
async function fetchMyDisputes(userId: string, signal?: AbortSignal): Promise<AccountDispute[]> {
  let query = supabase
    .from('disputes')
    .select(DISPUTE_SELECT)
    .eq('customer_id', userId)
    .order('updated_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your disputes: ${error.message}`);

  return ((data ?? []) as unknown as DisputeRow[]).map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    urgency: row.urgency,
    vendorName: row.vendor_name,
    subOrderId: row.sub_order_id ?? undefined,
    orderGroupId: row.order_group_id ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    resolutionAmount: row.resolution_amount ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Packages that are not finished: nothing here is counted from a seed array. */
const OPEN_STATUSES: readonly SubOrderStatus[] = [
  'placed',
  'confirmed',
  'packed',
  'ready_for_pickup',
  'shipped',
  'out_for_delivery',
  'return_requested',
  'return_approved',
];

const STATUS_LABEL: Record<SubOrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delivery_failed: 'Delivery failed',
  return_requested: 'Return requested',
  return_approved: 'Return approved',
  return_rejected: 'Return rejected',
  returned: 'Returned',
  refunded: 'Refunded',
  paid: 'Paid',
  available: 'Available',
};

const DISPUTE_STATUS_LABEL: Record<AccountDispute['status'], string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved_refund: 'Resolved with refund',
  resolved_denied: 'Resolved, denied',
};

const RETURN_REASONS = [
  'Defective / does not work properly',
  'Item received broken or cracked',
  'Different item received than ordered',
  'Missing accessories or parts',
  'Changed mind (unopened packaging)',
  'Delivery arrived late',
];

/** What a customer pays for a package: the booked subtotal plus its shipping fee. */
const grossOf = (pkg: SubOrder): number => pkg.subtotal + pkg.shippingFee;

const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'Something went wrong. Please try again.';

const dateOf = (iso: string): string => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
};

const panelClass =
  'rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6';
const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-sun-orange';
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300';
const chipClass = 'rounded-full px-2 py-0.5 text-[10px] font-bold';

const Banner: React.FC<{
  tone: 'success' | 'error' | 'info';
  children: React.ReactNode;
  onDismiss?: () => void;
}> = ({ tone, children, onDismiss }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs font-bold ${
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200'
    }`}
  >
    <div className="flex items-start gap-2">
      {tone === 'error' ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : tone === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className="leading-relaxed">{children}</span>
    </div>
    {onDismiss && (
      <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="shrink-0 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    )}
  </div>
);

/** Loading, failure and emptiness are stated per query rather than papered over with rows. */
const AsyncBlock: React.FC<{
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyTitle: string;
  emptyMessage: string;
  loadingText: string;
  onRetry?: () => void;
  children: React.ReactNode;
}> = ({ isLoading, isError, error, isEmpty, emptyTitle, emptyMessage, loadingText, onRetry, children }) => {
  if (isLoading) {
    return (
      <p className="text-xs text-slate-500" role="status" aria-live="polite">
        {loadingText}
      </p>
    );
  }
  if (isError) {
    return (
      <Banner tone="error">
        {messageOf(error)}
        {onRetry && (
          <button type="button" onClick={onRetry} className="ml-2 underline">
            Retry
          </button>
        )}
      </Banner>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5 space-y-1.5">
        <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">{emptyTitle}</h4>
        <p className="text-[11px] text-slate-500 leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }
  return <>{children}</>;
};

export const AccountProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // A ?tab= value from the URL is only honoured when it names a real section.
  const { pathname } = useLocation();
  const requestedTab = ACCOUNT_TABS.find((tab) => tab === searchParams.get('tab'));
  // The URL is the single source of truth for the open section: ?tab= names
  // it (handleTabChange writes it on every switch), and the dedicated
  // /account/addresses URL opens the addresses section when no ?tab= is
  // given. Deriving — rather than mirroring into state — keeps deep links,
  // sidebar links and browser back/forward in step with no sync effect.
  const activeTab: AccountTab =
    requestedTab ?? (pathname.endsWith('/addresses') ? 'addresses' : 'profile');

  const { user } = useAuthStore();
  const { refreshUser } = useAuth();
  const { formatPrice } = useCurrency();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const queryClient = useQueryClient();

  const ordersQuery = useOrders();
  const orderGroups = useMemo(() => ordersQuery.data?.orderGroups ?? [], [ordersQuery.data]);
  /**
   * Packages newest-first. The query hands back order groups in date order but says nothing
   * about the order of the packages embedded in each, so the sort happens here rather than
   * being claimed in the copy.
   */
  const subOrders = useMemo<SubOrder[]>(() => {
    const rows = ordersQuery.data?.subOrders ?? [];
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ordersQuery.data]);

  const activePackages = useMemo(() => subOrders.filter((s) => OPEN_STATUSES.includes(s.status)), [subOrders]);
  const deliveredPackages = useMemo(() => subOrders.filter((s) => s.status === 'delivered'), [subOrders]);
  const openReturns = useMemo(
    () => subOrders.filter((s) => s.status === 'return_requested' || s.status === 'return_approved'),
    [subOrders],
  );
  const returnablePackages = useMemo(
    () => subOrders.filter((s) => s.type === 'physical' && s.status === 'delivered'),
    [subOrders],
  );
  /** Money still sitting on packages that have not been handed over yet. */
  const inProgressTotal = activePackages.reduce((sum, pkg) => sum + grossOf(pkg), 0);

  /** Delivery addresses recorded on orders; there is no saved-address table to invent rows for. */
  const addressEntries = useMemo(() => {
    interface Entry extends ShippingAddress {
      key: string;
      orders: number;
      lastUsedAt: string;
    }
    const byKey = new Map<string, Entry>();
    orderGroups.forEach((group) => {
      const address = group.shippingAddress;
      if (!address || !address.street) return;
      const key = `${address.street}|${address.city}|${address.zipCode}`.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.orders += 1;
        if (group.createdAt > existing.lastUsedAt) existing.lastUsedAt = group.createdAt;
      } else {
        byKey.set(key, { ...address, key, orders: 1, lastUsedAt: group.createdAt });
      }
    });
    return [...byKey.values()].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  }, [orderGroups]);

  /** The instrument each order was actually booked with, read off the order rows. */
  const paymentEntries = useMemo(() => {
    interface Entry {
      key: string;
      method: 'card' | 'cod';
      brand?: string;
      last4?: string;
      orders: number;
      lastUsedAt: string;
    }
    const byKey = new Map<string, Entry>();
    orderGroups.forEach((group) => {
      const brand = group.paymentDetails.brand || undefined;
      const last4 = group.paymentDetails.last4 || undefined;
      const key = group.paymentMethod === 'cod' ? 'cod' : `card|${(brand || '').toLowerCase()}|${last4 || ''}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.orders += 1;
        if (group.createdAt > existing.lastUsedAt) existing.lastUsedAt = group.createdAt;
      } else {
        byKey.set(key, { key, method: group.paymentMethod, brand, last4, orders: 1, lastUsedAt: group.createdAt });
      }
    });
    return [...byKey.values()].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  }, [orderGroups]);

  const disputesQuery = useQuery({
    queryKey: accountDisputeKeys.for(user?.id),
    queryFn: ({ signal }) => (user?.id ? fetchMyDisputes(user.id, signal) : Promise.resolve([])),
    enabled: Boolean(user?.id),
  });
  const disputes = disputesQuery.data ?? [];

  const returnMutation = useUpdateSubOrderStatus();
  const disputeMutation = useMutation({
    mutationFn: async (input: { subOrderId: string; reason: string; urgency: AccountDispute['urgency'] }) => {
      if (!user?.id) throw new Error('Sign in before opening a dispute.');
      const pkg = subOrders.find((row) => row.id === input.subOrderId);
      if (!pkg) throw new Error('Choose one of your packages.');
      const reason = input.reason.trim();
      if (!reason) throw new Error('Describe the problem before submitting.');

      const row: Database['public']['Tables']['disputes']['Insert'] = {
        customer_id: user.id,
        customer_name: user.name || user.email,
        vendor_id: pkg.sellerId,
        vendor_name: pkg.sellerName || 'Seller',
        sub_order_id: pkg.id,
        order_group_id: pkg.orderGroupId,
        reason,
        status: 'open',
        urgency: input.urgency,
        evidence_photos: [],
      };
      const { error } = await supabase.from('disputes').insert(row);
      if (error) throw new Error(error.message);
      return pkg.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountDisputeKeys.all });
    },
  });

  // Profile writes go to the `profiles` row through the session layer and await the server.
  // A null draft means "show the row the server has", so a save or a re-read wins without an effect.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameValue = nameDraft ?? user?.name ?? '';
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileBanner, setProfileBanner] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // The password change is a real Supabase auth call; there is no timer faking success.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSubOrderId, setReturnSubOrderId] = useState('');
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnResolution, setReturnResolution] = useState<'replacement' | 'refund'>('replacement');
  const [returnBanner, setReturnBanner] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeSubOrderId, setDisputeSubOrderId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeUrgency, setDisputeUrgency] = useState<AccountDispute['urgency']>('standard');
  const [disputeBanner, setDisputeBanner] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);

  // Saved addresses and payment methods live in `user_addresses` /
  // `user_payment_methods` now. Until the customer's own rows land - and forever
  // for a new account - the lists are honestly empty, never seeded fiction.
  const addressesQuery = useSavedAddresses();
  const savedAddresses = addressesQuery.data ?? [];
  const addressActions = useSavedAddressActions();
  const paymentsQuery = useSavedPaymentMethods();
  const savedPaymentMethods = paymentsQuery.data ?? [];
  const paymentActions = useSavedPaymentMethodActions();

  // Address Modal & Form State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<AddressType>('home');
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressFullName, setAddressFullName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZipCode, setAddressZipCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('Pakistan');
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressBanner, setAddressBanner] = useState<string | null>(null);
  const [addressFilter, setAddressFilter] = useState<'all' | 'home' | 'work'>('all');

  // Payment Modal & Form State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'cod'>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('28');
  const [cvv, setCvv] = useState('');
  const [paymentIsDefault, setPaymentIsDefault] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<string | null>(null);

  const openAddAddressModal = (presetType: AddressType = 'home') => {
    setEditingAddressId(null);
    setAddressType(presetType);
    setAddressLabel(presetType === 'home' ? 'Home' : presetType === 'work' ? 'Work' : 'Other');
    setAddressFullName(user?.name || '');
    setAddressPhone('');
    setAddressStreet('');
    setAddressCity('');
    setAddressState('');
    setAddressZipCode('');
    setAddressCountry('Pakistan');
    setAddressIsDefault(savedAddresses.length === 0);
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: UserSavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressType(addr.type);
    setAddressLabel(addr.label);
    setAddressFullName(addr.fullName);
    setAddressPhone(addr.phone);
    setAddressStreet(addr.street);
    setAddressCity(addr.city);
    setAddressState(addr.state);
    setAddressZipCode(addr.zipCode);
    setAddressCountry(addr.country);
    setAddressIsDefault(addr.isDefault);
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressFullName.trim()) {
      setAddressError('Please enter a recipient name.');
      return;
    }
    if (!addressPhone.trim()) {
      setAddressError('Please enter a phone number.');
      return;
    }
    if (!addressStreet.trim()) {
      setAddressError('Please enter a street address.');
      return;
    }
    if (!addressCity.trim() || !addressZipCode.trim()) {
      setAddressError('Please enter both City and ZIP / Postal code.');
      return;
    }

    const draft = {
      type: addressType,
      label: addressLabel.trim() || (addressType === 'home' ? 'Home' : addressType === 'work' ? 'Work' : 'Other'),
      fullName: addressFullName.trim(),
      phone: addressPhone.trim(),
      street: addressStreet.trim(),
      city: addressCity.trim(),
      state: addressState.trim(),
      zipCode: addressZipCode.trim(),
      country: addressCountry.trim() || 'Pakistan',
      isDefault: addressIsDefault,
    };

    try {
      if (editingAddressId) {
        await addressActions.update.mutateAsync({ id: editingAddressId, updates: draft });
        setAddressBanner('Address updated successfully.');
      } else {
        await addressActions.create.mutateAsync(draft);
        setAddressBanner('New address added to your address book.');
      }
      setIsAddressModalOpen(false);
    } catch (cause) {
      setAddressError(messageOf(cause));
    }
  };

  const openAddPaymentModal = () => {
    setPaymentType('card');
    setCardholderName(user?.name || '');
    setCardNumber('');
    setExpiryMonth('12');
    setExpiryYear('28');
    setCvv('');
    setPaymentIsDefault(savedPaymentMethods.length === 0);
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (paymentType === 'card') {
        const cleanNum = cardNumber.replace(/[\s-]/g, '');
        if (!cleanNum || cleanNum.length < 13 || !/^\d+$/.test(cleanNum)) {
          setPaymentError('Please enter a valid card number (13-19 digits).');
          return;
        }
        if (!cardholderName.trim()) {
          setPaymentError('Please enter the name printed on the card.');
          return;
        }
        if (!cvv.trim() || cvv.length < 3) {
          setPaymentError('Please enter a valid CVV (3-4 digits).');
          return;
        }
        const detected = detectCardBrand(cleanNum);
        const brand = detected === 'Unknown' ? 'Card' : detected;
        const last4 = cleanNum.slice(-4);

        // Only the metadata crosses the wire: the full number and CVV end here.
        await paymentActions.create.mutateAsync({
          type: 'card',
          brand,
          cardholderName: cardholderName.trim(),
          last4,
          expiryMonth,
          expiryYear,
          isDefault: paymentIsDefault,
        });
        setPaymentBanner(`Payment card (${brand} ending in ${last4}) saved.`);
      } else {
        await paymentActions.create.mutateAsync({
          type: 'cod',
          brand: 'Cash on Delivery',
          isDefault: paymentIsDefault,
        });
        setPaymentBanner('Cash on Delivery payment preference saved.');
      }
      setIsPaymentModalOpen(false);
    } catch (cause) {
      setPaymentError(messageOf(cause));
    }
  };

  const displayName = user?.name || user?.email || 'there';
  const ordersUnavailable = !user;
  // Email-change policy gates on what the account IS — its profile roles and
  // store ownership — never on which page the account happens to be on.
  const isVendorAccount = Boolean(user && (user.roles.includes('vendor') || user.vendorId));

  const handleTabChange = (tab: AccountTab) => {
    // The section is derived from the URL, so writing the URL is the switch.
    setSearchParams({ tab });
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setProfileError('Add a display name before saving.');
      return;
    }
    setProfileBusy(true);
    setProfileError(null);
    setProfileBanner(null);
    try {
      await updateProfileIdentity({ name: trimmed });
      await refreshUser();
      setNameDraft(null);
      setProfileBanner('Your display name is saved on your profile row.');
    } catch (cause) {
      setProfileError(messageOf(cause));
    } finally {
      setProfileBusy(false);
    }
  };

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again after an error re-fires.
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarNotice(null);
    try {
      await uploadAvatar(file);
      // Re-read the profile so the header, the account sidebar and the navbar
      // all show the new photo from the same session user.
      await refreshUser();
      setAvatarNotice('Your profile photo is updated — it now appears everywhere your account does.');
    } catch (cause) {
      setAvatarError(messageOf(cause));
    } finally {
      setAvatarBusy(false);
    }
  };

  const submitEmailChange = async () => {
    const next = emailDraft.trim();
    if (!next) {
      setEmailError('Enter the new email address first.');
      return;
    }
    setEmailBusy(true);
    setEmailError(null);
    try {
      await requestEmailChange(next);
      setEmailSentTo(next);
      setEmailDraft('');
    } catch (cause) {
      setEmailError(messageOf(cause));
    } finally {
      setEmailBusy(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('The two passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordBanner(null);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordFormOpen(false);
      setPasswordBanner('Password updated through Supabase auth. Your sessions keep working until they expire.');
    } catch (cause) {
      setPasswordError(messageOf(cause));
    } finally {
      setPasswordBusy(false);
    }
  };

  const submitReturn = () => {
    if (!returnSubOrderId) {
      setReturnError('Choose one of your delivered packages.');
      return;
    }
    setReturnError(null);
    returnMutation.mutate(
      {
        subOrderId: returnSubOrderId,
        nextStatus: 'return_requested',
        note: `Customer return requested: ${returnReason} (${returnResolution})`,
      },
      {
        onSuccess: (updated) => {
          setIsReturnOpen(false);
          setReturnSubOrderId('');
          setReturnBanner(
            `Return requested on package ${updated.id.slice(0, 8)}. Status is now "${STATUS_LABEL[updated.status]}"; the seller decides the return.`,
          );
        },
        onError: (cause) => setReturnError(messageOf(cause)),
      },
    );
  };

  const submitDispute = () => {
    if (!disputeSubOrderId) {
      setDisputeError('Choose one of your packages.');
      return;
    }
    setDisputeError(null);
    disputeMutation.mutate(
      { subOrderId: disputeSubOrderId, reason: disputeReason, urgency: disputeUrgency },
      {
        onSuccess: (subOrderId) => {
          setIsDisputeOpen(false);
          setDisputeSubOrderId('');
          setDisputeReason('');
          setDisputeBanner(
            `Dispute opened on package ${subOrderId.slice(0, 8)}. It is now in your case list below and readable by the seller and the support desk.`,
          );
        },
        onError: (cause) => setDisputeError(messageOf(cause)),
      },
    );
  };

  const openReturnDialog = (subOrderId: string) => {
    setReturnError(null);
    returnMutation.reset();
    setReturnSubOrderId(subOrderId);
    setIsReturnOpen(true);
  };

  const tabHints: Record<AccountTab, string> = {
    profile: 'Identity',
    orders: ordersQuery.isLoading ? 'History' : `${subOrders.length} packages`,
    returns: openReturns.length > 0 ? `${openReturns.length} open` : 'RMA',
    addresses: addressesQuery.isLoading ? 'Address book' : `${savedAddresses.length} saved`,
    payments: paymentsQuery.isLoading ? 'Methods' : `${savedPaymentMethods.length} saved`,
    disputes: disputesQuery.isLoading ? 'Support' : `${disputes.length} cases`,
    security: 'Password',
  };

  const tabMeta: { key: AccountTab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Overview & Profile', icon: <UserIcon className="h-4 w-4" aria-hidden="true" /> },
    { key: 'orders', label: 'Track Orders', icon: <Truck className="h-4 w-4" aria-hidden="true" /> },
    { key: 'returns', label: 'Returns & Refunds', icon: <RotateCcw className="h-4 w-4" aria-hidden="true" /> },
    { key: 'addresses', label: 'Delivery Addresses', icon: <MapPin className="h-4 w-4" aria-hidden="true" /> },
    { key: 'payments', label: 'Payment Methods', icon: <CreditCard className="h-4 w-4" aria-hidden="true" /> },
    { key: 'disputes', label: 'Disputes & Claims', icon: <Scale className="h-4 w-4" aria-hidden="true" /> },
    { key: 'security', label: 'Security', icon: <Key className="h-4 w-4" aria-hidden="true" /> },
  ];

  const onTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: AccountTab[] = tabMeta.map((tab) => tab.key);
    const index = keys.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % keys.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + keys.length) % keys.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = keys.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = keys[nextIndex];
    handleTabChange(next);
    document.getElementById(`account-tab-${next}`)?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Content column only: AccountLayout carries the account sidebar and
          the full-width storefront container (max-w-[1600px]) — this page no
          longer narrows itself to max-w-7xl or paints its own shell. */}
        {/* ========================================================================= */}
        {/* Top Header Card - identity and counts read from the session and the orders */}
        {/* ========================================================================= */}
        <div className="overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-sun-orange shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </div>

              <div>
                <h1 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {user ? `Signed in as ${user.email}` : 'You are not signed in, so there is nothing to read yet.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/30 p-3.5 px-4 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-orange text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">Returns, refunds &amp; disputes</h4>
                <p className="text-[11px] text-slate-500">
                  Manage eligible returns and track refund progress.{' '}
                  <Link to="/refund-policy" className="font-bold text-sun-orange hover:underline">
                    Refund policy
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {!user && (
            <div className="mt-6">
              <Banner tone="info">
                <Link to="/login" className="underline font-extrabold">
                  Sign in
                </Link>{' '}
                to view your orders, saved addresses, payment methods, and security settings.
              </Banner>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            <button
              type="button"
              onClick={() => handleTabChange('orders')}
              aria-label={`Packages in progress: ${ordersQuery.isLoading || ordersUnavailable ? 'unknown' : activePackages.length}. Go to the orders section.`}
              className="text-left cursor-pointer rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 hover:border-orange-200 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">In progress</span>
                <Truck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                {ordersQuery.isLoading || ordersUnavailable ? '—' : activePackages.length}
              </div>
              <span className="text-[11px] font-semibold text-sun-orange">Placed, in transit, or in a return</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('returns')}
              aria-label={`Packages delivered: ${ordersQuery.isLoading || ordersUnavailable ? 'unknown' : deliveredPackages.length}. Go to the returns section.`}
              className="text-left cursor-pointer rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 hover:border-purple-200 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Delivered</span>
                <CheckCircle2 className="h-4 w-4 text-purple-500" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                {ordersQuery.isLoading || ordersUnavailable ? '—' : deliveredPackages.length}
              </div>
              <span className="text-[11px] text-slate-500">
                {ordersQuery.isLoading || ordersUnavailable
                  ? 'Your packages'
                  : `${returnablePackages.length} eligible for a return`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('orders')}
              aria-label={`Value of packages in progress: ${
                ordersQuery.isLoading || ordersUnavailable ? 'unknown' : formatPrice(inProgressTotal)
              }. Go to the orders section.`}
              className="text-left cursor-pointer rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 hover:border-rose-200 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Undelivered value</span>
                <Lock className="h-4 w-4 text-rose-500" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                {ordersQuery.isLoading || ordersUnavailable ? '—' : formatPrice(inProgressTotal)}
              </div>
              <span className="text-[11px] text-slate-500">Subtotal + shipping on open packages</span>
            </button>

            <Link
              to="/wishlist"
              aria-label={`Saved wishlist: ${wishlistCount} items. Open the wishlist.`}
              className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 hover:border-rose-200 transition-colors block"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Saved Wishlist</span>
                <Heart className="h-4 w-4 text-rose-400" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">{wishlistCount}</div>
              <span className="text-[11px] text-slate-500">Items on your saved list</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2-Column Grid                                                           */}
        {/* ========================================================================= */}
        {/* Section tabs: this page’s own sections as a horizontal tab bar.
            The account sidebar itself belongs to AccountLayout now. */}
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label="Account sections"
          onKeyDown={onTabListKeyDown}
          className="flex w-full min-w-0 gap-1.5 overflow-x-auto rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
                {tabMeta.map((tab) => {
                  const selected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      id={`account-tab-${tab.key}`}
                      aria-selected={selected}
                      aria-controls={`account-panel-${tab.key}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => handleTabChange(tab.key)}
                      className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-r from-sun-orange to-[#FF9040] text-white font-bold shadow-md shadow-orange-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {tab.icon}
                        <span>{tab.label}</span>
                      </span>
                      <span
                        className={
                          selected
                            ? 'text-[10px] text-white/90 font-semibold'
                            : 'text-[10px] text-slate-400 dark:text-slate-500 font-semibold'
                        }
                      >
                        {tabHints[tab.key]}
                      </span>
                    </button>
                  );
                })}
              </div>


          <div className="space-y-6">
            {/* TAB: OVERVIEW & PROFILE */}
            {activeTab === 'profile' && (
              <section
                id="account-panel-profile"
                role="tabpanel"
                aria-labelledby="account-tab-profile"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Personal Information
                      </h2>
                      <p className="text-xs text-slate-500">
                        Your display name writes to the profile row; only what the database lets you change is offered.
                      </p>
                    </div>
                  </div>

                  {!user ? (
                    <Banner tone="info">Sign in to edit the profile attached to your account.</Banner>
                  ) : (
                    <>
                      {/* Profile photo: uploads to the user-avatars bucket under
                          the caller's own uid prefix, then avatar_url is saved
                          on the profile row (see features/account/api/avatar). */}
                      <div className="flex flex-wrap items-center gap-4 max-w-xl">
                        <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-sun-orange/70 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UserIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className={labelClass}>Profile Photo</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              htmlFor="account-avatar-input"
                              className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${avatarBusy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                            >
                              {avatarBusy ? 'Uploading…' : 'Change photo'}
                            </label>
                            <input
                              id="account-avatar-input"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={handleAvatarPick}
                              disabled={avatarBusy}
                            />
                            <span className="text-[11px] text-slate-500">JPG, PNG or WebP, up to 2 MB.</span>
                          </div>
                          {avatarError && (
                            <p role="alert" className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              {avatarError}
                            </p>
                          )}
                          {avatarNotice && (
                            <p role="status" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {avatarNotice}
                            </p>
                          )}
                        </div>
                      </div>

                      <form onSubmit={saveProfile} className="space-y-4 max-w-xl">
                        <div>
                          <label htmlFor="account-name" className={labelClass}>
                            Display Name
                          </label>
                          <input
                            id="account-name"
                            name="accountName"
                            type="text"
                            autoComplete="name"
                            value={nameValue}
                            onChange={(event) => setNameDraft(event.target.value)}
                            className={inputClass}
                          />
                          <p className="mt-1 text-[11px] text-slate-500">
                            Saved as <code className="font-mono">profiles.name</code> through the session layer, then
                            re-read from the server.
                          </p>
                        </div>

                        <div>
                          <label htmlFor="account-email" className={labelClass}>
                            Sign-in Email
                          </label>
                          <input
                            id="account-email"
                            name="accountEmail"
                            type="email"
                            value={user.email}
                            readOnly
                            aria-readonly="true"
                            disabled
                            className={`${inputClass} opacity-70 cursor-not-allowed`}
                          />
                          {isVendorAccount ? (
                            <>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Seller accounts can&apos;t change their sign-in email here — the address is tied to
                                your store, payouts and order records, so an admin has to make this change for you.
                              </p>
                              <Link
                                to="/contact"
                                className="mt-2 inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                              >
                                Contact an admin
                              </Link>
                            </>
                          ) : emailSentTo ? (
                            <div
                              role="status"
                              className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30 p-3.5 space-y-1.5"
                            >
                              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                Confirmation sent to {emailSentTo}
                              </p>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                                Open the link in that inbox to finish. Your sign-in email only changes once you do —
                                until then, keep signing in with {user.email}.
                              </p>
                              <button
                                type="button"
                                onClick={() => setEmailSentTo(null)}
                                className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 underline"
                              >
                                Use a different email
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-[11px] text-slate-500">
                                To change it, enter the new address below. We email it a confirmation link, and the
                                change only takes effect once that link is opened.
                              </p>
                              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                <input
                                  id="account-email-new"
                                  name="accountEmailNew"
                                  aria-label="New email address"
                                  type="email"
                                  autoComplete="email"
                                  placeholder="New email address"
                                  value={emailDraft}
                                  onChange={(event) => setEmailDraft(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      void submitEmailChange();
                                    }
                                  }}
                                  className={inputClass}
                                />
                                <button
                                  type="button"
                                  onClick={() => void submitEmailChange()}
                                  disabled={emailBusy}
                                  className="shrink-0 rounded-xl bg-sun-orange text-white px-4 py-2.5 text-xs font-bold hover:bg-sun-orange-600 shadow-md shadow-orange-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {emailBusy ? 'Sending…' : 'Send confirmation link'}
                                </button>
                              </div>
                              {emailError && (
                                <p role="alert" className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                  {emailError}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="pt-2 flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={profileBusy}
                            className="rounded-xl bg-sun-orange text-white px-5 py-2.5 text-xs font-bold hover:bg-sun-orange-600 shadow-md shadow-orange-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {profileBusy ? 'Saving…' : 'Save Changes'}
                          </button>
                          {profileBusy && (
                            <span className="text-xs font-bold text-slate-500" role="status" aria-live="polite">
                              Writing to your profile row…
                            </span>
                          )}
                        </div>
                      </form>

                      <div className="space-y-3">
                        {profileBanner && <Banner tone="success" onDismiss={() => setProfileBanner(null)}>{profileBanner}</Banner>}
                        {profileError && <Banner tone="error" onDismiss={() => setProfileError(null)}>{profileError}</Banner>}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-wrap items-center gap-3">
                        <p className="text-[11px] text-slate-500">
                          Your password is changed under Security, along with what this account cannot change.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleTabChange('security')}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        >
                          Go to Security
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Quick cards, both derived from real order rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Most Recent Delivery Address
                    </span>
                    {ordersQuery.isLoading ? (
                      <p className="text-[11px] text-slate-500" role="status" aria-live="polite">
                        Loading your orders…
                      </p>
                    ) : ordersQuery.isError ? (
                      <p className="text-[11px] text-rose-600 font-bold" role="alert" aria-live="assertive">{messageOf(ordersQuery.error)}</p>
                    ) : addressEntries[0] ? (
                      <>
                        <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">
                          {addressEntries[0].street}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {[addressEntries[0].city, addressEntries[0].state].filter(Boolean).join(' • ')}
                          {addressEntries[0].phone ? ` • ${addressEntries[0].phone}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Used on {addressEntries[0].orders} order{addressEntries[0].orders === 1 ? '' : 's'}, last on{' '}
                          {dateOf(addressEntries[0].lastUsedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        No delivered address yet — orders set their address at checkout.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTabChange('addresses')}
                      className="text-xs font-bold text-sun-orange hover:underline pt-2 block"
                    >
                      Addresses on your orders →
                    </button>
                  </div>

                  <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Most Recent Payment Method
                    </span>
                    {ordersQuery.isLoading ? (
                      <p className="text-[11px] text-slate-500" role="status" aria-live="polite">
                        Loading your orders…
                      </p>
                    ) : ordersQuery.isError ? (
                      <p className="text-[11px] text-rose-600 font-bold" role="alert" aria-live="assertive">{messageOf(ordersQuery.error)}</p>
                    ) : paymentEntries[0] ? (
                      <>
                        <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">
                          {paymentEntries[0].method === 'cod'
                            ? 'Cash on delivery'
                            : `${paymentEntries[0].brand || 'Card'}${paymentEntries[0].last4 ? ` ending ${paymentEntries[0].last4}` : ''}`}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Used on {paymentEntries[0].orders} order{paymentEntries[0].orders === 1 ? '' : 's'}, last on{' '}
                          {dateOf(paymentEntries[0].lastUsedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500">No payment recorded on any order yet.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTabChange('payments')}
                      className="text-xs font-bold text-sun-orange hover:underline pt-2 block"
                    >
                      What your orders were paid with →
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: MY ORDERS & TRACKING */}
            {activeTab === 'orders' && (
              <section
                id="account-panel-orders"
                role="tabpanel"
                aria-labelledby="account-tab-orders"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Your Packages &amp; Tracking
                      </h2>
                      <p className="text-xs text-slate-500">
                        Every row below is a sub-order the database returned for this account.
                      </p>
                    </div>
                  </div>

                  <AsyncBlock
                    isLoading={ordersQuery.isLoading}
                    isError={ordersQuery.isError}
                    error={ordersQuery.error}
                    isEmpty={subOrders.length === 0}
                    emptyTitle={user ? 'No orders yet' : 'Nothing to list'}
                    emptyMessage={
                      user
                        ? 'This account has no orders, so there is nothing to track, return or dispute. Orders appear here once you check out.'
                        : 'Sign in and your order rows will appear here.'
                    }
                    loadingText="Loading your packages…"
                    onRetry={() => void ordersQuery.refetch()}
                  >
                    <ul className="space-y-3">
                      {subOrders.slice(0, 8).map((pkg) => (
                        <li
                          key={pkg.id}
                          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/50 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                Order #{pkg.orderGroupId}
                              </span>
                              <span className={`${chipClass} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`}>
                                {STATUS_LABEL[pkg.status]}
                              </span>
                              <span className={`${chipClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
                                {pkg.type === 'digital' ? 'Digital' : 'Physical'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Paid: {formatPrice(grossOf(pkg))}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {pkg.items[0]?.image ? (
                              <div className="h-14 w-14 rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                                <img
                                  src={pkg.items[0].image}
                                  alt={pkg.items[0].title || pkg.sellerName}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-14 w-14 rounded-xl bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center">
                                <Package className="h-5 w-5 text-slate-300" aria-hidden="true" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {pkg.items[0]?.title || 'Package contents'}
                                {pkg.items.length > 1 ? ` + ${pkg.items.length - 1} more` : ''}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {pkg.sellerName || 'Seller'} • placed {dateOf(pkg.createdAt)}
                                {pkg.carrierName && pkg.trackingNumber
                                  ? ` • ${pkg.carrierName} ${pkg.trackingNumber}`
                                  : ''}
                              </p>
                            </div>
                            <Link
                              to={`/orders/${pkg.orderGroupId}`}
                              className="rounded-xl bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white shadow-xs shrink-0"
                            >
                              Open order
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {subOrders.length > 8 && (
                      <p className="text-[11px] text-slate-500">
                        Showing your 8 most recent packages of {subOrders.length}.
                      </p>
                    )}
                  </AsyncBlock>
                </div>
              </section>
            )}

            {/* TAB: RETURNS & REFUNDS */}
            {activeTab === 'returns' && (
              <section
                id="account-panel-returns"
                role="tabpanel"
                aria-labelledby="account-tab-returns"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Returns &amp; Replacements
                      </h2>
                      <p className="text-xs text-slate-500">
                        A request moves the package to &ldquo;Return requested&rdquo;; the seller decides it.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => openReturnDialog('')}
                      disabled={returnablePackages.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Start a Return</span>
                    </button>
                  </div>

                  {returnBanner && (
                    <Banner tone="success" onDismiss={() => setReturnBanner(null)}>
                      {returnBanner}
                    </Banner>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-400">
                      Delivered packages you can return
                    </h3>
                    <AsyncBlock
                      isLoading={ordersQuery.isLoading}
                      isError={ordersQuery.isError}
                      error={ordersQuery.error}
                      isEmpty={returnablePackages.length === 0}
                      emptyTitle="No package is eligible yet"
                      emptyMessage={
                        user
                          ? 'Eligibility needs a delivered physical package, and this account has none yet. Nothing here is padded with invented items.'
                          : 'Sign in to see the packages you have received.'
                      }
                      loadingText="Loading your delivered packages…"
                      onRetry={() => void ordersQuery.refetch()}
                    >
                      <ul className="space-y-3">
                        {returnablePackages.map((pkg) => (
                          <li
                            key={pkg.id}
                            className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {pkg.items[0]?.image ? (
                                <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                                  <img
                                    src={pkg.items[0].image}
                                    alt={pkg.items[0].title || pkg.sellerName}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-slate-300" aria-hidden="true" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {pkg.items[0]?.title || pkg.sellerName}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  Order #{pkg.orderGroupId} • {formatPrice(grossOf(pkg))}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openReturnDialog(pkg.id)}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                            >
                              Request Return
                            </button>
                          </li>
                        ))}
                      </ul>
                    </AsyncBlock>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-400">
                      Returns in progress on your account
                    </h3>
                    {ordersQuery.isLoading ? (
                      <p className="text-xs text-slate-500" role="status" aria-live="polite">
                        Loading…
                      </p>
                    ) : openReturns.length === 0 ? (
                      <p className="text-[11px] text-slate-500">No return is waiting on a decision right now.</p>
                    ) : (
                      <ul className="space-y-2">
                        {openReturns.map((pkg) => (
                          <li
                            key={pkg.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-4"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {pkg.id.slice(0, 8)}
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                                {pkg.items[0]?.title || pkg.sellerName} • Order #{pkg.orderGroupId}
                              </p>
                              {pkg.returnReason && (
                                <p className="text-[11px] text-slate-500 mt-0.5">Reason on file: {pkg.returnReason}</p>
                              )}
                            </div>
                            <span className={`${chipClass} bg-amber-200 text-amber-900 shrink-0`}>
                              {STATUS_LABEL[pkg.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Refund amounts and return decisions are written by the seller and the support desk; this page only
                      requests the return. See the{' '}
                      <Link to="/refund-policy" className="font-bold text-sun-orange hover:underline">
                        refund policy
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: DELIVERY ADDRESSES (read from order rows) */}
            {activeTab === 'addresses' && (
              <section
                id="account-panel-addresses"
                role="tabpanel"
                aria-labelledby="account-tab-addresses"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Delivery Addresses
                      </h2>
                      <p className="text-xs text-slate-500">
                        Manage your saved Home &amp; Work addresses for faster checkout.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAddAddressModal('home')}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Add New Address</span>
                    </button>
                  </div>

                  {addressBanner && (
                    <Banner tone="success" onDismiss={() => setAddressBanner(null)}>
                      {addressBanner}
                    </Banner>
                  )}

                  {/* Filter chips */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddressFilter('all')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        addressFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      All Addresses ({savedAddresses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressFilter('home')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        addressFilter === 'home'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                      }`}
                    >
                      <Home className="h-3 w-3" />
                      <span>Home ({savedAddresses.filter((a) => a.type === 'home').length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressFilter('work')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        addressFilter === 'work'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100'
                      }`}
                    >
                      <Building2 className="h-3 w-3" />
                      <span>Work ({savedAddresses.filter((a) => a.type === 'work').length})</span>
                    </button>
                  </div>

                  {/* Saved addresses list */}
                  {addressesQuery.isLoading ? (
                    <p className="text-xs text-slate-500">Loading your saved addresses…</p>
                  ) : addressesQuery.isError ? (
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-2">
                      <p className="text-[11px] text-rose-600 font-bold" role="alert" aria-live="assertive">
                        {messageOf(addressesQuery.error)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void addressesQuery.refetch()}
                        className="text-[11px] font-bold text-sun-orange hover:underline cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : savedAddresses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-sun-orange">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                        No saved addresses yet
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Add your primary Home or Work address to streamline checkout across your orders.
                      </p>
                      <button
                        type="button"
                        onClick={() => openAddAddressModal('home')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Address</span>
                      </button>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedAddresses
                        .filter((addr) => addressFilter === 'all' || addr.type === addressFilter)
                        .map((addr) => (
                          <li
                            key={addr.id}
                            className={`rounded-2xl border p-5 space-y-3 transition-all relative ${
                              addr.isDefault
                                ? 'border-sun-orange/40 bg-orange-50/20 dark:bg-orange-950/10 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {addr.type === 'home' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-bold">
                                    <Home className="h-3 w-3" />
                                    <span>Home</span>
                                  </span>
                                ) : addr.type === 'work' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-0.5 text-[11px] font-bold">
                                    <Building2 className="h-3 w-3" />
                                    <span>Work</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-bold">
                                    <MapPin className="h-3 w-3" />
                                    <span>{addr.label || 'Other'}</span>
                                  </span>
                                )}

                                {addr.isDefault && (
                                  <span className="rounded-full bg-sun-orange/10 text-sun-orange border border-sun-orange/30 px-2 py-0.5 text-[10px] font-bold">
                                    Default
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditAddressModal(addr)}
                                  title="Edit address"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addressActions.remove.mutate(addr.id)}
                                  title="Delete address"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {addr.fullName}{' '}
                                <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                                  {addr.phone}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {addr.street}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {[addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ')}
                              </p>
                            </div>

                            {!addr.isDefault && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => addressActions.setDefault.mutate(addr.id)}
                                  className="text-[11px] font-bold text-sun-orange hover:underline cursor-pointer"
                                >
                                  Set as default address
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}

                  {/* Previous order address snapshots */}
                  {addressEntries.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div>
                        <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Addresses From Previous Orders
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Historic delivery snapshots recorded from your booked orders.
                        </p>
                      </div>

                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {addressEntries.map((entry) => (
                          <li
                            key={entry.key}
                            className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {entry.fullName || 'Recipient'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  openAddAddressModal('home');
                                  setAddressFullName(entry.fullName || '');
                                  setAddressPhone(entry.phone || '');
                                  setAddressStreet(entry.street || '');
                                  setAddressCity(entry.city || '');
                                  setAddressState(entry.state || '');
                                  setAddressZipCode(entry.zipCode || '');
                                  setAddressCountry(entry.country || 'Pakistan');
                                }}
                                className="text-[10px] font-bold text-sun-orange hover:underline cursor-pointer"
                              >
                                + Save as Home/Work
                              </button>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px]">{entry.street}</p>
                            <p className="text-[11px] text-slate-500">
                              {[entry.city, entry.state, entry.zipCode, entry.country].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Used on {entry.orders} order{entry.orders === 1 ? '' : 's'} • last {dateOf(entry.lastUsedAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB: PAYMENT METHODS */}
            {activeTab === 'payments' && (
              <section
                id="account-panel-payments"
                role="tabpanel"
                aria-labelledby="account-tab-payments"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Payment Methods
                      </h2>
                      <p className="text-xs text-slate-500">
                        Manage your saved credit/debit cards and preferred checkout options.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openAddPaymentModal}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>Add Payment Method</span>
                      </button>
                    </div>
                  </div>

                  {paymentBanner && (
                    <Banner tone="success" onDismiss={() => setPaymentBanner(null)}>
                      {paymentBanner}
                    </Banner>
                  )}

                  {/* Saved cards list */}
                  {paymentsQuery.isLoading ? (
                    <p className="text-xs text-slate-500">Loading your saved payment methods…</p>
                  ) : paymentsQuery.isError ? (
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-2">
                      <p className="text-[11px] text-rose-600 font-bold" role="alert" aria-live="assertive">
                        {messageOf(paymentsQuery.error)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void paymentsQuery.refetch()}
                        className="text-[11px] font-bold text-sun-orange hover:underline cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : savedPaymentMethods.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-sun-orange">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                        No saved payment methods
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Save a debit/credit card or set your payment preference for rapid 1-click checkout.
                      </p>
                      <button
                        type="button"
                        onClick={openAddPaymentModal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Payment Method</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedPaymentMethods.map((pm) => (
                        <div
                          key={pm.id}
                          className={`rounded-2xl border p-5 space-y-4 transition-all relative ${
                            pm.isDefault
                              ? 'border-sun-orange/40 bg-gradient-to-br from-white via-orange-50/10 to-white dark:from-slate-900 dark:via-orange-950/10 dark:to-slate-900 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
                                {pm.type === 'cod' ? 'COD' : pm.brand.slice(0, 4).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {pm.type === 'cod'
                                    ? 'Cash on delivery'
                                    : `${pm.brand} •••• ${pm.last4}`}
                                </h4>
                                {pm.cardholderName && (
                                  <p className="text-[11px] text-slate-500">{pm.cardholderName}</p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => paymentActions.remove.mutate(pm.id)}
                              title="Delete payment method"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              {pm.expiryMonth && pm.expiryYear ? (
                                <span>Expires {pm.expiryMonth}/{pm.expiryYear}</span>
                              ) : (
                                <span>Direct handover payment</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {pm.isDefault ? (
                                <span className="rounded-full bg-sun-orange/10 text-sun-orange border border-sun-orange/30 px-2.5 py-0.5 text-[10px] font-bold">
                                  Default
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => paymentActions.setDefault.mutate(pm.id)}
                                  className="font-bold text-sun-orange hover:underline cursor-pointer"
                                >
                                  Make default
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past orders payment instruments */}
                  {paymentEntries.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div>
                        <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Payment Instruments Used On Previous Orders
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          The payment method snapshot recorded on your settled orders.
                        </p>
                      </div>

                      <ul className="space-y-2.5">
                        {paymentEntries.map((entry) => (
                          <li
                            key={entry.key}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                                {entry.method === 'cod' ? 'COD' : (entry.brand || 'CARD').slice(0, 4).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {entry.method === 'cod'
                                    ? 'Cash on delivery'
                                    : `${entry.brand || 'Card'}${entry.last4 ? ` ending ${entry.last4}` : ''}`}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Used on {entry.orders} order{entry.orders === 1 ? '' : 's'} • last {dateOf(entry.lastUsedAt)}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 self-start sm:self-auto">
                              {entry.method === 'cod' ? 'Settled on delivery' : 'Charged at checkout'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB: DISPUTE RESOLUTION */}
            {activeTab === 'disputes' && (
              <section
                id="account-panel-disputes"
                role="tabpanel"
                aria-labelledby="account-tab-disputes"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Your Dispute Cases
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cases naming you as the customer, read from the disputes table.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        setDisputeError(null);
                        disputeMutation.reset();
                        setDisputeSubOrderId('');
                        setIsDisputeOpen(true);
                      }}
                      disabled={subOrders.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <span>Open New Dispute</span>
                    </button>
                  </div>

                  {disputeBanner && (
                    <Banner tone="success" onDismiss={() => setDisputeBanner(null)}>
                      {disputeBanner}
                    </Banner>
                  )}

                  <AsyncBlock
                    isLoading={disputesQuery.isLoading}
                    isError={disputesQuery.isError}
                    error={disputesQuery.error}
                    isEmpty={disputes.length === 0}
                    emptyTitle="No disputes on your account"
                    emptyMessage="You have not opened a mediation case, so there is nothing to track."
                    loadingText="Loading your cases…"
                    onRetry={() => void disputesQuery.refetch()}
                  >
                    <ul className="space-y-3">
                      {disputes.map((caseRow) => (
                        <li
                          key={caseRow.id}
                          className="rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-5 space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {caseRow.id}
                              </span>
                              <span className={`${chipClass} bg-amber-200 text-amber-900`}>
                                {DISPUTE_STATUS_LABEL[caseRow.status]}
                              </span>
                              <span className={`${chipClass} bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                                {caseRow.urgency === 'urgent' ? 'Urgent' : 'Standard'}
                              </span>
                            </div>
                            {caseRow.resolutionAmount !== undefined && caseRow.resolutionAmount !== null && (
                              <span className="text-xs font-bold text-rose-600">
                                Resolution amount: {formatPrice(caseRow.resolutionAmount)}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{caseRow.reason}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              {caseRow.vendorName || 'Seller'}
                              {caseRow.orderGroupId ? ` • Order #${caseRow.orderGroupId}` : ''} • opened{' '}
                              {dateOf(caseRow.createdAt)}
                            </p>
                            {caseRow.resolutionNote && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5">
                                Decision on file: {caseRow.resolutionNote}
                              </p>
                            )}
                          </div>

                          {caseRow.subOrderId && (
                            <Link
                              to={`/orders/${caseRow.orderGroupId ?? caseRow.subOrderId}`}
                              className="text-xs font-bold text-sun-orange hover:underline inline-block"
                            >
                              Open the order this case is on →
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-slate-500">
                      Replies happen in the case thread on the seller and support sides; a customer cannot change a case
                      status from here, and this page does not offer a button that pretends to.
                    </p>
                  </AsyncBlock>
                </div>
              </section>
            )}

            {/* TAB: SECURITY */}
            {activeTab === 'security' && (
              <section
                id="account-panel-security"
                role="tabpanel"
                aria-labelledby="account-tab-security"
                tabIndex={-1}
                className="space-y-6 focus:outline-none"
              >
                <div className={panelClass}>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Security
                    </h2>
                    <p className="text-xs text-slate-500">What this account can actually change, and what it cannot.</p>
                  </div>

                  <div className="space-y-3 max-w-xl">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Sign-in credentials
                    </h3>
                    <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>
                          Password — set below through Supabase auth, and the server&rsquo;s message is shown when it
                          refuses one.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        <span>
                          Email — your sign-in address is {user?.email ?? 'not available'}; this app exposes no email
                          change path.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-3 max-w-xl">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Update Account Password
                    </h3>

                    {!user ? (
                      <Banner tone="info">Sign in to change the password on your account.</Banner>
                    ) : (
                      <>
                        {passwordBanner && (
                          <Banner tone="success" onDismiss={() => setPasswordBanner(null)}>
                            {passwordBanner}
                          </Banner>
                        )}
                        {isPasswordFormOpen ? (
                          <form id="account-password-form" onSubmit={savePassword} className="space-y-3">
                            <div>
                              <label htmlFor="account-password-new" className={labelClass}>
                                New Password
                              </label>
                              <input
                                id="account-password-new"
                                name="newPassword"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label htmlFor="account-password-confirm" className={labelClass}>
                                Confirm New Password
                              </label>
                              <input
                                id="account-password-confirm"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className={inputClass}
                              />
                              <p className="mt-1 text-[11px] text-slate-500">
                                No current-password field: this session&rsquo;s token is what proves the request, and the
                                server enforces the minimum length. Its message appears below if it rejects the password.
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                disabled={passwordBusy}
                                className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {passwordBusy ? 'Updating…' : 'Update Password'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsPasswordFormOpen(false);
                                  setPasswordError(null);
                                  setNewPassword('');
                                  setConfirmPassword('');
                                }}
                                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                            {passwordError && (
                              <Banner tone="error" onDismiss={() => setPasswordError(null)}>
                                {passwordError}
                              </Banner>
                            )}
                          </form>
                        ) : (
                          <button
                            type="button"
                            aria-expanded={isPasswordFormOpen}
                            aria-controls="account-password-form"
                            onClick={() => setIsPasswordFormOpen(true)}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          >
                            Change password
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-2 max-w-xl">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Not available on this account
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Two-factor authentication, biometric passkeys, trusted-device lists and any &ldquo;trust score&rdquo;
                      have no column, policy or function behind them in this product, so no toggle is offered for them —
                      a switch that only moves itself would be a lie about your security posture.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-5 space-y-2 max-w-xl">
                    <h3 className="font-outfit text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Closing your account
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      There is no self-service deletion here: no function, edge function or owner-writable column deletes
                      or anonymises a customer account, and the moderation field on your profile row only holds
                      &ldquo;active&rdquo;, &ldquo;suspended&rdquo; or &ldquo;banned&rdquo; — which an admin sets, not you.
                      Rather than fake the button, ask support to close the account, and state the orders you want kept
                      for records.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link to="/contact" className="text-xs font-bold text-sun-orange hover:underline">
                        Contact support →
                      </Link>
                      <Link to="/help" className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline">
                        Help centre
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

      <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <h4 className="font-outfit text-xs font-bold">Buyer Protection &amp; Returns</h4>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Need help with an item? You can request a return, exchange, or submit an inquiry directly from your
          order details. Our buyer protection ensures prompt resolution and hassle-free refunds.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/returns" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            <span>Returns hub</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link to="/shipping-policy" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            <span>Shipping policy</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG: REQUEST A RETURN - selects a real package, writes a real status   */}
      {/* ========================================================================= */}
      <Dialog open={isReturnOpen} onOpenChange={(open) => !open && setIsReturnOpen(false)}>
        <DialogContent aria-labelledby="return-title">
          <DialogHeader>
            <DialogTitle id="return-title">Request a Return</DialogTitle>
            <DialogDescription>
              This moves one of your packages to &ldquo;Return requested&rdquo; on the order, where the seller decides it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="return-package" className={labelClass}>
                Which delivered package?
              </label>
              <select
                id="return-package"
                name="returnPackage"
                value={returnSubOrderId}
                onChange={(event) => setReturnSubOrderId(event.target.value)}
                className={`${inputClass} native-select`}
              >
                <option value="">Select a delivered package</option>
                {returnablePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.id.slice(0, 8)} · {pkg.items[0]?.title || pkg.sellerName || 'Package'} ·{' '}
                    {formatPrice(grossOf(pkg))}
                  </option>
                ))}
              </select>
              {returnablePackages.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  You have no delivered physical package to return yet.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="return-reason" className={labelClass}>
                Reason for the return
              </label>
              <select
                id="return-reason"
                name="returnReason"
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                className={`${inputClass} native-select`}
              >
                {RETURN_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
              <legend className="px-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                What you want
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer hover:border-sun-orange">
                  <input
                    type="radio"
                    name="returnResolution"
                    value="replacement"
                    checked={returnResolution === 'replacement'}
                    onChange={() => setReturnResolution('replacement')}
                  />
                  <span>Replacement</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer hover:border-sun-orange">
                  <input
                    type="radio"
                    name="returnResolution"
                    value="refund"
                    checked={returnResolution === 'refund'}
                    onChange={() => setReturnResolution('refund')}
                  />
                  <span>Refund</span>
                </label>
              </div>
            </fieldset>

            {(returnError || returnMutation.isError) && (
              <Banner tone="error">{returnError ?? messageOf(returnMutation.error)}</Banner>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsReturnOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReturn}
              disabled={returnMutation.isPending || !returnSubOrderId}
              className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {returnMutation.isPending ? 'Sending…' : 'Request Return'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: OPEN A DISPUTE - inserts a real disputes row under customer RLS   */}
      {/* ========================================================================= */}
      <Dialog open={isDisputeOpen} onOpenChange={(open) => !open && setIsDisputeOpen(false)}>
        <DialogContent aria-labelledby="dispute-title">
          <DialogHeader>
            <DialogTitle id="dispute-title">Open a Dispute</DialogTitle>
            <DialogDescription>
              Writes a case row naming you, the seller and the package. The support desk and the seller both read it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="dispute-package" className={labelClass}>
                Which package?
              </label>
              <select
                id="dispute-package"
                name="disputePackage"
                value={disputeSubOrderId}
                onChange={(event) => setDisputeSubOrderId(event.target.value)}
                className={`${inputClass} native-select`}
              >
                <option value="">Select one of your packages</option>
                {subOrders.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    Order #{pkg.orderGroupId.slice(0, 8)} · {pkg.items[0]?.title || pkg.sellerName || 'Package'} ·{' '}
                    {STATUS_LABEL[pkg.status]} · {formatPrice(grossOf(pkg))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dispute-urgency" className={labelClass}>
                Urgency
              </label>
              <select
                id="dispute-urgency"
                name="disputeUrgency"
                value={disputeUrgency}
                onChange={(event) => setDisputeUrgency(event.target.value === 'urgent' ? 'urgent' : 'standard')}
                className={`${inputClass} native-select`}
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="dispute-reason" className={labelClass}>
                What happened?
              </label>
              <textarea
                id="dispute-reason"
                name="disputeReason"
                required
                rows={4}
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                placeholder="Describe the defect, the missing item, or the delay"
                className={inputClass}
              />
            </div>

            {(disputeError || disputeMutation.isError) && (
              <Banner tone="error">{disputeError ?? messageOf(disputeMutation.error)}</Banner>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsDisputeOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDispute}
              disabled={disputeMutation.isPending || !disputeSubOrderId || !disputeReason.trim()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {disputeMutation.isPending ? 'Submitting…' : 'Submit Dispute'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: ADD / EDIT ADDRESS                                                */}
      {/* ========================================================================= */}
      <Dialog open={isAddressModalOpen} onOpenChange={(open) => !open && setIsAddressModalOpen(false)}>
        <DialogContent aria-labelledby="address-modal-title" className="max-w-lg">
          <DialogHeader>
            <DialogTitle id="address-modal-title">
              {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
            </DialogTitle>
            <DialogDescription>
              Specify your recipient and location details. Choose whether this is your Home or Work address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAddress} className="space-y-4">
            {/* Address Type Selection: Home vs Work vs Other */}
            <div>
              <label className={labelClass}>Address Type</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAddressType('home');
                    if (!editingAddressId || addressLabel === 'Work' || addressLabel === 'Other') setAddressLabel('Home');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    addressType === 'home'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddressType('work');
                    if (!editingAddressId || addressLabel === 'Home' || addressLabel === 'Other') setAddressLabel('Work');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    addressType === 'work'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Work</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddressType('other');
                    if (!editingAddressId || addressLabel === 'Home' || addressLabel === 'Work') setAddressLabel('Other');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    addressType === 'other'
                      ? 'border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white ring-2 ring-slate-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Other</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="address-fullName" className={labelClass}>
                  Recipient Full Name *
                </label>
                <input
                  id="address-fullName"
                  type="text"
                  required
                  value={addressFullName}
                  onChange={(e) => setAddressFullName(e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="address-phone" className={labelClass}>
                  Contact Phone *
                </label>
                <input
                  id="address-phone"
                  type="tel"
                  required
                  value={addressPhone}
                  onChange={(e) => setAddressPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address-street" className={labelClass}>
                Street Address *
              </label>
              <input
                id="address-street"
                type="text"
                required
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="House/Apt #, Street name"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="address-city" className={labelClass}>
                  City *
                </label>
                <input
                  id="address-city"
                  type="text"
                  required
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="e.g. Karachi"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="address-state" className={labelClass}>
                  State / Province
                </label>
                <input
                  id="address-state"
                  type="text"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="e.g. Sindh"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="address-zip" className={labelClass}>
                  ZIP / Postal Code *
                </label>
                <input
                  id="address-zip"
                  type="text"
                  required
                  value={addressZipCode}
                  onChange={(e) => setAddressZipCode(e.target.value)}
                  placeholder="e.g. 75500"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="address-country" className={labelClass}>
                  Country
                </label>
                <input
                  id="address-country"
                  type="text"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  placeholder="e.g. Pakistan"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="address-label" className={labelClass}>
                  Address Label / Nickname
                </label>
                <input
                  id="address-label"
                  type="text"
                  value={addressLabel}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  placeholder="e.g. Primary Home, Studio, Main Office"
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={addressIsDefault}
                onChange={(e) => setAddressIsDefault(e.target.checked)}
                className="rounded border-slate-300 text-sun-orange focus:ring-sun-orange h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Set as default delivery address for future orders
              </span>
            </label>

            {addressError && <Banner tone="error">{addressError}</Banner>}

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                {editingAddressId ? 'Save Changes' : 'Save Address'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: ADD PAYMENT METHOD                                                */}
      {/* ========================================================================= */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && setIsPaymentModalOpen(false)}>
        <DialogContent aria-labelledby="payment-modal-title" className="max-w-md">
          <DialogHeader>
            <DialogTitle id="payment-modal-title">Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment card or preferred checkout method to your profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePaymentMethod} className="space-y-4">
            {/* Method choice */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('card')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentType === 'card'
                    ? 'border-sun-orange bg-orange-50 text-sun-orange dark:bg-orange-950/60 ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Credit/Debit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cod')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentType === 'cod'
                    ? 'border-sun-orange bg-orange-50 text-sun-orange dark:bg-orange-950/60 ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Cash on Delivery</span>
              </button>
            </div>

            {paymentType === 'card' ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="card-name" className={labelClass}>
                    Cardholder Name *
                  </label>
                  <input
                    id="card-name"
                    type="text"
                    required
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Name as it appears on card"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="card-number" className={labelClass}>
                      Card Number *
                    </label>
                    {cardNumber.length >= 4 && (
                      <span className="text-[10px] font-bold text-sun-orange">
                        {detectCardBrand(cardNumber)}
                      </span>
                    )}
                  </div>
                  <input
                    id="card-number"
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="•••• •••• •••• ••••"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="card-exp-month" className={labelClass}>
                      Exp. Month
                    </label>
                    <select
                      id="card-exp-month"
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className={`${inputClass} native-select`}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="card-exp-year" className={labelClass}>
                      Exp. Year
                    </label>
                    <select
                      id="card-exp-year"
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      className={`${inputClass} native-select`}
                    >
                      {Array.from({ length: 10 }, (_, i) => String(25 + i)).map((y) => (
                        <option key={y} value={y}>
                          20{y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="card-cvv" className={labelClass}>
                      CVV *
                    </label>
                    <input
                      id="card-cvv"
                      type="password"
                      maxLength={4}
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cash on Delivery (COD)
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Save Cash on Delivery as your default checkout choice. You can settle physically when the package is delivered.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentIsDefault}
                onChange={(e) => setPaymentIsDefault(e.target.checked)}
                className="rounded border-slate-300 text-sun-orange focus:ring-sun-orange h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Set as default payment method
              </span>
            </label>

            {paymentError && <Banner tone="error">{paymentError}</Banner>}

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                Save Payment Method
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountProfilePage;
