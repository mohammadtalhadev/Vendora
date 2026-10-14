import { supabase } from '../../../lib/supabase';

/**
 * Gift cards, loyalty points and referrals — the client half of Batch 39.
 * Every write goes through a SECURITY DEFINER RPC in
 * `20261015000000_vendora_rewards_giftcards.sql`; there are no direct table
 * writes from here, because balances and ledgers are the database's job.
 */

export interface PurchasedGiftCard {
  id: string;
  code: string;
  balance: number;
  expiresAt: string;
}

export interface GiftCardCheck {
  found: boolean;
  balance?: number;
  status?: string;
  expiresAt?: string;
}

export interface MyGiftCard {
  id: string;
  codeLast4: string;
  recipientEmail: string;
  message: string | null;
  initialAmount: number;
  balance: number;
  status: 'active' | 'depleted' | 'void';
  expiresAt: string;
  createdAt: string;
}

export interface GiftCardTransaction {
  id: string;
  cardId: string;
  codeLast4: string;
  kind: 'purchase' | 'apply';
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  createdAt: string;
}

export interface MyGiftCards {
  cards: MyGiftCard[];
  transactions: GiftCardTransaction[];
}

export interface ApplyGiftCardResult {
  applied: number;
  amountDue: number;
  giftCardAmount: number;
  total: number;
}

export interface LoyaltyTransaction {
  id: string;
  kind: 'earn' | 'redeem' | 'referral';
  points: number;
  ref: string | null;
  createdAt: string;
}

export interface MyRewards {
  points: number;
  lifetimeEarned: number;
  referralCode: string | null;
  referralsRewarded: number;
  referralsPending: number;
  recentTransactions: LoyaltyTransaction[];
}

export interface RedeemResult {
  code: string;
  value: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const str = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

/**
 * Buys a gift card. The raw code comes back exactly once, in this response;
 * the database keeps only its hash and last four digits.
 */
export async function purchaseGiftCard(input: {
  recipientEmail: string;
  amount: number;
  message?: string;
}): Promise<PurchasedGiftCard> {
  const { data, error } = await supabase.rpc('purchase_gift_card', {
    p_recipient_email: input.recipientEmail,
    p_amount: input.amount,
    p_message: input.message ?? null,
  });
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  return {
    id: str(row.id),
    code: str(row.code),
    balance: num(row.balance),
    expiresAt: str(row.expiresAt),
  };
}

export async function checkGiftCard(code: string): Promise<GiftCardCheck> {
  const { data, error } = await supabase.rpc('check_gift_card', { p_code: code });
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  if (row.found !== true) return { found: false };
  return {
    found: true,
    balance: num(row.balance),
    status: str(row.status),
    expiresAt: str(row.expiresAt),
  };
}

export async function fetchMyGiftCards(): Promise<MyGiftCards> {
  const { data, error } = await supabase.rpc('get_my_gift_cards');
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  const cards = Array.isArray(row.cards) ? row.cards : [];
  const transactions = Array.isArray(row.transactions) ? row.transactions : [];
  return {
    cards: cards.map((raw) => {
      const card = asRecord(raw);
      return {
        id: str(card.id),
        codeLast4: str(card.codeLast4),
        recipientEmail: str(card.recipientEmail),
        message: card.message === null || card.message === undefined ? null : str(card.message),
        initialAmount: num(card.initialAmount),
        balance: num(card.balance),
        status: (str(card.status) || 'active') as MyGiftCard['status'],
        expiresAt: str(card.expiresAt),
        createdAt: str(card.createdAt),
      };
    }),
    transactions: transactions.map((raw) => {
      const txn = asRecord(raw);
      return {
        id: str(txn.id),
        cardId: str(txn.cardId),
        codeLast4: str(txn.codeLast4),
        kind: (str(txn.kind) || 'purchase') as GiftCardTransaction['kind'],
        amount: num(txn.amount),
        balanceAfter: num(txn.balanceAfter),
        orderId: txn.orderId === null || txn.orderId === undefined ? null : str(txn.orderId),
        createdAt: str(txn.createdAt),
      };
    }),
  };
}

/** Applies a card to one of the caller's own COD orders; returns what is still due. */
export async function applyGiftCardToOrder(code: string, orderId: string): Promise<ApplyGiftCardResult> {
  const { data, error } = await supabase.rpc('apply_gift_card_to_order', {
    p_code: code,
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  return {
    applied: num(row.applied),
    amountDue: num(row.amountDue),
    giftCardAmount: num(row.giftCardAmount),
    total: num(row.total),
  };
}

export async function fetchMyRewards(): Promise<MyRewards> {
  const { data, error } = await supabase.rpc('get_my_rewards');
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  const recent = Array.isArray(row.recentTransactions) ? row.recentTransactions : [];
  return {
    points: num(row.points),
    lifetimeEarned: num(row.lifetimeEarned),
    referralCode: row.referralCode === null || row.referralCode === undefined ? null : str(row.referralCode),
    referralsRewarded: num(row.referralsRewarded),
    referralsPending: num(row.referralsPending),
    recentTransactions: recent.map((raw) => {
      const txn = asRecord(raw);
      return {
        id: str(txn.id),
        kind: (str(txn.kind) || 'earn') as LoyaltyTransaction['kind'],
        points: num(txn.points),
        ref: txn.ref === null || txn.ref === undefined ? null : str(txn.ref),
        createdAt: str(txn.createdAt),
      };
    }),
  };
}

/** Converts points into a real single-use coupon row in `promotions`. */
export async function redeemLoyaltyPoints(points: number): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('redeem_loyalty_points', { p_points: points });
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  return { code: str(row.code), value: num(row.value) };
}

/** Links the caller to a referrer by code. Returns false for self/duplicate/unknown codes. */
export async function linkReferral(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('link_referral', { p_code: code });
  if (error) throw new Error(error.message);
  return data === true;
}

export function referralLinkFor(code: string): string {
  return `https://vendora-plum.vercel.app/register?ref=${encodeURIComponent(code)}`;
}
