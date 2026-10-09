# Panel Wiring Conventions (READ FIRST)

Goal: make every button/section in the Admin + Vendor panels actually work.
Two shared utilities already exist — USE THEM, do not re-invent.

## 1. Real pagination — `src/hooks/usePagination.ts` + `src/components/common/TablePagination.tsx`

Replace every STATIC/FAKE pagination footer (hardcoded `Previous / 1 / 2 / 3 / 855 / Next`
buttons with no onClick, plus fake "Showing 1-8 of 1,280" text and inert
`<select>` rows-per-page) with the real thing.

Steps per page:
1. Import:
   ```tsx
   import { usePagination } from '../hooks/usePagination';
   import { TablePagination } from '../components/common/TablePagination';
   ```
   (adjust relative depth — pages are in `src/pages/`, so `../hooks/...` and `../components/common/...`)
2. Inside the component, right after the existing `filtered…` array is computed:
   ```tsx
   const pagination = usePagination(filteredXxx, 8);
   ```
   Use the page's REAL filtered array name (`filteredOrders`, `filteredVendors`, etc.).
3. Change the `.map()` that renders table rows to iterate `pagination.pageItems`
   instead of the full filtered array.
4. Replace the whole static pagination `<div>…</div>` footer with:
   ```tsx
   <TablePagination pagination={pagination} noun="orders" />
   ```
   - `noun` = the row label already used in the fake text ("orders", "merchant records",
     "products", "users", "transactions", "campaigns", "reviews", "payouts", "notifications").
   - Add `variant="compact"` when the ORIGINAL footer used the icon style
     (`|<  <  1 2 3  >  >|` small h-7 w-7 buttons). Use the default text variant when the
     original used `Previous / Next` words.
5. If any "select all" checkbox logic compares against `filteredXxx.length`, keep it
   comparing against `filteredXxx` (all rows) — do NOT switch it to pageItems.

## 2. Dead buttons — make them do something real

Every `<button>` with no `onClick` (and not `type="submit"`) must become functional.
Pick the smallest honest behavior:

- **Toast feedback actions** (Configure, Audit, Connect, Edit tier logic, View Audit Log,
  Mark all as read, Pause Store, Rotate Credentials, Refresh, MoreVertical, Attach file,
  View All, Split Analytics, Escrow Policies, View Logistics SLA, Edit Rules, View Appeals,
  SLA Metrics, Return Settings/Policy, Filters, Download CSV report):
  reuse the page's EXISTING toast helper. Most pages already define
  `const [toastMessage, setToastMessage] = useState<string|null>(null)` + `showToast(msg)`
  and render a floating toast at the bottom. Call `showToast('…')` with a specific,
  truthful message about what the action did.
  If the page has NO toast helper, add the standard block (copy the pattern from
  `src/pages/VendorPayoutsPage.tsx` lines ~43-47 and ~775-780).
- **Actions that mutate list data** (approve/reject/suspend/restock/mark read/toggle):
  update the actual `useState` array with `setXxx(prev => prev.map(...))` so the UI
  visibly changes, THEN toast.
- **"Mark all as read"** (AdminNotificationsPage): flip the read flag on every item in
  state and toast the count.
- **Download / Export buttons**: use the existing `exportToCsv` from `../lib/export-csv`
  (already imported on many pages) with the page's real filtered data.
- **Restock** (VendorDashboardPage low-stock list): it is static demo data — wire it to a
  toast plus, if the list is in state, increment the count.
- **Pagination-looking but inert `<select>`** inside the fake footer: handled by
  TablePagination (it has a working rows-per-page select).

Rules:
- Never leave a button with no handler. Never add `onClick={() => {}}`.
- Keep all existing styling/classes; only add the handler (and `type="button"` if missing).
- Do not touch files outside your assigned list.
- Do not modify `src/hooks/usePagination.ts`, `src/components/common/TablePagination.tsx`,
  `src/hooks/useToast.ts`, `src/components/common/Toast.tsx` — they are shared/final.
- After edits: `npx tsc -b` must be clean and `npx oxlint <your files>` must add no new
  errors.
