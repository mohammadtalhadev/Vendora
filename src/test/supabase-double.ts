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
};

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
 * filters, ordering, ranges, counts and FK embeds, plus the GoTrue password/OAuth methods
 * and the auth listener. Postgres and GoTrue semantics themselves are covered offline by
 * scripts/smoke-rpcs.ts; this double only lets unit tests assert how the client maps
 * those responses.
 */
export function createSupabaseDouble() {
  const tables: Record<string, Row[]> = { profiles: [], vendor_profiles: [], products: [], categories: [] };
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
      /** Replays the select list's `alias:referenced_table(cols)` embeds against seeded rows. */
      withEmbeds(row: Row) {
        const out: Row = { ...row };
        for (const part of splitSelect(this.selected)) {
          const embed = /^(?:([\w]+):)?([\w]+)\((.*)\)$/s.exec(part);
          if (!embed) continue;
          const referenced = embed[2];
          const inner = embed[3];
          const fkColumn = EMBED_FK[table]?.[referenced];
          if (!fkColumn) continue;
          const name = embed[1] ?? referenced;
          const target = (tables[referenced] ?? []).find((candidate) => candidate.id === row[fkColumn]);
          if (!target) {
            out[name] = null;
            continue;
          }
          const picked = splitSelect(inner)
            .filter((column) => column !== '*')
            .reduce<Row>((acc, column) => ({ ...acc, [column]: target[column] }), {});
          out[name] = picked;
        }
        return out;
      },
      outcome() {
        const message = failure();
        if (message) return { data: null, error: { message }, count: null };
        if (this.signal?.aborted) {
          return { data: null, error: { name: 'AbortError', message: 'Aborted' }, count: null };
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
      async insert(values: Row) {
        const message = failure();
        if (message) return { data: null, error: { message } };
        tables[table] = [...rows(), values];
        return { data: values, error: null };
      },
      async upsert(values: Row) {
        const message = failure();
        if (message) return { data: null, error: { message } };
        tables[table] = [...rows(), values];
        return { data: values, error: null };
      },
      async update() {
        const message = failure();
        if (message) return { data: null, error: { message } };
        return { data: null, error: null };
      },
      async delete() {
        const message = failure();
        if (message) return { data: null, error: { message } };
        return { data: null, error: null };
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
    emit,
    from: vi.fn((table: string) => query(table)),
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
      listeners.clear();
      syntheticId = 0;
      double.from.mockClear();
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
