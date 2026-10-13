import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RouteDef } from './routes';

export interface Fixture {
  url: string;
  personas: Record<string, { email: string; userId?: string; session?: unknown; signInError?: string; dbRoles?: string[] }>;
  params: {
    categories?: { slug: string; name: string }[] | string;
    sampleApproved?: { id: string; slug: string }[];
    stores?: { id: string; slug: string; store_name: string; seller_type: string }[];
    customer?: { orders?: any[]; subOrders?: any[]; disputes?: any[]; trackNumbers?: string[] };
    vendor?: { subOrders?: any[]; products?: any[]; threads?: any[]; store?: any[] };
    admin?: { vendors?: any[]; orders?: any[]; users?: any[]; categories?: any[] };
    support?: { disputes?: any[] };
    rider?: { deliveries?: any[] };
    approvedProductCount?: number | string;
  };
  counts: Record<string, Record<string, { count?: number; error?: string }>>;
  navTruth: { categories: { slug: string; exists: boolean }[]; products: { slug: string; exists: boolean }[] };
}

/** Vite reads .env for the app; the Playwright node process has to do it by hand. */
export function loadEnv(file = '.env'): Record<string, string> {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

export function loadFixture(): Fixture {
  const path = resolve(process.cwd(), 'scratch/qa/live-fixture.json');
  if (!existsSync(path)) throw new Error('run scripts/qa-live-probe.mjs first - no scratch/qa/live-fixture.json');
  return JSON.parse(readFileSync(path, 'utf8')) as Fixture;
}

const INVALID_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Turns a declared route into the concrete urls worth visiting for it.
 * A route whose data does not exist yet is still visited once with an invalid id,
 * because "what does a missing row look like" is itself part of the spec.
 */
export function urlsForRoute(route: RouteDef, fx: Fixture): { urls: string[]; basis: 'real' | 'no-data' | 'static' } {
  const p = route.path;
  // Replace the FIRST param segment, which is what covers both `/orders/:orderId`
  // and `/vendor/products/:id/edit`; anchoring to the end left mid-path params literal.
  const list = (ids: (string | undefined)[]) =>
    ids.filter(Boolean).slice(0, 3).map((id) => p.replace(/:[A-Za-z]+/, id as string));

  const products = (fx.params.sampleApproved ?? []).slice(0, 2).map((x) => x.slug);
  const stores = (fx.params.stores ?? []).slice(0, 2);
  const cats = (fx.params.categories ?? []);
  const catSlugs = Array.isArray(cats) ? cats.slice(0, 2).map((c) => c.slug) : [];

  switch (p) {
    case '/products/:productId':
      return products.length ? { urls: list(products), basis: 'real' } : { urls: [`/products/${INVALID_UUID}`], basis: 'no-data' };
    case '/vendors/:vendorId':
    case '/stores/:vendorId':
    case '/store/:vendorId':
      return stores.length
        ? { urls: [p.replace(/:[A-Za-z]+$/, stores[0].slug), p.replace(/:[A-Za-z]+$/, stores[0].id)], basis: 'real' }
        : { urls: [`/stores/${INVALID_UUID}`], basis: 'no-data' };
    case '/categories/:slug':
    case '/category/:slug':
      return catSlugs.length ? { urls: list(catSlugs), basis: 'real' } : { urls: list(['no-such-category']), basis: 'no-data' };
    case '/orders/:orderId':
    case '/orders/:orderId/invoice': {
      const ids = (fx.params.customer?.orders ?? []).map((o: any) => o.id).concat((fx.params.customer?.subOrders ?? []).map((s: any) => s.id));
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [p.replace(/:[A-Za-z]+$/, INVALID_UUID)], basis: 'no-data' };
    }
    case '/track-order/:trackingNumber': {
      const tn = fx.params.customer?.trackNumbers ?? [];
      return tn.length ? { urls: list(tn), basis: 'real' } : { urls: ['/track-order/NOSUCHTRACKING'], basis: 'no-data' };
    }
    case '/disputes/:id':
    case '/disputes/:disputeId': {
      const ids = (fx.params.customer?.disputes ?? []).map((d: any) => d.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [p.replace(/:[A-Za-z]+$/, INVALID_UUID)], basis: 'no-data' };
    }
    case '/vendor/orders/:id':
    case '/vendor/products/:id/edit':
    case '/vendor/messages/:threadId': {
      const src = p.includes('orders') ? fx.params.vendor?.subOrders : p.includes('products') ? fx.params.vendor?.products : fx.params.vendor?.threads;
      const ids = (src ?? []).map((x: any) => x.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [p.replace(/:[A-Za-z]+$/, INVALID_UUID)], basis: 'no-data' };
    }
    case '/admin/vendors/:id': {
      const ids = (fx.params.admin?.vendors ?? []).map((x: any) => x.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [`/admin/vendors/${INVALID_UUID}`], basis: 'no-data' };
    }
    case '/admin/orders/:id': {
      const ids = (fx.params.admin?.orders ?? []).map((x: any) => x.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [`/admin/orders/${INVALID_UUID}`], basis: 'no-data' };
    }
    case '/rider/deliveries/:id': {
      const ids = (fx.params.rider?.deliveries ?? []).map((x: any) => x.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [`/rider/deliveries/${INVALID_UUID}`], basis: 'no-data' };
    }
    case '/support/disputes/:id': {
      const ids = (fx.params.support?.disputes ?? []).map((x: any) => x.id);
      return ids.length ? { urls: list(ids), basis: 'real' } : { urls: [`/support/disputes/${INVALID_UUID}`], basis: 'no-data' };
    }
    default:
      if (p.includes(':')) return { urls: [p.replace(/:[A-Za-z]+$/, INVALID_UUID)], basis: 'no-data' };
      return { urls: [p], basis: 'static' };
  }
}
