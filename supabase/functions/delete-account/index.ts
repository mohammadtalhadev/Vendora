// Vendora Batch 43: account self-deletion. Hardened in Batch 68:
// pinned supabase-js version (no floating @2 supply-chain risk), CORS
// restricted to the storefront origins instead of '*', demo/test accounts
// refused, and the caller's avatar files removed from storage.
//
// The caller proves who they are with their own JWT (verify_jwt = true in
// config.toml, and getUser() below re-checks it); the destructive work runs
// with the service role because a user cannot delete their own auth record
// or another table's rows about them.
//
// Order history is anonymized, not erased: orders.customer_id is
// ON DELETE SET NULL, and the email/address the order carried are replaced,
// so sellers keep their financial records while the person is gone.
// Tables cleaned: notifications, cart_items, wishlist_items, user_addresses,
// user_payment_methods — every per-user table that exists in this schema.
// (There are no loyalty tables in this schema, so none are referenced.)
// Storage cleaned: the caller's own prefix in the `user-avatars` bucket.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

const ALLOWED_ORIGINS = [
  'https://vendora-plum.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, { error: 'Function is not fully configured on the server' }, 500);
  }

  // Who is calling? Their own JWT, checked against Auth — never a body field.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json(req, { error: 'Not authenticated' }, 401);
  }
  const userId = userData.user.id;

  // Demo/test accounts are shared fixtures, not personal accounts: one
  // visitor must never be able to delete them for everyone else.
  const email = (userData.user.email ?? '').toLowerCase();
  if (email.endsWith('@vendora.test') || email.endsWith('@demo.test')) {
    return json(req, { error: 'Demo accounts cannot be deleted.' }, 403);
  }

  // The confirmation is exact and typed by the user in the settings page.
  let confirm: unknown;
  try {
    const body = await req.json() as { confirm?: unknown };
    confirm = body.confirm;
  } catch {
    return json(req, { error: 'Request body must be JSON: { "confirm": "DELETE" }' }, 400);
  }
  if (confirm !== 'DELETE') {
    return json(req, { error: 'Confirmation missing: send { "confirm": "DELETE" } to delete your account' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Anonymize order history first, while the rows still point at the user.
  const { error: ordersError } = await admin
    .from('orders')
    .update({ customer_email: 'deleted@vendora.market', shipping_address: {} })
    .eq('customer_id', userId);
  if (ordersError) {
    return json(req, { error: `Could not anonymize your orders: ${ordersError.message}` }, 500);
  }

  const personalTables = [
    'notifications',
    'cart_items',
    'wishlist_items',
    'user_addresses',
    'user_payment_methods',
  ] as const;
  for (const table of personalTables) {
    // Every one of these tables keys its rows by `user_id` in this schema.
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      return json(req, { error: `Could not delete your ${table}: ${error.message}` }, 500);
    }
  }

  // Remove the caller's avatar files (stored under their own `<uid>/`
  // prefix in the user-avatars bucket). Best effort per page of results:
  // a storage failure must not leave a half-deleted account behind, so a
  // hard error here still aborts before the auth record goes.
  const { data: avatarFiles, error: avatarListError } = await admin.storage
    .from('user-avatars')
    .list(userId, { limit: 100 });
  if (avatarListError) {
    return json(req, { error: `Could not list your stored files: ${avatarListError.message}` }, 500);
  }
  if (avatarFiles && avatarFiles.length > 0) {
    const paths = avatarFiles.map((f) => `${userId}/${f.name}`);
    const { error: avatarRemoveError } = await admin.storage
      .from('user-avatars')
      .remove(paths);
    if (avatarRemoveError) {
      return json(req, { error: `Could not delete your stored files: ${avatarRemoveError.message}` }, 500);
    }
  }

  // Last: the auth record itself (cascades the profile via its FK).
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json(req, { error: `Could not delete your account: ${deleteError.message}` }, 500);
  }

  return json(req, { ok: true });
});
