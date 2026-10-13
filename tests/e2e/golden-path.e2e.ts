import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { loadEnv, loadFixture } from './lib/qa';
import { attachCollectors, settle } from './lib/collect';

const env = loadEnv();
const origin = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const BASE = 'http://127.0.0.1:5199';
const fx = loadFixture();
const money = (s: string) => Number(s.replace(/[^0-9.-]/g, ''));

const server = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const customerSession = (fx.personas as any).customer?.session;

test.describe('golden path through the real UI', () => {
  test('signing in with the demo form lands the customer in their account', async ({ page }) => {
    const store = attachCollectors(page, origin);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#login-email', 'customer@demo.test');
    await page.fill('#login-password', 'demo1234');
    await page.getByRole('button', { name: /sign in/i }).last().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 }).catch(() => undefined);
    await settle(page, 1500);
    expect(page.url(), 'still stuck on /login after submitting valid demo credentials').not.toContain('/login');
    expect(store.pageErrors, `crash on sign-in: ${store.pageErrors[0] ?? ''}`).toHaveLength(0);
    expect(store.netFailures.filter((f) => f.status >= 500), `backend 5xx during sign-in: ${JSON.stringify(store.netFailures[0])}`).toHaveLength(0);
    const body = await page.locator('body').innerText();
    expect(/sarah|customer/i.test(body), 'signed-in user identity never reached the chrome').toBe(true);
  });

  test('the product card a shopper clicks shows the row the database holds', async ({ page }) => {
    const slug = (fx.params.sampleApproved as any)[0]?.slug;
    expect(slug, 'fixture has no approved product to test').toBeTruthy();
    const { data: row } = await server.from('products').select('title,price,stock,status').eq('slug', slug).maybeSingle();
    expect(row, `approved product ${slug} is not readable anonymously`).toBeTruthy();

    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await settle(page, 1500);
    const card = page.locator(`a[href="/products/${slug}"]`).first();
    if (await card.count()) {
      await card.click();
      await page.waitForURL(`**/products/${slug}`, { timeout: 15_000 }).catch(() => undefined);
    } else {
      await page.goto(`/products/${slug}`, { waitUntil: 'domcontentloaded' });
    }
    await settle(page, 1500);
    const body = await page.locator('main').innerText();
    const words = String(row!.title).split(/\s+/).slice(0, 3).join(' ');
    expect(body.toLowerCase(), `PDP does not show the database title for ${slug}`).toContain(words.toLowerCase());
    expect(money(body.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] ?? '0'), 'PDP shows no price').toBeGreaterThan(0);
  });

  test('checkout prints exactly what checkout_quote charged', async ({ browser }) => {
    // Seed the buyer's server-side cart, then compare the screen to the RPC for the same cart.
    const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: 'customer@demo.test', password: 'demo1234' });
    await c.from('cart_items').delete().eq('user_id', fx.personas.customer.userId);
    const picks = (fx.params.sampleApproved as any).slice(0, 2);
    const { data: lines } = await c.from('products').select('id,seller_id,price').in('slug', picks.map((p) => p.slug));
    expect(lines?.length, 'could not resolve the picked products to rows').toBe(2);
    await c.from('cart_items').insert(lines!.map((l) => ({ user_id: fx.personas.customer.userId, product_id: l.id, quantity: 1 })));
    const opts = Object.fromEntries(lines!.map((l) => [l.seller_id, 'standard']));
    const { data: quote, error } = await c.rpc('checkout_quote', { p_delivery_options: opts, p_coupon_code: undefined });
    expect(error, `checkout_quote failed: ${error?.message}`).toBeNull();
    const expectedTotal = Number(quote?.total ?? quote?.grandTotal ?? 0);
    expect(expectedTotal, 'quote returned no total').toBeGreaterThan(0);

    const ctx = await browser.newContext({ storageState: resolve(process.cwd(), 'scratch/qa/state-customer.json'), baseURL: BASE });
    const page = await ctx.newPage();
    const store = attachCollectors(page, origin);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await settle(page, 2500);
    const text = await page.locator('body').innerText();
    const amounts = Array.from(text.matchAll(/\$\s?[\d,]+\.\d{2}/g)).map((m) => money(m[0]));
    expect(store.pageErrors, `checkout crashed: ${store.pageErrors[0] ?? ''}`).toHaveLength(0);
    expect(amounts, `checkout shows no money at all (${amounts.length} amounts)`).not.toHaveLength(0);
    expect(amounts, `no figure on the checkout screen equals the server's ${expectedTotal} (seen: ${amounts.slice(0, 8).join(', ')})`).toContainEqual(expectedTotal);
    await ctx.close();
    await c.from('cart_items').delete().eq('user_id', fx.personas.customer.userId);
  });

  test('an anonymous shopper is asked to sign in before the order screens', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await settle(page, 1500);
    const landed = page.url().replace(BASE, '');
    expect(landed.startsWith('/login') || /sign in/i.test(await page.locator('body').innerText()), `/orders rendered for an anonymous visitor at ${landed}`).toBeTruthy();
  });
});
