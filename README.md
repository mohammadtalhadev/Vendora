# Vendora — Multi-Vendor Marketplace Frontend

> **Author**: Mohammad Talha Javaid  
> **Version**: 1.0, October 2026  
> **Prepared for**: Mentor Review  
> **Stack**: React 19, TypeScript (Strict), Vite, Tailwind CSS, TanStack Query, Zustand, React Router, MSW

---

## 🛍️ Executive Summary

**Vendora** is an Amazon-style multi-vendor marketplace frontend built with modern React and TypeScript. Customers browse one unified catalog containing two types of offerings:
1. **Platform Products** — Sold directly by the platform with the distinct **"Sold by Vendora"** verification seal.
2. **Independent Vendor Listings** — Sold by verified third-party merchants who manage their own catalog, fulfillment, and payouts. The platform automatically levies and freezes a commission on every vendor order.

The entire frontend operates against an in-browser Mock Service Worker (MSW) architecture with local persistence, simulating realistic latency (200–800ms), network errors, and complete state machine transitions without requiring an external backend.

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
  - **Step 3: Payment**: Simulated card with Luhn algorithm checksum validation and presets, or Cash on Delivery (COD).
  - **Step 4: Review & Split Order Placement**: Validates stock, freezes platform commissions, and generates child sub-orders.

### 3. Order Lifecycle & 7-Stage Stepper
- Strict order state machine transitions (`src/lib/order-state-machine.ts`):
  $$\text{placed} \to \text{confirmed} \to \text{packed} \to \text{ready\_for\_pickup} \to \text{shipped} \to \text{out\_for\_delivery} \to \text{delivered}$$
- 7-stage visual tracking stepper with actor audit log and simulated 4-digit PIN handover verification.
- **Printable Invoices (`/orders/:orderId/invoice`)**: Clean printer-optimized invoice with tax calculation and seller details (`window.print()`).

### 4. Six Distinct User Workspaces (RBAC)
- **Guest / Customer**: Storefront, orders, digital downloads, wishlist, address book, disputes.
- **Vendor Workspace (`/vendor`)**: Store KPIs, product inventory CRUD with variant matrices, order fulfillment, earnings, and store policies.
- **Platform Admin (`/admin`)**: Full Catmin governance console: vendor approvals, product moderation queue, commission rate overrides, dispute triage, user management, and platform analytics.
- **Delivery Rider (`/rider`)**: Shift toggle (online/offline), delivery queue, turn-by-turn navigation shortcut, and 4-digit PIN customer handover modal (`HandoverVerificationModal`).
- **Customer Support (`/support`)**: 3-pane dispute triage, internal staff notes, canned policy templates, and refund issuance controls.
- **In-App Notification Center (`/notifications`)**: Real-time notification bell dropdown with unread badge counter, category filters, and bulk read actions.

---

## 👥 Seeded Demo Accounts (1-Click Switcher)

You can switch between any of the pre-seeded personas instantly using the **Role Switcher** in the top navigation bar or through `/login`:

| Role | Demo Email | Password | Primary Capabilities & Purpose |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@demo.test` | `demo1234` | Full order history, active cart, saved addresses, wishlist |
| **New Customer** | `newuser@demo.test` | `demo1234` | Fresh account to test the `/become-a-seller` application flow |
| **Approved Vendor** | `vendor@demo.test` | `demo1234` | Manages store catalog, packs orders, views earnings after commission |
| **Platform Admin** | `admin@demo.test` | `demo1234` | Approves vendors, moderates products, sets commission rates, resolves disputes |
| **Support Agent** | `support@demo.test` | `demo1234` | Triages dispute tickets, writes internal notes, issues customer refunds |
| **Delivery Rider** | `rider@demo.test` | `demo1234` | Toggles shift, handles package pickup, verifies 4-digit customer PIN |

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
  - Catalog & Search               - vd:v1:auth_session        - Search term (q)
  - Orders & Sub-orders            - vd:v1:cart_items          - Category & Brand
  - Reviews & Ratings              - vd:v1:wishlist            - Price Min/Max
  - Analytics & Reports            - vd:v1:notifications       - Sort & Pagination
             │                     - vd:v1:compare
             ▼
      Service Layer (src/features/*/api)
             │  (fetch client with Zod response parsing)
             ▼
      MSW Service Worker Interceptor (/api/...)
             │
      Mock Database Engine (Seed JSON + LocalStorage Overlay)
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
├── lib/                  # apiClient, API schemas, order-state-machine, formatters
├── mocks/                # MSW worker, mockDb (seed JSON + localStorage overlay)
├── pages/                # Thin route components (HomePage, CheckoutPage, etc.)
├── store/                # Zustand stores (auth, cart, wishlist, notifications, compare)
└── types/                # Strict domain interfaces (Product, SubOrder, Dispute, User)
```

---

## ⚡ Performance & Quality Verification

- **TypeScript Strict Mode**: 100% compliant with zero type errors (`verbatimModuleSyntax: true`).
- **Test Suite**: **199 unit & integration tests passing** across 26 test suites in Vitest.
- **Route-Level Code Splitting**: All workspace, checkout, and secondary pages are asynchronously chunked via `React.lazy()` and `<Suspense>`, keeping initial page loads fast.
- **Deterministic Seed Data**: Static immutable seed data bundled with mutable browser overlay prevents third-party API downtime.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/vendora.git
cd vendora

# Install dependencies
npm install

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
