import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../../types/domain';
import {
  canAccessPath,
  getAutoWorkspace,
  getDestinations,
  getLastWorkspace,
  landingPath,
  resolvePostLoginLanding,
  setAutoWorkspace,
  setLastWorkspace,
} from './destinations';

/**
 * The access matrix at unit level: role × entry → landing.
 * The page-level halves of the same matrix live in
 * LoginPage.access.test.tsx and ProtectedRoute.test.tsx.
 */
function makeUser(partial: Partial<User>): User {
  return {
    id: 'u-matrix',
    email: 'matrix@example.com',
    name: 'Matrix User',
    roles: ['customer'],
    vendorStatus: 'none',
    accountStatus: 'active',
    ...partial,
  };
}

const customer = makeUser({});
const vendor = makeUser({ roles: ['customer', 'vendor'], vendorStatus: 'approved' });
const pendingVendor = makeUser({ roles: ['customer', 'vendor'], vendorStatus: 'pending' });
const rejectedVendor = makeUser({ roles: ['customer', 'vendor'], vendorStatus: 'rejected' });
const rider = makeUser({ roles: ['customer', 'rider'] });
const support = makeUser({ roles: ['support'] });
const supportCustomer = makeUser({ roles: ['customer', 'support'] });
const admin = makeUser({ roles: ['customer', 'admin'] });
const multiRole = makeUser({
  roles: ['customer', 'vendor', 'rider', 'support', 'admin'],
  vendorStatus: 'approved',
});
const suspended = makeUser({ roles: ['customer', 'vendor'], vendorStatus: 'approved', accountStatus: 'suspended' });

beforeEach(() => {
  window.localStorage.clear();
});

describe('getDestinations', () => {
  it.each([
    ['customer', customer, ['storefront']],
    ['approved vendor', vendor, ['storefront', 'vendor']],
    ['pending vendor (no console yet)', pendingVendor, ['storefront']],
    ['rejected vendor (no console)', rejectedVendor, ['storefront']],
    ['rider', rider, ['storefront', 'rider']],
    ['support without customer role', support, ['support']],
    ['admin', admin, ['storefront', 'admin']],
    ['multi-role', multiRole, ['storefront', 'vendor', 'rider', 'support', 'admin']],
    ['signed out', null, []],
  ])('%s → %j', (_label, user, expected) => {
    expect(getDestinations(user as User | null).map((d) => d.id)).toEqual(expected);
  });
});

describe('canAccessPath', () => {
  it.each([
    [customer, '/checkout', true],
    [customer, '/account/orders?x=1', true],
    [customer, '/vendor', false],
    [vendor, '/vendor/orders/9', true],
    [pendingVendor, '/vendor', false],
    [rider, '/rider/deliveries', true],
    [support, '/support/tickets', true],
    [admin, '/support/tickets', true], // SupportOnlyRoute admits admins too
    [support, '/admin', false],
    [admin, '/admin/reports', true],
  ])('%j + %s → %s', (user, path, expected) => {
    expect(canAccessPath(user as User, path as string)).toBe(expected);
  });
});

describe('resolvePostLoginLanding — role × entry matrix', () => {
  it.each([
    // Direct login, no redirect, no toggle intent
    ['customer, direct', customer, {}, { kind: 'path', path: '/' }],
    ['approved vendor, direct (multi-destination)', vendor, {}, { kind: 'chooser' }],
    ['pending vendor, direct', pendingVendor, {}, { kind: 'path', path: '/' }],
    ['rider, direct (auto-land)', rider, {}, { kind: 'path', path: '/rider' }],
    ['support, direct (auto-land)', supportCustomer, {}, { kind: 'path', path: '/support' }],
    ['support only, direct', support, {}, { kind: 'path', path: '/support' }],
    ['admin, direct (multi-destination)', admin, {}, { kind: 'chooser' }],
    ['multi-role, direct', multiRole, {}, { kind: 'chooser' }],
    ['suspended account, direct', suspended, {}, { kind: 'blocked' }],
    // Workspace deep links (redirect present)
    ['customer, deep link into own space', customer, { redirect: '/account/orders?status=packed#row-5' }, { kind: 'path', path: '/account/orders?status=packed#row-5' }],
    ['vendor, workspace link', vendor, { redirect: '/vendor' }, { kind: 'path', path: '/vendor' }],
    ['vendor, workspace deep link', vendor, { redirect: '/vendor/orders?status=packed' }, { kind: 'path', path: '/vendor/orders?status=packed' }],
    ['pending vendor, workspace link', pendingVendor, { redirect: '/vendor' }, { kind: 'seller-status' }],
    ['rejected vendor, workspace deep link', rejectedVendor, { redirect: '/vendor/products' }, { kind: 'seller-status' }],
    ['rider, workspace link', rider, { redirect: '/rider' }, { kind: 'path', path: '/rider' }],
    ['admin, staff deep link via customer login', admin, { redirect: '/admin/orders' }, { kind: 'path', path: '/admin/orders' }],
    // Wrong-role links: a dead end, never a loop
    ['customer, wrong-role /vendor link', customer, { redirect: '/vendor' }, { kind: 'no-access', target: '/vendor' }],
    ['customer, wrong-role /admin link', customer, { redirect: '/admin' }, { kind: 'no-access', target: '/admin' }],
    ['support, wrong-role /admin link', support, { redirect: '/admin' }, { kind: 'no-access', target: '/admin' }],
    ['rider, wrong-role /support link', rider, { redirect: '/support' }, { kind: 'no-access', target: '/support' }],
    // Hostile redirects fall back to the account's normal landing
    ['customer, hostile // redirect', customer, { redirect: '//evil.com' }, { kind: 'path', path: '/' }],
    ['customer, hostile absolute redirect', customer, { redirect: 'https://evil.com/phish' }, { kind: 'path', path: '/' }],
    ['vendor, hostile redirect', vendor, { redirect: '//evil.com' }, { kind: 'chooser' }],
    // The Verified Seller toggle is an explicit destination
    ['approved vendor, seller toggle', vendor, { intent: 'seller' }, { kind: 'path', path: '/vendor' }],
    ['pending vendor, seller toggle', pendingVendor, { intent: 'seller' }, { kind: 'seller-status' }],
    ['customer, seller toggle', customer, { intent: 'seller' }, { kind: 'not-a-seller' }],
    ['redirect beats the toggle', customer, { intent: 'seller', redirect: '/checkout' }, { kind: 'path', path: '/checkout' }],
  ])('%s', (_label, user, options, expected) => {
    expect(resolvePostLoginLanding(user as User, options as object)).toEqual(expected);
  });

  it('remembered workspace wins when the "always" preference is on', () => {
    setLastWorkspace(vendor.id, '/vendor');
    setAutoWorkspace(vendor.id, true);
    expect(resolvePostLoginLanding(vendor, {})).toEqual({ kind: 'path', path: '/vendor' });
  });

  it('remembered workspace is ignored while "always" is off — the chooser shows', () => {
    setLastWorkspace(vendor.id, '/vendor');
    setAutoWorkspace(vendor.id, false);
    expect(resolvePostLoginLanding(vendor, {})).toEqual({ kind: 'chooser' });
  });

  it('a remembered workspace the role no longer covers is not honoured', () => {
    setLastWorkspace(pendingVendor.id, '/vendor');
    setAutoWorkspace(pendingVendor.id, true);
    // Pending vendor has only the storefront destination left.
    expect(resolvePostLoginLanding(pendingVendor, {})).toEqual({ kind: 'path', path: '/' });
  });

  it('last-workspace storage round-trips per user and validates paths', () => {
    setLastWorkspace('u-a', '/rider');
    expect(getLastWorkspace('u-a')).toBe('/rider');
    expect(getLastWorkspace('u-b')).toBeNull();
    setLastWorkspace('u-a', 'https://evil.com');
    expect(getLastWorkspace('u-a')).toBe('/rider'); // invalid write ignored
    expect(getAutoWorkspace('u-a')).toBe(false);
    setAutoWorkspace('u-a', true);
    expect(getAutoWorkspace('u-a')).toBe(true);
  });
});

describe('landingPath', () => {
  it.each([
    [{ kind: 'path', path: '/vendor' } as const, '/vendor'],
    [{ kind: 'chooser' } as const, '/choose-workspace'],
    [{ kind: 'no-access', target: '/vendor' } as const, '/no-access?target=%2Fvendor'],
    [{ kind: 'seller-status' } as const, '/seller-status'],
    [{ kind: 'blocked' } as const, '/account-blocked'],
    [{ kind: 'not-a-seller' } as const, ''],
  ])('%j → %s', (decision, expected) => {
    expect(landingPath(decision)).toBe(expected);
  });
});
