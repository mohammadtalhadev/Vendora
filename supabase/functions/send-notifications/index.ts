// Vendora Batch 43: drains public.notification_outbox.
//
// Invoked on a schedule (pg_cron / external cron), never by end users, so it
// authenticates with a shared secret header instead of a user JWT:
//   POST /functions/v1/send-notifications   header: x-cron-secret: <CRON_SECRET>
//
// Honesty contract: a row becomes 'sent' only when the provider accepted it.
// With no provider configured the row becomes 'skipped' with the reason in
// `error` — queued mail is never reported as delivered.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OutboxRow {
  id: string;
  channel: 'email' | 'sms';
  recipient: string;
  subject: string | null;
  body: string;
}

const BATCH_SIZE = 50;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured' }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: rows, error: claimError } = await admin
    .from('notification_outbox')
    .select('id, channel, recipient, subject, body')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (claimError) return json({ error: claimError.message }, 500);

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const mailFrom = Deno.env.get('MAIL_FROM') ?? 'Vendora <orders@vendora.market>';
  const smsWebhookUrl = Deno.env.get('SMS_WEBHOOK_URL');

  const counts = { claimed: rows?.length ?? 0, sent: 0, failed: 0, skipped: 0 };

  // Rows are independent: one bad recipient must not abort the batch.
  for (const row of (rows ?? []) as OutboxRow[]) {
    let patch: Record<string, unknown>;
    try {
      if (row.channel === 'email') {
        if (!resendApiKey) {
          patch = { status: 'skipped', error: 'RESEND_API_KEY not configured' };
        } else {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: mailFrom,
              to: row.recipient,
              subject: row.subject ?? 'Vendora update',
              text: row.body,
            }),
          });
          const payload = await res.json().catch(() => null) as { id?: string; message?: string } | null;
          if (res.ok) {
            patch = {
              status: 'sent', provider: 'resend',
              provider_ref: payload?.id ?? null, sent_at: new Date().toISOString(), error: null,
            };
          } else {
            patch = {
              status: 'failed', provider: 'resend',
              error: `Resend HTTP ${res.status}: ${payload?.message ?? 'unknown error'}`,
            };
          }
        }
      } else {
        // channel === 'sms'
        if (!smsWebhookUrl) {
          patch = { status: 'skipped', error: 'SMS_WEBHOOK_URL not configured' };
        } else {
          const res = await fetch(smsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: row.recipient, body: row.body }),
          });
          if (res.ok) {
            patch = {
              status: 'sent', provider: 'sms-webhook',
              sent_at: new Date().toISOString(), error: null,
            };
          } else {
            patch = {
              status: 'failed', provider: 'sms-webhook',
              error: `SMS webhook HTTP ${res.status}`,
            };
          }
        }
      }
    } catch (err) {
      patch = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
    }

    const { error: updateError } = await admin
      .from('notification_outbox')
      .update(patch)
      .eq('id', row.id);
    if (updateError) {
      counts.failed += 1;
      continue;
    }
    if (patch.status === 'sent') counts.sent += 1;
    else if (patch.status === 'skipped') counts.skipped += 1;
    else counts.failed += 1;
  }

  return json(counts);
});
