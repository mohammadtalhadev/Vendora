// Live auth verification against the linked Supabase project.
// Read-only: signs in as each demo persona, then checks RLS scoping through PostgREST.
// Requires .env with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY and a seeded database.
// Usage: npm run auth:verify
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const PASSWORD = 'demo1234';
const PERSONAS = [
  'customer@demo.test',
  'newuser@demo.test',
  'vendor@demo.test',
  'vendor2@demo.test',
  'admin@demo.test',
  'support@demo.test',
  'rider@demo.test',
];
// Staff roles may read every profile; everyone else is limited to their own row.
const STAFF = new Set(['admin@demo.test', 'support@demo.test']);

let failed = 0;
const check = (cond, message) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${message}`);
  if (!cond) failed++;
};

const rest = (table, query, token) =>
  fetch(`${URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

const client = createClient(URL, ANON, { auth: { persistSession: false } });

console.log('1) Anon cannot read owned tables');
{
  const profiles = await client.from('profiles').select('id');
  check(profiles.error === null, 'profiles query reaches the server');
  check((profiles.data ?? []).length === 0, `profiles visible to anon = ${profiles.data?.length}`);
  const orders = await client.from('orders').select('id');
  check((orders.data ?? []).length === 0, `orders visible to anon = ${orders.data?.length}`);
}

console.log('2) Each persona signs in and sees only its own profile');
const sessions = {};
for (const email of PERSONAS) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) {
    check(false, `${email}: sign-in failed (${error?.message ?? 'no session'})`);
    continue;
  }
  sessions[email] = data.session.access_token;
  const mine = await rest('profiles', `id=eq.${data.user.id}&select=id,email`, data.session.access_token);
  const all = await rest('profiles', 'select=id&limit=50', data.session.access_token);
  const expected = STAFF.has(email) ? 7 : 1;
  check(
    Array.isArray(mine) && mine.length === 1 && mine[0].email === email,
    `${email}: own profile row readable`,
  );
  check(
    Array.isArray(all) && all.length === expected,
    `${email}: profiles visible = ${all?.length} (expected ${expected})`,
  );
  await client.auth.signOut();
}

console.log('3) Vendor directory is readable by staff and customers (public storefront)');
{
  for (const email of ['admin@demo.test', 'customer@demo.test']) {
    const rows = await rest('vendor_profiles', 'select=id&limit=200', sessions[email]);
    check(Array.isArray(rows) && rows.length === 14, `${email}: vendor_profiles = ${rows?.length}`);
  }
}

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} CHECK(S) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
