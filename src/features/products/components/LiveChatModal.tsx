import React, { useState } from 'react';
import { X, Send, Store, ShieldCheck } from 'lucide-react';
import { supabaseChat } from '../../../lib/supabase-service';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
}

interface ChatMessage {
  id: string;
  sender: 'seller' | 'user';
  text: string;
  timestamp: string;
}

export const LiveChatModal: React.FC<LiveChatModalProps> = ({
  isOpen,
  onClose,
  sellerName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'seller',
      text: `Hi there! 👋 Thanks for visiting our store. Do you have any questions about this item or shipping options?`,
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    const convId = `store_${sellerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    supabaseChat.sendMessage({
      id: userMsg.id,
      conversationId: convId,
      senderId: 'buyer-portal',
      senderName: 'Customer',
      senderRole: 'customer',
      text,
    }).catch(console.warn);

    // Simulated auto-reply after 1 second
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `s-${Date.now()}`,
        sender: 'seller',
        text: `Thanks for asking! Our support representative has received your inquiry: "${text.length > 30 ? text.substring(0, 30) + '...' : text}". We will reply right away!`,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, replyMsg]);

      supabaseChat.sendMessage({
        id: replyMsg.id,
        conversationId: convId,
        senderId: 'vendor-store',
        senderName: sellerName,
        senderRole: 'vendor',
        text: replyMsg.text,
      }).catch(console.warn);
    }, 1000);
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-[#FF7A1A]">
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
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online · Typically replies in minutes</span>
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
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'rounded-br-xs bg-[#FF7A1A] text-white'
                    : 'rounded-bl-xs bg-slate-100 text-slate-800'
                }`}
              >
                {m.text}
              </div>
              <span className="mt-1 text-[10px] text-slate-400">{m.timestamp}</span>
            </div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-slate-50/50 px-3 py-2" data-lenis-prevent>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-orange-300 hover:text-[#FF7A1A] transition-colors"
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
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-[#FF7A1A] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#FF7A1A]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A1A] text-white shadow-xs hover:bg-[#EA6C13] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
