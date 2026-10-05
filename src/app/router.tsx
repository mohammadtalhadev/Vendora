import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { VendorStorefrontPage } from '../pages/VendorStorefrontPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { WishlistPage } from '../pages/WishlistPage';
import { BecomeSellerPage } from '../pages/BecomeSellerPage';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { VendorDashboardPage } from '../pages/VendorDashboardPage';
import { VendorOrdersPage } from '../pages/VendorOrdersPage';
import { VendorProductsPage } from '../pages/VendorProductsPage';

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
        element: <VendorStorefrontPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailPage />,
      },
      {
        path: 'wishlist',
        element: <WishlistPage />,
      },
      {
        path: 'become-a-seller',
        element: <BecomeSellerPage />,
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
    element: <WorkspaceLayout role="vendor" sidebar={<VendorNav />} />,
    children: [
      {
        index: true,
        element: <VendorDashboardPage />,
      },
      {
        path: 'orders',
        element: <VendorOrdersPage />,
      },
      {
        path: 'products',
        element: <VendorProductsPage />,
      },
      {
        path: 'earnings',
        element: <VendorDashboardPage />,
      },
      {
        path: 'store-settings',
        element: <VendorDashboardPage />,
      },
    ],
  },
]);
