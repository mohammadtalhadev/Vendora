-- ============================================================================
-- VENDORA — Audit trail IP capture
-- Run in the Supabase SQL editor (like the Batch 10 migration). Idempotent:
-- every statement is safe to run twice.
--
-- Why a trigger: audit_logs has no single writer. Governance RPCs across the
-- operations, vendor-workspace, admin-console and later migrations insert
-- into it inline (a dozen-plus call sites), and there is no shared helper
-- function to patch. A BEFORE INSERT trigger is the one choke point every
-- current and future insert path passes through.
--
-- What it captures: the client IP PostgREST exposes for the request that
-- caused the write, taken from the first entry of the X-Forwarded-For header
-- (`request.headers` is a per-request GUC PostgREST sets). Inserts that do
-- not arrive through PostgREST (direct SQL, cron) have no such header, so
-- their rows honestly keep a NULL ip_address instead of an invented one.
--
-- What it does NOT do: rewrite history. Rows already stored keep whatever
-- ip_address they carry — mostly the old '127.0.0.1' column default, which
-- was a placeholder, not a measurement. That default is retired here so no
-- new row can silently acquire it again.
-- ============================================================================

-- The column exists in the operations migration; this keeps the migration
-- self-sufficient if it is ever run against a database built without it.
alter table public.audit_logs
  add column if not exists ip_address text;

-- Retire the placeholder default: an unknown IP is NULL, not 127.0.0.1.
alter table public.audit_logs
  alter column ip_address set default null;

create or replace function public.capture_audit_ip()
returns trigger
language plpgsql
as $$
declare
  v_headers jsonb;
  v_xff text;
begin
  -- `request.headers` is only set for PostgREST requests, and its value is
  -- not guaranteed to parse; a failed capture must never fail the audit
  -- insert itself, so the whole lookup is exception-guarded.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;

  if v_headers is not null then
    v_xff := nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
    if v_xff is not null then
      new.ip_address := v_xff;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_logs_capture_ip on public.audit_logs;

create trigger trg_audit_logs_capture_ip
  before insert on public.audit_logs
  for each row
  execute function public.capture_audit_ip();
