// Generates src/types/database.ts in the same shape as `supabase gen types typescript`.
//
// Runs the migrations against an in-process PGlite and introspects the catalog, so
// types can be regenerated offline (CI, before the project is linked). Once linked,
// `npm run db:types:remote` regenerates the same file from the live database.
//
// Usage: node --experimental-strip-types scripts/gen-types.ts
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCHEMA = 'public';
const db = new PGlite({ extensions: { pgcrypto } });

await db.exec(readFileSync(path.join(ROOT, 'scripts/pglite-stubs.sql'), 'utf8'));
for (const f of readdirSync(path.join(ROOT, 'supabase/migrations')).filter((x) => x.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'));
}

const rows = <T,>(sql: string) => db.query(sql).then((r) => r.rows as T[]);

type Col = {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
  has_default: boolean;
  generated: string;
};

const cols = await rows<Col>(
  `select c.relname as table, a.attname as column,
          format_type(a.atttypid, a.atttypmod) as type,
          not a.attnotnull as nullable,
          (a.atthasdef or a.attidentity <> '') as has_default,
          a.attgenerated as generated
     from pg_attribute a
     join pg_class c on c.oid = a.attrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = '${SCHEMA}' and a.attnum > 0 and not a.attisdropped
       and c.relkind in ('r','v','m')
     order by c.relname, a.attnum`,
);

const rels = await rows<{ relname: string; relkind: string }>(
  `select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = '${SCHEMA}' and c.relkind in ('r','v','m') order by c.relname`,
);

const enums = await rows<{ typname: string; label: string }>(
  `select t.typname, e.enumlabel as label from pg_type t
     join pg_enum e on e.enumtypid = t.oid
     join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = '${SCHEMA}' order by t.typname, e.enumsortorder`,
);

const pks = await rows<{ table: string; column: string }>(
  `select c.relname as table, a.attname as column
     from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_namespace n on n.oid = c.relnamespace
     join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
     where n.nspname = '${SCHEMA}' and i.indisprimary`,
);

const fks = await rows<{ table: string; column: string; ftable: string; fcolumn: string; name: string }>(
  `select c.relname as table, att.attname as column,
          fc.relname as ftable, fatt.attname as fcolumn, con.conname as name
     from pg_constraint con
     join pg_class c on c.oid = con.conrelid
     join pg_class fc on fc.oid = con.confrelid
     join pg_namespace n on n.oid = c.relnamespace
     join lateral unnest(con.conkey) with ordinality k(attnum, ord) on true
     join lateral unnest(con.confkey) with ordinality kk(attnum, ord) on kk.ord = k.ord
     join pg_attribute att on att.attrelid = c.oid and att.attnum = k.attnum
     join pg_attribute fatt on fatt.attrelid = fc.oid and fatt.attnum = kk.attnum
     where con.contype = 'f' and n.nspname = '${SCHEMA}'
     order by c.relname, con.conname, k.ord`,
);

// Trigger plumbing and support functions are not callable from the client.
const HIDDEN = new Set([
  'set_updated_at',
  'handle_new_user',
  'build_product_search_vector',
  'refresh_product_rating',
]);

const funcs = await rows<{ proname: string; args: string; ret: string; retset: boolean }>(
  `select p.proname,
          pg_get_function_arguments(p.oid) as args,
          format_type(p.prorettype, null) as ret,
          p.proretset as retset
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     join pg_roles r on r.oid = p.proowner
     where n.nspname = '${SCHEMA}' and p.prokind = 'f' and r.rolname = 'postgres'
     order by p.proname`,
);

const enumLabels = new Map<string, string[]>();
for (const e of enums) enumLabels.set(e.typname, [...(enumLabels.get(e.typname) ?? []), e.label]);
const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

/** Postgres type -> TypeScript, mirroring the Supabase generator's mapping. */
function tsType(pg: string): string {
  const trimmed = pg.trim();
  if (trimmed.endsWith('[]')) return `${tsType(trimmed.slice(0, -2))}[]`;
  const base = trimmed.replace(/^public\./, '').replace(/\(.*\)$/, '').trim();
  if (base === 'boolean') return 'boolean';
  if (['smallint', 'integer', 'bigint', 'real', 'double precision', 'money', 'oid'].includes(base)) return 'number';
  if (['json', 'jsonb'].includes(base)) return 'Json';
  if (enumLabels.has(base)) return enumLabels.get(base)!.map(esc).join(' | ');
  if (base === 'record' || base === 'void') return 'Record<string, unknown>';
  // text, uuid, numeric, dates, timestamps, tsvector, bytea, domains, ...
  return 'string';
}

const pkByTable = new Map<string, string[]>();
for (const p of pks) pkByTable.set(p.table, [...(pkByTable.get(p.table) ?? []), p.column]);

const fkByTable = new Map<string, { name: string; columns: string[]; ftable: string; fcolumns: string[] }[]>();
for (const f of fks) {
  const list = fkByTable.get(f.table) ?? [];
  const existing = list.find((r) => r.name === f.name);
  if (existing) existing.fcolumns.push(f.fcolumn);
  else list.push({ name: f.name, columns: [f.column], ftable: f.ftable, fcolumns: [f.fcolumn] });
  fkByTable.set(f.table, list);
}

function field(c: Col, mode: 'row' | 'insert' | 'update'): string {
  const t = tsType(c.type);
  const optional = mode === 'update' || (mode === 'insert' && (c.has_default || c.generated === 's' || c.nullable));
  return `        ${esc(c.column)}${optional ? '?' : ''}: ${t}${c.nullable ? ' | null' : ''}`;
}

function relationBlock(table: string, kind: 'table' | 'view'): string {
  if (kind === 'view') return '';
  const list = fkByTable.get(table) ?? [];
  if (list.length === 0) return '';
  const singleColPk = pkByTable.get(table);
  return list
    .map((r) => {
      const oneToOne = !!singleColPk && singleColPk.length === 1 && r.columns.length === 1 && singleColPk[0] === r.columns[0];
      return `        {
          foreignKeyName: ${esc(r.name)}
          columns: [${r.columns.map(esc).join(', ')}]
          isOneToOne: ${oneToOne}
          referencedRelation: ${esc(r.ftable)}
          referencedColumns: [${r.fcolumns.map(esc).join(', ')}]
        }`;
    })
    .join(',\n');
}

function entityBlock(name: string, kind: 'table' | 'view'): string {
  const list = cols.filter((c) => c.table === name);
  const rel = relationBlock(name, kind);
  return `    ${esc(name)}: {
      Row: {
${list.map((c) => field(c, 'row')).join(',\n')}
      }
      Insert: {
${list.map((c) => field(c, 'insert')).join(',\n')}
      }
      Update: {
${list.map((c) => field(c, 'update')).join(',\n')}
      }
      Relationships: ${rel ? `[\n${rel}\n      ]` : '[]'}
    }`;
}

function argsBlock(raw: string): string {
  if (!raw.trim()) return '{}';
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of raw) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const fields = parts.map((p) => {
    const m = p.replace(/^variadic\s+/i, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+?)(?:\s+default\s+.+)?$/is);
    if (!m) return null;
    const hasDefault = /\bdefault\b/i.test(p);
    const nullDefault = /\bdefault\s+null\b/i.test(p);
    const t = tsType(m[2]);
    if (!hasDefault) return `        ${esc(m[1])}: ${t}`;
    return `        ${esc(m[1])}?: ${t}${nullDefault ? ' | null' : ''}`;
  });
  return `{\n${fields.filter(Boolean).join(',\n')}\n      }`;
}

const visible = funcs.filter((f) => !HIDDEN.has(f.proname) && f.ret !== 'trigger' && !f.args.includes('trigger'));
const functionBlocks = visible.map((f) => {
  const ret = f.retset ? `${tsType(f.ret)}[]` : tsType(f.ret);
  return `    ${esc(f.proname)}: {
      Args: ${argsBlock(f.args)}
      Returns: ${ret}
    }`;
});

const tableBlocks = rels
  .filter((r) => r.relkind === 'r')
  .map((r) => entityBlock(r.relname, 'table'))
  .join(',\n');
const viewBlocks = rels
  .filter((r) => r.relkind !== 'r')
  .map((r) => entityBlock(r.relname, 'view'))
  .join(',\n');
const enumNames = [...new Set(enums.map((e) => e.typname))];

const out = `// Generated by scripts/gen-types.ts - do not edit by hand.
// npm run db:types          regenerates from supabase/migrations (offline, PGlite)
// npm run db:types:remote   regenerates from the linked project (authoritative)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
${tableBlocks}
    };
    Views: {
${viewBlocks || '      [key: string]: never;'}
    };
    Functions: {
${functionBlocks.join(',\n')}
    };
    Enums: {
${enumNames.map((e) => `      ${esc(e)}: ${enumLabels.get(e)!.map(esc).join(' | ')}`).join(',\n')}
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
`;

writeFileSync(path.join(ROOT, 'src', 'types', 'database.ts'), out, 'utf8');
console.log(
  `wrote src/types/database.ts: ${rels.filter((r) => r.relkind === 'r').length} tables, ${rels.filter((r) => r.relkind !== 'r').length} views, ${visible.length} functions, ${enumNames.length} enums`,
);
await db.close();
