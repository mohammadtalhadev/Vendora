import type { User } from '../types/domain';

export type DemoRoleKey = 'customer' | 'newuser' | 'vendor' | 'admin' | 'support' | 'rider';

/**
 * The demo personas seeded into the backend (`supabase/seed.sql` creates the auth
 * users, profiles and stores). Signing in as one of them is a real password sign-in
 * against the real RLS policies, so the personas exercise the same access control the
 * production roles get. The ids here match the mock API universe in src/mocks; a
 * session loaded from Supabase carries the database uuid instead.
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

/** Password seeded for every demo persona. */
export const DEMO_PASSWORD = 'demo1234';
