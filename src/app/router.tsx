import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';

// Core Immediate Landing Pages
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';

// Lazy Loaded Routes for Performance & Code Splitting (PRD Section 12 & 14)
const VendorStorefrontPage = lazy(() =>
  import('../pages/VendorStorefrontPage').then((m) => ({ default: m.VendorStorefrontPage })),
);
const CheckoutPage = lazy(() =>
  import('../pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const OrdersPage = lazy(() =>
  import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const OrderDetailPage = lazy(() =>
  import('../pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const InvoicePage = lazy(() =>
  import('../pages/InvoicePage').then((m) => ({ default: m.InvoicePage })),
);
const DownloadsPage = lazy(() =>
  import('../pages/DownloadsPage').then((m) => ({ default: m.DownloadsPage })),
);
const ComparePage = lazy(() =>
  import('../pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const WishlistPage = lazy(() =>
  import('../pages/WishlistPage').then((m) => ({ default: m.WishlistPage })),
);
const NotificationsPage = lazy(() =>
  import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const BecomeSellerPage = lazy(() =>
  import('../pages/BecomeSellerPage').then((m) => ({ default: m.BecomeSellerPage })),
);
const AccountProfilePage = lazy(() =>
  import('../pages/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage })),
);
const CustomerDisputesPage = lazy(() =>
  import('../pages/CustomerDisputesPage').then((m) => ({ default: m.CustomerDisputesPage })),
);
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForbiddenPage = lazy(() =>
  import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })),
);

// Vendor Workspace Lazy Pages
const VendorDashboardPage = lazy(() =>
  import('../pages/VendorDashboardPage').then((m) => ({ default: m.VendorDashboardPage })),
);
const VendorOrdersPage = lazy(() =>
  import('../pages/VendorOrdersPage').then((m) => ({ default: m.VendorOrdersPage })),
);
const VendorOrderDetailPage = lazy(() =>
  import('../pages/VendorOrderDetailPage').then((m) => ({ default: m.VendorOrderDetailPage })),
);
const VendorInventoryPage = lazy(() =>
  import('../pages/VendorInventoryPage').then((m) => ({ default: m.VendorInventoryPage })),
);
const VendorProductsPage = lazy(() =>
  import('../pages/VendorProductsPage').then((m) => ({ default: m.VendorProductsPage })),
);
const VendorAddProductPage = lazy(() =>
  import('../pages/VendorAddProductPage').then((m) => ({ default: m.VendorAddProductPage })),
);
const VendorReturnsPage = lazy(() =>
  import('../pages/VendorReturnsPage').then((m) => ({ default: m.VendorReturnsPage })),
);
const VendorEarningsPage = lazy(() =>
  import('../pages/VendorEarningsPage').then((m) => ({ default: m.VendorEarningsPage })),
);
const VendorPayoutsPage = lazy(() =>
  import('../pages/VendorPayoutsPage').then((m) => ({ default: m.VendorPayoutsPage })),
);
const VendorPromotionsPage = lazy(() =>
  import('../pages/VendorPromotionsPage').then((m) => ({ default: m.VendorPromotionsPage })),
);
const VendorMessagesPage = lazy(() =>
  import('../pages/VendorMessagesPage').then((m) => ({ default: m.VendorMessagesPage })),
);
const VendorReviewsPage = lazy(() =>
  import('../pages/VendorReviewsPage').then((m) => ({ default: m.VendorReviewsPage })),
);
const VendorSettingsPage = lazy(() =>
  import('../pages/VendorSettingsPage').then((m) => ({ default: m.VendorSettingsPage })),
);
const VendorSupportPage = lazy(() =>
  import('../pages/VendorSupportPage').then((m) => ({ default: m.VendorSupportPage })),
);
const VendorMediaPage = lazy(() =>
  import('../pages/VendorMediaPage').then((m) => ({ default: m.VendorMediaPage })),
);
const VendorProfilePage = lazy(() =>
  import('../pages/VendorProfilePage').then((m) => ({ default: m.VendorProfilePage })),
);
const VendorShippingSettingsPage = lazy(() =>
  import('../pages/VendorShippingSettingsPage').then((m) => ({ default: m.VendorShippingSettingsPage })),
);
const VendorImportExportPage = lazy(() =>
  import('../pages/VendorImportExportPage').then((m) => ({ default: m.VendorImportExportPage })),
);
const VendorQAPage = lazy(() =>
  import('../pages/VendorQAPage').then((m) => ({ default: m.VendorQAPage })),
);

// Admin Workspace Lazy Pages (Catmin)
const AdminDashboardPage = lazy(() =>
  import('../pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminVendorsPage = lazy(() =>
  import('../pages/AdminVendorsPage').then((m) => ({ default: m.AdminVendorsPage })),
);
const AdminVendorDetailPage = lazy(() =>
  import('../pages/AdminVendorDetailPage').then((m) => ({ default: m.AdminVendorDetailPage })),
);
const AdminProductsPage = lazy(() =>
  import('../pages/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminAddProductPage = lazy(() =>
  import('../pages/AdminAddProductPage').then((m) => ({ default: m.AdminAddProductPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('../pages/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminCommissionPage = lazy(() =>
  import('../pages/AdminCommissionPage').then((m) => ({ default: m.AdminCommissionPage })),
);
const AdminDisputesPage = lazy(() =>
  import('../pages/AdminDisputesPage').then((m) => ({ default: m.AdminDisputesPage })),
);
const AdminReportsPage = lazy(() =>
  import('../pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
);
const AdminUsersPage = lazy(() =>
  import('../pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminOrdersPage = lazy(() =>
  import('../pages/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminOrderDetailPage = lazy(() =>
  import('../pages/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })),
);
const AdminNotificationsPage = lazy(() =>
  import('../pages/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })),
);
const AdminSettingsPage = lazy(() =>
  import('../pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const AdminMediaPage = lazy(() =>
  import('../pages/AdminMediaPage').then((m) => ({ default: m.AdminMediaPage })),
);
const AdminProfilePage = lazy(() =>
  import('../pages/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage })),
);
const AdminAuditLogsPage = lazy(() =>
  import('../pages/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })),
);
const AdminCMSPage = lazy(() =>
  import('../pages/AdminCMSPage').then((m) => ({ default: m.AdminCMSPage })),
);
const AdminLogisticsPage = lazy(() =>
  import('../pages/AdminLogisticsPage').then((m) => ({ default: m.AdminLogisticsPage })),
);
const AdminCompliancePage = lazy(() =>
  import('../pages/AdminCompliancePage').then((m) => ({ default: m.AdminCompliancePage })),
);
const AdminBrandsPage = lazy(() =>
  import('../pages/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage })),
);

// Rider & Support Workspaces Lazy Pages
const RiderDashboardPage = lazy(() =>
  import('../pages/RiderDashboardPage').then((m) => ({ default: m.RiderDashboardPage })),
);
const SupportDashboardPage = lazy(() =>
  import('../pages/SupportDashboardPage').then((m) => ({ default: m.SupportDashboardPage })),
);

const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0071DC] border-t-transparent mb-3" />
    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Vendora...</span>
  </div>
);

const lazyWrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'products/:productId',
        element: <ProductDetailPage />,
      },
      {
        path: 'vendors/:vendorId',
        element: lazyWrap(<VendorStorefrontPage />),
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: lazyWrap(<CheckoutPage />),
      },
      {
        path: 'orders',
        element: lazyWrap(<OrdersPage />),
      },
      {
        path: 'orders/:orderId',
        element: lazyWrap(<OrderDetailPage />),
      },
      {
        path: 'orders/:orderId/invoice',
        element: lazyWrap(<InvoicePage />),
      },
      {
        path: 'downloads',
        element: lazyWrap(<DownloadsPage />),
      },
      {
        path: 'compare',
        element: lazyWrap(<ComparePage />),
      },
      {
        path: 'wishlist',
        element: lazyWrap(<WishlistPage />),
      },
      {
        path: 'notifications',
        element: lazyWrap(<NotificationsPage />),
      },
      {
        path: 'become-a-seller',
        element: lazyWrap(<BecomeSellerPage />),
      },
      {
        path: 'account/profile',
        element: lazyWrap(<AccountProfilePage />),
      },
      {
        path: 'account/addresses',
        element: lazyWrap(<AccountProfilePage />),
      },
      {
        path: 'disputes',
        element: lazyWrap(<CustomerDisputesPage />),
      },
      {
        path: 'disputes/:id',
        element: lazyWrap(<CustomerDisputesPage />),
      },
      {
        path: 'login',
        element: lazyWrap(<LoginPage />),
      },
      {
        path: 'register',
        element: lazyWrap(<RegisterPage />),
      },
      {
        path: '403',
        element: lazyWrap(<ForbiddenPage />),
      },
      {
        path: '*',
        element: (
          <div className="mx-auto max-w-lg px-4 py-20 text-center">
            <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
            <p className="mt-2 text-sm text-slate-500">Page not found</p>
            <a
              href="/"
              className="mt-6 inline-block rounded-full bg-[#FF7A1A] px-6 py-2.5 text-xs font-bold text-white shadow-md"
            >
              Back to Home
            </a>
          </div>
        ),
      },
    ],
  },
  // Vendor Workspace Routes
  {
    path: '/vendor',
    children: [
      {
        index: true,
        element: lazyWrap(<VendorDashboardPage />),
      },
      {
        path: 'orders',
        element: lazyWrap(<VendorOrdersPage />),
      },
      {
        path: 'orders/:id',
        element: lazyWrap(<VendorOrderDetailPage />),
      },
      {
        path: 'inventory',
        element: lazyWrap(<VendorInventoryPage />),
      },
      {
        path: 'products',
        element: lazyWrap(<VendorProductsPage />),
      },
      {
        path: 'products/new',
        element: lazyWrap(<VendorAddProductPage />),
      },
      {
        path: 'products/:id/edit',
        element: lazyWrap(<VendorAddProductPage />),
      },
      {
        path: 'add-product',
        element: lazyWrap(<VendorAddProductPage />),
      },
      {
        path: 'returns',
        element: lazyWrap(<VendorReturnsPage />),
      },
      {
        path: 'earnings',
        element: lazyWrap(<VendorEarningsPage />),
      },
      {
        path: 'payouts',
        element: lazyWrap(<VendorPayoutsPage />),
      },
      {
        path: 'promotions',
        element: lazyWrap(<VendorPromotionsPage />),
      },
      {
        path: 'messages',
        element: lazyWrap(<VendorMessagesPage />),
      },
      {
        path: 'reviews',
        element: lazyWrap(<VendorReviewsPage />),
      },
      {
        path: 'media',
        element: lazyWrap(<VendorMediaPage />),
      },
      {
        path: 'store-settings',
        element: lazyWrap(<VendorSettingsPage />),
      },
      {
        path: 'profile',
        element: lazyWrap(<VendorProfilePage />),
      },
      {
        path: 'account',
        element: <Navigate to="/vendor/profile" replace />,
      },
      {
        path: 'products/import-export',
        element: lazyWrap(<VendorImportExportPage />),
      },
      {
        path: 'shipping-settings',
        element: lazyWrap(<VendorShippingSettingsPage />),
      },
      {
        path: 'qa',
        element: lazyWrap(<VendorQAPage />),
      },
      {
        path: 'support',
        element: lazyWrap(<VendorSupportPage />),
      },
    ],
  },
  // Admin Workspace Routes (Catmin Design System)
  {
    path: '/admin',
    children: [
      {
        index: true,
        element: lazyWrap(<AdminDashboardPage />),
      },
      {
        path: 'vendors',
        element: lazyWrap(<AdminVendorsPage />),
      },
      {
        path: 'vendors/:id',
        element: lazyWrap(<AdminVendorDetailPage />),
      },
      {
        path: 'products',
        element: lazyWrap(<AdminProductsPage />),
      },
      {
        path: 'orders',
        element: lazyWrap(<AdminOrdersPage />),
      },
      {
        path: 'orders/:id',
        element: lazyWrap(<AdminOrderDetailPage />),
      },
      {
        path: 'users',
        element: lazyWrap(<AdminUsersPage />),
      },
      {
        path: 'add-product',
        element: lazyWrap(<AdminAddProductPage />),
      },
      {
        path: 'first-party',
        element: <Navigate to="/admin/add-product" replace />,
      },
      {
        path: 'categories',
        element: lazyWrap(<AdminCategoriesPage />),
      },
      {
        path: 'commission',
        element: lazyWrap(<AdminCommissionPage />),
      },
      {
        path: 'disputes',
        element: lazyWrap(<AdminDisputesPage />),
      },
      {
        path: 'reports',
        element: lazyWrap(<AdminReportsPage />),
      },
      {
        path: 'notifications',
        element: lazyWrap(<AdminNotificationsPage />),
      },
      {
        path: 'settings',
        element: lazyWrap(<AdminSettingsPage />),
      },
      {
        path: 'profile',
        element: lazyWrap(<AdminProfilePage />),
      },
      {
        path: 'account',
        element: <Navigate to="/admin/profile" replace />,
      },
      {
        path: 'media',
        element: lazyWrap(<AdminMediaPage />),
      },
      {
        path: 'files-media',
        element: <Navigate to="/admin/media" replace />,
      },
      {
        path: 'audit-logs',
        element: lazyWrap(<AdminAuditLogsPage />),
      },
      {
        path: 'cms',
        element: lazyWrap(<AdminCMSPage />),
      },
      {
        path: 'logistics',
        element: lazyWrap(<AdminLogisticsPage />),
      },
      {
        path: 'compliance',
        element: lazyWrap(<AdminCompliancePage />),
      },
      {
        path: 'brands',
        element: lazyWrap(<AdminBrandsPage />),
      },
    ],
  },
  // Rider Workspace Routes
  {
    path: '/rider',
    element: lazyWrap(<RiderDashboardPage />),
  },
  {
    path: '/rider/deliveries/:id',
    element: lazyWrap(<RiderDashboardPage />),
  },
  // Support Workspace Routes
  {
    path: '/support',
    element: lazyWrap(<SupportDashboardPage />),
  },
  {
    path: '/support/disputes/:id',
    element: lazyWrap(<SupportDashboardPage />),
  },
]);
