# Vendora — Backup & Restore Runbook

Honest scope first: this runbook does not guarantee anything by itself. A
backup you have never restored is a hope, not a backup. The monthly drill
below is the part that makes this document true.

## What Supabase gives us (plan-dependent)

- **Point-in-Time Recovery (PITR)** is **not available on every plan**. On
  the Free plan there is **no PITR and no scheduled backup retention you
  can restore from**; paid plans add daily backups, and PITR is a further
  add-on on higher tiers. Check the project's actual plan before relying on
  any of this: Supabase Dashboard → Settings → Billing.
- **Daily backups** (on plans that include them) are physical backups of
  the database, retained for a plan-dependent number of days.
- Nothing in the dashboard backs up **Storage objects** or **Auth settings /
  secrets configuration** as part of a database backup. See "What a restore
  does NOT cover" below.

## How to check backups (monthly, and after any plan change)

1. Supabase Dashboard → **Database → Backups**.
2. Confirm the **Scheduled backups** list shows a recent successful backup
   (note its date in the drill log below).
3. Confirm whether **Point-in-Time Recovery** is shown as enabled or
   available for this project; record which it is — do not assume.
4. If the list is empty or stale, treat it as an incident: run a manual CLI
   dump (below) immediately and keep it outside Supabase.

## Manual dump (works on every plan)

Requires the Supabase CLI linked to the project (`supabase link`) and the
database password from the dashboard (never commit it, never put it in a
script file in this repo).

```bash
# Full database (roles, schema, data) — the file you would restore from
supabase db dump -f backup-$(date +%F).sql

# Data only, if you just need the rows
supabase db dump --data-only -f backup-data-$(date +%F).sql
```

Store dumps somewhere that is **not** this repo and **not** only the same
laptop: an encrypted drive or a private bucket in a different account.
A dump contains every customer's personal data — treat it like production.

## Restore drill (monthly — into a NEW project, never over production)

1. Create a **new throwaway Supabase project** (free tier is fine).
2. Restore the latest dump into it:
   `psql <connection-string-of-NEW-project> -f backup-YYYY-MM-DD.sql`
   (or replay via the new project's SQL editor for small dumps).
3. Run the app against the drill project (point a local `.env` at it) and
   check: login works, product list loads, an old order opens, admin
   dashboard renders.
4. Record the date, the dump used, and the result in the log table below.
5. Delete the drill project when finished — it holds real customer data.

**Never restore over the live project as a first attempt.** A restore is
destructive to everything written after the backup; rehearse in the new
project, decide, and only then plan a production restore with a maintenance
window and a fresh dump of current production taken first.

## What a restore does NOT cover

- **Storage objects** (product images, avatars, dispute evidence): database
  rows reference file paths, but the files themselves live in Storage.
  Export them separately (Dashboard → Storage, or the S3-compatible API)
  on the same monthly cadence, into the same off-site location.
- **Auth configuration**: URL configuration (Site URL / redirect URLs),
  email templates, and providers are project settings, not table data.
  Keep a note of them in `SUPABASE_SETUP.md` whenever they change.
- **Secrets / environment variables**: Vercel env vars and database
  settings (e.g. `app.delivery_code_pepper`) are not in a dump's data.
  Re-apply them on the restored project before traffic.
- **Anything written after the backup**: that gap is the data loss window.

## Expectations (set by physics, not optimism)

- **RPO (how much data we can lose):** with daily backups, up to ~24 hours
  of orders; with PITR enabled, minutes. On the Free plan with only manual
  dumps, the RPO is "since the last manual dump" — run one before every
  risky change (migration days included).
- **RTO (how long a restore takes):** a CLI/dump restore of this database
  is realistically tens of minutes plus verification; a first-ever,
  unrehearsed restore will take longer. The drill exists to shrink this.

## Drill log

| Date | Backup/dump used | Restored into new project? | App verified? | Notes |
|------|------------------|----------------------------|---------------|-------|
|      |                  |                            |               |       |
