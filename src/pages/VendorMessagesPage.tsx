import React, { useState } from 'react';
import {
  Search,
  CheckCheck,
  Plus,
  Clock,
  ShieldCheck,
  Send,
  Paperclip,
  CheckCircle2,
  Package,
  MoreVertical,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface ChatThread {
  id: string;
  buyerName: string;
  avatarText: string;
  isOnline: boolean;
  orderId?: string;
  rmaId?: string;
  timeAgo: string;
  preview: string;
  tag: string;
  tagType: 'specs' | 'delivery' | 'return' | 'presales';
  isUrgent?: boolean;
  slaText?: string;
  unread: boolean;
}

export const VendorMessagesPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'orders'>('all');
  const [selectedThreadId, setSelectedThreadId] = useState('t1');
  const [replyText, setReplyText] = useState(
    'Yes, absolutely! The active noise cancellation and Ambient Sound mode both function completely in wired mode as long as the headphones are powered ON.'
  );
  const [isInternalNote, setIsInternalNote] = useState(false);

  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 't1',
      buyerName: 'Elena Rostova',
      avatarText: 'ER',
      isOnline: true,
      orderId: '#ORD-9819',
      timeAgo: '4m ago',
      preview: 'Will the included Type-C cable work directly with my MacBook Pro DAC without an adapter?',
      tag: 'Specs Query',
      tagType: 'specs',
      unread: true,
    },
    {
      id: 't2',
      buyerName: 'Marcus Vance',
      avatarText: 'MV',
      isOnline: false,
      orderId: '#ORD-9820',
      timeAgo: 'SLA 48m',
      preview: 'Could you verify whether the express carrier will require a physical signature upon delivery?',
      tag: 'Delivery Check',
      tagType: 'delivery',
      isUrgent: true,
      slaText: 'SLA 48m',
      unread: true,
    },
    {
      id: 't3',
      buyerName: 'Devon Thorpe',
      avatarText: 'DT',
      isOnline: false,
      rmaId: 'RMA-4029',
      timeAgo: '2h ago',
      preview: 'I dropped off the parcel at the depot yesterday, tracking code was scanned this morning.',
      tag: 'Return Inquiry',
      tagType: 'return',
      unread: true,
    },
    {
      id: 't4',
      buyerName: 'Sarah Jenkins',
      avatarText: 'SJ',
      isOnline: false,
      orderId: 'Listing #WH-XM5',
      timeAgo: '3h ago',
      preview: 'Does the silver variant come with the matching silver memory foam cushions or black ones?',
      tag: 'Pre-Sales',
      tagType: 'presales',
      unread: false,
    },
    {
      id: 't5',
      buyerName: "Liam O'Connor",
      avatarText: 'LO',
      isOnline: false,
      orderId: '#ORD-9750',
      timeAgo: 'Yesterday',
      preview: 'Thanks for the quick packing update, looking forward to testing the custom keycaps!',
      tag: 'General',
      tagType: 'presales',
      unread: false,
    },
  ]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const handleSendMessage = () => {
    if (!replyText.trim()) return;
    alert(`Reply sent to ${activeThread.buyerName}!`);
    setReplyText('');
  };

  const handleApplyMacro = (text: string) => {
    setReplyText(text);
  };

  const filteredThreads = threads.filter((t) => {
    if (filterTab === 'unread' && !t.unread) return false;
    if (filterTab === 'orders' && !t.orderId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.buyerName.toLowerCase().includes(q) ||
        (t.orderId && t.orderId.toLowerCase().includes(q)) ||
        t.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumb & Header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              COMMUNICATIONS <span className="text-slate-300">/</span> MESSAGES
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Customer Messages
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Direct buyer inquiries, order support threads, pre-sales questions, and resolution tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setThreads((prev) => prev.map((t) => ({ ...t, unread: false })));
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <CheckCheck className="h-4 w-4 text-slate-500" />
              Mark All as Read
            </button>
            <button
              onClick={() => setIsComposeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              + Compose Message
            </button>
          </div>
        </div>

        {/* ── 4 Top KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Unread Inquiries */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Unread Inquiries</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                  ● 3 Urgent SLA &lt;2h
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">7</div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Avg First Response Time */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Avg First Response Time</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  -4m vs 30m target
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">18m</div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* Card 3: Resolution Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Resolution Rate</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ↑ +2.1% this week
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">94.2%</div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
          </div>

          {/* Card 4: Customer CSAT */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Customer CSAT</span>
                <div className="flex items-center text-amber-400 text-xs">
                  {'★'.repeat(5)}
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">4.8</span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">420 surveyed chats</div>
            </div>
            <div className="mt-4 pt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3-Column Message Center ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column (3 cols): Conversations List ──────────── */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[700px]">
            {/* Search & Tabs */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search buyer, order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`rounded-md px-2.5 py-1 ${
                    filterTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All (28)
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`rounded-md px-2.5 py-1 ${
                    filterTab === 'unread'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unread (7)
                </button>
                <button
                  onClick={() => setFilterTab('orders')}
                  className={`rounded-md px-2.5 py-1 ${
                    filterTab === 'orders'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredThreads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedThreadId(t.id);
                      setThreads((prev) =>
                        prev.map((item) =>
                          item.id === t.id ? { ...item, unread: false } : item
                        )
                      );
                    }}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100/80 border-l-3 border-slate-900'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                          {t.avatarText}
                          {t.isOnline && (
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1">
                            <span>{t.buyerName}</span>
                            {t.id === 't1' && (
                              <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-50" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {t.orderId || t.rmaId}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-[10px] ${
                            t.isUrgent ? 'text-rose-600 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {t.timeAgo}
                        </div>
                        {t.unread && (
                          <span className="inline-block mt-1 h-2 w-2 rounded-full bg-slate-900" />
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {t.preview}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        {t.tag}
                      </span>
                      {t.isUrgent && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Middle Column (6 cols): Active Chat Thread ─────────── */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col h-[700px] overflow-hidden">
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                  {activeThread.avatarText}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {activeThread.buyerName}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      ✓ Verified Buyer
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Berlin, Germany (16:42 CET) • Order #ORD-9819
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-200">
                  <Clock className="h-3 w-3" />
                  Reply within 42m to maintain 99% SLA
                </span>
                <button className="text-slate-400 hover:text-slate-600 p-1">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              <div className="text-center">
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-400 shadow-2xs">
                  Today, October 24
                </span>
              </div>

              {/* Inbound message */}
              <div className="flex items-start gap-2.5 max-w-lg">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[10px]">
                  {activeThread.avatarText}
                </div>
                <div>
                  <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200/80 p-3.5 text-xs text-slate-800 leading-relaxed shadow-2xs">
                    Hi Nova Electronics Support Team! I just purchased the Sony WH-1000XM5 wireless headphones under Order #ORD-9819.
                    <br /><br />
                    Could you confirm whether the provided USB-C audio interconnect supports lossless transmission directly with the 2023 MacBook Pro DAC, or if I need to source a secondary 3.5mm-to-USB-C adapter?
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 pl-1">
                    16:38 CET • Sent via Web Portal
                  </div>
                </div>
              </div>

              {/* Status callout */}
              <div className="flex items-center justify-center">
                <div className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Customer viewed order tracking 12 minutes ago</span>
                </div>
              </div>
            </div>

            {/* Composer Box */}
            <div className="p-3.5 border-t border-slate-200 bg-white space-y-2.5">
              {/* Macro pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  MACROS:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyMacro(
                      'Your order #ORD-9819 has been prepared and staged for courier collection. Live GPS rider tracking will activate once scanned.'
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  ⚡ Track Shipment
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyMacro(
                      'The included Type-C cable is fully wired for high-resolution 24-bit/96kHz digital USB audio playback directly from macOS.'
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  ⚡ Confirm Specifications
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyMacro(
                      'Should you need an RMA return label, you can generate an automated prepaid return QR code from your order status panel.'
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  ⚡ Send RMA Form
                </button>
              </div>

              {/* Input Area */}
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 focus-within:border-slate-900 transition-colors">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none"
                />

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1" title="Attach file">
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-slate-900"
                      />
                      <span>Internal staff note only</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      Press Ctrl + Enter to send
                    </span>
                    <button
                      type="button"
                      onClick={() => alert('Draft saved successfully!')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
                    >
                      <span>Send Reply</span>
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column (3 cols): Buyer Dossier ──────────────── */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                BUYER DOSSIER
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>

            {/* Customer card */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm">
                {activeThread.avatarText}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {activeThread.buyerName}
                </div>
                <div className="text-[11px] text-slate-400">
                  elena.rostova@designlab.com
                </div>
              </div>
            </div>

            {/* Metrics 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold">Member Since</div>
                <div className="mt-0.5 font-bold text-slate-900">March 2023</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold">Total Spend</div>
                <div className="mt-0.5 font-bold text-slate-900">$1,280.00</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold">Completed Orders</div>
                <div className="mt-0.5 font-bold text-slate-900">6 Orders</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold">Disputes / Claims</div>
                <div className="mt-0.5 font-bold text-emerald-700">0 Disputes</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Trust Rating</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tier 1 Verified
              </span>
            </div>

            {/* Active Order Card */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-[11px]">ACTIVE ORDER: #ORD-9819</div>
                <span className="rounded-full bg-blue-50 px-2 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200">
                  Ready for Pickup
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">
                    Sony WH-1000XM5...
                  </div>
                  <div className="text-[10px] text-slate-400">
                    SKU: SNY-WH1000XM5-BLK
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between font-bold text-slate-900 text-xs pt-1 border-t border-slate-200/60">
                <span>$374.98</span>
                <span className="text-emerald-700 text-[11px]">Paid (Apple Pay)</span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <div>Carrier: <strong className="text-slate-700">DHL Express Worldwide</strong></div>
                <div>Tracking: <strong className="font-mono text-slate-700">JD01460000981928</strong></div>
                <div>Estimated: <strong className="text-slate-700">Tomorrow, 14:00</strong></div>
              </div>

              <button
                type="button"
                onClick={() => alert('Opening full order manifest #ORD-9819')}
                className="w-full mt-1 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                View Full Order Details
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert('Concession adjustment modal')}
                  className="rounded border border-slate-200 bg-white py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  % Issue Concession
                </button>
                <button
                  type="button"
                  onClick={() => alert('Initiating return merchandise RMA')}
                  className="rounded border border-slate-200 bg-white py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Create RMA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Compose Message Modal ───────────────────────────────── */}
        <Dialog open={isComposeModalOpen} onOpenChange={setIsComposeModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Compose Direct Customer Message
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Initiate a direct customer support ticket regarding an active order or delivery inquiry.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Message sent to customer!');
                setIsComposeModalOpen(false);
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Order Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. #ORD-9819 or customer email"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Regarding your recent shipment delivery..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write message details..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Send Message
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />
      </div>
    </WorkspaceLayout>
  );
};
