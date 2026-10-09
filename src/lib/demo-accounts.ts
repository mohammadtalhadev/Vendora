import type { User } from '../types/domain';

export type DemoRoleKey = 'customer' | 'newuser' | 'vendor' | 'admin' | 'support' | 'rider';

/**
 * Seeded demo accounts (PRD §4.3). One-click demo personas for QA.
 * Passwords live only in the mock API seed (src/mocks/seed/users.ts); nothing here
 * is a real credential.
 */
export const DEMO_ACCOUNTS: Record<DemoRoleKey, User> = {
  customer: {
    id: 'usr-customer-1',
    email: 'customer@demo.test',
    name: 'Sarah Customer',
    roles: ['customer'],
    vendorStatus: 'none',
  },
  newuser: {
    id: 'usr-newuser-1',
    email: 'newuser@demo.test',
    name: 'Alex Potential Vendor',
    roles: ['customer'],
    vendorStatus: 'none',
  },
  vendor: {
    id: 'usr-vendor-1',
    email: 'vendor@demo.test',
    name: 'Marcus Tech Seller',
    roles: ['customer', 'vendor'],
    vendorStatus: 'approved',
    vendorId: 'vendor-tech-1',
  },
  admin: {
    id: 'usr-admin-1',
    email: 'admin@demo.test',
    name: 'Elena Administrator',
    roles: ['admin', 'customer'],
    vendorStatus: 'none',
  },
  support: {
    id: 'usr-support-1',
    email: 'support@demo.test',
    name: 'Jordan Support Lead',
    roles: ['support'],
    vendorStatus: 'none',
  },
  rider: {
    id: 'usr-rider-1',
    email: 'rider@demo.test',
    name: 'Sam Express Rider',
    roles: ['rider'],
    vendorStatus: 'none',
  },
};

/** Shared simulated password for every seeded demo account. */
export const DEMO_PASSWORD = 'demo1234';

export function findDemoAccountByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return Object.values(DEMO_ACCOUNTS).find((account) => account.email === normalized);
}
