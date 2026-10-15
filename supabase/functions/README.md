# Vendora Edge Functions — owner runbook (Batch 43, invite-rider added Batch 65)

Three functions live here:

| Function | Who calls it | Auth |
| --- | --- | --- |
| `send-notifications` | A scheduler, every minute | `x-cron-secret` header must equal the `CRON_SECRET` secret |
| `delete-account` | The signed-in user from Account → Settings | The caller's own Supabase JWT (`verify_jwt = true`) |
| `invite-rider` | An admin from Fleet Logistics → Invite Rider | The caller's own Supabase JWT, and their profile must carry the `admin` role (re-checked inside the function) |

## 1. Deploy

From the repo root, with the Supabase CLI linked to the Vendora project:

```bash
supabase functions deploy send-notifications
supabase functions deploy delete-account
supabase functions deploy invite-rider
```

`supabase/config.toml` already carries the right `verify_jwt` settings
(`send-notifications` = false, `delete-account` = true, `invite-rider` = true).

## 2. Secrets

Never commit these; set them on the project:

```bash
supabase secrets set RESEND_API_KEY=re_...        # from resend.com (email provider)
supabase secrets set CRON_SECRET=<a long random string you generate>
supabase secrets set MAIL_FROM="Vendora <orders@vendora.market>"
# Optional, only if you have an SMS provider webhook:
supabase secrets set SMS_WEBHOOK_URL=https://your-sms-provider.example/send
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to every function automatically by the platform — do not set them
yourself.

## 3. Schedule `send-notifications` (pick ONE)

### Option A — pg_cron + pg_net (inside the database)

Run once in the SQL editor (replace the project ref and the secret):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vendora-send-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);
```

### Option B — any external cron

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-notifications \
  -H "x-cron-secret: <CRON_SECRET>"
```

## 4. Honest behaviour until secrets are set

The outbox (`public.notification_outbox`) collects mail from the moment the
Batch 43 migration runs — that part needs no keys. But **until `RESEND_API_KEY`
is set, the function marks every email row `skipped` with the error
`RESEND_API_KEY not configured`, and SMS rows are `skipped` until
`SMS_WEBHOOK_URL` is set.** Nothing is ever marked `sent` without the
provider actually accepting it, and no email leaves the building before you
complete steps 1–3. Check the queue any time with:

```sql
select status, channel, count(*) from public.notification_outbox group by 1, 2;
```

## 5. Account deletion

No scheduling needed. The Settings page calls `delete-account` with
`{ "confirm": "DELETE" }`; the function verifies the caller's JWT, anonymizes
their orders (`customer_email` → `deleted@vendora.market`, shipping address
wiped), deletes their notifications / cart / wishlist / addresses / saved
payment methods, then deletes the auth user. If the function is not deployed,
the settings page shows the function's error and points the user at support.

## 6. Rider invites (Batch 65)

Deploy with the commands in §1 — no new secrets are needed:
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to the function automatically. Optionally set `SITE_URL`
(e.g. `supabase secrets set SITE_URL=https://vendora-plum.vercel.app`)
to change where invite links land; the live storefront URL above is the
built-in default.

One dashboard step is required, or the invite email's link lands on an
error page: in **Supabase → Authentication → URL Configuration**, the
Redirect URLs allowlist must cover the set-password page the invite
points at — `https://vendora-plum.vercel.app/reset-password` (the
existing `https://vendora-plum.vercel.app/**` entry already covers it).

How it behaves: Fleet Logistics → **Invite Rider** calls the function,
which re-checks the caller's JWT + admin role, sends the Supabase invite
email, grants the `rider` role on the rider's profile and creates their
`rider_profiles` row (status `offline` until they mark themselves
available). The rider follows the email link, sets **their own**
password on `/reset-password`, and signs in to the Rider Board.
Re-inviting the same email is safe: the role and fleet row are simply
re-asserted and the dialog says the account already existed. Until this
function is deployed, the dialog surfaces the function's error honestly
— no rider is created and no password exists to share.
