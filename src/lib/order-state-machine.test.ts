import { describe, it, expect } from 'vitest';
import {
  canTransitionSubOrder,
  deriveOrderGroupStatus,
} from './order-state-machine';

describe('Order State Machine', () => {
  describe('Physical Sub-Order Transitions', () => {
    it('allows vendor to confirm and pack a placed physical sub-order', () => {
      const confirmCheck = canTransitionSubOrder('placed', 'confirmed', 'physical', 'vendor');
      expect(confirmCheck.allowed).toBe(true);

      const packCheck = canTransitionSubOrder('confirmed', 'packed', 'physical', 'vendor');
      expect(packCheck.allowed).toBe(true);
    });

    it('rejects illegal status jumps (e.g. placed directly to delivered)', () => {
      const invalidJump = canTransitionSubOrder('placed', 'delivered', 'physical', 'vendor');
      expect(invalidJump.allowed).toBe(false);
      expect(invalidJump.reason).toContain('Invalid state transition');
    });

    it('prevents customer from marking an order shipped or delivered', () => {
      const riderStepAsCustomer = canTransitionSubOrder('shipped', 'out_for_delivery', 'physical', 'customer');
      expect(riderStepAsCustomer.allowed).toBe(false);
      expect(riderStepAsCustomer.reason).toContain('Role \'customer\' is not authorized');
    });

    it('allows rider to advance from ready_for_pickup to delivered lifecycle', () => {
      expect(canTransitionSubOrder('ready_for_pickup', 'shipped', 'physical', 'rider').allowed).toBe(true);
      expect(canTransitionSubOrder('shipped', 'out_for_delivery', 'physical', 'rider').allowed).toBe(true);
      expect(canTransitionSubOrder('out_for_delivery', 'delivered', 'physical', 'rider').allowed).toBe(true);
    });

    it('allows customer to cancel before shipment', () => {
      expect(canTransitionSubOrder('placed', 'cancelled', 'physical', 'customer').allowed).toBe(true);
      expect(canTransitionSubOrder('confirmed', 'cancelled', 'physical', 'customer').allowed).toBe(true);
    });

    it('rejects customer cancellation after order is already shipped', () => {
      expect(canTransitionSubOrder('shipped', 'cancelled', 'physical', 'customer').allowed).toBe(false);
    });
  });

  describe('Digital Sub-Order Transitions', () => {
    it('follows placed -> paid -> available lifecycle', () => {
      expect(canTransitionSubOrder('placed', 'paid', 'digital', 'customer').allowed).toBe(true);
      expect(canTransitionSubOrder('paid', 'available', 'digital', 'admin').allowed).toBe(true);
      expect(canTransitionSubOrder('available', 'refunded', 'digital', 'admin').allowed).toBe(true);
    });

    it('rejects physical statuses for digital items', () => {
      const invalid = canTransitionSubOrder('placed', 'shipped', 'digital', 'admin');
      expect(invalid.allowed).toBe(false);
    });
  });

  describe('Order Group Derived Status', () => {
    it('derives completed when all sub-orders are delivered or available', () => {
      expect(deriveOrderGroupStatus(['delivered', 'available'])).toBe('completed');
    });

    it('derives in_transit if any sub-order is currently out for delivery', () => {
      expect(deriveOrderGroupStatus(['out_for_delivery', 'confirmed'])).toBe('in_transit');
    });

    it('derives partially_delivered if one sub-order is delivered and one is still processing', () => {
      expect(deriveOrderGroupStatus(['delivered', 'packed'])).toBe('partially_delivered');
    });

    it('derives cancelled if all sub-orders are cancelled', () => {
      expect(deriveOrderGroupStatus(['cancelled', 'cancelled'])).toBe('cancelled');
    });

    it('derives processing during early stages', () => {
      expect(deriveOrderGroupStatus(['placed', 'confirmed'])).toBe('processing');
    });
  });
});
