import { vi } from 'vitest';

type Row = Record<string, any>;

export interface DoubleAuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface DoubleSession {
  access_token: string;
  user: DoubleAuthUser;
}

export interface DoubleError {
  message: string;
}

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | string;

interface Listener {
  (event: AuthEvent, session: DoubleSession | null): void;
}

type Filter = (row: Row) => boolean;
type Order = { column: string; ascending: boolean };

/** Columns PostgREST walks for an embed, keyed by `<from table>.<referenced table>`. */
const EMBED_FK: Record<string, Record<string, string>> = {
  products: { categories: 'category_id', vendor_profiles: 'seller_id' },
  cart_items: { products: 'product_id' },
  wishlist_items: { products: 'product_id' },
  reviews: { products: 'product_id' },
  sub_orders: { vendor_profiles: 'seller_id', orders: 'order_group_id' },
  product_qa: { products: 'product_id' },
};

/** One-to-many embeds: `<from table>.<child table> = child.<foreign key>`. */
const CHILD_FK: Record<string, Record<string, string>> = {
  orders: { sub_orders: 'order_group_id' },
};

/** The unique indexes the migrations declare, so insert and upsert behave like Postgres. */
const UNIQUE_KEYS: Record<string, string[]> = {
  cart_items: ['user_id', 'product_id', 'variant_id'],
  wishlist_items: ['user_id', 'product_id'],
  reviews: ['product_id', 'author_id'],
  // Both configuration tables are singletons keyed by a boolean that must be true.
  platform_settings: ['id'],
  commission_config: ['id'],
};

/** `alias:referenced_table(cols)` in a PostgREST select list. */
const EMBED_RE = /^(?:([\w]+):)?([\w]+)\((.*)\)$/s;

/** The delivery statuses `issue_delivery_code` accepts. */
const OPEN_DELIVERY_STATUSES = ['placed', 'confirmed', 'packed', 'ready_for_pickup', 'shipped', 'out_for_delivery'];

/** `public.user_role`: `admin_set_user_roles` checks each label against this enum. */
const USER_ROLES = ['customer', 'vendor', 'admin', 'support', 'rider'];

/** The audiences `broadcast_notification()` will address; anything else it refuses. */
const NOTIFICATION_AUDIENCES = ['all', 'customer', 'vendor', 'support', 'admin', 'rider'];

/** The moderation states `admin_moderate_products` will write. */
const MODERATION_DECISIONS = ['approved', 'rejected', 'archived', 'pending_review'];

/** The states `admin_create_product_1p` accepts for a listing that has never been seen. */
const NEW_LISTING_STATUSES = ['draft', 'pending_review', 'approved'];

/** The only two standings `admin_set_vendor_status` accepts for a store. */
const VENDOR_STORE_STATUSES = ['active', 'suspended'];

/** The only three standings `admin_set_user_status` accepts for an account. */
const ACCOUNT_STATUSES = ['active', 'suspended', 'banned'];

/** The rulings `resolve_dispute` accepts. */
const DISPUTE_OUTCOMES = ['resolved_refund', 'resolved_denied'];

/** The disputes that still need a decision, which is what every risk count counts. */
const OPEN_DISPUTE_STATUSES = ['open', 'under_review', 'escalated'];

type RpcResult = { data: unknown; error: DoubleError | null };

/** A jsonb object as the RPCs return it; anything else stands in for `NULL`. */
function plain(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

/** An array as the RPCs return it: an absent jsonb is `[]`, never `null`. */
function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** `numeric(12,2)` in cents, so a total never picks up the float dust Postgres cannot produce. */
function cents(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/** The money a `numeric` total would carry back to the client. */
function dollars(value: number): number {
  return Math.round(value) / 100;
}

/** `(so.subtotal + so.shipping_fee)::numeric` - what the buyer was actually charged for a package. */
function packageGross(row: Row | undefined): number {
  return row ? dollars(cents(row.subtotal) + cents(row.shipping_fee)) : 0;
}

/** `count(*)` over the rows a subselect filters, which is the join work a client can see. */
function countWhere(rows: Row[], keep: (row: Row) => boolean): number {
  return rows.filter(keep).length;
}

/** `btrim(coalesce(p_search, '')) = ''` and then `ilike '%' || p_search || '%'` over the columns a queue searches. */
function ilikeAny(term: unknown, ...values: unknown[]): boolean {
  const needle = String(term ?? '').trim().toLowerCase();
  if (needle === '') return true;
  return values.some((value) => typeof value === 'string' && value.toLowerCase().includes(needle));
}

/** `coalesce(x, fallback)` for an integer parameter, which arrives as a number or `undefined`. */
function toInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

/** `coalesce(x, fallback)` for a fixture value a test pinned as a number. */
function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** `greatest(coalesce(p_days, 30), 1)`: the window every computed read measures itself over. */
function windowDays(value: unknown): number {
  return Math.max(toInt(value, 30), 1);
}

/** `greatest(coalesce(p_page, 1), 1)` and `greatest(coalesce(p_page_size, n), 1)`, plus the offset between them. */
function pageWindow(page: unknown, pageSize: unknown, fallbackSize: number) {
  const size = Math.max(toInt(pageSize, fallbackSize), 1);
  const at = Math.max(toInt(page, 1), 1);
  return { page: at, pageSize: size, from: (at - 1) * size, to: (at - 1) * size + size };
}

/** One key of an `order by`, with the rule the `from(table)` builders already use: a value a row
 *  does not carry sorts last rather than being compared against one. */
function byValue(pick: (row: Row) => string | number | null | undefined, descending = false) {
  return (a: Row, b: Row): number => {
    const left = pick(a);
    const right = pick(b);
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (left < right ? -1 : 1) * (descending ? -1 : 1);
  };
}

/** Applies an `order by` list to a derived result set without disturbing the seeded rows. */
function orderRows(rows: Row[], by: Array<(a: Row, b: Row) => number>): Row[] {
  return [...rows].sort((a, b) => {
    for (const compare of by) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

/** `coalesce(nullif(btrim(x), ''), current)` - the keep-what-is-there rule the category writes share. */
function keepText(value: unknown, current: unknown): unknown {
  if (value === null || value === undefined) return current;
  const trimmed = String(value).trim();
  return trimmed === '' ? current : trimmed;
}

/** `regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')`, the slug a first-party draft may omit. */
function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Splits a PostgREST select list on top-level commas only. */
function splitSelect(columns: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of columns) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${body}$`, 'i');
}

/**
 * Approximates `textSearch(..., { type: 'plain' })` over the tsvector the migrations build
 * from title/brand/description: every whitespace-separated term must appear, and a term
 * ending in `*` matches on a prefix, like the websearch operator does.
 */
function textSearchFilter(term: string): Filter {
  const terms = term.split(/\s+/).filter(Boolean);
  return (row) => {
    const haystack = [row.title, row.brand, row.description]
      .filter((value) => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    return terms.every((raw) => {
      const prefix = raw.endsWith('*');
      const needle = prefix ? raw.slice(0, -1) : raw;
      return prefix ? haystack.includes(needle) : haystack.split(/\W+/).includes(needle);
    });
  };
}

/**
 * In-memory stand-in for the slice of Supabase the data layer touches: table reads with
 * filters, ordering, ranges, counts and FK embeds, writes that honour unique keys and
 * `onConflict`, the RPCs the app calls, plus the GoTrue password/OAuth methods and the
 * auth listener. Postgres and GoTrue semantics themselves are covered offline by
 * scripts/smoke-rpcs.ts; this double only lets unit tests assert how the client maps
 * those responses.
 */
export function createSupabaseDouble() {
  const tables: Record<string, Row[]> = {
    profiles: [],
    vendor_profiles: [],
    products: [],
    categories: [],
    cart_items: [],
    wishlist_items: [],
    // The customer's own address book and saved payment methods (Phase 8 tables):
    // owner-scoped rows the account screens read and write directly under RLS.
    user_addresses: [],
    user_payment_methods: [],
    reviews: [],
    promotions: [],
    orders: [],
    sub_orders: [],
    deliveries: [],
    disputes: [],
    dispute_messages: [],
    product_qa: [],
    // CMS blocks: hero banners are the `homepage_hero` placement, read by both the
    // admin console (all rows) and the storefront (published rows only).
    content_blocks: [],
    media_items: [],
    vendor_shipping_settings: [],
    vendor_notification_prefs: [],
    message_threads: [],
    messages: [],
    notifications: [],
    // The desk's own template library: staff read it, only the author edits their copy.
    canned_responses: [],
    // The state the admin console owns: risk, money leaving, the audit trail, applications.
    vendor_strikes: [],
    refunds: [],
    audit_logs: [],
    vendor_applications: [],
    payouts: [],
    bank_accounts: [],
    rider_profiles: [],
    platform_settings: [],
    commission_config: [],
  };
  const failures: Record<string, string | null> = {};
  const authState = {
    session: null as DoubleSession | null,
    signInError: null as DoubleError | null,
    signUpError: null as DoubleError | null,
    signOutError: null as DoubleError | null,
    oAuthError: null as DoubleError | null,
    updateUserError: null as DoubleError | null,
    resendError: null as DoubleError | null,
    verifyOtpError: null as DoubleError | null,
    /** Forces a session for this user, even with no matching profile row. */
    signInUser: null as DoubleAuthUser | null,
    /** When true, signUp returns a user but no session, like an email-confirmation project. */
    confirmEmail: false,
  };
  /** Every `auth.updateUser` payload, in call order. */
  const updateUserCalls: Array<Record<string, unknown>> = [];
  /** Every `auth.resend` payload, in call order. */
  const resendCalls: Array<Record<string, unknown>> = [];
  /** Every `auth.verifyOtp` payload, in call order. */
  const verifyOtpCalls: Array<Record<string, unknown>> = [];
  /** Every storage upload the client attempted, with the bucket and object path it chose. */
  const storageUploads: Array<{ bucket: string; path: string; file: unknown }> = [];
  let storageUploadError: DoubleError | null = null;
  const listeners = new Set<Listener>();

  /** A `postgres_changes` binding, as `useRealtimeWatch` registers one. */
  interface RealtimeBinding {
    table: string;
    filter: string | null;
    callback: (payload: Row) => void;
  }

  /** The channels the components under test have opened, so a test can raise an event on them. */
  const realtimeChannels: Array<{ name: string; bindings: RealtimeBinding[] }> = [];

  /** PostgREST's `col=eq.value` subscription filter. */
  const matchesRealtimeFilter = (filter: string, record: Row | null): boolean => {
    const parsed = /^(\w+)=eq\.(.+)$/s.exec(filter);
    if (parsed === null) return true;
    return String(record?.[parsed[1]] ?? '') === parsed[2];
  };

  /** Delivers a change to every binding that asked for that table, as the publication would. */
  const emitRealtime = (table: string, payload: Row) => {
    realtimeChannels.forEach((channel) => {
      channel.bindings.forEach((binding) => {
        if (binding.table !== table) return;
        if (binding.filter !== null && !matchesRealtimeFilter(binding.filter, plain(payload.new))) return;
        binding.callback(payload);
      });
    });
  };
  let syntheticId = 0;
  let rpcError: DoubleError | null = null;
  const rpcCalls: Array<{ fn: string; args: Row }> = [];
  /** The jsonb `checkout_quote` / `place_order` would return; pricing stays in Postgres. */
  let quoteFixture: Row | null = null;
  let placedFixture: Row | null = null;
  /**
   * The jsonb the vendor aggregate RPCs return. Like pricing, the arithmetic is the
   * database's job (scripts/smoke-rpcs.ts covers it); a test pins one screen to known
   * numbers here, and the mapping in `api/dashboard.ts` / `api/earnings.ts` is what is
   * under test. Unset means "the store has no history yet", which is what the real
   * functions return for an empty ledger.
   */
  let dashboardFixture: Row | null = null;
  let balanceFixture: Row | null = null;
  let earningsFixture: Row | null = null;
  /**
   * The console's computed numbers. Cross-row sums, ratios and `now() - make_interval(...)`
   * windows are Postgres' work - `admin_dashboard`, `admin_report_summary`,
   * `admin_commission_overview`, `admin_logistics_board`, a queue's `counts`, `exposure` and
   * `booked`, and the money columns of a store row (`admin_vendor_settled_gmv`,
   * `vendor_earned_net_payout`, `vendor_available_balance`) - so a test pins the numbers it
   * asserts instead of the double recomputing them. Everything else a read reports stays derived
   * from the seeded tables: identity columns, joins, filters, ordering, paging and the count of
   * rows that matched.
   */
  let adminDashboardFixture: Row | null = null;
  let adminReportFixture: Row | null = null;
  let adminCommissionFixture: Row | null = null;
  let adminLogisticsFixture: Row | null = null;
  /** Per-store and per-order aggregates, keyed by the id the row carries, because the merchant
   *  queue and the merchant dossier read the same sums. */
  let adminStoreRollups: Record<string, Row> = {};
  let adminOrderRollups: Record<string, Row> = {};
  /** A read's aggregate sections: `{ counts, exposure }`, `{ booked }`, `{ actions }`, and a
   *  `rows` map for the per-row aggregates of any other derived read. */
  let adminQueueAggregates: Record<string, Row> = {};

  /** Resolves a select list against a row, replaying `alias:table(cols)` embeds recursively. */
  function project(target: Row, selectList: string, fromTable: string): Row {
    const parts = splitSelect(selectList);
    const out: Row = parts.includes('*') ? { ...target } : {};
    for (const part of parts) {
      if (part === '*') continue;
      const embed = EMBED_RE.exec(part);
      if (!embed) {
        out[part] = target[part];
        continue;
      }
      const name = embed[1] ?? embed[2];
      const referenced = embed[2];
      const fkColumn = EMBED_FK[fromTable]?.[referenced];
      if (fkColumn) {
        const child = (tables[referenced] ?? []).find((candidate) => candidate.id === target[fkColumn]) ?? null;
        out[name] = child ? project(child, embed[3], referenced) : null;
        continue;
      }
      // An order embeds its packages by their foreign key, the way PostgREST does.
      const childFk = CHILD_FK[fromTable]?.[referenced];
      if (childFk) {
        out[name] = (tables[referenced] ?? [])
          .filter((candidate) => candidate[childFk] === target.id)
          .map((candidate) => project(candidate, embed[3], referenced));
        continue;
      }
      out[name] = null;
    }
    return out;
  }

  /** The columns Postgres would fill for a row the client did not supply. */
  function withDefaults(table: string, row: Row): Row {
    const out: Row = { ...row };
    if (out.id === undefined) out.id = `${table}-${++syntheticId}`;
    if (out.created_at === undefined) out.created_at = new Date().toISOString();
    return out;
  }

  function uniqueConflict(table: string, row: Row): Row | undefined {
    const key = UNIQUE_KEYS[table];
    if (!key) return undefined;
    return (tables[table] ?? []).find((existing) => key.every((column) => existing[column] === row[column]));
  }

  function query(table: string) {
    const rows = () => tables[table] ?? [];
    const failure = () => failures[table] ?? null;
    const builder = {
      selected: '' as string,
      wantCount: false,
      /** `select('*', { count: 'exact', head: true })`: a count over the filters, no rows. */
      head: false,
      filters: [] as Filter[],
      orders: [] as Order[],
      take: null as number | null,
      window: null as [number, number] | null,
      signal: null as AbortSignal | null,
      /** Rows a write in this chain affected; a following `.select().single()` returns them. */
      written: null as Row[] | null,
      /** A rejected write, reported when the chain is awaited, as PostgREST reports it. */
      writeError: null as DoubleError | null,
      pending: null as { kind: 'update' | 'delete'; patch: Row | null } | null,
      select(columns: string, options?: { count?: string; head?: boolean }) {
        this.selected = columns;
        this.wantCount = options?.count !== undefined;
        this.head = options?.head === true;
        return this;
      },
      /** PostgREST's `col=is.null`, which is how an unread notice is matched. */
      is(column: string, value: unknown) {
        this.filters.push((row) => (row[column] ?? null) === value);
        return this;
      },
      eq(column: string, value: unknown) {
        this.filters.push((row) => row[column] === value);
        return this;
      },
      in(column: string, values: unknown[]) {
        this.filters.push((row) => values.includes(row[column]));
        return this;
      },
      gte(column: string, value: number) {
        this.filters.push((row) => Number(row[column]) >= value);
        return this;
      },
      lte(column: string, value: number) {
        this.filters.push((row) => Number(row[column]) <= value);
        return this;
      },
      ilike(column: string, pattern: string) {
        const re = patternToRegExp(pattern);
        this.filters.push((row) => typeof row[column] === 'string' && re.test(row[column]));
        return this;
      },
      textSearch(column: string, term: string) {
        void column;
        this.filters.push(textSearchFilter(term));
        return this;
      },
      order(column: string, options?: { ascending?: boolean }) {
        this.orders.push({ column, ascending: options?.ascending ?? true });
        return this;
      },
      limit(count: number) {
        this.take = count;
        return this;
      },
      range(from: number, to: number) {
        this.window = [from, to];
        return this;
      },
      abortSignal(signal: AbortSignal) {
        this.signal = signal;
        return this;
      },
      /** Rows the filters select, before ordering and paging. */
      filtered() {
        return rows().filter((row) => this.filters.every((keep) => keep(row)));
      },
      matched() {
        const sorted = this.filtered();
        for (const { column, ascending } of [...this.orders].reverse()) {
          sorted.sort((a, b) => {
            if (a[column] === b[column]) return 0;
            const later = a[column] === undefined || a[column] === null ? 1 : 0;
            if (later) return 1;
            return (a[column] < b[column] ? -1 : 1) * (ascending ? 1 : -1);
          });
        }
        const paged = this.window ? sorted.slice(this.window[0], this.window[1] + 1) : sorted;
        const limited = this.take !== null ? paged.slice(0, this.take) : paged;
        return limited.map((row) => this.withEmbeds(row));
      },
      /** Replays the select list's embeds against seeded rows, one level at a time. */
      withEmbeds(row: Row) {
        return project(row, this.selected, table);
      },
      outcome() {
        const message = failure();
        const pending = this.pending;
        const writeError = this.writeError;
        this.pending = null;
        this.writeError = null;
        if (message) return { data: null, error: { message }, count: null };
        if (writeError) return { data: null, error: writeError, count: null };
        if (this.signal?.aborted) {
          return { data: null, error: { name: 'AbortError', message: 'Aborted' }, count: null };
        }
        if (pending) {
          const targets = this.filtered();
          if (pending.kind === 'delete') {
            tables[table] = rows().filter((row) => !targets.includes(row));
            this.written = targets;
          } else {
            // PostgREST returns the row as it now reads, so the written rows carry the patch.
            const patched = targets.map((row) => ({ ...row, ...pending.patch }));
            const byOriginal = new Map(targets.map((row, index) => [row, patched[index]]));
            tables[table] = rows().map((row) => byOriginal.get(row) ?? row);
            this.written = patched;
          }
        }
        if (this.written) {
          // A write only returns rows when the chain asked for them, as PostgREST does.
          if (!this.selected) return { data: null, error: null, count: null };
          const affected = this.written.map((row) => this.withEmbeds(row));
          return { data: affected, error: null, count: this.wantCount ? affected.length : null };
        }
        if (this.head) {
          // A head read asks only for the count, so the rows stay unreturned, as PostgREST leaves them.
          return { data: null, error: null, count: this.filtered().length };
        }
        return { data: this.matched(), error: null, count: this.wantCount ? this.filtered().length : null };
      },
      // Real PostgREST builders are thenable, and stores await them directly.
      then(onFulfilled?: (value: { data: Row[] | null; error: DoubleError | null }) => unknown) {
        return Promise.resolve(this.outcome()).then(onFulfilled);
      },
      async maybeSingle() {
        const { data, error } = this.outcome();
        if (error) return { data: null, error };
        return { data: data?.[0] ?? null, error: null };
      },
      async single() {
        const { data, error } = this.outcome();
        if (error) return { data: null, error };
        const [first] = data ?? [];
        return first
          ? { data: first, error: null }
          : { data: null, error: { message: `No rows found for ${table}` } };
      },
      insert(values: Row | Row[]) {
        const message = failure();
        if (message) {
          this.writeError = { message };
          return this;
        }
        const incoming = Array.isArray(values) ? values : [values];
        for (const row of incoming) {
          if (uniqueConflict(table, row)) {
            this.writeError = {
              message: `duplicate key value violates unique constraint "${table}_key"`,
            };
            return this;
          }
        }
        const stored = incoming.map((row) => withDefaults(table, row));
        tables[table] = [...rows(), ...stored];
        this.written = stored;
        return this;
      },
      /**
       * `onConflict` decides whether a matching row is merged or a fresh one appended, which
       * is exactly the difference between a cart line updating its quantity and duplicating.
       */
      upsert(values: Row | Row[], options?: { onConflict?: string }) {
        const message = failure();
        if (message) {
          this.writeError = { message };
          return this;
        }
        const incoming = Array.isArray(values) ? values : [values];
        const key = options?.onConflict?.split(',').map((column) => column.trim());
        const stored: Row[] = [];
        for (const raw of incoming) {
          const row = withDefaults(table, raw);
          const existing = key
            ? rows().find((candidate) => key.every((column) => candidate[column] === row[column]))
            : uniqueConflict(table, row);
          if (!existing) {
            tables[table] = [...rows(), row];
            stored.push(row);
            continue;
          }
          const merged = { ...existing, ...row };
          tables[table] = rows().map((candidate) => (candidate === existing ? merged : candidate));
          stored.push(merged);
        }
        this.written = stored;
        return this;
      },
      /**
       * Like the real builder, these only record the write: it runs when the chain is
       * awaited, so every `.eq(...)` applied after the call is in place by then.
       */
      update(patch: Row) {
        this.pending = { kind: 'update', patch };
        return this;
      },
      delete() {
        this.pending = { kind: 'delete', patch: null };
        return this;
      },
    };
    return builder;
  }

  const emit = (event: AuthEvent, session: DoubleSession | null) => {
    listeners.forEach((listener) => listener(event, session));
  };

  /** The store the session owns, the way `current_vendor_id()` resolves it. */
  const vendorOfSession = () =>
    tables.vendor_profiles.find((row) => row.user_id === authState.session?.user.id)?.id ?? null;

  /** The caller, the way `auth.uid()` sees it: `null` when there is no session at all. */
  const sessionUserId = () => authState.session?.user.id ?? null;

  /**
   * `is_admin()` is a `profiles.roles` check on the caller's own row, so the console's guard
   * needs no flag of its own: a test grants or withholds the role exactly as the database does.
   */
  const sessionProfile = (): Row | null =>
    tables.profiles.find((row) => row.id === sessionUserId()) ?? null;

  const sessionHasRole = (role: string): boolean => asList(sessionProfile()?.roles).includes(role);

  /** `admin_require_admin()`: every console read and write starts from these two refusals. */
  const requireAdmin = (operation: string): DoubleError | null => {
    if (sessionUserId() === null) return { message: 'Not authenticated' };
    return sessionHasRole('admin') ? null : { message: `Only the platform team can ${operation}` };
  };

  /** The guard the pre-console governance RPCs carry: `is_admin() or has_role('support')`. */
  const requireStaff = (): DoubleError | null =>
    sessionHasRole('admin') || sessionHasRole('support') ? null : { message: 'Not authorized' };

  /** The name an RPC resolves an id to before the platform shows it, or `null` for no profile. */
  const nameOf = (id: unknown): string | null =>
    id === null || id === undefined
      ? null
      : tables.profiles.find((row) => row.id === id)?.name ?? null;

  /**
   * `admin_audit()`: the decision is written in the same transaction as the change it describes,
   * and `actor_role` follows that function's own order of checks. `review_vendor_application` and
   * `resolve_dispute` stamp a literal role instead, which is why they push their rows directly.
   */
  const audit = (
    action: string,
    entityType: string,
    entityId: string | null,
    before: Row | null = null,
    after: Row | null = null,
  ): Row => {
    const actor = sessionUserId();
    const entry: Row = {
      id: `audit-${++syntheticId}`,
      actor_id: actor,
      actor_role:
        actor === null
          ? 'System'
          : sessionHasRole('admin')
            ? 'Admin'
            : sessionHasRole('support')
              ? 'Support'
              : sessionHasRole('rider')
                ? 'Rider'
                : 'Customer',
      action,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: '127.0.0.1',
      before_data: before,
      after_data: after,
      created_at: new Date().toISOString(),
    };
    tables.audit_logs.push(entry);
    return entry;
  };

  /** A read's fixture section; unset means the aggregates stay at their honest zeros. */
  const queueAggregates = (read: string): Row => plain(adminQueueAggregates[read]);

  /** The aggregates one derived row reports: the shared per-store/per-order map, then its read's own. */
  const rowAggregates = (read: string, id: unknown, shared?: Record<string, Row>): Row => ({
    ...plain(shared === undefined ? undefined : shared[String(id)]),
    ...plain(plain(queueAggregates(read).rows)[String(id)]),
  });

  /** `select ps.payout_schedule from platform_settings ps limit 1`, the way the dossier reads it. */
  const platformSettings = (): Row => tables.platform_settings.find((row) => row.id === true) ?? {};

  /** `select cc.global_default_rate from commission_config cc limit 1`. */
  const commissionConfig = (): Row => tables.commission_config.find((row) => row.id === true) ?? {};

  /**
   * `sum(r.amount)` over the refund rows a package or an order already carries. The over-refund
   * guard has to weigh that ledger, so it is totalled in cents, exactly as `numeric(12,2)` would.
   */
  const refundTotalOn = (keep: (row: Row) => boolean): number =>
    dollars(tables.refunds.filter(keep).reduce((total, row) => total + cents(row.amount), 0));

  /** The migration chain inserts both configuration singletons, so a fresh double has them too. */
  function seedSingletons() {
    tables.platform_settings.push(platformSettingsRow());
    tables.commission_config.push(commissionConfigRow());
  }
  seedSingletons();

  /**
   * The real client's RPC call is awaitable *and* chainable - `.abortSignal(signal)` hands
   * back the same pending request. A query that passes a signal therefore needs this shape,
   * not a bare promise.
   */
  const chainableRpc = (
    call: (fn: string, args?: Row) => Promise<{ data: unknown; error: DoubleError | null }>,
  ) =>
    vi.fn((fn: string, args: Row = {}) => {
      const pending = call(fn, args);
      return Object.assign(pending, {
        abortSignal: (signal?: AbortSignal) =>
          signal?.aborted ? Promise.reject(new DOMException('Aborted', 'AbortError')) : pending,
      });
    });

  /** `admin_vendor_queue`'s `application_state`: the newest application the owning account filed. */
  const latestApplication = (userId: unknown): Row | null => {
    if (userId === null || userId === undefined) return null;
    const filed = tables.vendor_applications.filter((row) => row.user_id === userId);
    return filed.length > 0 ? orderRows(filed, [byValue((row) => row.created_at, true)])[0] : null;
  };

  /** The `kyc` the queue derives from that state; nothing filed yet means no documents seen. */
  const kycFrom = (application: Row | null): string => {
    const status = application === null ? 'none' : String(application.status);
    if (status === 'approved') return 'verified';
    if (status === 'pending' || status === 'under_review') return 'submitted';
    if (status === 'rejected') return 'rejected';
    return 'unverified';
  };

  /**
   * One merchant row. Identity columns come from `vendor_profiles`, the counts from the rows that
   * carry this store's id, and `kyc` from the application join. The money columns and `tier` are
   * sums and thresholds in SQL (`admin_vendor_settled_gmv`, `vendor_earned_net_payout`,
   * `vendor_available_balance`), so they stay 0 / `standard` until `setAdminVendors()` pins them.
   */
  const vendorQueueRow = (store: Row): Row => ({
    id: store.id,
    storeName: store.store_name,
    slug: store.slug,
    sellerType: store.seller_type,
    status: store.status,
    rating: store.rating,
    reviewCount: store.review_count,
    commissionRate: store.commission_rate_override ?? null,
    joinedAt: store.created_at ?? null,
    packages: countWhere(tables.sub_orders, (row) => row.seller_id === store.id),
    listings: countWhere(tables.products, (row) => row.seller_id === store.id),
    pendingListings: countWhere(
      tables.products,
      (row) => row.seller_id === store.id && row.status === 'pending_review',
    ),
    strikes: countWhere(tables.vendor_strikes, (row) => row.vendor_id === store.id),
    openDisputes: countWhere(
      tables.disputes,
      (row) => row.vendor_id === store.id && OPEN_DISPUTE_STATUSES.includes(String(row.status)),
    ),
    kyc: kycFrom(latestApplication(store.user_id)),
    gross: 0,
    commission: 0,
    net: 0,
    balance: 0,
    paidOut: 0,
    tier: 'standard',
    ...rowAggregates('admin_vendor_queue', store.id, adminStoreRollups),
  });

  /** A package as the dossier lists it: `gross` is `(subtotal + shipping_fee)::numeric`. */
  const vendorPackageRow = (sub: Row): Row => ({
    id: sub.id,
    orderGroupId: sub.order_group_id,
    status: sub.status,
    type: sub.type,
    gross: packageGross(sub),
    commission: sub.commission_amount,
    net: sub.net_payout,
    createdAt: sub.created_at ?? null,
    updatedAt: sub.updated_at ?? null,
    buyerEmail: tables.orders.find((row) => row.id === sub.order_group_id)?.customer_email ?? null,
  });

  /** A strike with the name of whoever issued it, the way `admin_audit()` records it. */
  const strikeDetailRow = (strike: Row): Row => ({
    id: strike.id,
    reason: strike.reason,
    note: strike.note ?? null,
    createdAt: strike.created_at ?? null,
    issuedBy: nameOf(strike.issued_by),
  });

  /**
   * A listing with its store, its category and the person who decided it - the four joins the
   * moderation queue reports. `flagged` is the SQL's own comparison: resubmitted after the
   * decision that hid it, which is what puts it back in front of a human.
   */
  const moderationRow = (product: Row): Row => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand ?? '',
    price: product.price,
    stock: product.stock,
    type: product.type,
    status: product.status,
    images: asList(product.images),
    rejectionReason: product.rejection_reason ?? null,
    createdAt: product.created_at ?? null,
    moderatedAt: product.moderated_at ?? null,
    moderatedBy: nameOf(product.moderated_by),
    sellerId: product.seller_id,
    storeName: tables.vendor_profiles.find((row) => row.id === product.seller_id)?.store_name ?? null,
    sellerStatus: tables.vendor_profiles.find((row) => row.id === product.seller_id)?.status ?? null,
    category: tables.categories.find((row) => row.id === product.category_id)?.name ?? null,
    flagged:
      product.status === 'pending_review' &&
      String(product.updated_at ?? '') > String(product.moderated_at ?? product.created_at ?? ''),
  });

  /**
   * An order group with its packages. `gross`, `commission` and `paidToSellers` are sums over
   * those packages and `leadStatus` is `max(sub_order_status)`, which follows the enum's
   * declaration order rather than the alphabet, so both come from `setAdminOrders()`.
   */
  const orderQueueRow = (order: Row): Row => {
    const packages = orderRows(
      tables.sub_orders.filter((row) => row.order_group_id === order.id),
      [byValue((row) => row.created_at)],
    );
    return {
      id: order.id,
      customerEmail: order.customer_email ?? '',
      createdAt: order.created_at ?? null,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      gross: 0,
      commission: 0,
      paidToSellers: 0,
      leadStatus: 'placed',
      packages: packages.length,
      lines: packages.map((sub) => ({
        id: sub.id,
        sellerId: sub.seller_id,
        status: sub.status,
        gross: packageGross(sub),
      })),
      ...rowAggregates('admin_order_queue', order.id, adminOrderRollups),
    };
  };

  /** An account with the record the console can jump to: its store, or its rider profile. */
  const userQueueRow = (profile: Row): Row => ({
    id: profile.id,
    name: profile.name ?? '',
    email: profile.email ?? '',
    avatarUrl: profile.avatar_url ?? '',
    roles: asList(profile.roles),
    vendorStatus: profile.vendor_status ?? null,
    accountStatus: profile.account_status ?? 'active',
    accountStatusReason: profile.account_status_reason ?? null,
    joinedAt: profile.created_at ?? null,
    orders: countWhere(tables.orders, (row) => row.customer_id === profile.id),
    // `volume` is a sum over the account's packages, so only a fixture can carry it.
    volume: 0,
    linkedId:
      tables.vendor_profiles.find((row) => row.user_id === profile.id)?.id ??
      tables.rider_profiles.find((row) => row.user_id === profile.id)?.id ??
      null,
    ...rowAggregates('admin_user_queue', profile.id),
  });

  /** A case with the money it could move: the disputed package's gross and its message count. */
  /** `coalesce(sum(r.amount), 0)` over the refund rows a package carries. */
  const refundedOnPackage = (subOrderId: string): number =>
    tables.refunds
      .filter((row) => String(row.sub_order_id ?? '') === subOrderId)
      .reduce((total, row) => total + Number(row.amount ?? 0), 0);

  const disputeQueueRow = (dispute: Row): Row => {
    const sub = tables.sub_orders.find((row) => row.id === dispute.sub_order_id);
    return {
      id: dispute.id,
      reason: dispute.reason ?? '',
      status: dispute.status,
      urgency: dispute.urgency,
      customerId: dispute.customer_id ?? null,
      customerName: dispute.customer_name ?? '',
      vendorName: dispute.vendor_name ?? '',
      vendorId: dispute.vendor_id ?? null,
      subOrderId: dispute.sub_order_id ?? null,
      orderGroupId: dispute.order_group_id ?? null,
      evidencePhotos: asList(dispute.evidence_photos),
      resolutionNote: dispute.resolution_note ?? null,
      resolutionAmount: dispute.resolution_amount ?? null,
      agentName: nameOf(dispute.assigned_agent_id),
      assignedAgentId: dispute.assigned_agent_id ?? null,
      messages: countWhere(tables.dispute_messages, (row) => row.dispute_id === dispute.id),
      packageGross: packageGross(sub),
      // What the refund ledger already returned on this package, the way the queue's
      // `refunded_amount` subselect adds it up.
      refundedAmount: refundedOnPackage(String(dispute.sub_order_id ?? '')),
      remainingGross: Math.max(packageGross(sub) - refundedOnPackage(String(dispute.sub_order_id ?? '')), 0),
      packageStatus: sub === undefined ? 'n/a' : String(sub.status),
      createdAt: dispute.created_at ?? null,
      updatedAt: dispute.updated_at ?? null,
    };
  };

  /** An audit entry with the actor's name resolved, and no invented address. */
  const auditQueueRow = (entry: Row): Row => ({
    id: entry.id,
    action: entry.action,
    actorRole: entry.actor_role ?? 'System',
    actorName: nameOf(entry.actor_id),
    entityType: entry.entity_type ?? null,
    entityId: entry.entity_id ?? null,
    ipAddress: entry.ip_address ?? null,
    before: entry.before_data ?? null,
    after: entry.after_data ?? null,
    createdAt: entry.created_at ?? null,
  });

  /** A tree node with the listings that point at it; `shelfValue` is `sum(price * stock)`. */
  const categoryNode = (category: Row, children: Row[]): Row => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon ?? null,
    image: category.image ?? null,
    isActive: category.is_active ?? true,
    commissionOverride: category.commission_rate_override ?? null,
    products: countWhere(tables.products, (row) => row.category_id === category.id),
    sellers: new Set(
      tables.products.filter((row) => row.category_id === category.id).map((row) => row.seller_id),
    ).size,
    shelfValue: 0,
    ...rowAggregates('admin_category_tree', category.id),
    ...(children.length > 0 ? { children } : {}),
  });

  /** `admin_require_admin()` then the read, in that order, for every console call. */
  const refuse = (operation: string): RpcResult | null => {
    const error = requireAdmin(operation);
    return error === null ? null : { data: null, error };
  };

  /** `require_staff()`: the platform team or the support desk, and nobody else. */
  const refuseStaff = (operation: string): RpcResult | null => {
    if (sessionUserId() === null) return { data: null, error: { message: 'Not authenticated' } };
    if (sessionHasRole('admin') || sessionHasRole('support')) return null;
    return { data: null, error: { message: `Only staff can ${operation}` } };
  };

  /** `count(*)` over the statuses the moderation queue facets by. */
  const moderationCounts = (): Row => ({
    pendingReview: countWhere(tables.products, (row) => row.status === 'pending_review'),
    approved: countWhere(tables.products, (row) => row.status === 'approved'),
    rejected: countWhere(tables.products, (row) => row.status === 'rejected'),
    draft: countWhere(tables.products, (row) => row.status === 'draft'),
    archived: countWhere(tables.products, (row) => row.status === 'archived'),
  });

  /** The dispute queue's facets, including the urgent ones still waiting on staff. */
  const disputeCounts = (): Row => ({
    open: countWhere(tables.disputes, (row) => row.status === 'open'),
    underReview: countWhere(tables.disputes, (row) => row.status === 'under_review'),
    escalated: countWhere(tables.disputes, (row) => row.status === 'escalated'),
    resolved: countWhere(tables.disputes, (row) => String(row.status).startsWith('resolved')),
    urgent: countWhere(
      tables.disputes,
      (row) => row.urgency === 'urgent' && OPEN_DISPUTE_STATUSES.includes(String(row.status)),
    ),
    awaitingStaff: countWhere(
      tables.disputes,
      (row) => OPEN_DISPUTE_STATUSES.includes(String(row.status)),
    ),
    unassigned: countWhere(
      tables.disputes,
      (row) => !row.assigned_agent_id && OPEN_DISPUTE_STATUSES.includes(String(row.status)),
    ),
    // `assigned_agent_id = auth.uid()`: whose pool this is depends on who is asking.
    mine: countWhere(
      tables.disputes,
      (row) => row.assigned_agent_id === sessionUserId() && OPEN_DISPUTE_STATUSES.includes(String(row.status)),
    ),
  });

  /** The accounts queue's facets, `roles @> array['admin']` for each role. */
  const userCounts = (): Row => ({
    all: tables.profiles.length,
    admins: countWhere(tables.profiles, (row) => asList(row.roles).includes('admin')),
    vendors: countWhere(tables.profiles, (row) => asList(row.roles).includes('vendor')),
    support: countWhere(tables.profiles, (row) => asList(row.roles).includes('support')),
    riders: countWhere(tables.profiles, (row) => asList(row.roles).includes('rider')),
    suspended: countWhere(tables.profiles, (row) => String(row.account_status ?? 'active') !== 'active'),
  });

  /** `jsonb_agg` over `(select action, count(*) from audit_logs group by action order by count(*) desc)`. */
  const auditActions = (): unknown[] => {
    const tallied = new Map<string, number>();
    tables.audit_logs.forEach((entry) => {
      const action = String(entry.action);
      tallied.set(action, (tallied.get(action) ?? 0) + 1);
    });
    return orderRows(
      [...tallied].map(([action, count]) => ({ action, count })),
      [byValue((row) => Number(row.count), true)],
    );
  };

  /**
   * The admin console's RPCs. Reads return the jsonb shape the SQL builds, with the key names
   * `src/features/admin/api/*.ts` maps, and writes move the rows the change is about and then
   * audit it. Counts over seeded rows are derived - the same predicate-count the `from(table)`
   * builders do for an exact count - while sums, ratios and `now()` windows are fixture-only,
   * because those are the arithmetic `npm run db:check` covers.
   */
  function adminRpc(fn: string, args: Row): RpcResult | null {
    // ---------------------------------------------- platform overview and reports
    if (fn === 'admin_dashboard') {
      const denied = refuse('read the platform overview');
      if (denied) return denied;
      // Every figure is a sum over the ledger; `setAdminDashboard()` hands back the jsonb.
      return {
        data: adminDashboardFixture ?? adminDashboardJson({ days: windowDays(args.p_days) }),
        error: null,
      };
    }
    if (fn === 'admin_report_summary') {
      const denied = refuse('read a report');
      if (denied) return denied;
      const bucket = args.p_bucket === 'month' || args.p_bucket === 'week' ? args.p_bucket : 'day';
      return {
        data: adminReportFixture ?? adminReportJson({ days: windowDays(args.p_days), bucket }),
        error: null,
      };
    }
    if (fn === 'admin_commission_overview') {
      const denied = refuse('read the commission ledger');
      if (denied) return denied;
      // The default rate is a column read, not an aggregate, so the seeded row answers it.
      return {
        data:
          adminCommissionFixture ??
          adminCommissionJson({
            days: windowDays(args.p_days),
            globalDefaultRate: toNumber(commissionConfig().global_default_rate, 0.1),
          }),
        error: null,
      };
    }
    if (fn === 'admin_logistics_board') {
      const denied = refuse('read the dispatch board');
      if (denied) return denied;
      return { data: adminLogisticsFixture ?? adminLogisticsJson(), error: null };
    }

    // ---------------------------------------------- merchants
    if (fn === 'admin_vendor_queue') {
      const denied = refuse('list merchants');
      if (denied) return denied;
      const status = String(args.p_status ?? 'all');
      const matched = tables.vendor_profiles.filter((store) => {
        const owner = tables.profiles.find((row) => row.id === store.user_id) ?? null;
        return (
          (status === 'all' ||
            (status === 'pending' && owner?.vendor_status === 'pending') ||
            (status === 'suspended' &&
              (store.status === 'suspended' || owner?.vendor_status === 'suspended')) ||
            String(store.status) === status) &&
          ilikeAny(args.p_search, store.store_name, store.slug, owner?.email)
        );
      });
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 12);
      const rows = orderRows(matched.map(vendorQueueRow), [
        byValue((row) => Number(row.gross), true),
        byValue((row) => String(row.storeName)),
      ]).slice(from, to);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, matched.length),
          // Applicants have no store row yet, so "pending" is the applications table.
          pending: toInt(sections.pending, countWhere(tables.vendor_applications, (row) => row.status === 'pending' || row.status === 'under_review')),
          suspended: toInt(sections.suspended, countWhere(tables.vendor_profiles, (row) => row.status === 'suspended')),
          // Counts are joins; the money inside `volume` is a SUM and stays a fixture (db:check owns it).
          volume: {
            gross: 0,
            commission: 0,
            net: 0,
            stores: tables.vendor_profiles.length,
            active: countWhere(tables.vendor_profiles, (row) => row.status === 'active'),
            ...plain(sections.volume),
          },
          // The applicants behind that count, oldest first: who has waited longest to be decided.
          applicants: orderRows(
            tables.vendor_applications
              .filter((row) => row.status === 'pending' || row.status === 'under_review')
              .map((row) => ({
                id: row.id,
                userId: row.user_id ?? null,
                storeName: row.proposed_store_name,
                slug: row.proposed_slug,
                businessType: row.business_type,
                contactEmail: row.contact_email,
                contactPhone: row.contact_phone ?? null,
                description: row.description ?? '',
                status: row.status,
                reviewNote: row.review_note ?? null,
                submittedAt: row.created_at,
                policyAccepted: row.policy_accepted === true,
                hasStore: tables.vendor_profiles.some((store) => store.user_id === row.user_id),
              })),
            [byValue((row) => String(row.submittedAt))],
          ),
          rows,
        },
        error: null,
      };
    }
    if (fn === 'admin_vendor_detail') {
      const denied = refuse('open a merchant record');
      if (denied) return denied;
      const store = tables.vendor_profiles.find((row) => row.id === args.p_vendor_id);
      if (!store) return { data: null, error: { message: 'Store not found' } };
      const owner = tables.profiles.find((row) => row.id === store.user_id) ?? null;
      return {
        data: {
          id: store.id,
          userId: store.user_id ?? null,
          storeName: store.store_name,
          slug: store.slug,
          description: store.description ?? '',
          logo: store.logo ?? '',
          banner: store.banner ?? null,
          sellerType: store.seller_type,
          status: store.status,
          rating: store.rating,
          reviewCount: store.review_count,
          commissionRate: store.commission_rate_override ?? null,
          joinedAt: store.created_at ?? null,
          email: owner?.email ?? null,
          name: owner?.name ?? null,
          vendorStatus: owner?.vendor_status ?? null,
          accountStatus: owner?.account_status ?? null,
          roles: asList(owner?.roles),
          gross: 0,
          net: 0,
          balance: 0,
          reserve: 0,
          paidOut: 0,
          tier: 'standard',
          payoutSchedule: platformSettings().payout_schedule ?? null,
          ...rowAggregates('admin_vendor_detail', store.id, adminStoreRollups),
          // The dossier's own lists, newest first, at the same limits the SQL applies.
          packages: orderRows(tables.sub_orders.filter((row) => row.seller_id === store.id), [
            byValue((row) => row.created_at, true),
          ])
            .slice(0, 20)
            .map(vendorPackageRow),
          strikes: orderRows(tables.vendor_strikes.filter((row) => row.vendor_id === store.id), [
            byValue((row) => row.created_at, true),
          ]).map(strikeDetailRow),
          payouts: orderRows(tables.payouts.filter((row) => row.vendor_id === store.id), [
            byValue((row) => row.created_at, true),
          ])
            .slice(0, 10)
            .map((payout) => ({
              id: payout.id,
              amount: payout.amount,
              status: payout.status,
              method: payout.payment_method,
              reference: payout.payment_reference ?? null,
              createdAt: payout.created_at ?? null,
            })),
          bankAccounts: orderRows(tables.bank_accounts.filter((row) => row.vendor_id === store.id), [
            byValue((row) => (row.is_default ? 0 : 1)),
          ]).map((account) => ({
            id: account.id,
            holderName: account.holder_name,
            bankName: account.bank_name,
            maskedAccount: account.masked_account,
            isDefault: account.is_default === true,
          })),
          disputes: orderRows(tables.disputes.filter((row) => row.vendor_id === store.id), [
            byValue((row) => row.created_at, true),
          ])
            .slice(0, 10)
            .map((dispute) => ({
              id: dispute.id,
              reason: dispute.reason,
              status: dispute.status,
              urgency: dispute.urgency,
              createdAt: dispute.created_at ?? null,
              resolutionAmount: dispute.resolution_amount ?? null,
            })),
          applications: orderRows(
            tables.vendor_applications.filter((row) => row.user_id === store.user_id),
            [byValue((row) => row.created_at, true)],
          ).map((application) => ({
            id: application.id,
            status: application.status,
            businessType: application.business_type,
            contactEmail: application.contact_email,
            createdAt: application.created_at ?? null,
            reviewNote: application.review_note ?? null,
          })),
          auditTrail: orderRows(
            tables.audit_logs.filter(
              (entry) => entry.entity_type === 'vendor' && String(entry.entity_id) === String(store.id),
            ),
            [byValue((entry) => entry.created_at, true)],
          )
            .slice(0, 25)
            .map((entry) => ({
              id: entry.id,
              action: entry.action,
              actorRole: entry.actor_role ?? 'System',
              createdAt: entry.created_at ?? null,
              before: entry.before_data ?? null,
              after: entry.after_data ?? null,
              actor: nameOf(entry.actor_id),
            })),
        },
        error: null,
      };
    }
    if (fn === 'admin_set_vendor_status') {
      const denied = refuse('change a store’s status');
      if (denied) return denied;
      const status = String(args.p_status ?? '');
      if (!VENDOR_STORE_STATUSES.includes(status)) {
        return { data: null, error: { message: 'A store is either active or suspended' } };
      }
      const store = tables.vendor_profiles.find((row) => row.id === args.p_vendor_id);
      if (!store) return { data: null, error: { message: 'Store not found' } };
      const before = { status: store.status, storeName: store.store_name };
      store.status = status;
      // The account's standing follows, so signing in cannot land a suspended store back in its
      // workspace; reactivating only lifts a suspension, never promotes an unapproved account.
      if (store.user_id !== null && store.user_id !== undefined) {
        const owner = tables.profiles.find((row) => row.id === store.user_id);
        if (owner && status === 'suspended') owner.vendor_status = 'suspended';
        if (owner && status === 'active' && owner.vendor_status === 'suspended') owner.vendor_status = 'approved';
      }
      audit('vendor.' + status, 'vendor', String(store.id), before, {
        status,
        note: args.p_note ?? null,
      });
      return { data: { id: store.id, status }, error: null };
    }
    if (fn === 'admin_set_vendor_commission') {
      const denied = refuse('change a store’s commission');
      if (denied) return denied;
      const rate = args.p_rate ?? null;
      const outOfRange = rate !== null && (Number(rate) < 0 || Number(rate) > 0.5);
      if (outOfRange) return { data: null, error: { message: 'Commission must be between 0% and 50%' } };
      const store = tables.vendor_profiles.find((row) => row.id === args.p_vendor_id);
      if (!store) return { data: null, error: { message: 'Store not found' } };
      const before = store.commission_rate_override ?? null;
      store.commission_rate_override = rate === null ? null : Number(rate);
      // `commission_config.vendor_overrides` is the map the settings screens list.
      const config = commissionConfig();
      const overrides = plain(config.vendor_overrides);
      if (rate === null) delete overrides[String(store.id)];
      else overrides[String(store.id)] = Number(rate);
      config.vendor_overrides = overrides;
      audit('commission.vendor.set', 'vendor', String(store.id), { rate: before }, {
        rate: rate === null ? null : Number(rate),
        storeName: store.store_name,
      });
      return { data: { id: store.id, rate: rate === null ? null : Number(rate) }, error: null };
    }
    if (fn === 'admin_issue_strike') {
      const denied = refuse('record a strike against a store');
      if (denied) return denied;
      const reason = args.p_reason === null || args.p_reason === undefined ? null : String(args.p_reason).trim();
      if (reason === null || reason === '') return { data: null, error: { message: 'A strike needs a reason' } };
      const store = tables.vendor_profiles.find((row) => row.id === args.p_vendor_id);
      if (!store) return { data: null, error: { message: 'Store not found' } };
      tables.vendor_strikes.push({
        id: `strike-${++syntheticId}`,
        vendor_id: store.id,
        reason,
        note: args.p_note ?? null,
        issued_by: sessionUserId(),
        created_at: new Date().toISOString(),
      });
      const total = countWhere(tables.vendor_strikes, (row) => row.vendor_id === store.id);
      audit('vendor.strike', 'vendor', String(store.id), null, {
        reason: args.p_reason,
        note: args.p_note ?? null,
        total,
      });
      return { data: { vendorId: store.id, strikes: total }, error: null };
    }

    // ---------------------------------------------- moderation
    if (fn === 'admin_moderation_queue') {
      const denied = refuse('read the moderation queue');
      if (denied) return denied;
      const status = String(args.p_status ?? 'pending_review');
      const category = args.p_category ?? null;
      const matched = tables.products.filter((product) => {
        const store = tables.vendor_profiles.find((row) => row.id === product.seller_id);
        return (
          (status === 'all' || String(product.status) === status) &&
          (category === null || product.category_id === category) &&
          ilikeAny(args.p_search, product.title, product.brand, product.slug, store?.store_name)
        );
      });
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 12);
      const rows = orderRows(matched.map(moderationRow), [byValue((row) => row.createdAt)]).slice(from, to);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, matched.length),
          counts: { ...moderationCounts(), ...plain(sections.counts) },
          rows,
        },
        error: null,
      };
    }
    if (fn === 'admin_moderate_products') {
      const denied = refuse('moderate listings');
      if (denied) return denied;
      const status = String(args.p_status ?? '');
      if (!MODERATION_DECISIONS.includes(status)) {
        return { data: null, error: { message: 'Invalid moderation status' } };
      }
      const reason = args.p_reason ?? null;
      const blank = reason === null || reason === undefined || String(reason).trim() === '';
      if (status === 'rejected' && blank) {
        return { data: null, error: { message: 'A rejected listing needs a reason the seller can read' } };
      }
      const decided: unknown[] = [];
      asList(args.p_product_ids).forEach((id) => {
        const product = tables.products.find((row) => row.id === id);
        // A row that is not there, or already at the requested state, is skipped, not counted.
        if (!product || String(product.status) === status) return;
        const before = product.status;
        product.status = status;
        product.rejection_reason = status === 'rejected' ? reason : null;
        product.moderated_by = sessionUserId();
        product.moderated_at = new Date().toISOString();
        product.updated_at = product.moderated_at;
        audit('product.' + status, 'product', String(product.id), { status: before }, {
          status,
          reason: status === 'rejected' ? reason : null,
        });
        decided.push(product.id);
      });
      return { data: { decided: decided.length, ids: decided }, error: null };
    }
    if (fn === 'admin_assign_moderator') {
      const denied = refuse('assign a listing to a moderator');
      if (denied) return denied;
      const moderator = tables.profiles.find(
        (row) => row.id === args.p_moderator_id && (asList(row.roles).includes('admin') || asList(row.roles).includes('support')),
      );
      if (!moderator) {
        return { data: null, error: { message: 'That account is not staff, so it cannot hold moderation work' } };
      }
      const product = tables.products.find((row) => row.id === args.p_product_id);
      if (!product) return { data: null, error: { message: 'Listing not found' } };
      product.assigned_moderator_id = moderator.id;
      audit('product.assign_moderator', 'product', String(product.id), null, {
        moderatorId: moderator.id,
      });
      return { data: { id: product.id, moderatorId: moderator.id }, error: null };
    }
    if (fn === 'admin_create_product_1p') {
      const denied = refuse('publish a first-party listing');
      if (denied) return denied;
      // The platform's own store is looked up, never named by the caller.
      const store = tables.vendor_profiles.find((row) => row.seller_type === 'platform');
      if (!store) {
        return { data: null, error: { message: 'The platform has no store record to sell from' } };
      }
      const input = plain(args.p_input);
      const title = input.title === null || input.title === undefined ? '' : String(input.title).trim();
      if (title === '') return { data: null, error: { message: 'A listing needs a title' } };
      if (!(Number(input.price) > 0)) {
        return { data: null, error: { message: 'A listing needs a price above zero' } };
      }
      const status = input.status === null || input.status === undefined ? 'pending_review' : String(input.status);
      if (!NEW_LISTING_STATUSES.includes(status)) {
        return { data: null, error: { message: 'A new listing can be a draft, sent for review, or approved' } };
      }
      const at = new Date().toISOString();
      const product: Row = {
        id: `product-${++syntheticId}`,
        title,
        slug: keepText(input.slug, slugify(title)),
        description: input.description ?? '',
        category_id: input.categoryId === '' ? null : input.categoryId ?? null,
        brand: input.brand ?? '',
        images: asList(input.images),
        price: Number(input.price),
        compare_at_price:
          input.compareAtPrice === null || input.compareAtPrice === undefined || input.compareAtPrice === ''
            ? null
            : Number(input.compareAtPrice),
        type: input.type === '' || input.type === null || input.type === undefined ? 'physical' : String(input.type),
        seller_id: store.id,
        variants: asList(input.variants),
        stock: Math.max(toInt(input.stock, 0), 0),
        shipping_settings: plain(input.shippingSettings),
        digital_asset_info: plain(input.digitalAssetInfo),
        status,
        rejection_reason: null,
        rating: 0,
        review_count: 0,
        // A listing created approved was approved by someone, so the decision is recorded with it.
        moderated_by: status === 'approved' ? sessionUserId() : null,
        moderated_at: status === 'approved' ? at : null,
        assigned_moderator_id: null,
        created_at: at,
        updated_at: at,
      };
      tables.products.push(product);
      audit('product.create_1p', 'product', String(product.id), null, {
        title: input.title,
        status,
        price: input.price,
      });
      return { data: { id: product.id, status, sellerId: store.id }, error: null };
    }
    if (fn === 'admin_assign_product_category') {
      const denied = refuse('move a listing between categories');
      if (denied) return denied;
      const product = tables.products.find((row) => row.id === args.p_product_id);
      if (!product) return { data: null, error: { message: 'Listing not found' } };
      const category = args.p_category_id ?? null;
      if (category !== null && !tables.categories.some((row) => row.id === category)) {
        return { data: null, error: { message: 'Category not found' } };
      }
      const before = product.category_id ?? null;
      product.category_id = category;
      audit('product.category', 'product', String(product.id), { categoryId: before }, { categoryId: category });
      return { data: { id: product.id, categoryId: category }, error: null };
    }

    // ---------------------------------------------- orders and refunds
    if (fn === 'admin_order_queue') {
      const denied = refuse('read the order queue');
      if (denied) return denied;
      const status = String(args.p_status ?? 'all');
      const payment = String(args.p_payment ?? 'all');
      const rows = orderRows(
        tables.orders
          .map(orderQueueRow)
          .filter(
            (row) =>
              (status === 'all' || String(row.leadStatus) === status) &&
              (payment === 'all' || String(row.paymentStatus) === payment) &&
              ilikeAny(args.p_search, row.id, row.customerEmail),
          ),
        [byValue((row) => row.createdAt, true)],
      );
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 12);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, rows.length),
          // `booked` is the sum of every order's packages, so only a fixture can carry it.
          booked: toNumber(sections.booked, 0),
          rows: rows.slice(from, to),
        },
        error: null,
      };
    }
    if (fn === 'admin_order_detail') {
      const denied = refuse('read an order');
      if (denied) return denied;
      const order = tables.orders.find((row) => row.id === args.p_order_group_id);
      // The SQL selects from one row: an unknown id yields no row at all, not an error.
      if (!order) return { data: null, error: null };
      const packages = orderRows(tables.sub_orders.filter((row) => row.order_group_id === order.id), [
        byValue((row) => row.created_at),
      ]);
      const sections = rowAggregates('admin_order_detail', order.id, adminOrderRollups);
      return {
        data: {
          id: order.id,
          customerEmail: order.customer_email ?? '',
          customerId: order.customer_id ?? null,
          shippingAddress: order.shipping_address ?? {},
          paymentMethod: order.payment_method,
          paymentDetails: order.payment_details ?? {},
          paymentStatus: order.payment_status,
          createdAt: order.created_at ?? null,
          gross: toNumber(sections.gross, 0),
          commission: toNumber(sections.commission, 0),
          // The refund ledger is totalled here and in `admin_refund_sub_order`, which refuses on it.
          refunded: toNumber(sections.refunded, refundTotalOn((row) => row.order_group_id === order.id)),
          packages: packages.map((sub) => {
            const delivery = tables.deliveries.find((row) => row.sub_order_id === sub.id);
            return {
              id: sub.id,
              sellerId: sub.seller_id,
              storeName: tables.vendor_profiles.find((row) => row.id === sub.seller_id)?.store_name ?? null,
              type: sub.type,
              status: sub.status,
              items: asList(sub.items),
              subtotal: sub.subtotal,
              shippingFee: sub.shipping_fee,
              commissionRate: sub.commission_rate,
              commissionAmount: sub.commission_amount,
              netPayout: sub.net_payout,
              riderId: sub.rider_id ?? null,
              licenseKey: sub.license_key ?? null,
              carrierName: sub.carrier_name ?? null,
              trackingNumber: sub.tracking_number ?? null,
              returnReason: sub.return_reason ?? null,
              history: asList(sub.history),
              createdAt: sub.created_at ?? null,
              updatedAt: sub.updated_at ?? null,
              delivery: delivery
                ? {
                    status: delivery.status,
                    riderId: delivery.rider_id ?? null,
                    pickedUpAt: delivery.picked_up_at ?? null,
                    deliveredAt: delivery.delivered_at ?? null,
                  }
                : null,
            };
          }),
          disputes: orderRows(tables.disputes.filter((row) => row.order_group_id === order.id), [
            byValue((row) => row.created_at, true),
          ]).map((dispute) => ({
            id: dispute.id,
            reason: dispute.reason,
            status: dispute.status,
            urgency: dispute.urgency,
            vendorName: dispute.vendor_name,
            resolutionNote: dispute.resolution_note ?? null,
            resolutionAmount: dispute.resolution_amount ?? null,
            createdAt: dispute.created_at ?? null,
          })),
          refunds: orderRows(tables.refunds.filter((row) => row.order_group_id === order.id), [
            byValue((row) => row.created_at, true),
          ]).map((refund) => ({
            id: refund.id,
            amount: refund.amount,
            reason: refund.reason,
            createdAt: refund.created_at ?? null,
            processedBy: nameOf(refund.processed_by),
          })),
        },
        error: null,
      };
    }
    if (fn === 'admin_refund_sub_order') {
      const denied = refuse('refund a package');
      if (denied) return denied;
      const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
      const order = sub ? tables.orders.find((row) => row.id === sub.order_group_id) : undefined;
      // The package and its order both have to be there, because the SQL joins them for the email.
      if (!sub || !order) return { data: null, error: { message: 'Package not found' } };
      if (String(sub.status) === 'refunded') {
        return { data: null, error: { message: 'This package has already been refunded' } };
      }
      const amount = args.p_amount === null || args.p_amount === undefined ? null : Number(args.p_amount);
      if (amount === null || !Number.isFinite(amount) || amount <= 0) {
        return { data: null, error: { message: 'A refund needs an amount above zero' } };
      }
      const already = refundTotalOn((row) => row.sub_order_id === sub.id);
      const gross = packageGross(sub);
      if (cents(already) + cents(amount) > cents(gross)) {
        return {
          data: null,
          error: { message: 'Cannot refund more than the buyer was charged for this package' },
        };
      }
      const reason =
        args.p_reason === null || args.p_reason === undefined
          ? 'Platform administrative refund'
          : String(args.p_reason).trim();
      // Same rule the SQL now enforces: only a refund of the whole gross closes the package,
      // so a partial leaves the remaining balance refundable.
      const fully = cents(already) + cents(amount) >= cents(gross);
      const beforeStatus = String(sub.status);
      tables.refunds.push({
        id: `refund-${++syntheticId}`,
        sub_order_id: sub.id,
        order_group_id: order.id,
        amount,
        reason,
        processed_by: sessionUserId(),
        created_at: new Date().toISOString(),
      });
      if (fully) sub.status = 'refunded';
      sub.history = [
        ...asList(sub.history),
        {
          status: fully ? 'refunded' : 'partial_refund',
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          note: `${fully ? 'Refunded' : 'Partial refund of'} ${amount}: ${args.p_reason ?? 'no reason recorded'}`,
        },
      ];
      // Only when nothing on the order is left unrefunded does the order itself read as refunded.
      const open = tables.sub_orders.some(
        (row) => row.order_group_id === order.id && String(row.status) !== 'refunded',
      );
      if (fully && !open) order.payment_status = 'refunded';
      audit('order.refund', 'sub_order', String(sub.id), { status: beforeStatus, refundedSoFar: already }, {
        amount,
        reason: args.p_reason ?? null,
        gross,
      });
      return { data: { subOrderId: sub.id, amount, reason: args.p_reason ?? null }, error: null };
    }

    if (fn === 'assign_rider') {
      // `assign_rider` is admin-only and refuses an unknown package or rider, in that
      // order; the delivery row follows the package, opening as `assigned`.
      const denied = refuse('assign a rider');
      if (denied) return denied;
      const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
      if (!sub) return { data: null, error: { message: 'Sub-order not found' } };
      const rider = tables.rider_profiles.find((row) => row.id === args.p_rider_id);
      if (!rider) return { data: null, error: { message: 'Rider not found' } };
      sub.rider_id = rider.id;
      for (const delivery of tables.deliveries) {
        if (delivery.sub_order_id !== sub.id) continue;
        delivery.rider_id = rider.id;
        delivery.assigned_at = new Date().toISOString();
        if (delivery.status === 'pending') delivery.status = 'assigned';
      }
      audit('delivery.rider_assigned', 'sub_order', String(sub.id), null, { rider_id: rider.id });
      return { data: { subOrderId: sub.id, riderId: rider.id }, error: null };
    }

    // ---------------------------------------------- disputes
    if (fn === 'admin_dispute_queue' || fn === 'support_dispute_queue') {
      // One read, two names: `support_dispute_queue` forwards to this body in Postgres, and
      // both are guarded by `require_staff()` rather than admin-only.
      const denied = refuseStaff('read the dispute queue');
      if (denied) return denied;
      const status = String(args.p_status ?? 'all');
      const matched = tables.disputes
        .filter(
          (dispute) =>
            (status === 'all' ||
              (status === 'awaiting_staff' && OPEN_DISPUTE_STATUSES.includes(String(dispute.status))) ||
              (status === 'resolved' && String(dispute.status).startsWith('resolved')) ||
              String(dispute.status) === status) &&
            (args.p_assigned_to === null || args.p_assigned_to === undefined ||
              dispute.assigned_agent_id === args.p_assigned_to) &&
            (args.p_unassigned !== true || !dispute.assigned_agent_id) &&
            ilikeAny(args.p_search, dispute.reason, dispute.customer_name, dispute.vendor_name, dispute.id),
        )
        .map(disputeQueueRow);
      // Urgent cases first, then the longest-waiting, exactly as the queue's `order by` reads.
      const rows = orderRows(matched, [
        byValue((row) => (row.urgency === 'urgent' ? 0 : 1)),
        byValue((row) => row.createdAt),
      ]);
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 12);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, rows.length),
          counts: { ...disputeCounts(), ...plain(sections.counts) },
          // The exposure the ruling is weighed against is a sum over the open cases.
          exposure: toNumber(sections.exposure, 0),
          rows: rows.slice(from, to),
        },
        error: null,
      };
    }
    if (fn === 'admin_escalate_dispute') {
      const denied = refuse('escalate a dispute');
      if (denied) return denied;
      const dispute = tables.disputes.find((row) => row.id === args.p_dispute_id);
      if (!dispute) return { data: null, error: { message: 'Dispute not found' } };
      const before = dispute.status;
      dispute.status = 'escalated';
      dispute.urgency = 'urgent';
      dispute.assigned_agent_id = sessionUserId();
      // A justification that only lives in a toast decides nothing, so the note goes on the case.
      const note = args.p_note === null || args.p_note === undefined ? '' : String(args.p_note).trim();
      if (note !== '') {
        tables.dispute_messages.push({
          id: `dispute-message-${++syntheticId}`,
          dispute_id: dispute.id,
          sender_id: sessionUserId(),
          sender_role: 'support',
          sender_name: sessionProfile()?.name ?? 'Staff',
          content: note,
          is_internal_note: true,
          attachments: [],
          created_at: new Date().toISOString(),
        });
      }
      audit('dispute.escalate', 'dispute', String(dispute.id), { status: before }, {
        status: 'escalated',
        note: args.p_note ?? null,
      });
      return { data: { id: dispute.id, status: 'escalated' }, error: null };
    }
    // --------------------------------------------------------------------------
    // Support desk (Phase 7): the same queue by its support name, the hand-over
    // menu, staff replies, partial refunds and the rider's own board.
    // --------------------------------------------------------------------------

    /** `support_staff_directory()`: every account with support access, plus the caller's load. */
    if (fn === 'support_staff_directory') {
      const denied = refuseStaff('read the agent directory');
      if (denied) return denied;
      return {
        data: {
          agents: tables.profiles
            .filter((row) => asList(row.roles).includes('support'))
            .map((row) => ({
              id: row.id,
              name: String(row.name || row.email),
              email: row.email,
              isMe: row.id === sessionUserId(),
              openCases: countWhere(
                tables.disputes,
                (dispute) =>
                  dispute.assigned_agent_id === row.id && OPEN_DISPUTE_STATUSES.includes(String(dispute.status)),
              ),
            })),
        },
        error: null,
      };
    }

    /** `assign_dispute()`: staff-only, never to yourself, never to an account without support access. */
    if (fn === 'assign_dispute') {
      const denied = refuseStaff('assign disputes');
      if (denied) return denied;
      if (args.p_agent_id === sessionUserId()) {
        return { data: null, error: { message: 'You cannot assign a dispute to yourself' } };
      }
      const agent = tables.profiles.find((row) => row.id === args.p_agent_id);
      if (!agent || !asList(agent.roles).includes('support')) {
        return { data: null, error: { message: 'That account does not have support access' } };
      }
      const dispute = tables.disputes.find((row) => row.id === args.p_dispute_id);
      if (!dispute) return { data: null, error: { message: 'Dispute not found' } };
      const before = dispute.assigned_agent_id ?? null;
      dispute.assigned_agent_id = agent.id;
      audit('dispute.assign', 'dispute', String(dispute.id), { assignedAgentId: before }, {
        assignedAgentId: agent.id,
      });
      return { data: { id: dispute.id, assignedAgentId: agent.id }, error: null };
    }

    /** `escalate_to_support()`: raises urgency, takes the case, and refuses a closed one. */
    if (fn === 'escalate_to_support') {
      const denied = refuseStaff('escalate disputes');
      if (denied) return denied;
      const dispute = tables.disputes.find((row) => row.id === args.p_dispute_id);
      if (!dispute) return { data: null, error: { message: 'Dispute not found' } };
      if (String(dispute.status).startsWith('resolved')) {
        return { data: null, error: { message: 'Resolved disputes cannot be escalated' } };
      }
      dispute.status = 'escalated';
      dispute.urgency = 'urgent';
      dispute.assigned_agent_id = sessionUserId();
      const note = String(args.p_note ?? '').trim();
      if (note !== '') {
        tables.dispute_messages.push({
          id: `dispute-message-${++syntheticId}`,
          dispute_id: dispute.id,
          sender_id: sessionUserId(),
          sender_role: 'support',
          sender_name: sessionProfile()?.name ?? 'Staff',
          content: note,
          is_internal_note: true,
          attachments: [],
          created_at: new Date().toISOString(),
        });
      }
      audit('dispute.escalate', 'dispute', String(dispute.id), null, { status: 'escalated' });
      return { data: { id: dispute.id, status: dispute.status }, error: null };
    }

    /** `add_dispute_message()`: a staff reply on a thread the buyer or store could never post to. */
    if (fn === 'add_dispute_message') {
      const denied = refuseStaff('post on a dispute');
      if (denied) return denied;
      const dispute = tables.disputes.find((row) => row.id === args.p_dispute_id);
      if (!dispute) return { data: null, error: { message: 'Dispute not found' } };
      const content = String(args.p_content ?? '').trim();
      if (content === '') return { data: null, error: { message: 'Write something before posting' } };
      const id = `dispute-message-${++syntheticId}`;
      tables.dispute_messages.push({
        id,
        dispute_id: dispute.id,
        sender_id: sessionUserId(),
        sender_role: 'support',
        sender_name: sessionProfile()?.name ?? 'Staff',
        sender_avatar: sessionProfile()?.avatar_url ?? null,
        content,
        is_internal_note: args.p_is_internal_note === true,
        attachments: [],
        created_at: new Date().toISOString(),
      });
      return { data: id, error: null };
    }

    /**
     * `support_refund_sub_order()`: capped at what the buyer was charged, and the package only
     * closes once the whole gross is back - the same rule Postgres enforces.
     */
    if (fn === 'support_refund_sub_order') {
      const denied = refuseStaff('issue refunds');
      if (denied) return denied;
      const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
      if (!sub) return { data: null, error: { message: 'Sub-order not found' } };
      if (sub.status === 'refunded') {
        return { data: null, error: { message: 'This package has already been fully refunded' } };
      }
      const amount = Number(args.p_amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { data: null, error: { message: 'A refund needs an amount above zero' } };
      }
      const gross = packageGross(sub);
      const already = refundedOnPackage(String(sub.id));
      if (already + amount > gross) {
        return { data: null, error: { message: `Cannot refund more than the buyer was charged ($${gross})` } };
      }
      tables.refunds.push({
        id: `refund-${++syntheticId}`,
        sub_order_id: sub.id,
        order_group_id: sub.order_group_id,
        amount,
        reason: args.p_reason,
        processed_by: sessionUserId(),
        created_at: new Date().toISOString(),
      });
      const fully = already + amount >= gross;
      if (fully) sub.status = 'refunded';
      sub.history = [
        ...(Array.isArray(sub.history) ? sub.history : []),
        {
          status: fully ? 'refunded' : 'partial_refund',
          timestamp: new Date().toISOString(),
          actor: String(args.p_actor_role ?? 'Staff'),
          note: `${fully ? 'Refunded' : 'Partial refund of'} ${amount}: ${args.p_reason}`,
        },
      ];
      audit('order.refund', 'sub_order', String(sub.id), { gross, alreadyRefunded: already }, {
        amount,
        reason: args.p_reason,
        fullyRefunded: fully,
      });
      return {
        data: { subOrderId: sub.id, amount, remainingGross: gross - already - amount, fullyRefunded: fully },
        error: null,
      };
    }

    /** `support_lookup_orders()`: the buyer's own orders by email, packages joined in. */
    if (fn === 'support_lookup_orders') {
      const denied = refuseStaff('look up an order');
      if (denied) return denied;
      const days = Math.max(Number(args.p_days ?? 30), 1);
      const since = Date.now() - days * 86_400_000;
      return {
        data: tables.orders
          .filter((order) =>
            String(order.customer_email ?? '').toLowerCase() === String(args.p_customer_email ?? '').toLowerCase() &&
            new Date(String(order.created_at ?? 0)).getTime() >= since,
          )
          .map((order) => {
            const packages = tables.sub_orders.filter((row) => row.order_group_id === order.id);
            return {
              id: order.id,
              customer_email: order.customer_email,
              payment_method: order.payment_method,
              payment_status: order.payment_status,
              created_at: order.created_at,
              packages: packages.map((row) => ({
                id: row.id,
                sellerId: row.seller_id,
                status: row.status,
                type: row.type,
                gross: packageGross(row),
                commission: row.commission_amount,
                net: row.net_payout,
                carrierName: row.carrier_name,
                trackingNumber: row.tracking_number,
              })),
              has_open_return: packages.some((row) => row.return_reason !== null && row.return_reason !== undefined),
            };
          }),
        error: null,
      };
    }

    /** `send_support_notification()`: a notice addressed to the account the desk picked. */
    if (fn === 'send_support_notification') {
      const denied = refuseStaff('send notifications');
      if (denied) return denied;
      const title = String(args.p_title ?? '').trim();
      if (title === '') return { data: null, error: { message: 'Notification title is required' } };
      const id = `notification-${++syntheticId}`;
      tables.notifications.push({
        id,
        user_id: args.p_user_id,
        type: 'dispute',
        title,
        message: String(args.p_message ?? ''),
        href: args.p_href ?? null,
        read_at: null,
        created_at: new Date().toISOString(),
      });
      return { data: id, error: null };
    }

    /**
     * `broadcast_notification()`: staff address a role and every account carrying it gets its own
     * row, because `read_at` is a per-person fact. The sender cannot read those rows back - they
     * belong to other trays - so the audit record is what the console lists as the delivery log.
     */
    if (fn === 'broadcast_notification') {
      const denied = refuseStaff('broadcast a notification');
      if (denied) return denied;
      const title = String(args.p_title ?? '').trim();
      if (title === '') return { data: null, error: { message: 'Notification title is required' } };
      const audience = String(args.p_role_target ?? '');
      if (!NOTIFICATION_AUDIENCES.includes(audience)) {
        return { data: null, error: { message: `Unknown notification audience ${audience || '<null>'}` } };
      }
      const reached = tables.profiles.filter(
        (profile) => audience === 'all' || asList(profile.roles).includes(audience),
      );
      const stamp = new Date().toISOString();
      const body = String(args.p_message ?? '').trim().slice(0, 500);
      reached.forEach((profile) => {
        tables.notifications.push({
          id: `notification-${++syntheticId}`,
          user_id: profile.id,
          role_target: audience,
          type: String(args.p_type ?? 'system'),
          title: title.slice(0, 120),
          message: body,
          href: args.p_href ?? null,
          read_at: null,
          created_at: stamp,
        });
      });
      audit('notification.broadcast', 'broadcast', null, null, {
        audience,
        type: String(args.p_type ?? 'system'),
        title: title.slice(0, 120),
        message: body,
        href: args.p_href ?? null,
        recipients: reached.length,
      });
      return { data: reached.length, error: null };
    }

    /**
     * `rider_delivery_board()`: only the signed-in rider's own parcels. A caller without a
     * rider profile is refused rather than shown an empty route.
     */
    if (fn === 'rider_delivery_board') {
      const rider = tables.rider_profiles.find((row) => row.user_id === sessionUserId());
      if (!rider) return { data: null, error: { message: 'Not a rider' } };
      const own = tables.deliveries.filter((row) => row.rider_id === rider.id);
      const open = own.filter((row) => row.status !== 'delivered');
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      return {
        data: {
          rider: {
            id: rider.id,
            full_name: rider.full_name,
            phone: rider.phone ?? '',
            vehicle_type: rider.vehicle_type ?? '',
            status: rider.status,
            sla_ceiling_hours: rider.sla_ceiling_hours ?? 4,
          },
          deliveries: open.map((row) => {
            const sub = tables.sub_orders.find((pkg) => pkg.id === row.sub_order_id);
            const order = tables.orders.find((group) => group.id === sub?.order_group_id);
            const store = tables.vendor_profiles.find((vendor) => vendor.id === sub?.seller_id);
            return {
              id: row.id,
              subOrderId: row.sub_order_id,
              status: row.status,
              assignedAt: row.assigned_at ?? null,
              pickedUpAt: row.picked_up_at ?? null,
              deliveredAt: row.delivered_at ?? null,
              needsHandoverCode: Boolean(row.handover_code_hash),
              gross: packageGross(sub),
              customerNotes: sub?.customer_notes ?? null,
              address: order?.shipping_address ?? {},
              customerEmail: order?.customer_email ?? '',
              storeName: store?.store_name ?? '',
            };
          }),
          counts: {
            assigned: countWhere(own, (row) => row.status === 'assigned'),
            inFlight: countWhere(own, (row) =>
              ['picked_up', 'in_transit', 'out_for_delivery'].includes(String(row.status)),
            ),
            deliveredToday: countWhere(own, (row) =>
              row.status === 'delivered' && new Date(String(row.delivered_at ?? 0)) >= dayStart),
            completedAllTime: countWhere(own, (row) => row.status === 'delivered'),
          },
        },
        error: null,
      };
    }

    /** `verify_delivery()`: the handover code is the only way a parcel reaches `delivered`. */
    if (fn === 'verify_delivery') {
      const rider = tables.rider_profiles.find((row) => row.user_id === sessionUserId());
      if (!rider) return { data: null, error: { message: 'Not a rider' } };
      const delivery = tables.deliveries.find((row) => row.id === args.p_delivery_id && row.rider_id === rider.id);
      if (!delivery) return { data: null, error: { message: 'Delivery not assigned to this rider' } };
      if (String(delivery.handover_code_hash ?? '') !== String(args.p_code ?? '')) {
        audit('delivery.code_failed', 'delivery', String(delivery.id), null, null);
        return { data: null, error: { message: 'Invalid handover code' } };
      }
      delivery.status = 'delivered';
      delivery.delivered_at = new Date().toISOString();
      delivery.proof_of_delivery = { verified_by: sessionUserId(), at: delivery.delivered_at };
      const sub = tables.sub_orders.find((row) => row.id === delivery.sub_order_id);
      if (sub) {
        sub.status = 'delivered';
        sub.history = [
          ...(Array.isArray(sub.history) ? sub.history : []),
          { status: 'delivered', timestamp: delivery.delivered_at, actor: 'Rider', note: 'Handover code verified' },
        ];
      }
      return { data: { deliveryId: delivery.id, status: 'delivered' }, error: null };
    }

    if (fn === 'resolve_dispute') {
      const denied = requireStaff();
      if (denied) return { data: null, error: denied };
      const outcome = String(args.p_outcome ?? '');
      if (!DISPUTE_OUTCOMES.includes(outcome)) {
        return { data: null, error: { message: 'Invalid outcome' } };
      }
      const dispute = tables.disputes.find((row) => row.id === args.p_dispute_id);
      if (!dispute) return { data: null, error: { message: 'Dispute not found' } };
      dispute.status = outcome;
      dispute.resolution_note = args.p_note ?? null;
      dispute.resolution_amount = outcome === 'resolved_refund' ? args.p_amount ?? null : null;
      if (outcome === 'resolved_refund' && dispute.sub_order_id) {
        const sub = tables.sub_orders.find((row) => row.id === dispute.sub_order_id);
        if (sub) {
          sub.status = 'refunded';
          sub.history = [
            ...asList(sub.history),
            {
              status: 'refunded',
              timestamp: new Date().toISOString(),
              actor: 'Support',
              note: args.p_note ?? 'Refund issued from dispute resolution',
            },
          ];
        }
      }
      // The message is written `from profiles`, so a caller with no profile row writes none.
      const caller = sessionProfile();
      if (caller) {
        tables.dispute_messages.push({
          id: `dispute-message-${++syntheticId}`,
          dispute_id: dispute.id,
          sender_id: caller.id,
          sender_role: 'support',
          sender_name: caller.name,
          content: args.p_note ?? `Dispute ${outcome}`,
          is_internal_note: false,
          attachments: [],
          created_at: new Date().toISOString(),
        });
      }
      tables.audit_logs.push({
        id: `audit-${++syntheticId}`,
        actor_id: sessionUserId(),
        actor_role: 'Support',
        action: 'dispute.' + outcome,
        entity_type: 'dispute',
        entity_id: String(dispute.id),
        ip_address: '127.0.0.1',
        before_data: null,
        after_data: { amount: args.p_amount ?? null },
        created_at: new Date().toISOString(),
      });
      return { data: true, error: null };
    }

    // ---------------------------------------------- accounts
    if (fn === 'admin_user_queue') {
      const denied = refuse('read the accounts queue');
      if (denied) return denied;
      const role = String(args.p_role ?? 'all');
      const status = String(args.p_status ?? 'all');
      const matched = tables.profiles.filter(
        (profile) =>
          (role === 'all' || asList(profile.roles).includes(role)) &&
          (status === 'all' || String(profile.account_status ?? 'active') === status) &&
          ilikeAny(args.p_search, profile.name, profile.email),
      );
      const rows = orderRows(matched.map(userQueueRow), [byValue((row) => row.joinedAt, true)]);
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 20);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, rows.length),
          counts: { ...userCounts(), ...plain(sections.counts) },
          rows: rows.slice(from, to),
        },
        error: null,
      };
    }
    if (fn === 'admin_set_user_status') {
      const denied = refuse('change an account’s status');
      if (denied) return denied;
      const status = String(args.p_status ?? '');
      if (!ACCOUNT_STATUSES.includes(status)) {
        return { data: null, error: { message: 'Unknown account status' } };
      }
      if (args.p_user_id === sessionUserId()) {
        return { data: null, error: { message: 'You cannot suspend your own account' } };
      }
      const profile = tables.profiles.find((row) => row.id === args.p_user_id);
      if (!profile) return { data: null, error: { message: 'Account not found' } };
      const before = profile.account_status ?? 'active';
      profile.account_status = status;
      profile.account_status_reason = args.p_reason ?? null;
      profile.account_status_at = new Date().toISOString();
      audit('account.' + status, 'user', String(profile.id), { status: before }, {
        status,
        reason: args.p_reason ?? null,
      });
      return { data: { id: profile.id, status }, error: null };
    }
    if (fn === 'admin_set_user_roles') {
      const denied = refuse('change an account’s roles');
      if (denied) return denied;
      if (args.p_user_id === sessionUserId()) {
        return { data: null, error: { message: 'You cannot change your own roles' } };
      }
      const roles = asList(args.p_roles);
      if (roles.length === 0) {
        return { data: null, error: { message: 'An account needs at least one role' } };
      }
      const unknown = roles.find((role) => !USER_ROLES.includes(String(role)));
      if (unknown !== undefined) {
        return { data: null, error: { message: `Unknown role ${unknown}` } };
      }
      const profile = tables.profiles.find((row) => row.id === args.p_user_id);
      if (!profile) return { data: null, error: { message: 'Account not found' } };
      const before = asList(profile.roles);
      profile.roles = roles;
      audit('account.roles', 'user', String(profile.id), { roles: before }, { roles });
      return { data: { id: profile.id, roles }, error: null };
    }

    // ---------------------------------------------- audit trail
    if (fn === 'admin_audit_queue') {
      const denied = refuse('read the audit trail');
      if (denied) return denied;
      const action = String(args.p_action ?? 'all');
      const matched = tables.audit_logs
        .filter((entry) => {
          const actor = tables.profiles.find((row) => row.id === entry.actor_id);
          return (
            (action === 'all' || String(entry.action) === action) &&
            ilikeAny(
              args.p_search,
              entry.action,
              entry.entity_id,
              entry.entity_type,
              actor?.name,
            )
          );
        })
        .map(auditQueueRow);
      const rows = orderRows(matched, [byValue((row) => row.createdAt, true)]);
      const { page, pageSize, from, to } = pageWindow(args.p_page, args.p_page_size, 25);
      const sections = queueAggregates(fn);
      return {
        data: {
          page,
          pageSize,
          total: toInt(sections.total, rows.length),
          actions: asList(sections.actions).length > 0 ? asList(sections.actions) : auditActions(),
          rows: rows.slice(from, to),
        },
        error: null,
      };
    }

    // ---------------------------------------------- taxonomy
    if (fn === 'admin_category_tree') {
      const denied = refuse('read the category tree');
      if (denied) return denied;
      const roots = tables.categories.filter((row) => row.parent_id === null || row.parent_id === undefined);
      const childrenOf = (parent: unknown) =>
        orderRows(
          tables.categories.filter((row) => row.parent_id === parent).map((row) => categoryNode(row, [])),
          [byValue((row) => String(row.name))],
        );
      const sections = queueAggregates(fn);
      return {
        data: {
          total: toInt(sections.total, tables.categories.length),
          roots: orderRows(roots, [byValue((row) => String(row.name))]).map((row) =>
            categoryNode(row, childrenOf(row.id)),
          ),
          // Listings with no category are the shelf the taxonomy page still has to place.
          unmapped: orderRows(
            tables.products.filter((row) => row.category_id === null || row.category_id === undefined),
            [byValue((row) => row.created_at, true)],
          )
            .slice(0, 50)
            .map((product) => ({
              id: product.id,
              title: product.title,
              slug: product.slug,
              brand: product.brand ?? '',
              price: product.price,
              stock: product.stock,
              status: product.status,
              storeName: tables.vendor_profiles.find((row) => row.id === product.seller_id)?.store_name ?? null,
            })),
        },
        error: null,
      };
    }
    if (fn === 'admin_create_category') {
      const denied = refuse('create a category');
      if (denied) return denied;
      const name = args.p_name === null || args.p_name === undefined ? '' : String(args.p_name).trim();
      if (name === '') return { data: null, error: { message: 'A category needs a name' } };
      const slug = args.p_slug === null || args.p_slug === undefined ? '' : String(args.p_slug).trim();
      if (slug === '') return { data: null, error: { message: 'A category needs a slug' } };
      const parent = args.p_parent_id ?? null;
      if (parent !== null && !tables.categories.some((row) => row.id === parent)) {
        return { data: null, error: { message: 'The parent category does not exist' } };
      }
      const at = new Date().toISOString();
      const category: Row = {
        id: `category-${++syntheticId}`,
        name,
        slug: slug.toLowerCase(),
        icon: args.p_icon ?? null,
        image: args.p_image ?? null,
        commission_rate_override: null,
        parent_id: parent,
        is_active: true,
        created_at: at,
        updated_at: at,
      };
      tables.categories.push(category);
      audit('category.create', 'category', String(category.id), null, {
        name: args.p_name,
        slug: args.p_slug,
        parentId: parent,
      });
      // The SQL echoes the values it was handed, trimmed or not.
      return { data: { id: category.id, name: args.p_name, slug: args.p_slug }, error: null };
    }
    if (fn === 'admin_update_category') {
      const denied = refuse('edit a category');
      if (denied) return denied;
      const category = tables.categories.find((row) => row.id === args.p_category_id);
      if (!category) return { data: null, error: { message: 'Category not found' } };
      // A category cannot sit inside itself; that breaks the tree the page walks.
      if (args.p_parent_id !== null && args.p_parent_id !== undefined && args.p_parent_id === category.id) {
        return { data: null, error: { message: 'A category cannot be its own parent' } };
      }
      const before = {
        name: category.name,
        slug: category.slug,
        parentId: category.parent_id ?? null,
        isActive: category.is_active ?? true,
      };
      const slug = args.p_slug === null || args.p_slug === undefined ? '' : String(args.p_slug).trim();
      category.name = keepText(args.p_name, category.name);
      category.slug = slug === '' ? category.slug : slug.toLowerCase();
      if (args.p_parent_id !== null && args.p_parent_id !== undefined) category.parent_id = args.p_parent_id;
      if (args.p_is_active !== null && args.p_is_active !== undefined) category.is_active = args.p_is_active;
      if (args.p_icon !== null && args.p_icon !== undefined) category.icon = args.p_icon;
      if (args.p_image !== null && args.p_image !== undefined) category.image = args.p_image;
      audit('category.update', 'category', String(category.id), before, {
        name: args.p_name ?? null,
        slug: args.p_slug ?? null,
        parentId: args.p_parent_id ?? null,
        isActive: args.p_is_active ?? null,
      });
      return { data: { id: category.id }, error: null };
    }
    if (fn === 'admin_delete_category') {
      const denied = refuse('delete a category');
      if (denied) return denied;
      const id = args.p_category_id;
      const products = countWhere(tables.products, (row) => row.category_id === id);
      const children = countWhere(tables.categories, (row) => row.parent_id === id);
      // Silently orphaning a shelf of products is what the audit trail exists to prevent.
      if (products > 0) {
        return { data: null, error: { message: `This category still has ${products} listing(s). Re-assign them first` } };
      }
      if (children > 0) {
        return { data: null, error: { message: `This category still has ${children} subcategor(y/ies). Move them first` } };
      }
      tables.categories = tables.categories.filter((row) => row.id !== id);
      audit('category.delete', 'category', String(id), null, null);
      return { data: { id, deleted: true }, error: null };
    }

    // ---------------------------------------------- commission and settings
    if (fn === 'admin_set_global_commission') {
      const denied = refuse('change the platform commission');
      if (denied) return denied;
      const rate = args.p_rate === null || args.p_rate === undefined ? null : Number(args.p_rate);
      if (rate === null || !Number.isFinite(rate) || rate < 0 || rate > 0.5) {
        return { data: null, error: { message: 'Commission must be between 0% and 50%' } };
      }
      const config = tables.commission_config.find((row) => row.id === true);
      if (!config) return { data: null, error: { message: 'Commission configuration is missing' } };
      const before = config.global_default_rate;
      config.global_default_rate = rate;
      config.updated_at = new Date().toISOString();
      audit('commission.global.set', 'commission_config', 'global', { rate: before }, { rate });
      return { data: { rate }, error: null };
    }
    if (fn === 'admin_set_category_commission') {
      const denied = refuse('change a category commission');
      if (denied) return denied;
      const rate = args.p_rate ?? null;
      if (rate !== null && (Number(rate) < 0 || Number(rate) > 0.5)) {
        return { data: null, error: { message: 'Commission must be between 0% and 50%' } };
      }
      const category = tables.categories.find((row) => row.id === args.p_category_id);
      if (!category) return { data: null, error: { message: 'Category not found' } };
      const before = category.commission_rate_override ?? null;
      category.commission_rate_override = rate === null ? null : Number(rate);
      const config = commissionConfig();
      const overrides = plain(config.category_overrides);
      if (rate === null) delete overrides[String(category.id)];
      else overrides[String(category.id)] = Number(rate);
      config.category_overrides = overrides;
      audit('commission.category.set', 'category', String(category.id), { rate: before }, {
        rate: rate === null ? null : Number(rate),
        name: category.name,
      });
      return { data: { id: category.id, rate: rate === null ? null : Number(rate) }, error: null };
    }
    if (fn === 'admin_save_platform_settings') {
      const denied = refuse('change platform settings');
      if (denied) return denied;
      const settings = tables.platform_settings.find((row) => row.id === true);
      // `update ... where id = true` then re-reads the row; with no row, the function returns NULL.
      if (!settings) return { data: null, error: null };
      const before = { ...settings };
      const input = plain(args.p_settings);
      settings.platform_name = keepText(input.platformName, settings.platform_name);
      settings.support_email = keepText(input.supportEmail, settings.support_email);
      settings.default_currency = keepText(input.currency, settings.default_currency);
      settings.payout_schedule = keepText(input.payoutSchedule, settings.payout_schedule);
      settings.new_listing_review = keepText(input.newListingReview, settings.new_listing_review);
      if (input.minPayoutFloor !== null && input.minPayoutFloor !== undefined) {
        settings.min_payout_floor = Number(input.minPayoutFloor);
      }
      if (input.reserveRetentionDays !== null && input.reserveRetentionDays !== undefined) {
        settings.reserve_retention_days = toInt(input.reserveRetentionDays, settings.reserve_retention_days);
      }
      if (input.slaCeilingHours !== null && input.slaCeilingHours !== undefined) {
        settings.sla_ceiling_hours = toInt(input.slaCeilingHours, settings.sla_ceiling_hours);
      }
      settings.updated_by = sessionUserId();
      settings.updated_at = new Date().toISOString();
      audit('settings.update', 'platform_settings', 'global', before, { ...settings });
      return { data: { ...settings }, error: null };
    }

    // ---------------------------------------------- applications
    if (fn === 'review_vendor_application') {
      const denied = requireStaff();
      if (denied) return { data: null, error: denied };
      const decision = String(args.p_decision ?? '');
      if (!['approved', 'rejected', 'under_review'].includes(decision)) {
        return { data: null, error: { message: 'Invalid decision' } };
      }
      const application = tables.vendor_applications.find((row) => row.id === args.p_application_id);
      if (!application) return { data: null, error: { message: 'Application not found' } };
      application.status = decision;
      application.review_note = args.p_note ?? null;
      application.reviewed_by = sessionUserId();
      application.reviewed_at = new Date().toISOString();
      const owner = tables.profiles.find((row) => row.id === application.user_id) ?? null;
      if (decision === 'approved' && owner) {
        // Approval opens the store, the way the RPC's `on conflict (user_id)` does.
        const store = tables.vendor_profiles.find((row) => row.user_id === owner.id);
        if (store) store.store_name = application.proposed_store_name;
        else {
          tables.vendor_profiles.push({
            id: `store-${++syntheticId}`,
            user_id: owner.id,
            store_name: application.proposed_store_name,
            slug: application.proposed_slug,
            description: application.description,
            logo: '',
            banner: '',
            seller_type: 'vendor',
            status: 'active',
            created_at: new Date().toISOString(),
          });
        }
        owner.roles = [...asList(owner.roles), 'vendor'];
        owner.vendor_status = 'approved';
        owner.rejection_reason = null;
      }
      if (decision === 'rejected' && owner) {
        owner.vendor_status = 'rejected';
        owner.rejection_reason = args.p_note ?? null;
      }
      tables.audit_logs.push({
        id: `audit-${++syntheticId}`,
        actor_id: sessionUserId(),
        actor_role: 'Super Admin',
        action: 'application.' + decision,
        entity_type: 'vendor_application',
        entity_id: String(application.id),
        ip_address: '127.0.0.1',
        before_data: null,
        after_data: null,
        created_at: new Date().toISOString(),
      });
      return { data: true, error: null };
    }

    return null;
  }

  const double = {
    tables,
    failures,
    authState,
    listeners,
    rpcCalls,
    updateUserCalls,
    resendCalls,
    verifyOtpCalls,
    storageUploads,
    emit,
    realtimeChannels,
    emitRealtime,
    /** `supabase.channel(name).on('postgres_changes', …).subscribe()`, the way a hook uses it. */
    channel(name: string) {
      const channel: {
        name: string;
        bindings: RealtimeBinding[];
        on: (type: string, params: Row, callback: (payload: Row) => void) => typeof channel;
        subscribe: () => typeof channel;
        unsubscribe: () => Promise<void>;
      } = {
        name,
        bindings: [],
        on(type: string, params: Row, callback: (payload: Row) => void) {
          if (type === 'postgres_changes') {
            channel.bindings.push({
              table: String(params?.table ?? ''),
              filter: params?.filter === undefined || params?.filter === null ? null : String(params.filter),
              callback,
            });
          }
          return channel;
        },
        subscribe() {
          return channel;
        },
        unsubscribe() {
          return double.removeChannel(channel);
        },
      };
      realtimeChannels.push(channel);
      return channel;
    },
    removeChannel(target: unknown) {
      const at = realtimeChannels.indexOf(target as { name: string; bindings: RealtimeBinding[] });
      if (at >= 0) realtimeChannels.splice(at, 1);
      return Promise.resolve();
    },
    from: vi.fn((table: string) => query(table)),
    /** Only the RPCs the data layer calls are implemented; the rest fail loudly. */
    rpc: chainableRpc(vi.fn(async (fn: string, args: Row = {}) => {
      rpcCalls.push({ fn, args });
      if (rpcError) return { data: null, error: rpcError };
      if (fn === 'reply_to_review') {
        const review = tables.reviews.find((row) => row.id === args.p_review_id);
        if (!review) return { data: null, error: { message: `No rows found for ${fn}` } };
        review.seller_reply = { author: 'Merchant Response', timeAgo: 'Just now', body: args.p_reply };
        return { data: true, error: null };
      }
      // Pricing is Postgres' job; a test hands back the jsonb that function produced.
      if (fn === 'checkout_quote') {
        return quoteFixture === null
          ? { data: null, error: { message: 'checkout_quote has no fixture - call setQuote() first' } }
          : { data: quoteFixture, error: null };
      }
      if (fn === 'place_order') {
        return placedFixture === null
          ? { data: null, error: { message: 'place_order has no fixture - call setPlacedOrder() first' } }
          : { data: placedFixture, error: null };
      }
      if (fn === 'advance_sub_order_status') {
        const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
        if (!sub) return { data: null, error: { message: 'Sub-order not found' } };
        sub.status = args.p_next;
        sub.history = [
          ...(Array.isArray(sub.history) ? sub.history : []),
          { status: args.p_next, timestamp: '2026-10-11T00:00:00.000Z', actor: 'Customer', note: args.p_note },
        ];
        return { data: { status: args.p_next }, error: null };
      }
      // Moderation moves a listing; the same four refusals the function raises.
      if (fn === 'set_vendor_product_listing') {
        if (args.p_action !== 'submit' && args.p_action !== 'withdraw') {
          return { data: null, error: { message: 'Action must be submit or withdraw' } };
        }
        const product = tables.products.find((row) => row.id === args.p_product_id);
        if (!product) return { data: null, error: { message: 'Product not found' } };
        if (product.seller_id !== vendorOfSession()) {
          return { data: null, error: { message: 'This listing is not yours' } };
        }
        if (args.p_action === 'submit') {
          if (product.status !== 'draft' && product.status !== 'rejected') {
            return { data: null, error: { message: `A ${product.status} listing does not need to be submitted` } };
          }
          product.status = 'pending_review';
          product.rejection_reason = null;
        } else {
          if (!['draft', 'pending_review', 'rejected'].includes(String(product.status))) {
            return { data: null, error: { message: 'Approved listings are withdrawn by the platform, not by the seller' } };
          }
          product.status = 'draft';
        }
        return { data: { id: product.id, status: product.status }, error: null };
      }
      // `sub_orders` has no UPDATE policy: carrier and tracking ride on this RPC, so the
      // double enforces the same four refusals the function raises.
      if (fn === 'update_sub_order_tracking') {
        const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
        if (!sub) return { data: null, error: { message: 'Package not found' } };
        if (sub.type !== 'physical') {
          return { data: null, error: { message: 'Digital packages have nothing to track' } };
        }
        if (sub.seller_id !== vendorOfSession()) {
          return { data: null, error: { message: 'This package is not yours to update' } };
        }
        const tracking = String(args.p_tracking_number ?? '').trim();
        if (tracking === '') return { data: null, error: { message: 'A tracking number is required' } };
        sub.carrier_name = String(args.p_carrier_name ?? '').trim() || null;
        sub.tracking_number = tracking;
        return { data: { carrierName: sub.carrier_name, trackingNumber: sub.tracking_number }, error: null };
      }
      if (fn === 'issue_delivery_code') {
        const sub = tables.sub_orders.find((row) => row.id === args.p_sub_order_id);
        if (!sub) return { data: null, error: { message: 'Sub-order not found' } };
        if (!sub.delivery_code_hash) {
          return { data: null, error: { message: 'This package has no handover code' } };
        }
        if (!OPEN_DELIVERY_STATUSES.includes(String(sub.status))) {
          return { data: null, error: { message: 'This delivery is already closed' } };
        }
        sub.delivery_code_hash = 'sha256:rotated';
        return { data: { code: '4821', subOrderId: sub.id }, error: null };
      }
      // The seller's own store, resolved from the session like `current_vendor_id()` does.
      if (fn === 'current_vendor_id') {
        return { data: vendorOfSession(), error: null };
      }
      // The standalone guard the content and media writes open with before their
      // table writes: same two refusals `requireAdmin` gives the console RPCs.
      if (fn === 'admin_require_admin') {
        const denied = requireAdmin(String(args.p_operation ?? 'do that'));
        return denied ? { data: null, error: denied } : { data: null, error: null };
      }
      if (fn === 'vendor_dashboard') {
        return { data: dashboardFixture ?? dashboardJson(), error: null };
      }
      if (fn === 'vendor_balance') {
        return { data: balanceFixture ?? balanceJson(), error: null };
      }
      if (fn === 'vendor_earnings') {
        return { data: earningsFixture ?? earningsJson(), error: null };
      }
      // The admin console: guarded reads over the whole platform, audited governance writes.
      const admin = adminRpc(fn, args);
      if (admin) return admin;
      return { data: null, error: { message: `Unknown rpc: ${fn}` } };
    })),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: authState.session } })),
      getUser: vi.fn(async () => {
        const user = authState.session?.user ?? null;
        return { data: { user }, error: user ? null : { message: 'Auth session missing!' } };
      }),
      updateUser: vi.fn(async (updates: Record<string, unknown>) => {
        if (authState.updateUserError) return { data: { user: null }, error: authState.updateUserError };
        if (!authState.session?.user) return { data: { user: null }, error: { message: 'Auth session missing!' } };
        updateUserCalls.push(updates);
        // An email change stays PENDING here, exactly like Supabase: it applies
        // only after the confirmation link is opened, so the session's email
        // deliberately does not move in response to this call.
        return { data: { user: authState.session.user }, error: null };
      }),
      signInWithPassword: vi.fn(async ({ email }: { email: string; password: string }) => {
        if (authState.signInError) return { data: { user: null, session: null }, error: authState.signInError };
        const profile =
          authState.signInUser === null
            ? tables.profiles.find((row) => row.email === email)
            : tables.profiles.find((row) => row.id === authState.signInUser!.id);
        if (!profile) {
          if (authState.signInUser) {
            const session: DoubleSession = { access_token: 'test-access-token', user: authState.signInUser };
            authState.session = session;
            return { data: { user: authState.signInUser, session }, error: null };
          }
          return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        }
        const user: DoubleAuthUser = { id: profile.id, email: profile.email };
        const session: DoubleSession = { access_token: 'test-access-token', user };
        authState.session = session;
        emit('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      }),
      signUp: vi.fn(async ({ email, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
        if (authState.signUpError) return { data: { user: null, session: null }, error: authState.signUpError };
        syntheticId += 1;
        const user: DoubleAuthUser = { id: `auth-${syntheticId}`, email, user_metadata: options?.data };
        // Mirrors the handle_new_user() trigger, which creates the profile row on insert.
        tables.profiles.push({
          id: user.id,
          email,
          name: options?.data?.full_name ?? options?.data?.name ?? null,
          avatar_url: null,
          roles: options?.data?.role === 'vendor' ? ['vendor'] : ['customer'],
          vendor_status: options?.data?.role === 'vendor' ? 'pending' : 'none',
          rejection_reason: null,
        });
        if (authState.confirmEmail) return { data: { user, session: null }, error: null };
        const session: DoubleSession = { access_token: 'test-access-token', user };
        authState.session = session;
        return { data: { user, session }, error: null };
      }),
      resend: vi.fn(async (payload: Record<string, unknown>) => {
        resendCalls.push(payload);
        if (authState.resendError) return { data: {}, error: authState.resendError };
        return { data: {}, error: null };
      }),
      verifyOtp: vi.fn(async (payload: { email: string; token: string; type: string }) => {
        verifyOtpCalls.push(payload);
        if (authState.verifyOtpError) {
          return { data: { user: null, session: null }, error: authState.verifyOtpError };
        }
        const profile = tables.profiles.find((row) => row.email === payload.email);
        if (!profile) {
          return {
            data: { user: null, session: null },
            error: { message: 'Token has expired or is invalid' },
          };
        }
        const user: DoubleAuthUser = { id: profile.id, email: profile.email };
        const session: DoubleSession = { access_token: 'test-access-token', user };
        authState.session = session;
        emit('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      }),
      signOut: vi.fn(async () => {
        if (authState.signOutError) return { error: authState.signOutError };
        authState.session = null;
        emit('SIGNED_OUT', null);
        return { error: null };
      }),
      signInWithOAuth: vi.fn(async (_input: { provider: string; options?: { redirectTo?: string } }) => ({
        data: { url: 'https://provider.example/authorize' },
        error: authState.oAuthError,
      })),
      onAuthStateChange: vi.fn((listener: Listener) => {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      }),
    },
    /**
     * Storage, in memory: uploads are recorded (bucket, path, file) rather than
     * stored, and `getPublicUrl` is the pure URL composition it is in the real
     * client. `failStorageUpload` makes uploads refuse, the way an RLS denial
     * or a missing bucket would surface.
     */
    storage: {
      from: (bucket: string) => ({
        upload: vi.fn(async (path: string, file: unknown) => {
          if (storageUploadError) return { data: null, error: storageUploadError };
          storageUploads.push({ bucket, path, file });
          return { data: { path }, error: null };
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://double.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
        remove: vi.fn(async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null })),
      }),
    },
    /** Makes storage uploads fail with this message (or succeed again with null). */
    failStorageUpload(message: string | null) {
      storageUploadError = message ? { message } : null;
    },
    /** Seeds the rows a signed-in user will be authorized against. */
    seedProfile(profile: Row) {
      tables.profiles.push(profile);
      return profile;
    },
    seedVendorProfile(vendorProfile: Row) {
      tables.vendor_profiles.push(vendorProfile);
      return vendorProfile;
    },
    seedCategory(category: Row) {
      tables.categories.push(category);
      return category;
    },
    seedProduct(product: Row) {
      tables.products.push(product);
      return product;
    },
    seedCartItem(item: Row) {
      tables.cart_items.push(item);
      return item;
    },
    seedWishlistItem(item: Row) {
      tables.wishlist_items.push(item);
      return item;
    },
    seedAddress(address: Row) {
      tables.user_addresses.push(address);
      return address;
    },
    seedPaymentMethod(method: Row) {
      tables.user_payment_methods.push(method);
      return method;
    },
    seedReview(review: Row) {
      tables.reviews.push(review);
      return review;
    },
    seedPromotion(promotion: Row) {
      tables.promotions.push(promotion);
      return promotion;
    },
    seedOrder(order: Row) {
      tables.orders.push(order);
      return order;
    },
    seedSubOrder(subOrder: Row) {
      tables.sub_orders.push(subOrder);
      return subOrder;
    },
    seedDispute(dispute: Row) {
      tables.disputes.push(dispute);
      return dispute;
    },
    seedDisputeMessage(message: Row) {
      tables.dispute_messages.push(message);
      return message;
    },
    seedQuestion(question: Row) {
      tables.product_qa.push(question);
      return question;
    },
    seedMediaItem(item: Row) {
      tables.media_items.push(item);
      return item;
    },
    seedContentBlock(block: Row) {
      tables.content_blocks.push(block);
      return block;
    },
    seedShippingSettings(settings: Row) {
      tables.vendor_shipping_settings.push(settings);
      return settings;
    },
    seedNotificationPrefs(prefs: Row) {
      tables.vendor_notification_prefs.push(prefs);
      return prefs;
    },
    seedThread(thread: Row) {
      tables.message_threads.push(thread);
      return thread;
    },
    seedMessage(message: Row) {
      tables.messages.push(message);
      return message;
    },
    seedStrike(strike: Row) {
      tables.vendor_strikes.push(strike);
      return strike;
    },
    seedRefund(refund: Row) {
      tables.refunds.push(refund);
      return refund;
    },
    seedAuditLog(entry: Row) {
      tables.audit_logs.push(entry);
      return entry;
    },
    seedApplication(application: Row) {
      tables.vendor_applications.push(application);
      return application;
    },
    seedPayout(payout: Row) {
      tables.payouts.push(payout);
      return payout;
    },
    seedBankAccount(account: Row) {
      tables.bank_accounts.push(account);
      return account;
    },
    seedRider(rider: Row) {
      tables.rider_profiles.push(rider);
      return rider;
    },
    seedDelivery(delivery: Row) {
      tables.deliveries.push(delivery);
      return delivery;
    },
    seedNotification(notification: Row) {
      tables.notifications.push(notification);
      return notification;
    },
    seedCanned(response: Row) {
      tables.canned_responses.push(response);
      return response;
    },
    /** Replaces the singleton `platform_settings` row, the way `update ... where id = true` does. */
    seedPlatformSettings(settings: Row) {
      tables.platform_settings = [{ ...platformSettingsRow(), ...settings }];
      return tables.platform_settings[0];
    },
    /** Replaces the singleton `commission_config` row the same way. */
    seedCommissionConfig(config: Row) {
      tables.commission_config = [{ ...commissionConfigRow(), ...config }];
      return tables.commission_config[0];
    },
    /**
     * Seeds the account that satisfies `is_admin()` and puts it on the session, because the
     * guard every console call runs is a `profiles.roles` check, not a flag this double owns.
     */
    seedAdmin(overrides: Row = {}) {
      const profile = profileRow({
        id: 'admin-1',
        email: 'ops@vendora.market',
        name: 'Platform Admin',
        roles: ['admin'],
        vendor_status: 'none',
        ...overrides,
      });
      tables.profiles.push(profile);
      const session: DoubleSession = {
        access_token: 'test-access-token',
        user: { id: profile.id, email: profile.email },
      };
      authState.session = session;
      emit('SIGNED_IN', session);
      return profile;
    },
    /** The jsonb `checkout_quote` returns, so a test can pin one screen to known money. */
    setQuote(quote: Row | null) {
      quoteFixture = quote;
    },
    /** The jsonb `place_order` returns after booking. */
    setPlacedOrder(placed: Row | null) {
      placedFixture = placed;
    },
    /** The jsonb `vendor_dashboard` returns; unset means an empty ledger. */
    setDashboard(dashboard: Row | null) {
      dashboardFixture = dashboard;
    },
    setBalance(balance: Row | null) {
      balanceFixture = balance;
    },
    setEarnings(earnings: Row | null) {
      earningsFixture = earnings;
    },
    /** The jsonb `admin_dashboard` returns; unset means the overview's honest zeros. */
    setAdminDashboard(dashboard: Row | null) {
      adminDashboardFixture = dashboard;
    },
    setAdminReport(report: Row | null) {
      adminReportFixture = report;
    },
    setAdminCommission(overview: Row | null) {
      adminCommissionFixture = overview;
    },
    setAdminLogistics(board: Row | null) {
      adminLogisticsFixture = board;
    },
    /** A store's money and tier by id, read by the merchant queue and the dossier alike. */
    setAdminVendors(rollups: Record<string, Row> | null) {
      adminStoreRollups = rollups ?? {};
    },
    /** An order group's totals by id: `gross`, `commission`, `paidToSellers`, `leadStatus`. */
    setAdminOrders(rollups: Record<string, Row> | null) {
      adminOrderRollups = rollups ?? {};
    },
    /**
     * One read's aggregate section by RPC name: `{ counts, exposure }` for the dispute queue,
     * `{ booked }` for the order queue, `{ actions }` for the audit trail, `{ pending, suspended }`
     * for the merchant queue, or `{ total }` and a `rows` map keyed by row id for any derived row's
     * aggregates. Unset keys keep their derived value or their zero.
     */
    setAdminQueue(read: string, values: Row | null) {
      if (values === null) delete adminQueueAggregates[read];
      else adminQueueAggregates[read] = values;
    },
    /** Makes the next RPC call fail, the way a denied SECURITY DEFINER call does. */
    failRpc(message: string | null) {
      rpcError = message ? { message } : null;
    },
    reset() {
      Object.keys(tables).forEach((name) => {
        tables[name].length = 0;
      });
      Object.keys(failures).forEach((name) => {
        delete failures[name];
      });
      authState.session = null;
      authState.signInUser = null;
      authState.signInError = null;
      authState.signUpError = null;
      authState.signOutError = null;
      authState.oAuthError = null;
      authState.updateUserError = null;
      authState.resendError = null;
      authState.verifyOtpError = null;
      authState.confirmEmail = false;
      updateUserCalls.length = 0;
      resendCalls.length = 0;
      verifyOtpCalls.length = 0;
      storageUploads.length = 0;
      storageUploadError = null;
      rpcError = null;
      rpcCalls.length = 0;
      quoteFixture = null;
      placedFixture = null;
      dashboardFixture = null;
      balanceFixture = null;
      earningsFixture = null;
      adminDashboardFixture = null;
      adminReportFixture = null;
      adminCommissionFixture = null;
      adminLogisticsFixture = null;
      adminStoreRollups = {};
      adminOrderRollups = {};
      adminQueueAggregates = {};
      seedSingletons();
      listeners.clear();
      realtimeChannels.length = 0;
      syntheticId = 0;
      double.from.mockClear();
      double.rpc.mockClear();
      Object.values(double.auth).forEach((fn) => typeof fn.mockClear === 'function' && fn.mockClear());
    },
  };

  return double;
}

export type SupabaseDouble = ReturnType<typeof createSupabaseDouble>;

/**
 * The single instance a test file hands to `vi.mock('../../../lib/supabase')`. Importing
 * this module from inside the mock factory keeps the factory and the test on one object.
 */
export const supabaseDouble = createSupabaseDouble();

/** A profiles row shaped like the generated `profiles` type. `roles` is what `is_admin()` reads. */
export function profileRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'user-1',
    email: 'buyer@demo.test',
    name: 'Talha Javaid',
    avatar_url: null,
    roles: ['customer'],
    vendor_status: 'none',
    rejection_reason: null,
    metadata: {},
    account_status: 'active',
    account_status_reason: null,
    account_status_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A vendor_profiles row; seller_type is what splits platform from third-party stores. */
export function storeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'store-1',
    user_id: null,
    store_name: 'Demo Store',
    slug: 'demo-store',
    description: 'A demo store.',
    logo: '',
    banner: '',
    rating: 4.5,
    review_count: 10,
    seller_type: 'vendor',
    status: 'active',
    commission_rate_override: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A categories row. `parent_id` is what lets the console draw a tree instead of a list. */
export function categoryRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Audio',
    slug: 'audio',
    icon: null,
    image: null,
    commission_rate_override: null,
    parent_id: null,
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A cart_items line: `variant_id` is the empty string when no variant was chosen. */
export function cartRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'cart-1',
    user_id: 'user-1',
    product_id: productRow().id,
    variant_id: '',
    quantity: 1,
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

export function wishlistRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'wish-1',
    user_id: 'user-1',
    product_id: productRow().id,
    created_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

/** A user_addresses row: the owner's own book entry, a home address by default. */
export function addressRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'addr-1',
    user_id: 'user-1',
    type: 'home',
    label: 'Home',
    full_name: 'Alex Buyer',
    phone: '+92 300 1234567',
    street: '12 Canal Road',
    city: 'Lahore',
    state: 'Punjab',
    zip_code: '54000',
    country: 'Pakistan',
    is_default: false,
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

/** A user_payment_methods row: display metadata only - brand and last4, never a number. */
export function paymentMethodRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'pm-1',
    user_id: 'user-1',
    type: 'card',
    brand: 'Visa',
    cardholder_name: 'Alex Buyer',
    last4: '4242',
    expiry_month: '12',
    expiry_year: '28',
    is_default: false,
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

/** A reviews row; `verified_purchase` is set by the database, never by the client. */
export function reviewRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000201',
    product_id: productRow().id,
    author_id: 'user-1',
    author_name: 'Alex Buyer',
    author_avatar: '',
    author_country: 'US',
    verified_purchase: false,
    order_number: null,
    rating: 5,
    headline: 'Excellent',
    body: 'Arrived early and works perfectly.',
    photos: [],
    helpful_count: 3,
    seller_reply: null,
    created_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * A products row shaped like the generated `products` type, approved by default.
 * `moderated_by`/`moderated_at` are the console's attribution columns and
 * `assigned_moderator_id` is whose queue the listing sits in - a separate thing from who
 * decided it, which is why the RPC writes them separately.
 */
export function productRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    title: 'Reference Headphones',
    slug: 'reference-headphones',
    description: 'A demo product.',
    category_id: '00000000-0000-4000-8000-000000000001',
    brand: 'AudioBrand',
    images: ['https://example.test/headphones.png'],
    price: 199.99,
    compare_at_price: null,
    type: 'physical',
    seller_id: 'store-1',
    variants: [],
    stock: 25,
    shipping_settings: { free_shipping: true },
    digital_asset_info: null,
    rating: 4.7,
    review_count: 320,
    status: 'approved',
    rejection_reason: null,
    moderated_by: null,
    moderated_at: null,
    assigned_moderator_id: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A promotions row; `active` is what RLS filters on before the client checks the dates. */
export function promotionRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000301',
    code: 'SAVE10',
    title: '10% off',
    description: 'A demo promotion.',
    discount_type: 'percent',
    discount_value: 10,
    minimum_order: 50,
    max_discount: null,
    vendor_id: null,
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-12-31T00:00:00.000Z',
    usage_count: 0,
    usage_limit: 100,
    active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A booked cart line, frozen into `sub_orders.items` at checkout. */
export function orderedItemRow(overrides: Partial<Row> = {}): Row {
  return {
    productId: productRow().id,
    variantId: '',
    title: 'Reference Headphones',
    price: 199.99,
    quantity: 1,
    image: 'https://example.test/headphones.png',
    ...overrides,
  };
}

/** An orders row; the money lives on the packages, so this row carries who and how they paid. */
export function orderRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000401',
    customer_id: 'user-1',
    customer_email: 'buyer@demo.test',
    shipping_address: {
      fullName: 'Alex Buyer',
      street: '1 Elm Street',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43004',
      country: 'USA',
      phone: '614-555-0100',
    },
    payment_method: 'card',
    payment_details: { brand: 'Visa', last4: '0000' },
    payment_status: 'succeeded',
    created_at: '2026-10-06T14:30:00.000Z',
    ...overrides,
  };
}

/**
 * A sub_orders row. `delivery_code_hash` is seeded here because `issue_delivery_code` reads
 * it, but no select list asks for it, so nothing the client maps can.
 */
export function subOrderRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    order_group_id: orderRow().id,
    seller_id: 'store-1',
    type: 'physical',
    items: [orderedItemRow()],
    subtotal: 199.99,
    shipping_fee: 8.5,
    delivery_option: 'standard',
    commission_rate: 0.1,
    commission_amount: 20,
    net_payout: 179.99,
    status: 'placed',
    rider_id: null,
    license_key: null,
    history: [{ status: 'placed', timestamp: '2026-10-06T14:30:00.000Z', actor: 'Customer', note: 'Order placed via checkout' }],
    return_reason: null,
    carrier_name: null,
    tracking_number: null,
    customer_notes: null,
    delivery_code_hash: 'sha256:seeded',
    created_at: '2026-10-06T14:30:00.000Z',
    updated_at: '2026-10-06T14:30:00.000Z',
    ...overrides,
  };
}

/**
 * A disputes row. Only the buyer of the order can insert one (`disputes_insert_customer`),
 * so a test seeds it rather than creating it through the client.
 */
export function disputeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000601',
    sub_order_id: subOrderRow().id,
    order_group_id: orderRow().id,
    customer_id: 'user-1',
    customer_name: 'Alex Buyer',
    customer_avatar: null,
    vendor_id: 'store-1',
    vendor_name: 'Demo Store',
    reason: 'Package never arrived',
    status: 'open',
    urgency: 'standard',
    assigned_agent_id: null,
    resolution_note: null,
    resolution_amount: null,
    evidence_photos: [],
    created_at: '2026-10-07T00:00:00.000Z',
    updated_at: '2026-10-07T00:00:00.000Z',
    ...overrides,
  };
}

/** A dispute_messages entry. `is_internal_note` is a staff flag the counterparty can still read. */
export function disputeMessageRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000611',
    dispute_id: disputeRow().id,
    sender_id: 'user-1',
    sender_role: 'customer',
    sender_name: 'Alex Buyer',
    sender_avatar: null,
    content: 'The tracking has not moved in six days.',
    is_internal_note: false,
    attachments: [],
    created_at: '2026-10-07T00:00:00.000Z',
    ...overrides,
  };
}

/** A product_qa row; the question, product and asker are immutable to the seller. */
export function questionRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000701',
    product_id: productRow().id,
    vendor_id: 'store-1',
    customer_id: 'user-1',
    customer_name: 'Alex Buyer',
    question: 'Does this work with a USB-C hub?',
    answer: null,
    published: false,
    created_at: '2026-10-07T00:00:00.000Z',
    answered_at: null,
    ...overrides,
  };
}

/** A media_items row; `status` is the platform's moderation column, not the seller's. */
export function mediaItemRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000801',
    vendor_id: 'store-1',
    name: 'headphones.png',
    folder: 'products',
    object_path: 'store-1/products/headphones.png',
    cdn_url: 'https://cdn.example.test/headphones.png',
    mime_type: 'image/png',
    size_bytes: 20480,
    width: 1024,
    height: 1024,
    status: 'pending',
    created_at: '2026-10-07T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * A `content_blocks` row. Hero banners carry their storefront copy in the `body`
 * jsonb the admin console and the homepage agree on; the row's own `title` is the
 * fallback headline when the body has none.
 */
export function contentBlockRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000901',
    slug: 'hero-banner-1',
    title: 'Flagship phones, honest prices',
    body: {
      headline: 'Flagship phones, honest prices',
      subtitle: 'Verified sellers, genuine warranty picks.',
      imageUrl: 'https://cdn.example.test/hero-phones.jpg',
      ctaText: 'Shop Phones',
      ctaLink: '/products?category=electronics',
    },
    placement: 'homepage_hero',
    published: true,
    sort_order: 10,
    created_at: '2026-10-07T00:00:00.000Z',
    updated_at: '2026-10-07T00:00:00.000Z',
    ...overrides,
  };
}

/** A vendor_shipping_settings row. The store id is the primary key, so one row per store. */
export function shippingRow(overrides: Partial<Row> = {}): Row {
  return {
    vendor_id: 'store-1',
    free_shipping_enabled: false,
    free_shipping_threshold: 150,
    standard_rate: 8.5,
    express_rate: 24,
    warehouse_name: 'Demo Warehouse',
    street: '1 Dock Road',
    city: 'Columbus',
    state: 'OH',
    zip_code: '43004',
    phone: '614-555-0100',
    operating_hours: 'Mon-Fri 08:00-18:00',
    gate_code: '4432',
    sla_window: '48h',
    ...overrides,
  };
}

/** A vendor_notification_prefs row; the switches live in one jsonb bag. */
export function prefsRow(overrides: Partial<Row> = {}): Row {
  return {
    vendor_id: 'store-1',
    prefs: { smsDispatch: false, lowInventoryAlert: true, rmaPushAlert: true, dailyDigest: false },
    ...overrides,
  };
}

/** A message_threads row. */
export function threadRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000901',
    vendor_id: 'store-1',
    customer_id: 'user-1',
    customer_name: 'Alex Buyer',
    channel: 'order_inquiry',
    order_ref: 'ORD-1001',
    product_ref: null,
    status: 'open',
    created_at: '2026-10-06T14:30:00.000Z',
    updated_at: '2026-10-07T09:00:00.000Z',
    ...overrides,
  };
}

/** A messages row inside a buyer thread. */
export function threadMessageRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000911',
    thread_id: threadRow().id,
    sender_id: 'user-1',
    sender_role: 'customer',
    sender_name: 'Alex Buyer',
    body: 'Is this still in stock?',
    attachments: [],
    read: false,
    created_at: '2026-10-07T09:00:00.000Z',
    ...overrides,
  };
}

/**
 * The jsonb `vendor_dashboard` returns for a store with no history. The aggregates are
 * Postgres' work; this is the shape the client must map, so a test can pin one tile by
 * handing `setDashboard()` its own section.
 */
export function dashboardJson(overrides: Partial<Row> = {}): Row {
  return {
    store: {
      id: 'store-1',
      storeName: 'Demo Store',
      slug: 'demo-store',
      sellerType: 'vendor',
      status: 'active',
      rating: 0,
      reviewCount: 0,
      vacationMode: false,
    },
    kpis: {
      grossBooked: 0,
      commission: 0,
      netPayout: 0,
      physicalSales: 0,
      digitalSales: 0,
      revenue7d: 0,
      revenue30d: 0,
      orders7d: 0,
      balance: 0,
    },
    stages: { placed: 0, confirmed: 0, packed: 0, inTransit: 0, delivered: 0, returns: 0, cancelled: 0 },
    catalog: {
      approved: 0,
      pendingReview: 0,
      rejected: 0,
      draft: 0,
      archived: 0,
      lowStock: 0,
      outOfStock: 0,
      units: 0,
      valuation: 0,
    },
    engagement: { openThreads: 0, unreadMessages: 0, activePromotions: 0, unansweredQuestions: 0 },
    topProducts: [],
    recentPackages: [],
    ...overrides,
  };
}

/** The jsonb `vendor_balance` returns for a store that has earned nothing. */
export function balanceJson(overrides: Partial<Row> = {}): Row {
  return {
    vendorId: 'store-1',
    lifetimeNet: 0,
    paidOut: 0,
    reserve: 0,
    available: 0,
    pendingPayouts: 0,
    ...overrides,
  };
}

/** The jsonb `vendor_earnings` returns when the ledger is empty. */
export function earningsJson(overrides: Partial<Row> = {}): Row {
  return {
    totals: { gross: 0, subtotal: 0, shipping: 0, fees: 0, net: 0, packages: 0, settled: 0, processing: 0 },
    months: [],
    ledger: [],
    ...overrides,
  };
}

/** A vendor_strikes row; the evidence the queue's suspension rule counts. */
export function strikeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001001',
    vendor_id: 'store-1',
    reason: 'Shipping outside the published SLA',
    note: null,
    issued_by: null,
    created_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A refunds row: money leaving, with how much, against which package, why and by whom. */
export function refundRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001101',
    sub_order_id: subOrderRow().id,
    order_group_id: orderRow().id,
    amount: 199.99,
    reason: 'Package returned undelivered',
    processed_by: null,
    created_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** An audit_logs row. Only the governance RPCs write one, which is what makes it evidence. */
export function auditLogRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001201',
    actor_id: 'admin-1',
    actor_role: 'Admin',
    action: 'product.approve',
    entity_type: 'product',
    entity_id: productRow().id,
    ip_address: '127.0.0.1',
    before_data: { status: 'pending_review' },
    after_data: { status: 'approved', reason: null },
    created_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A vendor_applications row; an applicant has no store row until the application is approved. */
export function applicationRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001301',
    user_id: 'user-1',
    proposed_store_name: 'Nova Tech',
    proposed_slug: 'nova-tech',
    description: 'Consumer electronics.',
    business_type: 'General Retail',
    contact_email: 'seller@demo.test',
    contact_phone: null,
    business_address: null,
    kyc_documents: null,
    policy_accepted: true,
    status: 'pending',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-10-08T00:00:00.000Z',
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A payouts row, as the dossier lists it. */
export function payoutRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001401',
    vendor_id: 'store-1',
    amount: 1200.5,
    currency: 'USD',
    status: 'completed',
    payment_method: 'ACH Instant Direct Transfer',
    payment_reference: 'po_2026_10_08',
    metadata: {},
    created_at: '2026-10-08T00:00:00.000Z',
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A bank_accounts row; only the masked columns ever leave the database. */
export function bankAccountRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001501',
    vendor_id: 'store-1',
    holder_name: 'Demo Store LLC',
    bank_name: 'First Demo Bank',
    masked_account: '****4321',
    is_default: true,
    account_type: 'checking',
    masked_routing: null,
    created_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A rider_profiles row; `status` is the availability the dispatch board reads. */
export function riderRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001601',
    user_id: null,
    full_name: 'Nadia Rider',
    phone: '614-555-0199',
    vehicle_type: 'Motorcycle',
    status: 'available',
    // Added by the Phase 7 migration: this rider's own handling window.
    sla_ceiling_hours: 4,
    created_at: '2026-10-08T00:00:00.000Z',
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** A deliveries row: one per package, since `sub_order_id` is unique. */
export function deliveryRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001701',
    sub_order_id: subOrderRow().id,
    rider_id: riderRow().id,
    status: 'assigned',
    pickup_details: {},
    dropoff_details: {},
    handover_code_hash: null,
    proof_of_delivery: null,
    assigned_at: '2026-10-08T00:00:00.000Z',
    picked_up_at: null,
    delivered_at: null,
    created_at: '2026-10-08T00:00:00.000Z',
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** The `platform_settings` singleton the migration inserts; the console edits exactly these knobs. */
export function platformSettingsRow(overrides: Partial<Row> = {}): Row {
  return {
    id: true,
    platform_name: 'Vendora Multi-Vendor Marketplace',
    support_email: 'ops@vendora.market',
    default_currency: 'USD',
    payout_schedule: 'Bi-weekly on Monday',
    min_payout_floor: 50,
    reserve_retention_days: 14,
    new_listing_review: 'Moderate (Standard)',
    sla_ceiling_hours: 48,
    updated_by: null,
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/** The `commission_config` singleton the rate RPCs keep in step with the columns pricing reads. */
export function commissionConfigRow(overrides: Partial<Row> = {}): Row {
  return {
    id: true,
    global_default_rate: 0.1,
    category_overrides: {},
    vendor_overrides: {},
    updated_at: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * The jsonb `admin_dashboard` returns for a platform with no history. `catalog` is
 * `to_jsonb(c)` over the SQL CTE, so those keys really do come back snake_case while every
 * other section is built with `jsonb_build_object` and comes back camelCase. `averageOrderValue`
 * and `deltaPct` are `round(... / nullif(..., 0) ...)`, which is NULL on an empty ledger.
 */
export function adminDashboardJson(overrides: Partial<Row> = {}): Row {
  return {
    days: 30,
    kpis: {
      gmvBooked: 0,
      commission: 0,
      netToSellers: 0,
      packages: 0,
      orders: 0,
      openPackages: 0,
      averageOrderValue: null,
      refundAmount: 0,
      refundCount: 0,
      payoutsPaid: 0,
      payoutsPending: 0,
      payoutsPendingCount: 0,
    },
    growth: { revenue7d: 0, revenue30d: 0, orders7d: 0, orders30d: 0, previousGmv: 0, deltaPct: null },
    sellers: { active: 0, suspended: 0, awaitingReview: 0 },
    catalog: {
      approved: 0,
      pending_review: 0,
      rejected: 0,
      draft: 0,
      archived: 0,
      out_of_stock: 0,
      low_stock: 0,
    },
    trust: { openDisputes: 0, escalatedDisputes: 0, pendingReturns: 0, strikes: 0 },
    stages: {},
    monthly: [],
    topVendors: [],
    ...overrides,
  };
}

/** The jsonb `admin_report_summary` returns for a period with nothing in it. */
export function adminReportJson(overrides: Partial<Row> = {}): Row {
  return {
    days: 30,
    bucket: 'day',
    totals: {
      gross: 0,
      commission: 0,
      net: 0,
      freight: 0,
      digitalGross: 0,
      orders: 0,
      packages: 0,
      refunds: 0,
      // `round(commission / nullif(gross, 0) * 100, 2)`: no volume, no take rate.
      takeRatePct: null,
    },
    series: [],
    byCategory: [],
    bySeller: [],
    ...overrides,
  };
}

/** The jsonb `admin_commission_overview` returns before anything has been charged or changed. */
export function adminCommissionJson(overrides: Partial<Row> = {}): Row {
  return {
    days: 30,
    globalDefaultRate: 0.1,
    earned: { commission: 0, gross: 0, packages: 0 },
    effectiveRatePct: null,
    byCategory: [],
    byVendor: [],
    changes: [],
    ...overrides,
  };
}

/** The jsonb `admin_logistics_board` returns with no fleet and nothing to dispatch. */
export function adminLogisticsJson(overrides: Partial<Row> = {}): Row {
  return {
    fleet: [],
    queue: [],
    counts: { awaitingPickup: 0, inTransit: 0, failed: 0, delivered: 0, ridersAvailable: 0 },
    ...overrides,
  };
}

/** A notice addressed to one account, as `send_support_notification()` writes it. */
export function notificationRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001801',
    user_id: profileRow().id,
    role_target: 'all',
    type: 'dispute',
    title: 'Your return was approved',
    message: 'Reply in this thread to add evidence.',
    href: '/orders',
    read_at: null,
    created_at: '2026-10-11T00:00:00.000Z',
    ...overrides,
  };
}

/** A reply template the desk saved for itself; `agent_id` is its author. */
export function cannedRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000001901',
    agent_id: 'support-1',
    subject: 'Late delivery apology',
    body: 'We are sorry your parcel ran late. Here is what we are doing about it.',
    category: 'delivery',
    created_at: '2026-10-11T00:00:00.000Z',
    ...overrides,
  };
}
