import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, hasAnyRole, hasPermission } from './rbac';
import type { UserRole } from '../../types/domain';

describe('ROLE_PERMISSIONS', () => {
  it('covers every role the profiles enum can hold', () => {
    const roles: UserRole[] = ['guest', 'customer', 'vendor', 'admin', 'support', 'rider'];
    roles.forEach((role) => expect(ROLE_PERMISSIONS[role]).toBeDefined());
  });

  it('keeps a guest to browsing', () => {
    expect(ROLE_PERMISSIONS.guest).toEqual(['view:storefront']);
    expect(hasPermission(['guest'], 'checkout')).toBe(false);
    expect(hasPermission(['guest'], 'view:orders')).toBe(false);
  });

  it('gives a customer checkout but no seller or staff surface', () => {
    ['checkout', 'view:orders', 'apply:vendor'].forEach((permission) =>
      expect(hasPermission(['customer'], permission)).toBe(true),
    );
    ['vendor:dashboard', 'admin:approve_vendors', 'support:disputes', 'rider:deliveries'].forEach((permission) =>
      expect(hasPermission(['customer'], permission)).toBe(false),
    );
  });

  it('scopes a vendor to their own store', () => {
    ['vendor:dashboard', 'vendor:manage_products', 'vendor:manage_orders'].forEach((permission) =>
      expect(hasPermission(['vendor'], permission)).toBe(true),
    );
    ['admin:approve_vendors', 'admin:moderate_products', 'admin:set_commission'].forEach((permission) =>
      expect(hasPermission(['vendor'], permission)).toBe(false),
    );
  });

  it('grants staff only their own console', () => {
    expect(hasPermission(['support'], 'support:disputes')).toBe(true);
    expect(hasPermission(['support'], 'rider:deliveries')).toBe(false);
    expect(hasPermission(['support'], 'admin:manage_users')).toBe(false);
    expect(hasPermission(['rider'], 'rider:deliveries')).toBe(true);
    expect(hasPermission(['rider'], 'support:disputes')).toBe(false);
  });

  it('makes admin a superset of every other role', () => {
    const otherPermissions = new Set(
      (Object.keys(ROLE_PERMISSIONS) as UserRole[])
        .filter((role) => role !== 'admin')
        .flatMap((role) => ROLE_PERMISSIONS[role]),
    );
    otherPermissions.forEach((permission) => expect(hasPermission(['admin'], permission)).toBe(true));
  });

  it('unions the permissions of a multi-role account', () => {
    expect(hasPermission(['customer', 'rider'], 'checkout')).toBe(true);
    expect(hasPermission(['customer', 'rider'], 'rider:deliveries')).toBe(true);
    expect(hasPermission(['customer', 'vendor'], 'vendor:manage_products')).toBe(true);
    expect(hasPermission(['customer', 'vendor'], 'admin:approve_vendors')).toBe(false);
  });

  it('never resolves a permission the map does not define', () => {
    expect(hasPermission(['admin'], 'admin:delete_users')).toBe(false);
    expect(hasPermission(['vendor'], 'anything')).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('treats an empty requirement as open', () => {
    expect(hasAnyRole(['customer'], [])).toBe(true);
  });

  it('matches on any one of the required roles', () => {
    expect(hasAnyRole(['customer', 'vendor'], ['vendor', 'admin'])).toBe(true);
    expect(hasAnyRole(['customer'], ['vendor', 'admin'])).toBe(false);
  });
});
