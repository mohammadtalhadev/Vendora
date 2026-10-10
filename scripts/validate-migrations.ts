// Validates Supabase migrations against a real Postgres (PGlite/WASM).
// Usage: node --experimental-strip-types scripts/validate-migrations.ts
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const db = new PGlite({ extensions: { pgcrypto } });

async function runFile(label: string, file: string) {
  const sql = readFileSync(file, 'utf8');
  try {
    await db.exec(sql);
    console.log(`OK   ${label}`);
  } catch (err: any) {
    console.error(`FAIL ${label}`);
    console.error(String(err.message ?? err).split('\n').slice(0, 6).join('\n'));
    process.exitCode = 1;
  }
}

await runFile('stubs', path.join(ROOT, 'scripts/pglite-stubs.sql'));

const migDir = path.join(ROOT, 'supabase/migrations');
const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();

for (const f of files) {
  await runFile(f, path.join(migDir, f));
}

// smoke: table + function inventory
const tables = await db.query(
  "select tablename from pg_tables where schemaname='public' order by tablename",
);
const fns = await db.query(
  "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname",
);
console.log(`tables(${tables.rows.length}):`, tables.rows.map((r: any) => r.tablename).join(', '));
console.log(`functions(${fns.rows.length}):`, fns.rows.map((r: any) => r.proname).join(', '));

const policies = await db.query('select count(*)::int as c from pg_policies where schemaname=$1', ['public']);
console.log('policies:', (policies as any).rows?.[0]?.c);
