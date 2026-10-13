import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { loadPanelCSS, getPanelCSSForRoute } from '../../lib/css-loader';

/**
 * PanelLayout - Wrapper that loads panel-specific CSS based on current route
 * Automatically loads/unloads CSS when navigating between different panels
 */
export const PanelLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const panelCSS = getPanelCSSForRoute(location.pathname);

    // Load the required panel CSS
    if (panelCSS) {
      loadPanelCSS(panelCSS).catch((err) => {
        console.warn('Failed to load panel CSS:', err);
      });
    }
  }, [location.pathname]);

  return <Outlet />;
};

/**
 * Route-specific layout wrappers that ensure correct panel CSS is loaded
 * Use these as parent route elements for each panel group
 */

// Public/Homepage Layout - loads homepage.css
export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    loadPanelCSS('/homepage.css').catch(console.warn);
  }, [location.pathname]);

  return children ? <>{children}</> : <Outlet />;
};

// Admin Layout - loads admin.css
export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    loadPanelCSS('/admin.css').catch(console.warn);
  }, [location.pathname]);

  return children ? <>{children}</> : <Outlet />;
};

// Vendor Layout - loads vendor.css
export const VendorLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    loadPanelCSS('/vendor.css').catch(console.warn);
  }, [location.pathname]);

  return children ? <>{children}</> : <Outlet />;
};

// Rider Layout - loads rider.css
export const RiderLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    loadPanelCSS('/rider.css').catch(console.warn);
  }, [location.pathname]);

  return children ? <>{children}</> : <Outlet />;
};

// Support Layout - loads support.css
export const SupportLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    loadPanelCSS('/support.css').catch(console.warn);
  }, [location.pathname]);

  return children ? <>{children}</> : <Outlet />;
};

/**
 * Higher-order component to wrap a route element with panel CSS loading
 * Usage: withPanelCSS('admin', <AdminDashboardPage />)
 */
export function withPanelCSS<T extends React.ComponentType<any>>(
  panel: 'admin' | 'vendor' | 'rider' | 'support' | 'homepage',
  Component: T
): React.FC<React.ComponentProps<T>> {
  const PanelComponent: React.FC<React.ComponentProps<T>> = (props) => {
    const location = useLocation();

    useEffect(() => {
      const cssMap: Record<string, string> = {
        admin: '/admin.css',
        vendor: '/vendor.css',
        rider: '/rider.css',
        support: '/support.css',
        homepage: '/homepage.css',
      };
      loadPanelCSS(cssMap[panel]).catch(console.warn);
    }, [location.pathname]);

    return <Component {...props} />;
  };

  PanelComponent.displayName = `withPanelCSS(${Component.displayName || Component.name || 'Component'})`;
  return PanelComponent;
}