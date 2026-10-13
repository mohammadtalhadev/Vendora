# Vendora — Live QA Report

**Date:** 2026-10-13  **Tester:** Qoder agent  **Build under test:** working tree @ `1c4795b` + this session's fixes
**Backend:** linked Supabase project `bbwcvrviisqmynsllroi` (migrations applied through `20261011001150`)
**Companion file:** `docs/qa-report.md` is the older pre-Supabase matrix and is still being edited by the
concurrent session; it is left untouched here on purpose.

---

## 1. How this was tested

| Instrument | What it does | Evidence |
| --- | --- | --- |
| `scripts/qa-live-probe.mjs` | Signs in all 6 demo personas, calls every app's read RPCs, counts RLS-visible rows, collects real ids for parameterized routes, checks nav slugs against the database | `scratch/qa/live-fixture.json` |
| `scripts/qa-flow-live.mjs` | 52 live write checks: cart → quote → `place_order` → seller fulfilment → rider route → handover code → dispute → partial then full refund → governance writes → security negatives | `scratch/qa/flow-live.json` |
| `playwright.config.ts` + `tests/e2e/*` | 204 page visits across 114 routes × 6 personas, 24 access-control probes, 8 chrome-overlay walks, 4 golden-path flows. Records console errors, uncaught exceptions, non-2xx responses from the backend, blank panels, fabricated-data text, dead links, and walks every tab and safe trigger | `scratch/qa/sweep.jsonl`, `scratch/qa/chrome.jsonl`, `scratch/qa/shots/` |
| `npm run db:check` | PGlite replays the whole migration chain + seed and asserts SQL semantics offline | 271 assertions, 0 failures |

Target is a **production build** served by `vite preview`, not the dev server. The first sweep run was
discarded: port 5199 was held by a stale Vite dev process, which made 165 pages look blank. That was the
harness, not the app — re-verified by probing the built bundle directly (`/admin/audit-logs` renders 3,124
characters of `main`, `/vendors/soundwave-direct` renders the store).

---

## 2. Gates

| Gate | Result | Attribution |
| --- | --- | --- |
| `npm run db:check` | **271 passed, 0 failed** (was 269) | includes the two new assertions from §4 |
| `npx vitest run` | **679 tests, 14 failing** | all 14 sit in the concurrent session's in-flight files (§7) |
| `npx tsc -b` | **69 errors, 9 files** | unused-import errors in their redesign pages; `npm run build` therefore red |
| `npx vite build` | **green**, 35s | the app itself compiles and runs |
| `npm run lint` (oxlint) | 170 warnings, 0 errors | mostly `set-state-in-effect` in the new pages |

---

## 3. Backend: the marketplace actually works

Every step below was executed against the live project through the real RLS-protected surface, as the
real persona.

- **Pricing has one truth.** `checkout_quote` returned `subtotal 514 / shipping 8.50 / total 522.50`;
  `place_order` booked exactly `522.50`. Delta **0.00**.
- **Per-seller split is correct.** Two packages from two sellers; the seller's package carries
  `commission 13.23 @ 7%` and `net_payout 175.77`; the platform package carries `commission 0`.
  `net = subtotal − commission (+ seller shipping)` reconciled on **both** packages.
- **Fulfilment state machine.** `confirmed → packed → ready_for_pickup` by the seller, `shipped →
  out_for_delivery` by the rider, each accepted; `picked_up` is a *delivery* status, not a package status —
  the two enums are separate and consistent.
- **Handover code.** Re-issued as a live value (`9237`) — never read back from the hash. A wrong code is
  refused (`Invalid handover code`); the correct code delivers and the package becomes `delivered`.
- **Refunds.** A partial refund returns `fullyRefunded: false, remainingGross: 98.75` and leaves the
  package refundable; only the whole gross closes it as `refunded`.
- **Governance writes land.** `admin_issue_strike`, `admin_moderate_products` (a seller-created listing
  reached `pending_review`, was rejected, and stopped being public), `admin_save_platform_settings`,
  `review_vendor_application`, `set_vendor_product_listing` (`submit`/`withdraw`, matching the app's
  typing), `resolve_dispute('resolved_refund')` writing note + amount + assignee.
- **Console numbers agree with the tables.** `admin_dashboard` reported `orders: 1, packages: 2,
  gmvBooked: 522.5, commission: 13.23, refundAmount: 197.5` against an `orders` count of 1;
  `vendor_dashboard` reported the new package's `netPayout 175.77`; `rider_delivery_board` reported
  `deliveredToday: 1`; `admin_report_summary` totals tie to the same gross.

**Data created by this run (deliberate, it is what the empty panels need):** 2 QA order groups with 4
packages, 1 dispute with refunds and a resolution, 1 strike on `soundwave-direct`, 1 rejected QA listing,
and the associated notifications. Before this session the remote held **zero** orders, sub_orders,
disputes, deliveries, reviews, threads or notifications for any persona.

---

## 4. Security

**One real bug found, fixed, pushed and verified.**

`dispute_messages` SELECT policy (`supabase/migrations/20261011000200_vendora_rls.sql:328`) gated reads on
`is_dispute_party(dispute_id)` **and nothing else**. `add_dispute_message` and `escalate_to_support` both
write rows with `is_internal_note = true`, so a buyer opening their own case read the desk's private notes.
Confirmed live before the fix: the buyer saw **3 of 3 messages, 2 of them internal**.

Fixed in `supabase/migrations/20261011001150_vendora_dispute_note_visibility.sql`: staff see the whole
thread because they are staff; a party sees the thread minus the notes. Verified three ways — offline
(`db:check` 271 green, including the new "the buyer reads the staff reply but never a desk note"), pushed to
the live project, then re-read live: **buyer sees 2 public messages, 0 internal; the desk still sees all 4.**

The offline suite had 269 assertions and never caught this because it only checked that internal notes are
*stored* as notes, never that they are *unreadable* to the counterparty. That class of gap — a policy that
passes a write test and fails a read test — is the reason the live probe exists.

**Negative authorisation checks, all passing:** a customer calling `admin_dashboard` → `42501 Only the
platform team can read the platform overview`; a customer calling `vendor_dashboard` → `42501 No vendor
store is linked to this account`; anonymous reads 0 `profiles` and 0 `orders`; a seller advancing another
seller's package → `42501 Role none is not authorized for transition placed -> confirmed`; a rider jumping
to `delivered` without the code → `42501 …not authorized for transition out_for_delivery -> delivered`;
a support agent issuing a strike → `42501 Only the platform team can record a strike`. Self-assignment of a
dispute is refused by design and the picker already filters `isMe` (`DisputeContextBar.tsx:318,338`).

**Client-side RBAC matches the guards:** every disallowed persona is bounced to `/403` from all four
consoles, and every allowed one reaches its own console.

---

## 5. Bug fixed: every slug-addressed store page was broken

`fetchStoreByHandle` filtered with `or(slug.eq.X, id.eq.X)`. PostgREST types the whole filter from the uuid
column, so any non-uuid handle failed the **entire request** with `400 22P02 invalid input syntax for type
uuid` rather than simply not matching. Every store link built from a slug — the storefront chrome,
`CartPage.tsx:90`, `BrandsPage.tsx:47,63` (`/vendors/ronin-pk`, `/vendors/faster-pk`) — could not load.

Fixed in `src/features/vendor/api/store.ts:122` by choosing one clause from the handle's shape. Proven
live: old filter → `22P02`; new → resolves by slug, resolves by id, and returns an honest *Store not found*
for an unknown handle. Locked with `src/features/vendor/api/store.test.ts` (4 tests).

---

## 6. Mock data and dead paths still live at runtime

These are **reported, not removed** — Phase 9 owns the purge.

| What | Where | Why it matters |
| --- | --- | --- |
| MSW worker boots in the **shipped bundle** | `src/main.tsx:21`, `dist/mockServiceWorker.js` (12,754 bytes) | Observed live intercepting real `rest/v1/profiles`, `vendor_profiles`, `cart_items`, `wishlist_items` traffic on every page, emitting 30+ warnings per route |
| `/api/*` dev middleware fabricates a product | `vite.config.ts:5-79` | invents price 199, rating 4.9, 310 reviews, `cat-electronics` |
| localStorage marketplace store kept alive | `components/layout/RootLayout.tsx:12` calls `syncWithDatabase` on every mount | the single line that keeps the 2,335-line store, its 14 invented seed arrays and `src/mocks/*` reachable in production |
| Admin pages on the store / mockDb | `AdminAddProductPage.tsx:307,310,318` (writes to `mockDb` + `localStorage 'vd:v1:products'`), `AdminCommissionPage.tsx:192-200`, `AdminOrderDetailPage.tsx:28-38,45,99`, `AdminBrandsPage`, `AdminCategoriesPage`, `AdminDisputesPage`, `AdminUsersPage` | moderation and fulfilment actions that never reach Postgres |
| Pages with **no data layer at all** | `AdminReportsPage.tsx:45,256-313` (GMV `$1,489,200`, `+18.4%`, take rate `12.0%`, AOV `$142.80`, `98.8%` compliance in its own CSV), `AdminProfilePage.tsx:41-108,750-754`, `AdminSettingsPage.tsx:37,96-101,147-149` (`Math.random()` API keys), `TrackOrderPage.tsx:71-295` (whole invented shipment: rider name, phone, OTP `6492`, "live" telemetry), `AccountProfilePage.tsx:71-148` | these render invented numbers as platform truth |
| Legacy untyped client still imported | `supabase-service.ts` via `CartDrawer.tsx:7`, `LiveChatModal.tsx:3`, `MediaManagementView.tsx:41`, `SellerApplicationForm.tsx:22`, `RegisterPage.tsx:27` | bypasses generated types |
| Dead code | `src/lib/api-client.ts` (zero importers), `src/App.tsx` (unused MSW/Lenis spike), `TechSpecsGrid.tsx`, `TrustValuePropsStrip.tsx` | |
| Mixed real + fake on one screen | `ProductDetailPage.tsx:843` renders `CustomersAlsoViewedGrid` with no props → prints `DEFAULT_ALSO_VIEWED` with hardcoded `AED` strings; `:807` renders `OtherOffersSection` **without its only data prop**, so the component returns `null` and the feature is wired to nothing; `OrdersPage.tsx:67,727` fabricated recommendations next to a real `useOrders`; `CheckoutPage.tsx:38,103` seeds `DEFAULT_ADDRESSES` | |
| Media library | `features/media/mediaData.ts:117 INITIAL_MEDIA_ITEMS` rendered as an asset library through `MediaManagementView` | Admin/Vendor media pages |

---

## 7. UI defects inside the concurrent redesign zone (report-only)

The other session owns these files right now, so nothing here was changed.

- 14 failing Vitest tests: `MegaMenu.test.tsx` (6), `SellerApplicationForm.test.tsx` (4),
  `AccordionCheckout.test.tsx` (2), `VendorComponents.test.tsx` (1), `AdminVendorsPage.test.tsx` (1).
  The last two fail on money strings: the new `src/store/currency-store.ts` formats with per-currency
  decimals and an FX multiplier, while the pinned tests expect `$4,400` / `$11,250`.
- 69 `tsc` errors, all unused imports/locals in `LoginPage`, `RegisterPage`, `BecomeSellerPage`, `BlogPage`,
  `BrandsPage`, `CareersPage`, `DealsPage` — this is what turns `npm run build` red.
- **Money shown in two units on one screen.** `AdminDisputesPage.tsx:581` prints the refund ceiling through
  `formatPrice()` (currency-selector driven) while `input#ruling-amount` at `:613` prefills and caps at the
  raw USD `remainingGross`. Switch the selector to PKR and the guidance and the field disagree by the FX
  rate. The write itself is safe (it sends the raw number).
- `LoginPage.tsx:231` asserts "Platform Status: 100% Operational" with no source.

---

## 8. Navigation truth

- **Broken by data, not by route:** `/products?category=appliances` (`HomePage.tsx:2497,2533,2551,2570`),
  `?category=beauty` (`:2420,2452,2483` — real slug is `beauty-personal-care`), `?category=home`
  (`BrandsPage.tsx:127`), `?category=audio` / `?category=digital` (`ComparePage.tsx:97` — real slugs
  `audio-wearables`, `digital-products`). Confirmed against the live `categories` table: `appliances`,
  `health`, `household`, `pets`, `toys`, `patio-garden`, `grocery-fruits` **do not exist**.
- **Legacy mock ids as live links:** `HomePage.tsx` carousels carry ids like `elec-sony-wh`,
  `beauty-mineral-primer`, `deal-s24ultra`, `deal-invincible` which reach `/products/<id>` through
  `ProductCard.tsx:74,98` and resolve to nothing. The same ids leak into cart, wishlist and compare rows.
- **Dead in-page anchor:** `SellerApplicationForm.tsx:574` `href="#terms"` with `preventDefault()`.
- **Raw `<a>` that bypasses the router:** `MediaManagementView.tsx:1155` (`/vendors/vendor-tech-1`, a mock
  id), `WorkspaceLayout.tsx:228`, `router.tsx:512`.
- **Query params the page ignores:** `/products?type=digital` (`DownloadsPage.tsx:191`) and
  `/products?seller=<id>` (`ProductCard.tsx:141`) — `ProductsPage` reads only `q, category, sort, min, max, page`.
- **22 alias/duplicate route groups**, e.g. `/track` = `/track-order` = `/order-tracking`,
  `/vendors/:id` = `/stores/:id` = `/store/:id`, `/faq` = `/help`, `/about` = `/about-us`;
  `/customer/messages` renders the **vendor** messages page. Most aliases have no inbound link at all.

---

## 9. Not covered here

- **Phase 8 realtime / notification fan-out** (`20261011001200`, held back by your decision). Its RPCs and
  triggers exist locally and pass `db:check`, so `AdminNotificationsPage`, the notification bell and every
  realtime subscription will fail against the live project until it is pushed.
- **Homepage** — left to last and untouched, per the concurrent session owning it.
- Mobile viewports, Lighthouse, axe accessibility, and storage/CDN asset behaviour.
- Payment-path depth: only `card` with brand/last4 was exercised; COD and coupon paths were not.

## 10. Recommended next actions

1. Re-run `npx playwright test` after the redesign lands (rebuild first: `npx vite build`) and drive the
   sweep's blank/console/link rows to zero.
2. Phase 9 as scoped by §6: retire `main.tsx` MSW boot, `vite.config.ts` middleware, `api-client.ts`,
   `App.tsx`, then the `RootLayout` → `marketplace-store` thread and the five no-data-layer admin pages.
3. Decide the currency rule for staff consoles: either pin consoles to USD, or label every amount with its
   unit and keep inputs in the stored unit (§7).
4. Push `20261011001200` when Phase 8 is finished so the notification surfaces can be tested live.
