import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { AccountLayout } from '../components/layout/AccountLayout';
import { PublicLayout, AdminLayout, VendorLayout, RiderLayout, SupportLayout } from '../components/layout/PanelLayout';
import { RouteErrorScreen } from '../components/common/RouteErrorScreen';
import { GridSkeleton, Skeleton } from '../components/common/QueryState';
import { isChunkLoadError, reloadOnceForNewVersion } from '../lib/chunk-recovery';
import { 
  AdminOnlyRoute, 
  VendorOnlyRoute, 
  SupportOnlyRoute, 
  RiderOnlyRoute, 
} from '../components/auth/ProtectedRoute';

// Core Immediate Landing Pages
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';

// Lazy Loaded Routes for Performance & Code Splitting (PRD Section 12 & 14)
const VendorStorefrontPage = lazyWithRetry(() =>
  import('../pages/VendorStorefrontPage').then((m) => ({ default: m.VendorStorefrontPage })),
);
const CheckoutPage = lazyWithRetry(() =>
  import('../pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const OrdersPage = lazyWithRetry(() =>
  import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const OrderDetailPage = lazyWithRetry(() =>
  import('../pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const InvoicePage = lazyWithRetry(() =>
  import('../pages/InvoicePage').then((m) => ({ default: m.InvoicePage })),
);
const DownloadsPage = lazyWithRetry(() =>
  import('../pages/DownloadsPage').then((m) => ({ default: m.DownloadsPage })),
);
const OrderConfirmationPage = lazyWithRetry(() =>
  import('../pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage })),
);
const AccountReviewsPage = lazyWithRetry(() =>
  import('../pages/AccountReviewsPage').then((m) => ({ default: m.AccountReviewsPage })),
);
const AccountReturnsPage = lazyWithRetry(() =>
  import('../pages/AccountReturnsPage').then((m) => ({ default: m.AccountReturnsPage })),
);
const AccountSettingsPage = lazyWithRetry(() =>
  import('../pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage })),
);
const AccountRewardsPage = lazyWithRetry(() =>
  import('../pages/AccountRewardsPage').then((m) => ({ default: m.AccountRewardsPage })),
);
const GiftCardsPage = lazyWithRetry(() =>
  import('../pages/GiftCardsPage').then((m) => ({ default: m.GiftCardsPage })),
);
const RecentlyViewedPage = lazyWithRetry(() =>
  import('../pages/RecentlyViewedPage').then((m) => ({ default: m.RecentlyViewedPage })),
);
const AccountSupportPage = lazyWithRetry(() =>
  import('../pages/AccountSupportPage').then((m) => ({ default: m.AccountSupportPage })),
);
const ComparePage = lazyWithRetry(() =>
  import('../pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const WishlistPage = lazyWithRetry(() =>
  import('../pages/WishlistPage').then((m) => ({ default: m.WishlistPage })),
);
const NotificationsPage = lazyWithRetry(() =>
  import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const BecomeSellerPage = lazyWithRetry(() =>
  import('../pages/BecomeSellerPage').then((m) => ({ default: m.BecomeSellerPage })),
);
const SellerApplicationPage = lazyWithRetry(() =>
  import('../pages/SellerApplicationPage').then((m) => ({ default: m.SellerApplicationPage })),
);
const AccountProfilePage = lazyWithRetry(() =>
  import('../pages/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage })),
);
const CustomerDisputesPage = lazyWithRetry(() =>
  import('../pages/CustomerDisputesPage').then((m) => ({ default: m.CustomerDisputesPage })),
);
const LoginPage = lazyWithRetry(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const AdminLoginPage = lazyWithRetry(() =>
  import('../pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const RegisterPage = lazyWithRetry(() =>
  import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ResetPasswordPage = lazyWithRetry(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const ForbiddenPage = lazyWithRetry(() =>
  import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })),
);
const ReturnsPage = lazyWithRetry(() =>
  import('../pages/ReturnsPage').then((m) => ({ default: m.ReturnsPage })),
);
const ShippingPolicyPage = lazyWithRetry(() =>
  import('../pages/ShippingPolicyPage').then((m) => ({ default: m.ShippingPolicyPage })),
);
const RefundPolicyPage = lazyWithRetry(() =>
  import('../pages/RefundPolicyPage').then((m) => ({ default: m.RefundPolicyPage })),
);
const PrivacyPolicyPage = lazyWithRetry(() =>
  import('../pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsPage = lazyWithRetry(() =>
  import('../pages/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const AboutPage = lazyWithRetry(() =>
  import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const AffiliatePage = lazyWithRetry(() =>
  import('../pages/AffiliatePage').then((m) => ({ default: m.AffiliatePage })),
);
const SellerFeesPage = lazyWithRetry(() =>
  import('../pages/SellerFeesPage').then((m) => ({ default: m.SellerFeesPage })),
);
const SellerPolicyPage = lazyWithRetry(() =>
  import('../pages/SellerPolicyPage').then((m) => ({ default: m.SellerPolicyPage })),
);
const CouponCentrePage = lazyWithRetry(() =>
  import('../pages/CouponCentrePage').then((m) => ({ default: m.CouponCentrePage })),
);
const CookiePolicyPage = lazyWithRetry(() =>
  import('../pages/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage })),
);
const FAQPage = lazyWithRetry(() =>
  import('../pages/FAQPage').then((m) => ({ default: m.FAQPage })),
);
const ContactPage = lazyWithRetry(() =>
  import('../pages/ContactPage').then((m) => ({ default: m.ContactPage })),
);
const TrackOrderPage = lazyWithRetry(() =>
  import('../pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })),
);
const BrandsPage = lazyWithRetry(() =>
  import('../pages/BrandsPage').then((m) => ({ default: m.BrandsPage })),
);
const DealsPage = lazyWithRetry(() =>
  import('../pages/DealsPage').then((m) => ({ default: m.DealsPage })),
);
const CareersPage = lazyWithRetry(() =>
  import('../pages/CareersPage').then((m) => ({ default: m.CareersPage })),
);
const BlogPage = lazyWithRetry(() =>
  import('../pages/BlogPage').then((m) => ({ default: m.BlogPage })),
);
const CategorySlugRedirect = lazyWithRetry(() =>
  import('../pages/CategorySlugRedirect').then((m) => ({ default: m.CategorySlugRedirect })),
);
const CategoriesPage = lazyWithRetry(() =>
  import('../pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const BrandDetailPage = lazyWithRetry(() =>
  import('../pages/BrandDetailPage').then((m) => ({ default: m.BrandDetailPage })),
);
const BlogPostPage = lazyWithRetry(() =>
  import('../pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })),
);
const NewArrivalsPage = lazyWithRetry(() =>
  import('../pages/NewArrivalsPage').then((m) => ({ default: m.NewArrivalsPage })),
);

// Vendor Workspace Lazy Pages
const VendorDashboardPage = lazyWithRetry(() =>
  import('../pages/VendorDashboardPage').then((m) => ({ default: m.VendorDashboardPage })),
);
const VendorOrdersPage = lazyWithRetry(() =>
  import('../pages/VendorOrdersPage').then((m) => ({ default: m.VendorOrdersPage })),
);
const VendorOrderDetailPage = lazyWithRetry(() =>
  import('../pages/VendorOrderDetailPage').then((m) => ({ default: m.VendorOrderDetailPage })),
);
const VendorInventoryPage = lazyWithRetry(() =>
  import('../pages/VendorInventoryPage').then((m) => ({ default: m.VendorInventoryPage })),
);
const VendorProductsPage = lazyWithRetry(() =>
  import('../pages/VendorProductsPage').then((m) => ({ default: m.VendorProductsPage })),
);
const VendorAddProductPage = lazyWithRetry(() =>
  import('../pages/VendorAddProductPage').then((m) => ({ default: m.VendorAddProductPage })),
);
const VendorReturnsPage = lazyWithRetry(() =>
  import('../pages/VendorReturnsPage').then((m) => ({ default: m.VendorReturnsPage })),
);
const VendorEarningsPage = lazyWithRetry(() =>
  import('../pages/VendorEarningsPage').then((m) => ({ default: m.VendorEarningsPage })),
);
const VendorAnalyticsPage = lazyWithRetry(() =>
  import('../pages/VendorAnalyticsPage').then((m) => ({ default: m.VendorAnalyticsPage })),
);
const VendorPayoutsPage = lazyWithRetry(() =>
  import('../pages/VendorPayoutsPage').then((m) => ({ default: m.VendorPayoutsPage })),
);
const VendorPromotionsPage = lazyWithRetry(() =>
  import('../pages/VendorPromotionsPage').then((m) => ({ default: m.VendorPromotionsPage })),
);
const VendorMessagesPage = lazyWithRetry(() =>
  import('../pages/VendorMessagesPage').then((m) => ({ default: m.VendorMessagesPage })),
);
const VendorReviewsPage = lazyWithRetry(() =>
  import('../pages/VendorReviewsPage').then((m) => ({ default: m.VendorReviewsPage })),
);
const VendorSettingsPage = lazyWithRetry(() =>
  import('../pages/VendorSettingsPage').then((m) => ({ default: m.VendorSettingsPage })),
);
const VendorSupportPage = lazyWithRetry(() =>
  import('../pages/VendorSupportPage').then((m) => ({ default: m.VendorSupportPage })),
);
const VendorMediaPage = lazyWithRetry(() =>
  import('../pages/VendorMediaPage').then((m) => ({ default: m.VendorMediaPage })),
);
const VendorProfilePage = lazyWithRetry(() =>
  import('../pages/VendorProfilePage').then((m) => ({ default: m.VendorProfilePage })),
);
const VendorShippingSettingsPage = lazyWithRetry(() =>
  import('../pages/VendorShippingSettingsPage').then((m) => ({ default: m.VendorShippingSettingsPage })),
);
const VendorImportExportPage = lazyWithRetry(() =>
  import('../pages/VendorImportExportPage').then((m) => ({ default: m.VendorImportExportPage })),
);
const VendorQAPage = lazyWithRetry(() =>
  import('../pages/VendorQAPage').then((m) => ({ default: m.VendorQAPage })),
);

// Admin Workspace Lazy Pages (Catmin)
const AdminDashboardPage = lazyWithRetry(() =>
  import('../pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminVendorsPage = lazyWithRetry(() =>
  import('../pages/AdminVendorsPage').then((m) => ({ default: m.AdminVendorsPage })),
);
const AdminVendorDetailPage = lazyWithRetry(() =>
  import('../pages/AdminVendorDetailPage').then((m) => ({ default: m.AdminVendorDetailPage })),
);
const AdminProductsPage = lazyWithRetry(() =>
  import('../pages/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminAddProductPage = lazyWithRetry(() =>
  import('../pages/AdminAddProductPage').then((m) => ({ default: m.AdminAddProductPage })),
);
const AdminCategoriesPage = lazyWithRetry(() =>
  import('../pages/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminCommissionPage = lazyWithRetry(() =>
  import('../pages/AdminCommissionPage').then((m) => ({ default: m.AdminCommissionPage })),
);
const AdminDisputesPage = lazyWithRetry(() =>
  import('../pages/AdminDisputesPage').then((m) => ({ default: m.AdminDisputesPage })),
);
const AdminPayoutsPage = lazyWithRetry(() =>
  import('../pages/AdminPayoutsPage').then((m) => ({ default: m.AdminPayoutsPage })),
);
const AdminReturnsPage = lazyWithRetry(() =>
  import('../pages/AdminReturnsPage').then((m) => ({ default: m.AdminReturnsPage })),
);
const AdminReportsPage = lazyWithRetry(() =>
  import('../pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
);
const AdminUsersPage = lazyWithRetry(() =>
  import('../pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminReviewsPage = lazyWithRetry(() =>
  import('../pages/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })),
);
const AdminOrdersPage = lazyWithRetry(() =>
  import('../pages/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminOrderDetailPage = lazyWithRetry(() =>
  import('../pages/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })),
);
const AdminNotificationsPage = lazyWithRetry(() =>
  import('../pages/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })),
);
const AdminSettingsPage = lazyWithRetry(() =>
  import('../pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const AdminMediaPage = lazyWithRetry(() =>
  import('../pages/AdminMediaPage').then((m) => ({ default: m.AdminMediaPage })),
);
const AdminProfilePage = lazyWithRetry(() =>
  import('../pages/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage })),
);
const AdminAuditLogsPage = lazyWithRetry(() =>
  import('../pages/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })),
);
const AdminCMSPage = lazyWithRetry(() =>
  import('../pages/AdminCMSPage').then((m) => ({ default: m.AdminCMSPage })),
);
const AdminLogisticsPage = lazyWithRetry(() =>
  import('../pages/AdminLogisticsPage').then((m) => ({ default: m.AdminLogisticsPage })),
);
const AdminCompliancePage = lazyWithRetry(() =>
  import('../pages/AdminCompliancePage').then((m) => ({ default: m.AdminCompliancePage })),
);
const AdminBrandsPage = lazyWithRetry(() =>
  import('../pages/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage })),
);

// Rider & Support Workspaces Lazy Pages
const RiderDashboardPage = lazyWithRetry(() =>
  import('../pages/RiderDashboardPage').then((m) => ({ default: m.RiderDashboardPage })),
);
const RiderHistoryPage = lazyWithRetry(() =>
  import('../pages/RiderHistoryPage').then((m) => ({ default: m.RiderHistoryPage })),
);
const RiderEarningsPage = lazyWithRetry(() =>
  import('../pages/RiderEarningsPage').then((m) => ({ default: m.RiderEarningsPage })),
);
const RiderProfilePage = lazyWithRetry(() =>
  import('../pages/RiderProfilePage').then((m) => ({ default: m.RiderProfilePage })),
);
const SupportDashboardPage = lazyWithRetry(() =>
  import('../pages/SupportDashboardPage').then((m) => ({ default: m.SupportDashboardPage })),
);
const SupportTicketsPage = lazyWithRetry(() =>
  import('../pages/SupportTicketsPage').then((m) => ({ default: m.SupportTicketsPage })),
);
const SupportTicketDetailPage = lazyWithRetry(() =>
  import('../pages/SupportTicketDetailPage').then((m) => ({ default: m.SupportTicketDetailPage })),
);

/**
 * Lazy-route fallback (Batch 47): a page-shaped skeleton — header bar over a
 * card grid — instead of the old centred spinner, so a chunk loading in
 * looks like the page it is about to become and the layout does not jump.
 */
const PageLoader: React.FC = () => (
  <div
    className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8"
    role="status"
    aria-label="Loading page"
  >
    <Skeleton className="mb-3 h-4 w-40" />
    <Skeleton className="mb-8 h-10 w-72 max-w-full" />
    <GridSkeleton count={4} />
  </div>
);

/**
 * lazy() with stale-chunk recovery. After a redeploy, a tab opened before the
 * deploy asks for chunk hashes that no longer exist and the import rejects. One
 * guarded reload lands the tab on the current deployment (see
 * lib/chunk-recovery); while it reloads, the promise never settles so Suspense
 * keeps the page loader up instead of flashing an error. If a reload already
 * happened inside the guard window, the error propagates to the route's
 * errorElement (RouteErrorScreen) instead of looping.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForNewVersion()) {
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

const lazyWrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);


/**
 * Redirect for legacy alias routes that carried a route param (Batch 55):
 * renders the canonical URL built from the matched params, so old links
 * keep working without mounting the page twice.
 */
const ParamRedirect: React.FC<{ build: (params: Record<string, string | undefined>) => string }> = ({
  build,
}) => {
  const params = useParams();
  return <Navigate to={build(params)} replace />;
};
export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorScreen />,
    element: (
      <PublicLayout>
        <RootLayout />
      </PublicLayout>
    ),
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
        path: 'stores/:vendorId',
        element: <ParamRedirect build={(p) => `/vendors/${p.vendorId ?? ''}`} />,
      },
      {
        path: 'store/:vendorId',
        element: <ParamRedirect build={(p) => `/vendors/${p.vendorId ?? ''}`} />,
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
        // The customer account area: one shared shell (sidebar + user
        // summary) stays mounted while the section content swaps. Every
        // URL below is the URL these pages have always had.
        element: <AccountLayout />,
        children: [
          {
            path: 'orders',
            element: lazyWrap(<OrdersPage />),
          },
          {
            path: 'downloads',
            element: lazyWrap(<DownloadsPage />),
          },
          {
            path: 'wishlist',
            element: lazyWrap(<WishlistPage />),
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
            path: 'account/reviews',
            element: lazyWrap(<AccountReviewsPage />),
          },
          {
            path: 'account/returns',
            element: lazyWrap(<AccountReturnsPage />),
          },
          {
            path: 'account/settings',
            element: lazyWrap(<AccountSettingsPage />),
          },
          {
            path: 'account/rewards',
            element: lazyWrap(<AccountRewardsPage />),
          },
          {
            path: 'account/support',
            element: lazyWrap(<AccountSupportPage />),
          },
        ],
      },
      {
        path: 'gift-cards',
        element: lazyWrap(<GiftCardsPage />),
      },
      {
        path: 'recently-viewed',
        element: lazyWrap(<RecentlyViewedPage />),
      },
      {
        path: 'order-confirmation/:orderId',
        element: lazyWrap(<OrderConfirmationPage />),
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
        path: 'track',
        element: lazyWrap(<TrackOrderPage />),
      },
      {
        path: 'track-order',
        element: <Navigate to="/track" replace />,
      },
      {
        path: 'track-order/:trackingNumber',
        element: <ParamRedirect build={(p) => `/track?trk=${encodeURIComponent(p.trackingNumber ?? '')}`} />,
      },
      {
        path: 'order-tracking',
        element: <Navigate to="/track" replace />,
      },
      {
        path: 'compare',
        element: lazyWrap(<ComparePage />),
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
        path: 'seller-application',
        element: lazyWrap(<SellerApplicationPage />),
      },
      {
        path: 'sell',
        element: <Navigate to="/become-a-seller" replace />,
      },
      {
        path: 'sell-on-vendora',
        element: <Navigate to="/become-a-seller" replace />,
      },
      {
        path: 'merchants',
        element: <Navigate to="/become-a-seller" replace />,
      },
      {
        path: 'customer/messages',
        element: lazyWrap(<VendorMessagesPage />),
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
        path: 'reset-password',
        element: lazyWrap(<ResetPasswordPage />),
      },
      {
        path: 'returns',
        element: lazyWrap(<ReturnsPage />),
      },
      {
        path: 'returns-replacements',
        element: <Navigate to="/returns" replace />,
      },
      {
        path: 'shipping',
        element: lazyWrap(<ShippingPolicyPage />),
      },
      {
        path: 'shipping-rates',
        element: <Navigate to="/shipping" replace />,
      },
      {
        path: 'shipping-policy',
        element: <Navigate to="/shipping" replace />,
      },
      {
        path: 'refund-policy',
        element: lazyWrap(<RefundPolicyPage />),
      },
      {
        path: 'refunds',
        element: <Navigate to="/refund-policy" replace />,
      },
      {
        path: 'privacy',
        element: lazyWrap(<PrivacyPolicyPage />),
      },
      {
        path: 'terms',
        element: lazyWrap(<TermsPage />),
      },
      {
        path: 'legal',
        element: <Navigate to="/terms" replace />,
      },
      {
        path: 'about',
        element: lazyWrap(<AboutPage />),
      },
      {
        path: 'about-us',
        element: <Navigate to="/about" replace />,
      },
      {
        path: 'affiliates',
        element: lazyWrap(<AffiliatePage />),
      },
      {
        path: 'creator-program',
        element: <Navigate to="/affiliates" replace />,
      },
      {
        path: 'faq',
        element: lazyWrap(<FAQPage />),
      },
      {
        path: 'help',
        element: <Navigate to="/faq" replace />,
      },
      {
        path: 'contact',
        element: lazyWrap(<ContactPage />),
      },
      {
        path: 'contact-us',
        element: <Navigate to="/contact" replace />,
      },
      {
        path: 'brands',
        element: lazyWrap(<BrandsPage />),
      },
      {
        path: 'brand-stores',
        element: <Navigate to="/brands" replace />,
      },
      {
        path: 'brands/:slug',
        element: lazyWrap(<BrandDetailPage />),
      },
      {
        path: 'deals',
        element: lazyWrap(<DealsPage />),
      },
      {
        path: 'new-arrivals',
        element: lazyWrap(<NewArrivalsPage />),
      },
      {
        path: 'flash-deals',
        element: <Navigate to="/deals" replace />,
      },
      {
        path: 'seller-fees',
        element: lazyWrap(<SellerFeesPage />),
      },
      {
        path: 'seller-policy',
        element: lazyWrap(<SellerPolicyPage />),
      },
      {
        path: 'coupons',
        element: lazyWrap(<CouponCentrePage />),
      },
      {
        path: 'cookie-policy',
        element: lazyWrap(<CookiePolicyPage />),
      },
      {
        path: 'careers',
        element: lazyWrap(<CareersPage />),
      },
      {
        path: 'jobs',
        element: <Navigate to="/careers" replace />,
      },
      {
        path: 'blog',
        element: lazyWrap(<BlogPage />),
      },
      {
        path: 'journal',
        element: <Navigate to="/blog" replace />,
      },
      {
        path: 'blog/:slug',
        element: lazyWrap(<BlogPostPage />),
      },
      {
        path: 'search',
        element: <ProductsPage />,
      },
      {
        path: 'categories',
        element: lazyWrap(<CategoriesPage />),
      },
      {
        path: 'categories/:slug',
        element: lazyWrap(<CategorySlugRedirect />),
      },
      {
        path: 'category/:slug',
        element: lazyWrap(<CategorySlugRedirect />),
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
              className="mt-6 inline-block rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-md"
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
    errorElement: <RouteErrorScreen />,
    element: (
      <VendorOnlyRoute>
        <VendorLayout />
      </VendorOnlyRoute>
    ),
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
        element: <Navigate to="/vendor/products/new" replace />,
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
        path: 'analytics',
        element: lazyWrap(<VendorAnalyticsPage />),
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
        path: 'messages/:threadId',
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
  // Staff Sign-In (its own URL, outside the storefront chrome): the admin
  // workspace's guard sends unauthenticated visitors here, not to /login.
  {
    path: '/admin/login',
    errorElement: <RouteErrorScreen />,
    element: lazyWrap(<AdminLoginPage />),
  },
  // Admin Workspace Routes (Catmin Design System)
  {
    path: '/admin',
    errorElement: <RouteErrorScreen />,
    element: (
      <AdminOnlyRoute loginPath="/admin/login" deniedPath="/admin/login?denied=1">
        <AdminLayout />
      </AdminOnlyRoute>
    ),
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
        path: 'reviews',
        element: lazyWrap(<AdminReviewsPage />),
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
        path: 'payouts',
        element: lazyWrap(<AdminPayoutsPage />),
      },
      {
        path: 'disputes',
        element: lazyWrap(<AdminDisputesPage />),
      },
      {
        path: 'returns',
        element: lazyWrap(<AdminReturnsPage />),
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
    errorElement: <RouteErrorScreen />,
    element: (
      <RiderOnlyRoute>
        <RiderLayout />
      </RiderOnlyRoute>
    ),
    children: [
      {
        index: true,
        element: lazyWrap(<RiderDashboardPage />),
      },
      {
        path: 'deliveries',
        element: lazyWrap(<RiderDashboardPage />),
      },
      {
        path: 'deliveries/:id',
        element: lazyWrap(<RiderDashboardPage />),
      },
      {
        path: 'history',
        element: lazyWrap(<RiderHistoryPage />),
      },
      {
        path: 'earnings',
        element: lazyWrap(<RiderEarningsPage />),
      },
      {
        path: 'profile',
        element: lazyWrap(<RiderProfilePage />),
      },
    ],
  },
  // Support Workspace Routes
  {
    path: '/support',
    errorElement: <RouteErrorScreen />,
    element: (
      <SupportOnlyRoute>
        <SupportLayout />
      </SupportOnlyRoute>
    ),
    children: [
      {
        index: true,
        element: lazyWrap(<SupportDashboardPage />),
      },
      {
        path: 'disputes',
        element: lazyWrap(<SupportDashboardPage />),
      },
      {
        path: 'disputes/:id',
        element: lazyWrap(<SupportDashboardPage />),
      },
      {
        path: 'tickets',
        element: lazyWrap(<SupportTicketsPage />),
      },
      {
        path: 'tickets/:id',
        element: lazyWrap(<SupportTicketDetailPage />),
      },
    ],
  },
]);
