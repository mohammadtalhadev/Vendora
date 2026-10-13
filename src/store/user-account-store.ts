import { create } from 'zustand';

export type AddressType = 'home' | 'work' | 'other';

export interface UserSavedAddress {
  id: string;
  type: AddressType;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

export interface UserSavedPaymentMethod {
  id: string;
  type: 'card' | 'cod';
  brand: string;
  cardholderName?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
  createdAt: string;
}

const DEFAULT_ADDRESSES: UserSavedAddress[] = [
  {
    id: 'addr-home-default',
    type: 'home',
    label: 'Home',
    fullName: 'Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    street: '742 Evergreen Terrace',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'United States',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'addr-work-default',
    type: 'work',
    label: 'Work',
    fullName: 'Sarah Jenkins',
    phone: '+1 (555) 876-5432',
    street: '100 Silicon Vista Blvd, Suite 400',
    city: 'San Jose',
    state: 'CA',
    zipCode: '95113',
    country: 'United States',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_PAYMENTS: UserSavedPaymentMethod[] = [
  {
    id: 'pm-card-default-1',
    type: 'card',
    brand: 'Visa',
    cardholderName: 'Sarah Jenkins',
    last4: '4242',
    expiryMonth: '12',
    expiryYear: '28',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pm-card-default-2',
    type: 'card',
    brand: 'Mastercard',
    cardholderName: 'Sarah Jenkins',
    last4: '8812',
    expiryMonth: '08',
    expiryYear: '29',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

function getStorageKeys(userId?: string | null) {
  const scope = userId || 'guest';
  return {
    addressKey: `vd:v1:user_addresses:${scope}`,
    paymentKey: `vd:v1:user_payments:${scope}`,
  };
}

function loadAddressesFromStorage(userId?: string | null): UserSavedAddress[] {
  if (typeof window === 'undefined') return DEFAULT_ADDRESSES;
  const { addressKey } = getStorageKeys(userId);
  try {
    const raw = localStorage.getItem(addressKey);
    if (!raw) {
      localStorage.setItem(addressKey, JSON.stringify(DEFAULT_ADDRESSES));
      return DEFAULT_ADDRESSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ADDRESSES;
  } catch {
    return DEFAULT_ADDRESSES;
  }
}

function saveAddressesToStorage(addresses: UserSavedAddress[], userId?: string | null) {
  if (typeof window === 'undefined') return;
  const { addressKey } = getStorageKeys(userId);
  try {
    localStorage.setItem(addressKey, JSON.stringify(addresses));
  } catch (err) {
    console.error('Failed to save addresses to localStorage', err);
  }
}

function loadPaymentsFromStorage(userId?: string | null): UserSavedPaymentMethod[] {
  if (typeof window === 'undefined') return DEFAULT_PAYMENTS;
  const { paymentKey } = getStorageKeys(userId);
  try {
    const raw = localStorage.getItem(paymentKey);
    if (!raw) {
      localStorage.setItem(paymentKey, JSON.stringify(DEFAULT_PAYMENTS));
      return DEFAULT_PAYMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PAYMENTS;
  } catch {
    return DEFAULT_PAYMENTS;
  }
}

function savePaymentsToStorage(payments: UserSavedPaymentMethod[], userId?: string | null) {
  if (typeof window === 'undefined') return;
  const { paymentKey } = getStorageKeys(userId);
  try {
    localStorage.setItem(paymentKey, JSON.stringify(payments));
  } catch (err) {
    console.error('Failed to save payment methods to localStorage', err);
  }
}

interface UserAccountState {
  currentUserId: string | null;
  savedAddresses: UserSavedAddress[];
  savedPaymentMethods: UserSavedPaymentMethod[];

  // Address Actions
  syncForUser: (userId: string | null) => void;
  addAddress: (address: Omit<UserSavedAddress, 'id' | 'createdAt'>) => UserSavedAddress;
  updateAddress: (id: string, updates: Partial<Omit<UserSavedAddress, 'id' | 'createdAt'>>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  // Payment Actions
  addPaymentMethod: (payment: Omit<UserSavedPaymentMethod, 'id' | 'createdAt'>) => UserSavedPaymentMethod;
  deletePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
}

export const useUserAccountStore = create<UserAccountState>((set, get) => ({
  currentUserId: null,
  savedAddresses: loadAddressesFromStorage(null),
  savedPaymentMethods: loadPaymentsFromStorage(null),

  syncForUser: (userId: string | null) => {
    if (get().currentUserId === userId) return;
    const addresses = loadAddressesFromStorage(userId);
    const payments = loadPaymentsFromStorage(userId);
    set({
      currentUserId: userId,
      savedAddresses: addresses,
      savedPaymentMethods: payments,
    });
  },

  addAddress: (input) => {
    const { currentUserId, savedAddresses } = get();
    const isFirst = savedAddresses.length === 0;
    const isDefault = input.isDefault || isFirst;

    const newAddress: UserSavedAddress = {
      ...input,
      id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isDefault,
      createdAt: new Date().toISOString(),
    };

    const nextAddresses = savedAddresses.map((a) => (isDefault ? { ...a, isDefault: false } : a));
    const updated = [newAddress, ...nextAddresses];

    set({ savedAddresses: updated });
    saveAddressesToStorage(updated, currentUserId);
    return newAddress;
  },

  updateAddress: (id, updates) => {
    const { currentUserId, savedAddresses } = get();
    const updated = savedAddresses.map((addr) => {
      if (addr.id !== id) {
        if (updates.isDefault) {
          return { ...addr, isDefault: false };
        }
        return addr;
      }
      return { ...addr, ...updates };
    });

    set({ savedAddresses: updated });
    saveAddressesToStorage(updated, currentUserId);
  },

  deleteAddress: (id) => {
    const { currentUserId, savedAddresses } = get();
    const filtered = savedAddresses.filter((a) => a.id !== id);
    // If deleted address was default, make first remaining default
    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0].isDefault = true;
    }
    set({ savedAddresses: filtered });
    saveAddressesToStorage(filtered, currentUserId);
  },

  setDefaultAddress: (id) => {
    const { currentUserId, savedAddresses } = get();
    const updated = savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    set({ savedAddresses: updated });
    saveAddressesToStorage(updated, currentUserId);
  },

  addPaymentMethod: (input) => {
    const { currentUserId, savedPaymentMethods } = get();
    const isFirst = savedPaymentMethods.length === 0;
    const isDefault = input.isDefault || isFirst;

    const newPayment: UserSavedPaymentMethod = {
      ...input,
      id: `pm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isDefault,
      createdAt: new Date().toISOString(),
    };

    const nextPayments = savedPaymentMethods.map((p) => (isDefault ? { ...p, isDefault: false } : p));
    const updated = [newPayment, ...nextPayments];

    set({ savedPaymentMethods: updated });
    savePaymentsToStorage(updated, currentUserId);
    return newPayment;
  },

  deletePaymentMethod: (id) => {
    const { currentUserId, savedPaymentMethods } = get();
    const filtered = savedPaymentMethods.filter((p) => p.id !== id);
    if (filtered.length > 0 && !filtered.some((p) => p.isDefault)) {
      filtered[0].isDefault = true;
    }
    set({ savedPaymentMethods: filtered });
    savePaymentsToStorage(filtered, currentUserId);
  },

  setDefaultPaymentMethod: (id) => {
    const { currentUserId, savedPaymentMethods } = get();
    const updated = savedPaymentMethods.map((p) => ({
      ...p,
      isDefault: p.id === id,
    }));
    set({ savedPaymentMethods: updated });
    savePaymentsToStorage(updated, currentUserId);
  },
}));
