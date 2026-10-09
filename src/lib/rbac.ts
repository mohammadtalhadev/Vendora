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

/**
 * Checks if a given set of user roles includes a role.
 * The 'guest' role matches an empty role list (an unauthenticated visitor).
 */
export function hasRole(roles: UserRole[], role: UserRole): boolean {
  if (role === 'guest') return roles.length === 0;
  return roles.includes(role);
}

/** True when at least one of the required roles is held. */
export function hasAnyRole(roles: UserRole[], required: UserRole[]): boolean {
  if (required.length === 0) return true;
  return required.some((role) => (role === 'guest' ? roles.length === 0 : roles.includes(role)));
}

/** Role priority used for display badges and default workspace routing. */
const ROLE_PRIORITY: UserRole[] = ['admin', 'support', 'rider', 'vendor', 'customer', 'guest'];

/** Highest-priority role in a role list (used for badge labels, not authorization). */
export function getPrimaryRole(roles: UserRole[]): UserRole {
  if (roles.length === 0) return 'guest';
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return 'customer';
}

/** Routes each role lands on after login (null = customer storefront). */
const WORKSPACE_ROUTES: Partial<Record<UserRole, string>> = {
  admin: '/admin',
  support: '/support',
  rider: '/rider',
  vendor: '/vendor',
};

/** Default post-login destination for a role set. */
export function getDefaultWorkspace(roles: UserRole[]): string | null {
  const primary = getPrimaryRole(roles);
  return WORKSPACE_ROUTES[primary] ?? null;
}
