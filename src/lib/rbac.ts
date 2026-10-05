import type { UserRole } from '../types/domain';

export type Permission =
  | 'view:storefront'
  | 'checkout'
  | 'view:orders'
  | 'apply:vendor'
  | 'vendor:dashboard'
  | 'vendor:manage_products'
  | 'vendor:manage_orders'
  | 'admin:dashboard'
  | 'admin:approve_vendors'
  | 'admin:moderate_products'
  | 'admin:set_commission'
  | 'admin:manage_users'
  | 'rider:deliveries'
  | 'support:disputes';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  guest: ['view:storefront'],
  customer: ['view:storefront', 'checkout', 'view:orders', 'apply:vendor'],
  vendor: [
    'view:storefront',
    'checkout',
    'view:orders',
    'vendor:dashboard',
    'vendor:manage_products',
    'vendor:manage_orders',
  ],
  admin: [
    'view:storefront',
    'checkout',
    'view:orders',
    'apply:vendor',
    'vendor:dashboard',
    'vendor:manage_products',
    'vendor:manage_orders',
    'admin:dashboard',
    'admin:approve_vendors',
    'admin:moderate_products',
    'admin:set_commission',
    'admin:manage_users',
    'rider:deliveries',
    'support:disputes',
  ],
  support: ['view:storefront', 'view:orders', 'support:disputes'],
  rider: ['view:storefront', 'rider:deliveries'],
};

/**
 * Checks if a given set of user roles has a specific permission.
 */
export function hasPermission(roles: UserRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}
