// Vendora Batch 43: account self-deletion.
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Function is not fully configured on the server' }, 500);
  }

  // Who is calling? Their own JWT, checked against Auth — never a body field.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Not authenticated' }, 401);
  }
  const userId = userData.user.id;

  // The confirmation is exact and typed by the user in the settings page.
  let confirm: unknown;
  try {
    const body = await req.json() as { confirm?: unknown };
    confirm = body.confirm;
  } catch {
    return json({ error: 'Request body must be JSON: { "confirm": "DELETE" }' }, 400);
  }
  if (confirm !== 'DELETE') {
    return json({ error: 'Confirmation missing: send { "confirm": "DELETE" } to delete your account' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Anonymize order history first, while the rows still point at the user.
  const { error: ordersError } = await admin
    .from('orders')
    .update({ customer_email: 'deleted@vendora.market', shipping_address: {} })
    .eq('customer_id', userId);
  if (ordersError) {
    return json({ error: `Could not anonymize your orders: ${ordersError.message}` }, 500);
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
      return json({ error: `Could not delete your ${table}: ${error.message}` }, 500);
    }
  }

  // Last: the auth record itself (cascades the profile via its FK).
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json({ error: `Could not delete your account: ${deleteError.message}` }, 500);
  }

  return json({ ok: true });
});
