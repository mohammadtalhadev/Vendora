import React, { useState, useRef, useEffect } from 'react';
import type { Dispute, UserRole } from '../../../types/domain';
import { cn } from '../../../lib/utils';
import {
  Send,
  Lock,
  MessageSquare,
  FileText,
  ChevronDown,
  Image as ImageIcon,
  User,
  Store,
  Headphones,
  ShieldAlert,
} from 'lucide-react';

export interface DisputeConversationThreadProps {
  dispute: Dispute;
  onSendMessage: (content: string, isInternalNote: boolean) => void;
  currentAgentName?: string;
  currentAgentRole?: UserRole;
  className?: string;
}

interface CannedResponse {
  title: string;
  text: string;
}

const CANNED_RESPONSES: CannedResponse[] = [
  {
    title: 'Request Return Shipping Label Photo',
    text: 'Please provide a clear, well-lit photo of the return shipping label attached to the outer parcel carton so that our fulfillment team can trace the courier dispatch log.',
  },
  {
    title: 'Request Serial Number & Barcode Verification',
    text: 'To verify authentic warranty coverage, please upload a clear picture of the manufacturer serial number and product barcode located on the underside of the retail packaging.',
  },
  {
    title: 'Policy Notice: 14-Day Return Window Expired',
    text: 'In accordance with Vendora Marketplace Buyer Protection guidelines, dispute claims must be submitted within 14 calendar days of confirmed doorstep delivery. As this window has elapsed, the merchant return policy applies directly.',
  },
  {
    title: 'Inform: Full Refund Issued',
    text: 'Good news! Our Support Resolution Team has ruled in your favor. A full refund has been authorized and issued back to your original payment method. Please allow 3-5 business days for banking processing.',
  },
];

export const DisputeConversationThread: React.FC<DisputeConversationThreadProps> = ({
  dispute,
  onSendMessage,
  currentAgentName = 'Jordan Support Lead',
  className,
}) => {
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isCannedOpen, setIsCannedOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dispute.messages.length]);

  // Click outside listener for canned response dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCannedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    onSendMessage(messageText.trim(), isInternalNote);
    setMessageText('');
    setIsInternalNote(false);
  };

  const handleSelectCanned = (canned: CannedResponse) => {
    setMessageText(canned.text);
    setIsCannedOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            <User className="h-2.5 w-2.5 text-slate-500" />
            Customer
          </span>
        );
      case 'vendor':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/80 px-2 py-0.5 text-[10px] font-semibold text-orange-900">
            <Store className="h-2.5 w-2.5 text-orange-600" />
            Vendor
          </span>
        );
      case 'support':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100/90 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
            <Headphones className="h-2.5 w-2.5 text-sky-600" />
            Support Agent
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-900">
            <ShieldAlert className="h-2.5 w-2.5 text-purple-600" />
            Platform Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {role}
          </span>
        );
    }
  };

  // Extract all evidence photos (from dispute top-level or messages)
  const evidencePhotos = [
    ...(dispute.evidencePhotos || []),
    ...dispute.messages.flatMap((m) => m.attachments || []),
  ].filter((photo, index, self) => self.indexOf(photo) === index);

  return (
    <div
      data-testid="dispute-conversation-thread"
      className={cn('flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden', className)}
    >
      {/* Thread Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Dispute #{dispute.id}
              </h2>
              <span className="font-mono text-xs text-slate-500">
                ({dispute.subOrderId})
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[360px] sm:max-w-md">
              {dispute.reason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">
            Agent: <strong className="text-slate-800">{dispute.assignedAgentId ? currentAgentName : 'Unassigned'}</strong>
          </span>
        </div>
      </div>

      {/* Photo Evidence Gallery (if available) */}
      {evidencePhotos.length > 0 && (
        <div
          data-testid="evidence-photos"
          className="bg-amber-50/40 border-b border-amber-200/50 px-4 py-2.5 flex items-center gap-3 overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 shrink-0">
            <ImageIcon className="h-4 w-4 text-amber-700" />
            <span>Photo Evidence ({evidencePhotos.length}):</span>
          </div>
          <div className="flex items-center gap-2">
            {evidencePhotos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                data-testid={`evidence-photo-${idx}`}
                onClick={() => setSelectedPhotoModal(photo)}
                className="relative group h-12 w-12 rounded-lg overflow-hidden border border-amber-200 shrink-0 hover:ring-2 hover:ring-amber-500 transition-all cursor-pointer"
              >
                <img
                  src={photo}
                  alt={`Evidence photo ${idx + 1}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/20">
        {dispute.messages.map((message) => {
          const isInternal = message.isInternalNote;
          const formattedDate = new Date(message.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={message.id}
              data-testid={isInternal ? 'internal-note-card' : `message-${message.id}`}
              className={cn(
                'rounded-2xl p-4 transition-all',
                isInternal
                  ? 'bg-amber-50/90 border border-amber-300/80 shadow-xs backdrop-blur-md ring-1 ring-amber-300/40'
                  : 'bg-white border border-slate-200/80 shadow-xs'
              )}
            >
              {/* Header: Sender Profile & Internal Note Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  {message.senderAvatar ? (
                    <img
                      src={message.senderAvatar}
                      alt={message.senderName}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {message.senderName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 leading-none">
                        {message.senderName}
                      </span>
                      {getRoleBadge(message.senderRole)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isInternal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300/80">
                      <Lock className="h-3 w-3 text-amber-800" />
                      Internal Agent Note (Staff Only)
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formattedDate}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <p
                className={cn(
                  'text-xs leading-relaxed whitespace-pre-wrap',
                  isInternal ? 'text-amber-950 font-medium' : 'text-slate-700'
                )}
              >
                {message.content}
              </p>

              {/* Message Attachments (if message level) */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {message.attachments.map((att, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedPhotoModal(att)}
                      className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-sky-500 transition-all cursor-pointer"
                    >
                      <img src={att} alt="Attachment" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Bottom Area */}
      <form
        onSubmit={handleSend}
        className="p-3.5 sm:p-4 border-t border-slate-200/90 bg-white"
      >
        {/* Composer Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          {/* Left: Canned Responses Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              data-testid="canned-responses-btn"
              onClick={() => setIsCannedOpen(!isCannedOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Canned Responses</span>
              <ChevronDown className={cn('h-3 w-3 text-slate-400 transition-transform', isCannedOpen && 'rotate-180')} />
            </button>

            {isCannedOpen && (
              <div
                data-testid="canned-responses-menu"
                className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30"
              >
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pre-written Policy Templates
                </div>
                <div className="mt-1 space-y-1">
                  {CANNED_RESPONSES.map((canned, idx) => (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`canned-option-${idx}`}
                      onClick={() => handleSelectCanned(canned)}
                      className="w-full text-left p-2 rounded-lg hover:bg-sky-50 text-xs text-slate-800 hover:text-sky-900 transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-slate-900">{canned.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{canned.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Internal Note Toggle Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              data-testid="internal-note-toggle"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className={cn('inline-flex items-center gap-1', isInternalNote && 'text-amber-800 font-bold')}>
              <Lock className="h-3 w-3 text-amber-600" />
              Post as Internal Note (Staff Only)
            </span>
          </label>
        </div>

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            data-testid="message-input"
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            placeholder={
              isInternalNote
                ? 'Type staff-only notes here (invisible to customer and vendor)...'
                : 'Type response to customer & vendor...'
            }
            className={cn(
              'w-full rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-1 resize-none',
              isInternalNote
                ? 'border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-500'
                : 'border-slate-200 bg-slate-50/50 focus:border-sky-500 focus:bg-white focus:ring-sky-500'
            )}
          />
        </div>

        {/* Submit Actions */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd> to send
          </span>

          <button
            type="submit"
            data-testid="send-message-btn"
            disabled={!messageText.trim()}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-slate-900 hover:bg-slate-800'
            )}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isInternalNote ? 'Post Internal Note' : 'Send Message'}</span>
          </button>
        </div>
      </form>

      {/* Lightbox Modal for Photo Evidence */}
      {selectedPhotoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <img
              src={selectedPhotoModal}
              alt="Photo Evidence Preview"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <div className="mt-2 text-center text-xs font-medium text-slate-500">
              Click anywhere to close preview
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
