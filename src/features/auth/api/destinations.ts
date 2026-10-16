import type { User } from '../../../types/domain';
import { safeRedirect } from '../../../lib/safe-redirect';

/**
 * destinations — the shared workspace model behind the hybrid sign-in flow
 *. One account, several possible workspaces: which ones exist is
 * decided ONLY by the profile the backend authorized (`profiles.roles` +
 * vendor status), never by anything the client claims. The login pages, the
 * workspace chooser and the Switch-workspace menus all read this module so
 * the rules can never drift apart.
 *
 * The localStorage preferences below are a convenience only (land me where
 * I last worked); they grant nothing — every workspace route still enforces
 * its own role guard, and a remembered workspace is honoured only while the
 * profile still carries the role for it.
 */

export type WorkspaceId = 'storefront' | 'vendor' | 'rider' | 'support' | 'admin';

export interface WorkspaceDestination {
  id: WorkspaceId;
  label: string;
  description: string;
  path: string;
}

const CATALOG: Record<WorkspaceId, WorkspaceDestination> = {
  storefront: {
    id: 'storefront',
    label: 'Storefront',
    description: 'Shop the marketplace, track orders and manage your account.',
    path: '/',
  },
  vendor: {
    id: 'vendor',
    label: 'Seller Console',
    description: 'Manage your store, products, orders and payouts.',
    path: '/vendor',
  },
  rider: {
    id: 'rider',
    label: 'Rider Board',
    description: 'See your assigned deliveries and confirm drop-offs.',
    path: '/rider',
  },
  support: {
    id: 'support',
    label: 'Support Console',
    description: 'Work the ticket and dispute queues.',
    path: '/support',
  },
  admin: {
    id: 'admin',
    label: 'Admin Console',
    description: 'Run the marketplace: moderation, finance and settings.',
    path: '/admin',
  },
};

const ORDER: WorkspaceId[] = ['storefront', 'vendor', 'rider', 'support', 'admin'];

/** Accounts the platform has switched off: no workspace is reachable. */
export function isAccountBlocked(user: User | null | undefined): boolean {
  return user?.accountStatus === 'suspended' || user?.accountStatus === 'banned';
}

/**
 * The destinations this account may enter. The storefront comes with the
 * customer role; the seller console additionally requires an APPROVED
 * vendor status (a pending or rejected application is not a destination —
 * it has its own status page).
 */
export function getDestinations(user: User | null | undefined): WorkspaceDestination[] {
  if (!user) return [];
  const roles = user.roles ?? [];
  const allowed = new Set<WorkspaceId>();
  if (roles.includes('customer')) allowed.add('storefront');
  if (roles.includes('vendor') && user.vendorStatus === 'approved') allowed.add('vendor');
  if (roles.includes('rider')) allowed.add('rider');
  if (roles.includes('support')) allowed.add('support');
  if (roles.includes('admin')) allowed.add('admin');
  return ORDER.filter((id) => allowed.has(id)).map((id) => CATALOG[id]);
}

/** Which workspace a path belongs to; null = the public/account space. */
export function workspaceIdForPath(path: string): WorkspaceId | null {
  const clean = path.split(/[?#]/)[0];
  if (clean === '/vendor' || clean.startsWith('/vendor/')) return 'vendor';
  if (clean === '/rider' || clean.startsWith('/rider/')) return 'rider';
  if (clean === '/support' || clean.startsWith('/support/')) return 'support';
  if (clean === '/admin' || clean.startsWith('/admin/')) return 'admin';
  return null;
}

/**
 * Whether this account may continue to `path` after sign-in. Public and
 * account-space paths are open to any signed-in user; workspace paths need
 * the matching destination. The support console also admits admins, exactly
 * like its route guard (SupportOnlyRoute).
 */
export function canAccessPath(user: User, path: string): boolean {
  const workspace = workspaceIdForPath(path);
  if (!workspace) return true;
  const ids = getDestinations(user).map((d) => d.id);
  if (workspace === 'support') return ids.includes('support') || ids.includes('admin');
  return ids.includes(workspace);
}

// ---------------------------------------------------------------------------
// Remembered workspace (convenience only — see the module header)
// ---------------------------------------------------------------------------

const lastKey = (userId: string) => `vendora:last-workspace:${userId}`;
const autoKey = (userId: string) => `vendora:auto-workspace:${userId}`;

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private browsing / storage disabled: the preference simply won't stick.
  }
}

export function getLastWorkspace(userId: string): string | null {
  const raw = readStore(lastKey(userId));
  if (!raw) return null;
  const known = ORDER.map((id) => CATALOG[id].path);
  return known.includes(raw) ? raw : null;
}

export function setLastWorkspace(userId: string, path: string): void {
  const known = ORDER.map((id) => CATALOG[id].path);
  if (known.includes(path)) writeStore(lastKey(userId), path);
}

export function getAutoWorkspace(userId: string): boolean {
  return readStore(autoKey(userId)) === '1';
}

export function setAutoWorkspace(userId: string, on: boolean): void {
  writeStore(autoKey(userId), on ? '1' : '0');
}

// ---------------------------------------------------------------------------
// Post-login precedence (owner-approved order,)
// ---------------------------------------------------------------------------

export type LandingDecision =
  | { kind: 'path'; path: string }
  | { kind: 'chooser' }
  | { kind: 'no-access'; target: string }
  | { kind: 'seller-status' }
  | { kind: 'blocked' }
  | { kind: 'not-a-seller' };

export interface LandingOptions {
  /** Raw `?redirect=` value from the URL, if any. Judged through safeRedirect. */
  redirect?: string | null;
  /**
   * The path the visitor explicitly picked on the sign-in form ('seller' =
   * the Verified Seller toggle). Null when no form intent exists — e.g. an
   * already signed-in visitor opening /login.
   */
  intent?: 'buyer' | 'seller' | null;
}

/**
 * Where a freshly authenticated (or already authenticated) user lands.
 *
 * 1. A blocked account lands on the blocked page, always.
 * 2. A valid redirect the account's roles cover wins, with no chooser. A
 *    redirect into a workspace the account cannot enter is a dead end with
 *    an explanation (/no-access) — never a bounce back to a guard, which
 *    would loop. A pending/rejected seller aiming at /vendor lands on the
 *    seller status page instead.
 * 3. The seller toggle is an explicit destination: approved sellers go to
 *    their console; pending/rejected ones to the status page; accounts with
 *    no vendor role at all are 'not-a-seller' (the caller keeps its refusal).
 * 4. A single-destination account goes straight there. Rider- and
 * support-only workspace accounts keep their auto-landing.
 * 5. A multi-destination account goes to its remembered workspace when the
 *    "always" preference is on and the role still covers it — otherwise to
 *    the workspace chooser.
 */
export function resolvePostLoginLanding(user: User, options: LandingOptions = {}): LandingDecision {
  if (isAccountBlocked(user)) return { kind: 'blocked' };

  const redirectRaw = options.redirect ?? null;
  const redirect = redirectRaw && redirectRaw !== '/' ? safeRedirect(redirectRaw, '') : '';
  if (redirect) {
    if (
      workspaceIdForPath(redirect) === 'vendor' &&
      user.roles.includes('vendor') &&
      user.vendorStatus !== 'approved'
    ) {
      return { kind: 'seller-status' };
    }
    if (canAccessPath(user, redirect)) return { kind: 'path', path: redirect };
    return { kind: 'no-access', target: redirect };
  }

  if (options.intent === 'seller') {
    if (!user.roles.includes('vendor')) return { kind: 'not-a-seller' };
    return user.vendorStatus === 'approved'
      ? { kind: 'path', path: CATALOG.vendor.path }
      : { kind: 'seller-status' };
  }

  const destinations = getDestinations(user);
  if (destinations.length <= 1) {
    return { kind: 'path', path: destinations[0]?.path ?? CATALOG.storefront.path };
  }

  const workspaces = destinations.filter((d) => d.id !== 'storefront');
  if (workspaces.length === 1 && (workspaces[0].id === 'rider' || workspaces[0].id === 'support')) {
    return { kind: 'path', path: workspaces[0].path };
  }

  const last = getLastWorkspace(user.id);
  if (last && getAutoWorkspace(user.id) && destinations.some((d) => d.path === last)) {
    return { kind: 'path', path: last };
  }
  return { kind: 'chooser' };
}

/** The concrete route a decision navigates to ('' for caller-handled kinds). */
export function landingPath(decision: LandingDecision): string {
  switch (decision.kind) {
    case 'path':
      return decision.path;
    case 'chooser':
      return '/choose-workspace';
    case 'no-access':
      return `/no-access?target=${encodeURIComponent(decision.target)}`;
    case 'seller-status':
      return '/seller-status';
    case 'blocked':
      return '/account-blocked';
    case 'not-a-seller':
      return '';
  }
}
