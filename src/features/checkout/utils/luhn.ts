import type { CardBrand, MaskedCardSummary } from '../types';

/**
 * Validates a card number using the Luhn checksum algorithm (Mod 10).
 * Handles numbers with or without spaces and hyphens.
 */
export function validateCardLuhn(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  const sanitized = cardNumber.replace(/[\s-]/g, '');

  // Card numbers must consist strictly of digits and have plausible length (8 to 19 digits)
  if (!/^\d{8,19}$/.test(sanitized)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(sanitized.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Detects the payment card brand based on industry-standard IIN/BIN prefix rules.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return 'Unknown';
  }

  const sanitized = cardNumber.replace(/[\s-]/g, '');

  if (!/^\d+$/.test(sanitized)) {
    return 'Unknown';
  }

  // Visa: starts with 4
  if (/^4/.test(sanitized)) {
    return 'Visa';
  }

  // Mastercard: 51-55 or 2221-2720
  if (/^5[1-5]/.test(sanitized)) {
    return 'Mastercard';
  }
  if (sanitized.length >= 4) {
    const first4 = Number.parseInt(sanitized.slice(0, 4), 10);
    if (first4 >= 2221 && first4 <= 2720) {
      return 'Mastercard';
    }
  }

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(sanitized)) {
    return 'Amex';
  }

  // Discover: starts with 6011, 65, 644-649, or 622126-622925
  if (/^(6011|65|64[4-9])/.test(sanitized)) {
    return 'Discover';
  }
  if (sanitized.length >= 6) {
    const first6 = Number.parseInt(sanitized.slice(0, 6), 10);
    if (first6 >= 622126 && first6 <= 622925) {
      return 'Discover';
    }
  }

  return 'Unknown';
}

/**
 * Returns a masked representation of a card number for PCI-compliant receipts and UI display.
 */
export function maskCardNumber(cardNumber: string): MaskedCardSummary {
  const brand = detectCardBrand(cardNumber);
  const sanitized = (cardNumber || '').replace(/[\s-]/g, '');

  if (!sanitized || !/^\d+$/.test(sanitized)) {
    return {
      brand: 'Unknown',
      last4: '',
      masked: '',
    };
  }

  const last4 = sanitized.length >= 4 ? sanitized.slice(-4) : sanitized;
  const masked = sanitized.length >= 4 ? `•••• •••• •••• ${last4}` : sanitized;

  return {
    brand,
    last4,
    masked,
  };
}

/**
 * Validates card expiration month and year against current time.
 * Accepts 2-digit (e.g., '28') or 4-digit (e.g., '2028') years and months 1-12.
 * Card remains valid until the last day of the expiration month.
 */
export function validateExpiry(
  month: string,
  year: string,
  referenceDate: Date = new Date(),
): boolean {
  if (!month || !year || typeof month !== 'string' || typeof year !== 'string') {
    return false;
  }

  const trimmedMonth = month.trim();
  const trimmedYear = year.trim();

  // Validate month format (01-12 or 1-12)
  if (!/^(0?[1-9]|1[0-2])$/.test(trimmedMonth)) {
    return false;
  }

  // Validate year format (2 digits or 4 digits)
  if (!/^\d{2}$|^\d{4}$/.test(trimmedYear)) {
    return false;
  }

  const parsedMonth = Number.parseInt(trimmedMonth, 10);
  const parsedYear =
    trimmedYear.length === 2
      ? 2000 + Number.parseInt(trimmedYear, 10)
      : Number.parseInt(trimmedYear, 10);

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  // In the past
  if (parsedYear < currentYear) {
    return false;
  }

  // In current year, but past month
  if (parsedYear === currentYear && parsedMonth < currentMonth) {
    return false;
  }

  // Prevent unrealistic expiration dates (> 25 years into future)
  if (parsedYear > currentYear + 25) {
    return false;
  }

  return true;
}
