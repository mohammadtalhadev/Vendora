import type { UserRole } from '../../types/domain';

/**
 * Client-side route permissions. This mirrors the `user_role` enum in
 * `supabase/migrations`, and it is only a navigation guard: the server never reads it.
 * Every request is authorized by RLS policies against `profiles.roles`, and the
 * SECURITY DEFINER RPCs re-check the actor, so a tampered client cannot widen this map.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  guest: ['view:storefront'],
  customer: ['view:storefront', 'checkout', 'view:orders', 'apply:vendor'],
  vendor: ['view:storefront', 'checkout', 'view:orders', 'vendor:dashboard', 'vendor:manage_products', 'vendor:manage_orders'],
  admin: ['view:storefront', 'checkout', 'view:orders', 'apply:vendor', 'vendor:dashboard', 'vendor:manage_products', 'vendor:manage_orders', 'admin:dashboard', 'admin:approve_vendors', 'admin:moderate_products', 'admin:set_commission', 'admin:manage_users', 'rider:deliveries', 'support:disputes'],
  support: ['view:storefront', 'view:orders', 'support:disputes'],
  rider: ['view:storefront', 'rider:deliveries'],
};

export function hasPermission(roles: UserRole[], permission: string): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function hasAnyRole(roles: UserRole[], required: UserRole[]): boolean {
  if (required.length === 0) return true;
  return required.some((role) => roles.includes(role));
}
