import type { TestCardPreset } from '../types';

/**
 * Standard simulated test card presets for the Vendora checkout sandbox.
 * Includes successful multi-vendor payment presets, failure simulations, and edge cases.
 */
export const TEST_CARD_PRESETS: readonly TestCardPreset[] = [
  {
    id: 'valid-visa',
    label: 'Valid Visa',
    brand: 'Visa',
    cardNumber: '4242 4242 4242 4242',
    cardholderName: 'Jane Doe',
    expiryMonth: '12',
    expiryYear: '28',
    cvv: '123',
    description: 'Standard valid Visa credit card for successful checkout payments',
    expectedOutcome: 'success',
  },
  {
    id: 'valid-mastercard',
    label: 'Valid Mastercard',
    brand: 'Mastercard',
    cardNumber: '5555 5555 5555 4444',
    cardholderName: 'Alex Smith',
    expiryMonth: '11',
    expiryYear: '27',
    cvv: '456',
    description: 'Standard valid Mastercard for multi-vendor split orders',
    expectedOutcome: 'success',
  },
  {
    id: 'low-balance',
    label: 'Low Balance Card (Failure Simulation)',
    brand: 'Visa',
    cardNumber: '4000 0000 0000 0002',
    cardholderName: 'Low Balance Tester',
    expiryMonth: '08',
    expiryYear: '27',
    cvv: '789',
    description: 'Valid Luhn card configured to simulate insufficient funds failure',
    expectedOutcome: 'insufficient_funds',
  },
  {
    id: 'invalid-card',
    label: 'Invalid Card (Checksum Error)',
    brand: 'Visa',
    cardNumber: '4242 4242 4242 4243',
    cardholderName: 'Invalid Tester',
    expiryMonth: '05',
    expiryYear: '28',
    cvv: '000',
    description: 'Card with invalid Luhn checksum to test client-side validation errors',
    expectedOutcome: 'invalid_card',
  },
  {
    id: 'valid-amex',
    label: 'Valid American Express',
    brand: 'Amex',
    cardNumber: '3782 822463 10005',
    cardholderName: 'Morgan Chase',
    expiryMonth: '10',
    expiryYear: '29',
    cvv: '1234',
    description: '15-digit valid American Express card with 4-digit CVV',
    expectedOutcome: 'success',
  },
  {
    id: 'valid-discover',
    label: 'Valid Discover',
    brand: 'Discover',
    cardNumber: '6011 0000 0000 0004',
    cardholderName: 'Chris Taylor',
    expiryMonth: '09',
    expiryYear: '28',
    cvv: '321',
    description: 'Standard 16-digit valid Discover card',
    expectedOutcome: 'success',
  },
] as const;

/**
 * Finds a test card preset by its unique identifier.
 */
export function getTestCardById(id: string): TestCardPreset | undefined {
  return TEST_CARD_PRESETS.find((card) => card.id === id);
}

/**
 * Matches a card number (ignoring spaces and dashes) against available test card presets.
 */
export function findTestCardByNumber(cardNumber: string): TestCardPreset | undefined {
  const normalized = cardNumber.replace(/[\s-]/g, '');
  return TEST_CARD_PRESETS.find(
    (card) => card.cardNumber.replace(/[\s-]/g, '') === normalized,
  );
}
