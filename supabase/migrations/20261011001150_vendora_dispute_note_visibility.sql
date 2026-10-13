-- ============================================================================
-- QA finding (live, 2026-10-12): a buyer could read the desk's internal notes.
--
-- `dispute_messages_select_party` (20261011000200_vendora_rls.sql:328) gated the row on
-- "are you a party to this dispute" and nothing else. `add_dispute_message` and the
-- escalation path both write rows with `is_internal_note = true` - triage opinions,
-- audit flags, the reason a case was handed up - and those rows satisfy the same policy,
-- so `select * from dispute_messages where dispute_id = <my case>` as the customer
-- returned staff-only copy. Verified live against the linked project: a buyer read
-- 2 of 2 messages, one of them the internal note.
--
-- The fix keeps one rule and adds the missing half of the other: staff see the whole
-- thread because they are staff; a party (buyer or the store on the other side of the
-- case) sees the thread minus the notes. Notes stay in the table - the desk needs them
-- and the audit trail references them - they are simply not readable from outside.
-- ============================================================================

drop policy if exists dispute_messages_select_party on public.dispute_messages;

create policy dispute_messages_select_party on public.dispute_messages
  for select to authenticated
  using (
    public.has_role('admin')
    or public.has_role('support')
    or (
      public.is_dispute_party(dispute_id)
      and coalesce(is_internal_note, false) = false
    )
  );
