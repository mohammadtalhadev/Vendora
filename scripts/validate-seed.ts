// Applies the migrations + generated seed to a throwaway PGlite and sanity-checks
// referential integrity of the demo catalog.
// Usage: node --experimental-strip-types scripts/validate-seed.ts
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const db = new PGlite({ extensions: { pgcrypto } });
const migDir = path.join(ROOT, 'supabase/migrations');

await db.exec(readFileSync(path.join(ROOT, 'scripts/pglite-stubs.sql'), 'utf8'));
for (const f of readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
}
await db.exec(readFileSync(path.join(ROOT, 'supabase/seed.sql'), 'utf8'));

const rows = (sql: string) => db.query(sql).then((r) => r.rows as any[]);

const counts = await rows(`
  select
    (select count(*)::int from auth.users) as auth_users,
    (select count(*)::int from profiles) as profiles,
    (select count(*)::int from categories) as categories,
    (select count(*)::int from vendor_profiles) as stores,
    (select count(*)::int from products) as products,
    (select count(*)::int from promotions) as promotions,
    (select count(*)::int from rider_profiles) as riders,
    (select count(*)::int from content_blocks) as content
`);
console.log(counts[0]);

const problems = await rows(`
  select 'products without category' k, count(*)::int n from products p left join categories c on c.id = p.category_id where p.category_id is not null and c.id is null
  union all select 'digital products missing asset info', count(*)::int from products where type = 'digital' and digital_asset_info = '{}'::jsonb
  union all select 'products not approved', count(*)::int from products where status <> 'approved'
  union all select 'stores with no products', count(*)::int from vendor_profiles v where not exists (select 1 from products p where p.seller_id = v.id)
  union all select 'duplicate product slugs', count(*)::int from (select slug from products group by slug having count(*) > 1) d
  union all select 'profiles without roles', count(*)::int from profiles where array_length(roles,1) is null
`);
for (const p of problems) console.log(`${p.k}: ${p.n}`);

const perStore = await rows(`
  select v.store_name, v.slug, count(p.id)::int as products, coalesce(sum(p.stock),0)::int as stock
  from vendor_profiles v left join products p on p.seller_id = v.id
  group by 1,2 order by 3 desc limit 8
`);
console.table(perStore);

const search = await rows(`
  select title from products
  where search_vector @@ plainto_tsquery('english', 'wireless headphones')
  limit 3
`);
console.log('fts sample:', search.map((r) => r.title));

const login = await rows(`
  select count(*)::int as total,
         count(*) filter (where extensions.crypt('demo1234', encrypted_password) = encrypted_password)::int as ok
  from auth.users
`);
console.log(`demo password 'demo1234' verifies for ${login[0].ok}/${login[0].total} users`);
if (login[0].ok !== login[0].total) process.exitCode = 1;

await db.close();
