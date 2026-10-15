import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { hasPermission } from '../../features/auth/rbac';
import { isAccountBlocked } from '../../features/auth/api/destinations';
import type { UserRole } from '../../types/domain';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  /** Roles allowed to access this route */
  allowedRoles?: UserRole[];
  /** Permissions required (alternative to roles) */
  requiredPermissions?: string[];
  /** Redirect path if not authorized */
  fallbackPath?: string;
  /**
   * Sign-in page unauthenticated visitors are sent to (the full current
   * path — pathname, query and hash — is carried along as ?redirect=, so a
   * deep link survives the sign-in round trip). Defaults to the customer
   * /login; the admin workspace passes /admin/login so staff never land on
   * the shopper page.
   */
  loginPath?: string;
  /**
   * Where an authenticated user who lacks the required role is sent, when
   * the workspace owns a clearer denial than the generic /403 — the admin
   * workspace sends them to /admin/login?denied=1, whose page explains that
   * the account has no staff access.
   */
  deniedPath?: string;
  /** Show loading while checking auth */
  showLoading?: boolean;
}

/**
 * Route wrapper that enforces role/permission-based access control
 */
export function ProtectedRoute({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallbackPath = '/403',
  loginPath = '/login',
  deniedPath,
  showLoading = true
}: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Verifying access...</span>
        </div>
      </div>
    );
  }

  // Not authenticated — carry the FULL path (query + hash included) so the
  // page the visitor actually wanted is the page sign-in returns them to.
  if (!user) {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(fullPath)}`} replace />;
  }

  // A suspended/banned account reaches no workspace at all: every guarded
  // route lands it on the blocked page, which is itself unguarded (and
  // offers sign-out), so this can never loop.
  if (isAccountBlocked(user)) {
    return <Navigate to="/account-blocked" replace />;
  }

  // Check roles
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      return <Navigate to={deniedPath ?? fallbackPath} replace />;
    }
  }

  // If vendor workspace is requested and role is vendor, verify seller is
  // approved. A pending/rejected/suspended seller lands on the dedicated
  // status page (Batch 63) — not the marketing/apply page, which reads as
  // "apply again" to someone whose application is already in flight.
  if (allowedRoles.includes('vendor') && user.roles.includes('vendor') && user.vendorStatus !== 'approved') {
    return <Navigate to="/seller-status" replace />;
  }

  // Check permissions (if using permission-based access)
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.every((perm) => hasPermission(user.roles, perm));

    if (!hasRequiredPermission) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Convenience components for common role requirements
 */
export const AdminOnlyRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['admin']} {...props} />;

export const VendorOnlyRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['vendor']} {...props} />;

export const SupportOnlyRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['support', 'admin']} {...props} />;

export const RiderOnlyRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['rider']} {...props} />;

export const CustomerOnlyRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin']} {...props} />;

export const AuthenticatedRoute = (props: Omit<ProtectedRouteProps, 'allowedRoles'>) => 
  <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'support', 'rider']} {...props} />;

/**
 * Hook to check if current user can access a route
 */
export function useRouteAccess(allowedRoles: UserRole[] = [], _requiredPermissions: string[] = []) {
  const { user, hasRole } = useAuth();
  
  if (!user) return { canAccess: false, reason: 'not_authenticated' };
  
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) return { canAccess: false, reason: 'insufficient_role' };
  }
  
  // Permission check would go here
  
  return { canAccess: true, reason: 'authorized' };
}