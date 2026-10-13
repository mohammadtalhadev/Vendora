import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/')) {
          const url = new URL(req.url, 'http://localhost');
          const pathname = url.pathname;

          if (pathname.startsWith('/api/products/')) {
            const id = decodeURIComponent(pathname.replace('/api/products/', ''));
            const cleanTitle = id
              .replace(/^(elec|beauty|home|deal|winter|fash|prod|groc)-/, '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase());

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                id,
                title: cleanTitle || 'Vendora Verified Product',
                slug: id,
                description: `Official authentic ${cleanTitle} backed by Vendora 100% Quality Assurance Guarantee. Includes premium packaging, original accessories, and express delivery.`,
                category: 'cat-electronics',
                brand: 'Vendora',
                images: [
                  '/images/products/prod_silver_headphones.jpg',
                  '/images/products/prod_titanium_phone.jpg',
                  '/images/products/prod_smart_watch.jpg',
                ],
                price: 199.0,
                compareAtPrice: 249.0,
                type: 'physical',
                sellerId: 'platform',
                sellerName: 'Vendora',
                sellerType: 'platform',
                variants: [],
                stock: 35,
                shippingSettings: { freeShipping: true, standardFee: 0 },
                rating: 4.9,
                reviewCount: 310,
                status: 'approved',
              }),
            );
            return;
          }

          if (pathname === '/api/products') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                items: [],
                total: 0,
                page: 1,
                totalPages: 1,
                hasMore: false,
              }),
            );
            return;
          }

          if (pathname === '/api/categories') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ categories: [] }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevMiddleware()],
  server: {
    watch: {
      ignored: [
        '**/scratch/**',
        '**/.git/**',
        '**/.kilo/**',
        '**/coverage/**',
        '**/temp/**',
        '**/*.log',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.kilo/**', '**/.git/**'],
    testTimeout: 20000,
    pool: 'threads',
    maxWorkers: 3,
  },
});
