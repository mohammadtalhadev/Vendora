import React, { useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  Inbox,
  Package,
  RotateCcw,
  ShieldAlert,
  Store,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { SupportAgent, SupportDisputeRow } from '../api/disputes';
import { cn } from '../../../lib/utils';

export interface DisputeContextBarProps {
  /** The case as Postgres computed it: the money, the status, the evidence, who holds it. */
  dispute: SupportDisputeRow;
  /** Real accounts the case can be handed to, from `support_staff_directory`. */
  agents: SupportAgent[];
  /** A write is in flight, so the desk cannot issue it twice. */
  pending?: boolean;
  /** The database's own refusal, shown rather than swallowed. */
  error?: string | null;
  onRefund: (amount: number, note: string) => void;
  onResolve: (outcome: 'resolved_refund' | 'resolved_denied', note: string, amount?: number) => void;
  onEscalate: (note: string) => void;
  onAssign: (agentId: string) => void;
  className?: string;
}

const money = (value: number) => `$${value.toFixed(2)}`;

const STATUS_BADGE: Record<SupportDisputeRow['status'], string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-sky-50 text-sky-700 border-sky-200',
  escalated: 'bg-rose-50 text-rose-700 border-rose-200',
  resolved_refund: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  resolved_denied: 'bg-slate-100 text-slate-700 border-slate-200',
};

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-slate-500">{label}</span>
    <span className={cn('text-right font-semibold text-slate-800', mono && 'font-mono text-[11px]')}>{value}</span>
  </div>
);

export const DisputeContextBar: React.FC<DisputeContextBarProps> = ({
  dispute,
  agents,
  pending = false,
  error = null,
  onRefund,
  onResolve,
  onEscalate,
  onAssign,
  className,
}) => {
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialNote, setPartialNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [rulingNote, setRulingNote] = useState('');

  const closed = dispute.status === 'resolved_refund' || dispute.status === 'resolved_denied';
  const owed = Math.max(dispute.remainingGross, 0);
  const partialNumber = Number(partialAmount);
  const partialValid = partialAmount !== ''
    && Number.isFinite(partialNumber)
    && partialNumber > 0
    && partialNumber <= owed
    && partialNote.trim().length > 0;

  const submitRefund = (amount: number, note: string) => {
    setConfirming(false);
    setShowPartialInput(false);
    setPartialAmount('');
    setPartialNote('');
    onRefund(amount, note);
  };

  return (
    <div
      data-testid="dispute-context-bar"
      className={cn(
        'flex h-full flex-col divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs',
        className,
      )}
    >
      {/* 1. What the case is */}
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Case</h3>
          <span
            data-testid="resolution-status-badge"
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              STATUS_BADGE[dispute.status],
            )}
          >
            {dispute.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm font-bold text-slate-900">{dispute.reason}</p>
        <div className="mt-3 space-y-1.5 text-xs">
          <Row label="Buyer" value={dispute.customerName || 'Not named'} />
          <Row
            label="Store"
            value={(
              <span className="inline-flex items-center gap-1">
                <Store className="h-3 w-3 text-slate-400" />
                {dispute.vendorName || 'Unknown store'}
              </span>
            )}
          />
          <Row
            label="Package status"
            value={<span className="capitalize">{dispute.packageStatus.replace(/_/g, ' ')}</span>}
          />
          <Row label="Agent on case" value={dispute.agentName || 'Unassigned'} />
          <Row label="Messages" value={dispute.messages} />
          <Row label="Opened" value={new Date(dispute.createdAt).toLocaleDateString()} />
        </div>
      </div>

      {/* 2. The money, as the ledger holds it */}
      <div className="p-4" data-testid="dispute-money">
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Package className="h-3.5 w-3.5 text-slate-500" />
          <span>What the buyer paid for this package</span>
        </h4>
        <div className="space-y-1.5 text-xs">
          <Row label="Charged at checkout" value={money(dispute.packageGross)} />
          <Row label="Already returned" value={money(dispute.refundedAmount)} />
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-500">Still owed</span>
            <span data-testid="dispute-remaining" className="text-sm font-black text-sky-700">{money(owed)}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          These are the refund rows against this package, added up in Postgres. A package reads
          refunded only once the whole amount is back with the buyer.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span data-testid="context-bar-error">{error}</span>
        </div>
      )}

      {/* 3. Money: the one action that leaves the platform */}
      {!closed && (
        <div className="p-4">
          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Refund</h4>
          <button
            type="button"
            data-testid="btn-full-refund"
            disabled={pending || owed <= 0}
            onClick={() => setConfirming(true)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-xs transition-all',
              owed > 0 && !pending
                ? 'cursor-pointer bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                : 'cursor-not-allowed bg-slate-100 text-slate-400',
            )}
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              {owed > 0 ? `Refund everything owed (${money(owed)})` : 'Nothing left to refund on this package'}
            </span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-200">
              Buyer credit
            </span>
          </button>

          {!showPartialInput ? (
            <button
              type="button"
              data-testid="btn-partial-refund"
              disabled={pending || owed <= 0}
              onClick={() => setShowPartialInput(true)}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refund part of it
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <label className="block text-xs font-bold text-emerald-900" htmlFor="partial-refund-input">
                Amount (max {money(owed)})
              </label>
              <input
                id="partial-refund-input"
                type="number"
                step="0.01"
                min="0.01"
                max={owed}
                data-testid="partial-refund-input"
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value)}
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <label className="block text-xs font-bold text-emerald-900" htmlFor="partial-refund-note">
                Why — recorded on the refund and in the package history
              </label>
              <textarea
                id="partial-refund-note"
                rows={2}
                data-testid="partial-refund-note"
                value={partialNote}
                onChange={(event) => setPartialNote(event.target.value)}
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="confirm-partial-refund-btn"
                  disabled={!partialValid || pending}
                  onClick={() => submitRefund(partialNumber, partialNote.trim())}
                  className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refund {partialAmount && Number.isFinite(partialNumber) ? money(partialNumber) : '—'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialInput(false);
                    setPartialAmount('');
                    setPartialNote('');
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. The ruling on the case */}
      <div className="p-4">
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Ruling</h4>
        {!closed && (
          <textarea
            rows={2}
            data-testid="ruling-note"
            aria-label="Ruling note"
            placeholder="What you decided and why — the buyer reads this"
            value={rulingNote}
            onChange={(event) => setRulingNote(event.target.value)}
            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="btn-resolve-refund"
            disabled={closed || pending || rulingNote.trim().length === 0}
            onClick={() => onResolve('resolved_refund', rulingNote.trim(), dispute.refundedAmount)}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolve as refunded</span>
          </button>
          <button
            type="button"
            data-testid="btn-deny-dispute"
            disabled={closed || pending || rulingNote.trim().length === 0}
            onClick={() => onResolve('resolved_denied', rulingNote.trim())}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Deny claim</span>
          </button>
        </div>
        {closed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
            <div className="mb-1 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{dispute.status === 'resolved_refund' ? 'Resolved with a refund' : 'Claim denied'}</span>
            </div>
            {dispute.resolutionNote && <p className="mt-1 text-[11px]">{dispute.resolutionNote}</p>}
            {dispute.resolutionAmount !== null && (
              <p className="mt-0.5 text-[11px] font-semibold">Amount recorded: {money(dispute.resolutionAmount)}</p>
            )}
          </div>
        )}
        <button
          type="button"
          data-testid="btn-escalate-admin"
          disabled={dispute.status === 'escalated' || closed || pending}
          onClick={() => onEscalate(rulingNote.trim() || 'Needs a senior decision.')}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors',
            dispute.status === 'escalated' || closed || pending
              ? 'cursor-not-allowed border-rose-200 bg-rose-50 text-rose-700 opacity-60'
              : 'cursor-pointer border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100',
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>{dispute.status === 'escalated' ? 'Already escalated' : 'Escalate to a senior agent'}</span>
        </button>
      </div>

      {/* 5. Who works it */}
      <div className="p-4">
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          <UserCheck className="h-3.5 w-3.5" />
          <span>Hand over</span>
        </h4>
        {agents.filter((agent) => !agent.isMe).length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Inbox className="h-3.5 w-3.5" />
            There is no other agent account to hand this to.
          </p>
        ) : (
          <select
            data-testid="assign-agent-select"
            aria-label="Agent to hand this case to"
            defaultValue=""
            disabled={pending || closed}
            onChange={(event) => {
              const chosen = event.target.value;
              event.target.value = '';
              if (chosen) onAssign(chosen);
            }}
            className="native-select w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="" disabled>Choose an agent</option>
            {agents
              .filter((agent) => !agent.isMe)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.openCases} open
                </option>
              ))}
          </select>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          The handover is recorded on the case and audited. A case cannot be handed to yourself.
        </p>
      </div>

      {/* 6. Evidence the buyer attached */}
      {dispute.evidencePhotos.length > 0 && (
        <div className="p-4" data-testid="dispute-evidence">
          <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
            <span>Evidence on the case</span>
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {dispute.evidencePhotos.map((photo) => (
              <a key={photo} href={photo} target="_blank" rel="noreferrer">
                <img
                  src={photo}
                  alt="Evidence supplied on this case"
                  className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 7. The one thing that cannot be undone */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm the refund"
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Refund {money(owed)}</h3>
                <p className="text-xs text-slate-400">
                  A refund row is written against the package. Refund rows are not edited or deleted.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
              <Row label="Buyer" value={dispute.customerName || 'Not named'} />
              <Row label="Store" value={dispute.vendorName || 'Unknown store'} />
              <Row label="Package" value={`#${dispute.subOrderId ?? 'unknown'}`} mono />
              <Row label="Charged at checkout" value={money(dispute.packageGross)} />
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Returning now</span>
                <span className="text-sm text-rose-600">{money(owed)}</span>
              </div>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="font-bold text-slate-700">Reason (stored on the refund)</span>
              <input
                data-testid="refund-confirm-note"
                value={partialNote}
                onChange={(event) => setPartialNote(event.target.value)}
                placeholder="Wrong item delivered, buyer kept the parcel"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </label>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-full-refund-btn"
                disabled={partialNote.trim().length === 0 || pending}
                onClick={() => submitRefund(owed, partialNote.trim())}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refund {money(owed)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The road is the buyer's last question; state the package, not an invented courier. */}
      {dispute.packageStatus === 'out_for_delivery' && (
        <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
          <Bike className="h-3.5 w-3.5" />
          <span>On its final leg. A delivery closes only with the buyer&rsquo;s handover code.</span>
        </div>
      )}
    </div>
  );
};
