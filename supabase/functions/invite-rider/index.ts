// Vendora Batch 65: rider invitation.
//
// Before this function, a rider only existed if the owner hand-ran SQL
// against a pre-created account. This replaces that with a real invite:
// an admin sends { email, name, phone?, vehicle? }, Supabase Auth emails
// the rider an invite link, and the rider sets their OWN password — no
// password is ever created, seen, or shared by an admin.
//
// Auth model (mirrors delete-account): the caller proves who they are
// with their own JWT (verify_jwt = true in config.toml, getUser() below
// re-checks it), and their profile must carry the 'admin' role. The
// privileged writes — inviting the auth user, granting the role, writing
// the rider row — run with the service role from the function's own env
// (SUPABASE_SERVICE_ROLE_KEY is provided by the platform; it is never
// accepted from the request and never logged).
//
// The invite's redirectTo is the app's existing set-password page
// (/reset-password): an invite link lands there carrying a live session,
// and that page already shows its set-new-password form for any valid
// session and saves via auth.updateUser({ password }) — the same code
// path password recovery uses.
//
// The rider row starts 'offline': rider_availability has no 'pending'
// state, and 'available' would let dispatch assign deliveries to someone
// who has not accepted the invite yet. The rider flips themselves to
// 'available' from their own panel once they are in.

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

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  // Where invite links land. SITE_URL is a plain config value (not a
  // secret); the live storefront is the default so a fresh deploy works
  // before anyone sets it.
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://vendora-plum.vercel.app').replace(/\/+$/, '');

  // Who is calling? Their own JWT, checked against Auth — never a body field.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Not authenticated' }, 401);
  }
  const callerId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Only an admin may invite: the role lives on the caller's profile row,
  // read with the service role so a stale or forged client claim cannot
  // widen it.
  const { data: callerProfile, error: callerError } = await admin
    .from('profiles')
    .select('roles')
    .eq('id', callerId)
    .maybeSingle();
  if (callerError) {
    return json({ error: `Could not verify your admin role: ${callerError.message}` }, 500);
  }
  const callerRoles = (callerProfile?.roles ?? []) as string[];
  if (!callerRoles.includes('admin')) {
    return json({ error: 'Only administrators can invite riders' }, 403);
  }

  let body: { email?: unknown; name?: unknown; phone?: unknown; vehicle?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Request body must be JSON: { "email": "...", "name": "..." }' }, 400);
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const vehicle = typeof body.vehicle === 'string' && body.vehicle.trim() ? body.vehicle.trim() : 'Motorcycle';
  if (!EMAIL_SHAPE.test(email)) {
    return json({ error: 'A valid rider email address is required' }, 400);
  }
  if (!name) {
    return json({ error: "The rider's full name is required" }, 400);
  }

  // Idempotency: a profile already carrying this email means the auth user
  // already exists (profiles are created by trigger on user insert, and
  // profiles.email is kept in sync). Re-inviting then just re-asserts the
  // role and the rider row instead of erroring on a duplicate invite.
  const { data: existingProfile, error: lookupError } = await admin
    .from('profiles')
    .select('id, roles')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) {
    return json({ error: `Could not look up that email: ${lookupError.message}` }, 500);
  }

  let riderUserId: string;
  let alreadyInvited = false;
  if (existingProfile?.id) {
    riderUserId = existingProfile.id as string;
    alreadyInvited = true;
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name, invited_as: 'rider' },
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (inviteError || !invited.user) {
      // The one recoverable refusal: the email is an auth user with no
      // profile row (a legacy hand-made account). Find them and fall
      // through to the same idempotent grant instead of failing the desk.
      const already = /already been registered|already exists/i.test(inviteError?.message ?? '');
      const { data: listed } = already
        ? await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        : { data: null };
      const found = listed?.users.find((u) => u.email?.toLowerCase() === email);
      if (!found) {
        return json({ error: `Could not send the invite: ${inviteError?.message ?? 'unknown error'}` }, 500);
      }
      riderUserId = found.id;
      alreadyInvited = true;
    } else {
      riderUserId = invited.user.id;
    }
  }

  // Grant the rider role server-side. profiles.roles is the authority the
  // guards and RLS read (never a JWT claim), and the write is pinned to
  // just the roles column merge — an existing account keeps its other
  // roles (a rider is usually also a customer). A fresh invite's profile
  // was made by the on_auth_user_created trigger; the orphan fallback
  // above can surface a pre-trigger account with no row, so ensure it.
  let profileRow = existingProfile;
  if (!profileRow) {
    const { data } = await admin
      .from('profiles')
      .select('id, roles')
      .eq('id', riderUserId)
      .maybeSingle();
    profileRow = data;
  }
  if (!profileRow) {
    const { error: createError } = await admin
      .from('profiles')
      .insert({ id: riderUserId, name, email, roles: ['customer'] });
    if (createError) {
      return json({ error: `Could not create the rider's profile: ${createError.message}` }, 500);
    }
    profileRow = { id: riderUserId, roles: ['customer'] };
  }
  const currentRoles = ((profileRow?.roles ?? []) as string[]);
  if (!currentRoles.includes('rider')) {
    const { error: roleError } = await admin
      .from('profiles')
      .update({ roles: [...currentRoles, 'rider'] })
      .eq('id', riderUserId);
    if (roleError) {
      return json({ error: `Invite sent, but the rider role could not be granted: ${roleError.message}` }, 500);
    }
  }

  // The rider row dispatch reads. Upsert on user_id (unique) so a
  // re-invite refreshes the desk's copy of the contact fields without
  // duplicating the rider or resetting a status they have since set.
  const { error: riderError } = await admin
    .from('rider_profiles')
    .upsert(
      { user_id: riderUserId, full_name: name, phone, vehicle_type: vehicle },
      { onConflict: 'user_id', ignoreDuplicates: false },
    );
  if (riderError) {
    return json({ error: `The rider role was granted, but the fleet row could not be saved: ${riderError.message}` }, 500);
  }
  // `status` is deliberately absent from the upsert payload: a new row
  // takes the column default ('offline'), and a re-invite never resets
  // the availability the rider has set for themselves.

  return json({ ok: true, userId: riderUserId, alreadyInvited });
});
