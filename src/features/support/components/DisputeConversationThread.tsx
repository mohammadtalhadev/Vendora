import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Send,
  Store,
  User,
} from 'lucide-react';
import type { CannedResponse } from '../api/canned';
import type { DisputeThreadMessage, SupportDisputeRow } from '../api/disputes';
import { cn } from '../../../lib/utils';

export interface DisputeConversationThreadProps {
  /** The case the queue page returned, for the header line and its evidence. */
  dispute: SupportDisputeRow;
  /** `dispute_messages` as Postgres ordered them, oldest first. */
  messages: DisputeThreadMessage[];
  /** The desk's own template library, read from `canned_responses`. */
  templates: CannedResponse[];
  loading?: boolean;
  pending?: boolean;
  error?: string | null;
  onSend: (content: string, internalNote: boolean) => void;
  className?: string;
}

const SENDER: Record<DisputeThreadMessage['senderRole'], { label: string; badge: string; icon: React.ReactNode }> = {
  customer: {
    label: 'Customer',
    badge: 'bg-slate-100 text-slate-700',
    icon: <User className="h-2.5 w-2.5 text-slate-500" />,
  },
  vendor: {
    label: 'Store',
    badge: 'bg-orange-100/80 text-orange-900',
    icon: <Store className="h-2.5 w-2.5 text-orange-600" />,
  },
  support: {
    label: 'Support agent',
    badge: 'bg-sky-100/90 text-sky-900',
    icon: <MessageSquare className="h-2.5 w-2.5 text-sky-600" />,
  },
};

export const DisputeConversationThread: React.FC<DisputeConversationThreadProps> = ({
  dispute,
  messages,
  templates,
  loading = false,
  pending = false,
  error = null,
  onSend,
  className,
}) => {
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isCannedOpen, setIsCannedOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, dispute.id]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCannedOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const send = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const content = messageText.trim();
    if (!content || pending) return;
    onSend(content, isInternalNote);
    setMessageText('');
    setIsInternalNote(false);
  };

  // Everything shown here is a photo a party attached: the case row or a message.
  const photos = Array.from(new Set([
    ...dispute.evidencePhotos,
    ...messages.flatMap((message) => message.attachments),
  ]));

  return (
    <div
      data-testid="dispute-conversation-thread"
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs',
        className,
      )}
    >
      {/* Thread header: which case, who holds it */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Case {dispute.id.slice(0, 8)}</h2>
              <span className="font-mono text-xs text-slate-500">
                package {dispute.subOrderId ? dispute.subOrderId.slice(0, 8) : 'unknown'}
              </span>
            </div>
            <p className="max-w-[360px] truncate text-xs text-slate-500 sm:max-w-md">{dispute.reason}</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          On this case: <strong className="text-slate-800">{dispute.agentName || 'Unassigned'}</strong>
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800" role="alert">
          <span data-testid="thread-error">{error}</span>
        </div>
      )}

      {/* Evidence strip */}
      {photos.length > 0 && (
        <div
          data-testid="evidence-photos"
          className="flex items-center gap-3 overflow-x-auto border-b border-amber-200/50 bg-amber-50/40 px-4 py-2.5"
        >
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-900">
            <ImageIcon className="h-4 w-4 text-amber-700" />
            <span>Evidence ({photos.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                data-testid={`evidence-photo-${index}`}
                onClick={() => setPreview(photo)}
                className="group h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-amber-200 transition-all hover:ring-2 hover:ring-amber-500"
              >
                <img
                  src={photo}
                  alt={`Evidence ${index + 1} on this case`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/20 p-4 sm:p-5">
        {loading && <p className="text-xs text-slate-400">Loading this conversation…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-xs text-slate-400" data-testid="thread-empty">
            Nothing has been said on this case yet. The buyer opened it with: “{dispute.reason}”.
          </p>
        )}

        {messages.map((message) => {
          const sender = SENDER[message.senderRole];
          return (
            <div
              key={message.id}
              data-testid={message.internalNote ? 'internal-note-card' : `message-${message.id}`}
              className={cn(
                'rounded-2xl p-4',
                message.internalNote
                  ? 'border border-amber-300/80 bg-amber-50/90 ring-1 ring-amber-300/40'
                  : 'border border-slate-200/80 bg-white shadow-xs',
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2.5">
                  {message.senderAvatar ? (
                    <img
                      src={message.senderAvatar}
                      alt={message.senderName}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {(message.senderName.slice(0, 1) || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold leading-none text-slate-900">
                      {message.senderName || 'Unknown sender'}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', sender.badge)}>
                      {sender.icon}
                      {sender.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {message.internalNote && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      <Lock className="h-3 w-3 text-amber-800" />
                      Internal note
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-slate-400">
                    {new Date(message.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <p
                className={cn(
                  'whitespace-pre-wrap text-xs leading-relaxed',
                  message.internalNote ? 'font-medium text-amber-950' : 'text-slate-700',
                )}
              >
                {message.content}
              </p>

              {message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                  {message.attachments.map((attachment) => (
                    <button
                      key={attachment}
                      type="button"
                      onClick={() => setPreview(attachment)}
                      className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-slate-200 transition-all hover:ring-2 hover:ring-sky-500"
                    >
                      <img src={attachment} alt="Attachment on this message" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-slate-200/90 bg-white p-3.5 sm:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              data-testid="canned-responses-btn"
              disabled={templates.length === 0}
              onClick={() => setIsCannedOpen((open) => !open)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Templates</span>
              <ChevronDown className={cn('h-3 w-3 text-slate-400 transition-transform', isCannedOpen && 'rotate-180')} />
            </button>

            {isCannedOpen && (
              <div
                data-testid="canned-responses-menu"
                className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl sm:w-80"
              >
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Saved by this desk
                </div>
                <div className="mt-1 max-h-64 space-y-1 overflow-y-auto">
                  {templates.map((template, index) => (
                    <button
                      key={template.id}
                      type="button"
                      data-testid={`canned-option-${index}`}
                      onClick={() => {
                        setMessageText(template.body);
                        setIsCannedOpen(false);
                      }}
                      className="w-full cursor-pointer rounded-lg p-2 text-left text-xs text-slate-800 transition-colors hover:bg-sky-50 hover:text-sky-900"
                    >
                      <div className="font-semibold text-slate-900">{template.subject}</div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{template.body}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              data-testid="internal-note-toggle"
              checked={isInternalNote}
              onChange={(event) => setIsInternalNote(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className={cn('inline-flex items-center gap-1', isInternalNote && 'font-bold text-amber-800')}>
              <Lock className="h-3 w-3 text-amber-600" />
              Internal note
            </span>
          </label>
        </div>

        <textarea
          data-testid="message-input"
          rows={3}
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) send();
          }}
          placeholder={
            isInternalNote
              ? 'Note for the next agent on this case — the buyer and the store do not see this…'
              : 'Reply to the buyer and the store…'
          }
          className={cn(
            'w-full resize-none rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-1',
            isInternalNote
              ? 'border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-500'
              : 'border-slate-200 bg-slate-50/50 focus:border-sky-500 focus:bg-white focus:ring-sky-500',
          )}
        />

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Ctrl+Enter</kbd> to send
          </span>
          <button
            type="submit"
            data-testid="send-message-btn"
            disabled={!messageText.trim() || pending}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-40',
              isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800',
            )}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{pending ? 'Sending…' : isInternalNote ? 'Post note' : 'Send reply'}</span>
          </button>
        </div>
      </form>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <img src={preview} alt="Evidence preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <div className="mt-2 text-center text-xs font-medium text-slate-500">Click anywhere to close</div>
          </div>
        </div>
      )}
    </div>
  );
};
