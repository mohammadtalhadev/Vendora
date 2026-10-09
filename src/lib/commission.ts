import type { CommissionConfig } from '../types/domain';

export interface CommissionResult {
  rate: number;
  amount: number;
  netPayout: number;
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  globalDefaultRate: 0.1,
  categoryOverrides: { 'cat-digital': 0.15 },
  vendorOverrides: { 'vendor-tech-1': 0.07 },
};

/**
 * Pure commission resolution engine (PRD §7.4: commission is calculated per
 * sub-order at placement time and frozen on the order).
 *
 * Precedence: platform (100%) > vendor override > category override > global default.
 */
export function calculateCommission(
  config: CommissionConfig,
  vendorId: string,
  categoryId: string,
  subtotal: number,
): CommissionResult {
  if (vendorId === 'platform') {
    // Platform keeps 100% of first-party revenue; there is no vendor payout.
    return { rate: 1.0, amount: subtotal, netPayout: 0 };
  }

  let effectiveRate = config.vendorOverrides[vendorId];

  if (effectiveRate === undefined) {
    effectiveRate = config.categoryOverrides[categoryId];
  }

  if (effectiveRate === undefined) {
    effectiveRate = config.globalDefaultRate;
  }

  const amount = Math.round(subtotal * effectiveRate * 100) / 100;
  const netPayout = Math.round((subtotal - amount) * 100) / 100;

  return { rate: effectiveRate, amount, netPayout };
}
