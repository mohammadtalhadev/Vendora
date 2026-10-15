# Vendora — Multi-Vendor Marketplace

> **Author**: Mohammad Talha Javaid  
> **Version**: 1.0, October 2026  
> **Prepared for**: Mentor Review  
> **Live**: https://vendora-plum.vercel.app/  
> **Stack**: React 19, TypeScript (Strict), Vite, Tailwind CSS v4, TanStack Query, Zustand, React Router, Supabase (PostgreSQL, Auth, RLS, RPCs)

---

## 🛍️ Executive Summary

**Vendora** is an Amazon-style multi-vendor marketplace frontend built with modern React and TypeScript. Customers browse one unified catalog containing two types of offerings:
1. **Platform Products** — Sold directly by the platform with the distinct **"Sold by Vendora"** verification seal.
2. **Independent Vendor Listings** — Sold by verified third-party merchants who manage their own catalog, fulfillment, and payouts. The platform automatically levies and freezes a commission on every vendor order.

The app runs on a real Supabase backend — PostgreSQL with row-level security (RLS) and RPC functions for privileged operations. There is no mock data layer: an earlier in-browser mock (MSW) architecture was removed in full, and every page reads and writes the live database.

---

## 🌟 Key Product Features

### 1. Unified Customer Discovery
- **Hero & Curated Collections**: Limited Campaigns, Today's Deals, Electronics, and Home Essentials with responsive pill navigation.
- **Debounced Search**: Cancellable live suggestions with `AbortSignal`, keyboard navigation, and stale response protection (`useDebouncedValue`).
- **URL-Driven Product Catalog (`/products`)**: Multi-faceted filtering (category, price range, brand, seller type, rating, stock status) and pagination synchronized strictly with URL query parameters.
- **Product Detail Page (`/products/:productId`)**: High-res image gallery with zoom indicator, variant choices, quantity stepper, seller card with live chat shortcut, rating breakdown, and customer review submission.
- **Product Comparison (`/compare`)**: Side-by-side spec comparison of up to 4 items with difference highlighting and 1-click cart addition.
- **Digital Asset Library (`/downloads`)**: Instant fulfillment library for digital goods (software licenses, eBooks, presets) with one-click license key copying and simulated asset download.

### 2. Multi-Vendor Cart & Accordion Checkout
- **Seller-Grouped Cart (`/cart`)**: Items partitioned dynamically by vendor with independent subtotals, fulfillment notes, and estimated shipping fees.
- **Guest-to-Account Cart Merge**: Cart persists locally across sessions and merges automatically upon login.
- **4-Step Accordion Checkout (`/checkout`)**:
  - **Step 1: Shipping Address**: Validated with Zod schema and saved address book picker.
  - **Step 2: Delivery Options**: Individual standard/express shipping options selected per vendor.
  - **Step 3: Payment**: Saved payment methods store display metadata only (brand + last 4 digits) — card numbers are never stored — or Cash on Delivery (COD).
  - **Step 4: Review & Split Order Placement**: Validates stock, freezes platform commissions, and generates child sub-orders.

### 3. Order Lifecycle & 7-Stage Stepper
- Strict order state machine transitions (`src/lib/order-state-machine.ts`):
  $$\text{placed} \to \text{confirmed} \to \text{packed} \to \text{ready\_for\_pickup} \to \text{shipped} \to \text{out\_for\_delivery} \to \text{delivered}$$
- 7-stage visual tracking stepper with actor audit log and simulated 4-digit PIN handover verification.
- **Printable Invoices (`/orders/:orderId/invoice`)**: Clean printer-optimized invoice with tax calculation and seller details (`window.print()`).

### 4. Six Distinct User Workspaces (RBAC)
- **Guest / Customer**: Storefront, orders, digital downloads, wishlist, address book, disputes.
- **Vendor Workspace (`/vendor`)**: Store KPIs, product inventory CRUD with variant matrices, order fulfillment, earnings, and store policies.
- **Platform Admin (`/admin`)**: Full governance console: vendor approvals, product moderation queue, commission rate overrides, dispute triage, user management, and platform analytics.
- **Delivery Rider (`/rider`)**: Shift toggle (online/offline), delivery queue, turn-by-turn navigation shortcut, and 4-digit PIN customer handover modal (`HandoverVerificationModal`).
- **Customer Support (`/support`)**: 3-pane dispute triage, internal staff notes, canned policy templates, and refund issuance controls.
- **In-App Notification Center (`/notifications`)**: Real-time notification bell dropdown with unread badge counter, category filters, and bulk read actions.

---

## 👥 Access & Roles

The demo personas that existed during early development were deleted for security. For the mentor evaluation, a small set of clearly-labelled test accounts (`@vendora.test` — customer, seller, rider, support, admin) exists so every role can be demonstrated end to end; their credentials are shared privately with the reviewer, never published here, and the accounts are removed after the evaluation.

To explore the live site:

- **Customer**: register your own account at `/register`.
- **Vendor**: register, then apply at `/become-a-seller`; an admin approves the application.
- **Staff (admin / support)**: sign in at `/admin/login` — staff accounts only; non-staff accounts are signed out with an access denial.
- **Rider**: provisioned by an admin.

A separate, isolated public demo environment (its own database and deployment, public demo accounts, scheduled data reset) is planned for portfolio use, so demo access never touches production data.

---

## 🏗️ Architecture & State Placement

Vendora enforces strict separation between server state, client persistent state, URL state, and form state:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UI Layer (React 19)                           │
└────────────▲──────────────────────────────▲─────────────────────────▲───┘
             │                              │                         │
     TanStack Query                   Zustand Stores              URL State
  (Server Data Cache)             (Persistent Client)        (Single Source)
  - Catalog & Search               - Cart (vd:v1:cart:<user>)   - Search term (q)
  - Orders & Sub-orders            - Wishlist (per-user keys)   - Category & Brand
  - Reviews & Ratings              - Compare (vd:v1:compare)    - Price Min/Max
  - Analytics & Reports            - Currency (vd:v1:currency)  - Sort & Pagination
             ▼
      Service Layer (src/features/*/api)
             │  (fetch client with Zod response parsing)
             ▼
      Supabase Client (PostgREST + RPC)
             │
      PostgreSQL (RLS Policies + RPC Functions)
```

### State Placement Rules
1. **Server state is never duplicated into Zustand**. Catalog data and order records are managed solely via TanStack Query.
2. **URL is the single source of truth** for filtering, search queries, pagination, and sorting.
3. **Cart and Commission derivations are computed on-the-fly** via selectors and memoization to prevent state drift.

---

## 📁 Project Structure

```
src/
├── app/                  # Router setup with React.lazy code splitting, QueryClient, RootLayout
├── components/
│   ├── common/           # QueryState, NotificationDropdown, Loading skeletons
│   ├── layout/           # Navbar (Glassmorphic + MegaMenu), Footer, Role layouts
│   └── ui/               # shadcn / Radix primitives customized to Vendora tokens
├── features/
│   ├── admin/            # AdminNav, moderation tables, commission override editors
│   ├── cart/             # Cart drawer, seller grouping, calculations
│   ├── checkout/         # Accordion checkout steps, Luhn validator, test cards
│   ├── orders/           # Tracking stepper, event audit log, invoice views
│   ├── products/         # Gallery, variant choices, specs table, seller card
│   ├── reviews/          # Review list, breakdown chart, write review modal
│   ├── rider/            # Handover PIN modal, delivery issue reporting modal
│   ├── support/          # 3-pane dispute triage, internal staff notes
│   └── vendor/           # VendorNav, KPI cards, product form modal
├── hooks/                # useDebouncedValue, custom UI utilities
├── lib/                  # Supabase client, API schemas, order-state-machine, formatters, friendly-error mapping
├── pages/                # Thin route components (HomePage, CheckoutPage, etc.)
├── store/                # Zustand stores (auth, cart, wishlist, notifications, compare)
└── types/                # Strict domain interfaces (Product, SubOrder, Dispute, User)
```

---

## ⚡ Performance & Quality Verification

- **TypeScript Strict Mode**: 100% compliant with zero type errors (`verbatimModuleSyntax: true`).
- **Test Suite**: **1,053 unit & integration tests passing** across 136 test files in Vitest, with GitHub Actions CI green on every push. Database checks: **364 assertions passing** (`db:check`, PGlite replay of the full migration chain).
- **Route-Level Code Splitting**: All workspace, checkout, and secondary pages are asynchronously chunked via `React.lazy()` and `<Suspense>`, keeping initial page loads fast.
- **Real Catalogue Data**: Products, stores, orders, and commissions live in Supabase (seeded catalogue re-priced to realistic PKR); nothing on the site is mock or invented data.

---

## 🔒 Security Posture

- **Row-Level Security everywhere**: RLS is enabled on every table; privileged money operations (checkout pricing, order placement, payouts, gift cards) run server-side in `SECURITY DEFINER` RPCs with a pinned `search_path`, and checkout totals are computed by the database, never trusted from the client.
- **One password policy**: new passwords require at least 8 characters on every surface (registration, reset, settings), validated by shared client code and Zod schemas; sign-in accepts the account's existing password and lets the server verify it.
- **No open redirects**: post-login `?redirect=` targets pass through a single `safeRedirect` check that only honours same-origin paths.
- **Public forms are capped**: the anonymous contact/newsletter inboxes enforce field-length limits in the client and as database CHECK constraints; new tables receive no automatic anonymous grants.
- **Headers**: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS and `Permissions-Policy` are set at the edge; a full Content-Security-Policy is deployed in Report-Only mode first, so violations are collected before enforcement.
- **Demo access stays out of production code paths**: the one-click demo persona switcher exists only in development builds (`import.meta.env.DEV`); the production bundle contains no demo credentials.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- npm or pnpm
- A Supabase project (see `SUPABASE_SETUP.md`)

### Installation
```bash
# Clone the repository
git clone https://github.com/mohammadtalhadev/Vendora.git
cd Vendora

# Install dependencies
npm install

# Configure environment: create .env with your Supabase project's
# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon key only —
# never expose the service-role key to the browser)

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Scripts
```bash
# Run unit & component tests
npm run test

# Type-check with TypeScript compiler
npx tsc -b --noEmit

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License
Created for academic / mentor evaluation. Licensed under the MIT License.
