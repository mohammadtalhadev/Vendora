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
};

/** The unique indexes the migrations declare, so insert and upsert behave like Postgres. */
const UNIQUE_KEYS: Record<string, string[]> = {
  cart_items: ['user_id', 'product_id', 'variant_id'],
  wishlist_items: ['user_id', 'product_id'],
  reviews: ['product_id', 'author_id'],
};

/** `alias:referenced_table(cols)` in a PostgREST select list. */
const EMBED_RE = /^(?:([\w]+):)?([\w]+)\((.*)\)$/s;

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
    .replace(/\%/g, '.*')
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
    reviews: [],
  };
  const failures: Record<string, string | null> = {};
  const authState = {
    session: null as DoubleSession | null,
    signInError: null as DoubleError | null,
    signUpError: null as DoubleError | null,
    signOutError: null as DoubleError | null,
    oAuthError: null as DoubleError | null,
    /** Forces a session for this user, even with no matching profile row. */
    signInUser: null as DoubleAuthUser | null,
    /** When true, signUp returns a user but no session, like an email-confirmation project. */
    confirmEmail: false,
  };
  const listeners = new Set<Listener>();
  let syntheticId = 0;
  let rpcError: DoubleError | null = null;
  const rpcCalls: Array<{ fn: string; args: Row }> = [];

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
      const child = fkColumn
        ? (tables[referenced] ?? []).find((candidate) => candidate.id === target[fkColumn]) ?? null
        : null;
      out[name] = child ? project(child, embed[3], referenced) : null;
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
      select(columns: string, options?: { count?: string }) {
        this.selected = columns;
        this.wantCount = options?.count !== undefined;
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
          tables[table] =
            pending.kind === 'delete'
              ? rows().filter((row) => !targets.includes(row))
              : rows().map((row) => (targets.includes(row) ? { ...row, ...pending.patch } : row));
          this.written = targets;
        }
        if (this.written) {
          // A write only returns rows when the chain asked for them, as PostgREST does.
          if (!this.selected) return { data: null, error: null, count: null };
          const affected = this.written.map((row) => this.withEmbeds(row));
          return { data: affected, error: null, count: this.wantCount ? affected.length : null };
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

  const double = {
    tables,
    failures,
    authState,
    listeners,
    rpcCalls,
    emit,
    from: vi.fn((table: string) => query(table)),
    /** Only the RPCs the data layer calls are implemented; the rest fail loudly. */
    rpc: vi.fn(async (fn: string, args: Row = {}) => {
      rpcCalls.push({ fn, args });
      if (rpcError) return { data: null, error: rpcError };
      if (fn === 'reply_to_review') {
        const review = tables.reviews.find((row) => row.id === args.p_review_id);
        if (!review) return { data: null, error: { message: `No rows found for ${fn}` } };
        review.seller_reply = { author: 'Merchant Response', timeAgo: 'Just now', body: args.p_reply };
        return { data: true, error: null };
      }
      return { data: null, error: { message: `Unknown rpc: ${fn}` } };
    }),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: authState.session } })),
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
          name: options?.data?.name ?? null,
          avatar_url: null,
          roles: ['customer'],
          vendor_status: 'none',
          rejection_reason: null,
        });
        if (authState.confirmEmail) return { data: { user, session: null }, error: null };
        const session: DoubleSession = { access_token: 'test-access-token', user };
        authState.session = session;
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
    seedReview(review: Row) {
      tables.reviews.push(review);
      return review;
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
      authState.confirmEmail = false;
      rpcError = null;
      rpcCalls.length = 0;
      listeners.clear();
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

/** A profiles row shaped like the generated `profiles` type. */
export function profileRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'user-1',
    email: 'buyer@demo.test',
    name: 'Talha Javaid',
    avatar_url: null,
    roles: ['customer'],
    vendor_status: 'none',
    rejection_reason: null,
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
    ...overrides,
  };
}

export function categoryRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Audio',
    slug: 'audio',
    icon: null,
    image: null,
    commission_rate_override: null,
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

/** A products row shaped like the generated `products` type, approved by default. */
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
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
