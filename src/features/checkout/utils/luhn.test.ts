import { describe, expect, it } from 'vitest';
import {
  detectCardBrand,
  maskCardNumber,
  validateCardLuhn,
  validateExpiry,
} from './luhn';
import {
  TEST_CARD_PRESETS,
  findTestCardByNumber,
  getTestCardById,
} from './test-cards';

describe('luhn utils', () => {
  describe('validateCardLuhn', () => {
    it('returns true for valid Visa card numbers', () => {
      expect(validateCardLuhn('4242 4242 4242 4242')).toBe(true);
      expect(validateCardLuhn('4242424242424242')).toBe(true);
      expect(validateCardLuhn('4242-4242-4242-4242')).toBe(true);
    });

    it('returns true for valid Mastercard numbers', () => {
      expect(validateCardLuhn('5555 5555 5555 4444')).toBe(true);
      expect(validateCardLuhn('5555555555554444')).toBe(true);
      expect(validateCardLuhn('2221 0000 0000 0009')).toBe(true);
    });

    it('returns true for valid 15-digit American Express numbers', () => {
      expect(validateCardLuhn('3782 822463 10005')).toBe(true);
      expect(validateCardLuhn('378282246310005')).toBe(true);
    });

    it('returns true for valid Discover card numbers', () => {
      expect(validateCardLuhn('6011 0000 0000 0004')).toBe(true);
      expect(validateCardLuhn('6011000000000004')).toBe(true);
    });

    it('returns true for valid simulated low-balance failure cards', () => {
      expect(validateCardLuhn('4000 0000 0000 0002')).toBe(true);
    });

    it('returns false for card numbers that fail Luhn checksum', () => {
      expect(validateCardLuhn('4242 4242 4242 4243')).toBe(false);
      expect(validateCardLuhn('5555 5555 5555 4445')).toBe(false);
      expect(validateCardLuhn('3782 822463 10006')).toBe(false);
      expect(validateCardLuhn('6011 0000 0000 0005')).toBe(false);
    });

    it('returns false for invalid inputs, letters, or short strings', () => {
      expect(validateCardLuhn('')).toBe(false);
      expect(validateCardLuhn('1234')).toBe(false);
      expect(validateCardLuhn('4242 abc 4242')).toBe(false);
      expect(validateCardLuhn('not-a-card-number')).toBe(false);
      expect(validateCardLuhn(null as unknown as string)).toBe(false);
      expect(validateCardLuhn(undefined as unknown as string)).toBe(false);
    });
  });

  describe('detectCardBrand', () => {
    it('detects Visa correctly', () => {
      expect(detectCardBrand('4242 4242 4242 4242')).toBe('Visa');
      expect(detectCardBrand('4000000000000002')).toBe('Visa');
    });

    it('detects Mastercard correctly for standard 51-55 and 2221-2720 BIN ranges', () => {
      expect(detectCardBrand('5100 0000 0000 0000')).toBe('Mastercard');
      expect(detectCardBrand('5555 5555 5555 4444')).toBe('Mastercard');
      expect(detectCardBrand('2221 0000 0000 0000')).toBe('Mastercard');
      expect(detectCardBrand('2720 9999 9999 9999')).toBe('Mastercard');
    });

    it('detects American Express correctly', () => {
      expect(detectCardBrand('3400 0000 0000 000')).toBe('Amex');
      expect(detectCardBrand('3782 822463 10005')).toBe('Amex');
    });

    it('detects Discover correctly', () => {
      expect(detectCardBrand('6011 0000 0000 0004')).toBe('Discover');
      expect(detectCardBrand('6500 0000 0000 0000')).toBe('Discover');
      expect(detectCardBrand('6440 0000 0000 0000')).toBe('Discover');
      expect(detectCardBrand('622126 0000000000')).toBe('Discover');
    });

    it('returns Unknown for unsupported brands or malformed input', () => {
      expect(detectCardBrand('1234 5678 9012 3456')).toBe('Unknown');
      expect(detectCardBrand('')).toBe('Unknown');
      expect(detectCardBrand('invalid')).toBe('Unknown');
      expect(detectCardBrand(null as unknown as string)).toBe('Unknown');
    });
  });

  describe('maskCardNumber', () => {
    it('masks a standard 16-digit card number and preserves last 4 digits', () => {
      const result = maskCardNumber('4242 4242 4242 4242');
      expect(result).toEqual({
        brand: 'Visa',
        last4: '4242',
        masked: '•••• •••• •••• 4242',
      });
    });

    it('masks a 15-digit Amex card number properly', () => {
      const result = maskCardNumber('3782 822463 10005');
      expect(result).toEqual({
        brand: 'Amex',
        last4: '0005',
        masked: '•••• •••• •••• 0005',
      });
    });

    it('handles short or empty inputs gracefully', () => {
      expect(maskCardNumber('')).toEqual({
        brand: 'Unknown',
        last4: '',
        masked: '',
      });
      expect(maskCardNumber('123')).toEqual({
        brand: 'Unknown',
        last4: '123',
        masked: '123',
      });
      expect(maskCardNumber('invalid-card')).toEqual({
        brand: 'Unknown',
        last4: '',
        masked: '',
      });
    });
  });

  describe('validateExpiry', () => {
    const fixedNow = new Date(2026, 9, 15); // October 15, 2026

    it('returns true for future expiration dates', () => {
      expect(validateExpiry('12', '28', fixedNow)).toBe(true);
      expect(validateExpiry('11', '2026', fixedNow)).toBe(true);
      expect(validateExpiry('01', '30', fixedNow)).toBe(true);
    });

    it('returns true for the current month in current year (expires at end of month)', () => {
      expect(validateExpiry('10', '26', fixedNow)).toBe(true);
      expect(validateExpiry('10', '2026', fixedNow)).toBe(true);
    });

    it('returns false for past years', () => {
      expect(validateExpiry('12', '25', fixedNow)).toBe(false);
      expect(validateExpiry('12', '2024', fixedNow)).toBe(false);
    });

    it('returns false for past months in current year', () => {
      expect(validateExpiry('09', '26', fixedNow)).toBe(false);
      expect(validateExpiry('01', '2026', fixedNow)).toBe(false);
    });

    it('returns false for invalid month numbers', () => {
      expect(validateExpiry('0', '28', fixedNow)).toBe(false);
      expect(validateExpiry('00', '28', fixedNow)).toBe(false);
      expect(validateExpiry('13', '28', fixedNow)).toBe(false);
      expect(validateExpiry('99', '28', fixedNow)).toBe(false);
      expect(validateExpiry('-1', '28', fixedNow)).toBe(false);
    });

    it('returns false for malformed or non-numeric strings', () => {
      expect(validateExpiry('ab', '28', fixedNow)).toBe(false);
      expect(validateExpiry('10', 'cd', fixedNow)).toBe(false);
      expect(validateExpiry('', '28', fixedNow)).toBe(false);
      expect(validateExpiry('10', '', fixedNow)).toBe(false);
      expect(validateExpiry('10', '202', fixedNow)).toBe(false); // 3 digits
    });

    it('returns false for expiration dates unrealistically far in the future', () => {
      expect(validateExpiry('12', '60', fixedNow)).toBe(false);
      expect(validateExpiry('12', '2060', fixedNow)).toBe(false);
    });
  });

  describe('test cards engine', () => {
    it('contains all required preset configurations', () => {
      const validVisa = getTestCardById('valid-visa');
      const validMastercard = getTestCardById('valid-mastercard');
      const lowBalance = getTestCardById('low-balance');
      const invalidCard = getTestCardById('invalid-card');

      expect(validVisa).toBeDefined();
      expect(validMastercard).toBeDefined();
      expect(lowBalance).toBeDefined();
      expect(invalidCard).toBeDefined();

      expect(validVisa?.expectedOutcome).toBe('success');
      expect(validMastercard?.expectedOutcome).toBe('success');
      expect(lowBalance?.expectedOutcome).toBe('insufficient_funds');
      expect(invalidCard?.expectedOutcome).toBe('invalid_card');
    });

    it('ensures valid presets pass Luhn check and invalid preset fails Luhn check', () => {
      for (const card of TEST_CARD_PRESETS) {
        const passesLuhn = validateCardLuhn(card.cardNumber);
        if (card.expectedOutcome === 'invalid_card') {
          expect(passesLuhn).toBe(false);
        } else {
          expect(passesLuhn).toBe(true);
        }
        expect(detectCardBrand(card.cardNumber)).toBe(card.brand);
      }
    });

    it('finds test card by formatted or raw card number', () => {
      const foundWithSpaces = findTestCardByNumber('4242 4242 4242 4242');
      const foundRaw = findTestCardByNumber('4242424242424242');
      expect(foundWithSpaces?.id).toBe('valid-visa');
      expect(foundRaw?.id).toBe('valid-visa');

      expect(findTestCardByNumber('9999 9999 9999 9999')).toBeUndefined();
    });
  });
});
