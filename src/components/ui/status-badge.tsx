import { Badge } from './badge';
import { cn } from '../../lib/utils';

/**
 * The ONE shared status presentation map for the admin console.
 *
 * Harvested from the per-page helpers this component replaces
 * (AdminOrdersPage `statusLabel`/`statusTone`, AdminProductsPage's inline
 * status ternary, AdminUsersPage `statusTone`). Where pages disagreed on a
 * colour, the AdminOrdersPage treatment won: the neutral tone is
 * `text-slate-700` (AdminProductsPage rendered archived with
 * `text-slate-600`, AdminUsersPage's fallback likewise).
 *
 * Labels default to the pages' option labels. Two legacy displays show the
 * raw token instead of a label (AdminUsersPage renders `accountStatus`
 * verbatim; AdminProductsPage renders raw status text outside
 * `pending_review`) — those call sites pass `label` explicitly to preserve
 * their exact text while still taking the shared tone from here.
 */
export const STATUS_LABELS: Record<string, string> = {
  // Order lifecycle (AdminOrdersPage STATUS_OPTIONS)
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
  // Payment states (AdminOrdersPage PAYMENT_OPTIONS)
  pending: 'Pending',
  succeeded: 'Succeeded',
  failed: 'Failed',
  // Listing moderation (AdminProductsPage)
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
  draft: 'Draft',
  // Account governance (AdminUsersPage STATUS_OPTIONS)
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
};

const TONE_EMERALD = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
const TONE_ROSE = 'bg-rose-50 text-rose-700 border border-rose-200';
const TONE_PURPLE = 'bg-purple-50 text-purple-700 border border-purple-200';
const TONE_BLUE = 'bg-blue-50 text-blue-700 border border-blue-200';
const TONE_AMBER = 'bg-amber-50 text-amber-700 border border-amber-200';
const TONE_NEUTRAL = 'bg-slate-100 text-slate-700 border border-slate-200';

export const STATUS_TONES: Record<string, string> = {
  delivered: TONE_EMERALD,
  approved: TONE_EMERALD,
  cancelled: TONE_ROSE,
  refunded: TONE_ROSE,
  returned: TONE_ROSE,
  rejected: TONE_ROSE,
  suspended: TONE_ROSE,
  banned: 'bg-rose-600 text-white',
  active: 'bg-slate-900 text-white',
  shipped: TONE_PURPLE,
  out_for_delivery: TONE_PURPLE,
  placed: TONE_BLUE,
  confirmed: TONE_BLUE,
  pending_review: TONE_AMBER,
  draft: TONE_AMBER,
  archived: TONE_NEUTRAL,
};

/** Tone for any status without an explicit entry (AdminOrdersPage default). */
export const STATUS_TONE_FALLBACK = TONE_NEUTRAL;

export interface StatusBadgeProps {
  /** Raw status token, e.g. `out_for_delivery`, `pending_review`, `active`. */
  status: string;
  /**
   * Overrides the shared label map. Pass it where a page's current display
   * text is not the map label (raw tokens, or contextual text such as
   * AdminProductsPage's `Re-submitted` for flagged listings).
   */
  label?: string;
  className?: string;
}

/**
 * StatusBadge — renders a status token as the console's standard pill
 * (Badge geometry: rounded-full, `px-2.5 py-0.5 text-[10px] font-bold`).
 * Unknown statuses fall back to the neutral slate tone and a label of the
 * token with underscores replaced by spaces, matching AdminOrdersPage's
 * existing fallback. Pages whose badge geometry differs today
 * (AdminProductsPage uses `rounded-md py-1`) pass it via `className`.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = STATUS_TONES[status] ?? STATUS_TONE_FALLBACK;
  const text = label ?? STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <Badge variant="default" className={cn('px-2.5 py-0.5 text-[10px] font-bold', tone, className)}>
      {text}
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
