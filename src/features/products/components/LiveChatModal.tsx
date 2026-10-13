import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Send, Store, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import {
  fetchChatMessages,
  findOrCreateProductThread,
  sendChatMessage,
  type ChatMessage,
} from '../api/chat';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  /** vendor_profiles id of the seller ('platform' for first-party listings). */
  sellerId?: string;
  productId?: string;
}

interface FeedMessage {
  id: string;
  sender: 'seller' | 'user';
  text: string;
  timestamp: string;
}

const toFeedMessage = (m: ChatMessage): FeedMessage => ({
  id: m.id,
  sender: m.senderRole === 'customer' ? 'user' : 'seller',
  text: m.body,
  timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
});

/**
 * Product chat backed by the real message_threads/messages tables. The seller's
 * replies arrive from the database (vendors answer from their workspace) — this
 * modal never fabricates a seller reply, which the previous version did locally
 * and then persisted as if the seller had written it.
 */
export const LiveChatModal: React.FC<LiveChatModalProps> = ({
  isOpen,
  onClose,
  sellerName,
  sellerId,
  productId,
}) => {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlatformSeller = !sellerId || sellerId === 'platform';
  const canChat = Boolean(user) && !isPlatformSeller && Boolean(productId);

  useEffect(() => {
    if (!isOpen || !canChat || !sellerId || !productId || !user) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    findOrCreateProductThread({ vendorId: sellerId, customerName: user.name, productRef: productId })
      .then(async (thread) => {
        if (cancelled) return;
        setThreadId(thread.id);
        const history = await fetchChatMessages(thread.id);
        if (!cancelled) setMessages(history.map(toFeedMessage));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open the chat.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, canChat, sellerId, productId, user]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !threadId || !user) return;
    setError(null);
    try {
      const saved = await sendChatMessage({ threadId, senderName: user.name, body: text });
      setMessages((prev) => [...prev, toFeedMessage(saved)]);
      setInputText('');
      setNotice('Message sent. The seller will reply in this conversation.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your message could not be sent.');
    }
  };

  const quickPrompts = [
    'Is this in stock for immediate dispatch?',
    'What is your return policy?',
    'Do you offer warranty coverage?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex h-[520px] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sun-orange">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900">{sellerName}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              </div>
              <div className="text-xs text-slate-500">
                <span>Messages are answered by the seller in their workspace</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!user && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              Please{' '}
              <Link to="/login" className="font-bold text-sun-orange hover:underline">
                sign in
              </Link>{' '}
              to message this seller.
            </p>
          )}
          {user && isPlatformSeller && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              This is a Vendora first-party listing — questions about it are handled by Vendora
              support rather than a seller chat.
            </p>
          )}
          {isLoading && <p className="text-xs text-slate-400">Loading conversation…</p>}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'rounded-br-xs bg-sun-orange text-white'
                    : 'rounded-bl-xs bg-slate-100 text-slate-800'
                }`}
              >
                {m.text}
              </div>
              <span className="mt-1 text-[10px] text-slate-400">{m.timestamp}</span>
            </div>
          ))}
          {notice && messages.length > 0 && (
            <p className="text-center text-[11px] text-slate-400">{notice}</p>
          )}
          {error && (
            <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-slate-50/50 px-3 py-2" data-lenis-prevent>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={!canChat || !threadId}
              onClick={() => void handleSend(prompt)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-orange-300 hover:text-sun-orange transition-colors disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 p-3 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={canChat ? 'Type your question...' : 'Sign in to message the seller'}
              disabled={!canChat || !threadId}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-sun-orange focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sun-orange disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !canChat || !threadId}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sun-orange text-white shadow-xs hover:bg-sun-orange-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
