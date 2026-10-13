/**
 * The customer's own address book and saved payment methods, as the screens use them.
 * These camelCase shapes are what the deleted localStorage account store exposed, so the pages
 * keep their rendering; what changed is where the rows live - `user_addresses` and
 * `user_payment_methods` in Postgres, read and written under RLS - instead of a
 * localStorage seed that handed every account a stranger's addresses and cards.
 */

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

/** What a save-address form hands the API: everything but the server-minted facts. */
export type NewAddressInput = Omit<UserSavedAddress, 'id' | 'createdAt'>;

/** A partial edit of a saved address; `isDefault: true` moves the default to this row. */
export type AddressUpdates = Partial<NewAddressInput>;

/**
 * A saved payment method is display metadata only: brand, cardholder, last four and
 * expiry - the facts a "saved card" tile renders. There is deliberately no field here
 * that could hold a full card number or CVV; real charging stays in the checkout flow.
 */
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

/** What a save-payment form hands the API: metadata only, never a card number. */
export type NewPaymentMethodInput = Omit<UserSavedPaymentMethod, 'id' | 'createdAt'>;
