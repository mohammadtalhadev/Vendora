import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Calendar,
  Ticket,
  Play,
  Download,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Package,
  CreditCard,
  RotateCcw,
  Zap,
  CheckCircle2,
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

export const VendorSupportPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isOpenTicketModalOpen, setIsOpenTicketModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [isTicketHistoryModalOpen, setIsTicketHistoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const suggestedSearches = [
    '1099-K Tax Forms',
    'Fulfillment SLA',
    'Return Window Rules',
    'Restricted Brands',
    'Fee Schedule 2026',
  ];

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
              ASSISTANCE &amp; POLICIES <span className="text-slate-300">/</span> HELP CENTER
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Help &amp; Support
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Access seller documentation, platform compliance guidelines, contact dedicated merchant support, or submit an inquiry ticket.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => showToast('Connecting to Vendora Merchant Community Discourse...')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <UsersIcon className="h-4 w-4 text-slate-500" />
              Seller Community Forum
            </button>
            <button
              onClick={() => setIsOpenTicketModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Ticket className="h-4 w-4" />
              + Open Support Ticket
            </button>
          </div>
        </div>

        {/* ── Hero Search Box ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            SELF-SERVICE DOCUMENTATION INDEX
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            What can we help you resolve today?
          </h2>

          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search seller guides, API docs, dispute guidelines, fee structures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-14 py-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:border-slate-900"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-200">
              ⌘K
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 pt-1">
            <span className="font-semibold text-slate-400">Suggested Searches:</span>
            {suggestedSearches.map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 shadow-2xs transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3 Direct Support Channels Cards ──────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Priority Live Chat */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Available
                </span>
              </div>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">Priority Live Chat</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Average wait time: &lt; 3 mins. Available 24/7 for Level 3 Platinum Sellers.
              </p>
            </div>
            <button
              onClick={() => setIsChatModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Start Live Chat</span>
            </button>
          </div>

          {/* Card 2: Dedicated Merchant Advisor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Assigned Advisor
                </span>
              </div>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">Dedicated Merchant Advisor</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Assigned Account Manager: <strong>Sarah Jenkins</strong>. Schedule a 1-on-1 strategy or catalog optimization call.
              </p>
            </div>
            <button
              onClick={() => setIsBookCallModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Book a Call</span>
            </button>
          </div>

          {/* Card 3: Support Ticket Escalation */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Ticket className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  0 Open • 12 Resolved
                </span>
              </div>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">Support Ticket Escalation</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                0 Open Tickets, 12 Resolved. Track ongoing technical inquiries and dispute escalations.
              </p>
            </div>
            <button
              onClick={() => setIsTicketHistoryModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Ticket className="h-3.5 w-3.5 text-slate-500" />
              <span>View Ticket History</span>
            </button>
          </div>
        </div>

        {/* ── Main Section (8 cols / 4 cols) ───────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ── Left Column (8 cols): Frequently Consulted Topics ──── */}
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Frequently Consulted Merchant Topics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Standard Operating Procedures, service SLAs, and operational policies.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Updated March 2026
                </span>
              </div>

              {/* 4 Topic Categories (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. Fulfillment & Shipping */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Fulfillment &amp; Shipping</span>
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.2 text-[9px] font-bold text-slate-600">
                      3 Guides
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      'Vendora Express Packing Standards',
                      'Handling Lost in Transit Claims',
                      'International Customs Documentation',
                    ].map((guide) => (
                      <button
                        key={guide}
                        type="button"
                        onClick={() => showToast(`Opening documentation: ${guide}`)}
                        className="w-full flex items-center justify-between text-left text-slate-700 hover:text-slate-900 hover:underline text-[11px] font-medium py-1 cursor-pointer"
                      >
                        <span>{guide}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Payments & Fees */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Payments &amp; Fees</span>
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.2 text-[9px] font-bold text-slate-600">
                      3 Guides
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      'Understanding Bi-weekly ACH Schedules',
                      'Dispute Chargeback Escrow Rules',
                      'Promotional Fee Credits',
                    ].map((guide) => (
                      <button
                        key={guide}
                        type="button"
                        onClick={() => showToast(`Opening documentation: ${guide}`)}
                        className="w-full flex items-center justify-between text-left text-slate-700 hover:text-slate-900 hover:underline text-[11px] font-medium py-1 cursor-pointer"
                      >
                        <span>{guide}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Catalog Compliance */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Catalog Compliance</span>
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.2 text-[9px] font-bold text-slate-600">
                      3 Guides
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      '4K Image & Specification Standards',
                      'FCC & CE Electronics Certification Uploads',
                      'Restricted Product Policies',
                    ].map((guide) => (
                      <button
                        key={guide}
                        type="button"
                        onClick={() => showToast(`Opening documentation: ${guide}`)}
                        className="w-full flex items-center justify-between text-left text-slate-700 hover:text-slate-900 hover:underline text-[11px] font-medium py-1 cursor-pointer"
                      >
                        <span>{guide}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Returns & Disputed RMAs */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                        <RotateCcw className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Returns &amp; Disputed RMAs</span>
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.2 text-[9px] font-bold text-slate-600">
                      3 Guides
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      'Auto-approval threshold configuration',
                      'Customer return fraud protection guidelines',
                      'Restocking fee allowances',
                    ].map((guide) => (
                      <button
                        key={guide}
                        type="button"
                        onClick={() => showToast(`Opening documentation: ${guide}`)}
                        className="w-full flex items-center justify-between text-left text-slate-700 hover:text-slate-900 hover:underline text-[11px] font-medium py-1 cursor-pointer"
                      >
                        <span>{guide}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Masterclass Video Callout */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-950 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white">
                    <Play className="h-5 w-5 fill-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      VENDORA ACADEMY MASTERCLASS
                    </div>
                    <h3 className="font-bold text-sm text-white">
                      Q2 Peak Fulfillment &amp; RMA Protocol Briefing
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Stream the 18-minute verified workflow walkthrough with head logistics architects.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => showToast('Launching masterclass video stream player...')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <span>Watch Session</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column (4 cols): Status, Tickets, Downloads ─── */}
          <div className="space-y-6 lg:col-span-4">
            {/* Widget 1: Marketplace Operational Status */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Marketplace Operational Status
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  All Systems Normal
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Core Checkout</span>
                  <span className="font-bold text-emerald-700">99.98% uptime</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Merchant Payout Engine</span>
                  <span className="font-bold text-emerald-700">Operational</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Webhooks &amp; APIs</span>
                  <span className="font-bold text-emerald-700">Operational</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Latency (US-East Edge):</span>
                  <strong className="text-slate-700 font-mono">24ms average</strong>
                </div>
                {/* Latency ticks */}
                <div className="flex gap-1 h-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex-1 bg-emerald-500 rounded-xs" />
                  ))}
                </div>
              </div>
            </div>

            {/* Widget 2: Recent Support Tickets */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Support Tickets</h3>
                  <div className="text-[10px] text-slate-400">Nova Electronics</div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    id: '#TK-8491',
                    title: 'Clarification on multi-variant ...',
                    meta: 'Closed Feb 24, 2026 • Agent Mark R.',
                  },
                  {
                    id: '#TK-8204',
                    title: 'Update to international tax ne...',
                    meta: 'Closed Jan 19, 2026 • Compliance Team',
                  },
                  {
                    id: '#TK-7912',
                    title: 'Carrier label scan delay inquiry',
                    meta: 'Closed Dec 12, 2025 • Logistics Team',
                  },
                ].map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {ticket.id}
                      </span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Resolved
                      </span>
                    </div>
                    <div className="font-medium text-slate-700 text-xs truncate">
                      {ticket.title}
                    </div>
                    <div className="text-[10px] text-slate-400">{ticket.meta}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Seller Resource Downloads */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-slate-600" />
                Seller Resource Downloads
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { title: '2026 Merchant Handbook', meta: 'PDF • 4.2 MB' },
                  { title: 'Standard RMA Packing Slip', meta: 'Template • XLSX' },
                  { title: 'API Integration Specs', meta: 'OpenAPI 3.1 • JSON' },
                ].map((res) => (
                  <div
                    key={res.title}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{res.title}</div>
                      <div className="text-[10px] text-slate-400">{res.meta}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(`Downloading resource template: ${res.title}`)}
                      className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Open Ticket Modal ────────────────────────────────────── */}
        <Dialog open={isOpenTicketModalOpen} onOpenChange={setIsOpenTicketModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-slate-700" />
                Open Merchant Support Ticket
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Submit an urgent technical, financial, or catalog inquiry directly to the merchant operations team.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast('Support ticket created! Ticket #TK-9021 assigned.');
                setIsOpenTicketModalOpen(false);
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Category</label>
                <select className="w-full rounded-lg border border-slate-200 p-2 text-xs">
                  <option>Settlement &amp; Payout Inquiry</option>
                  <option>Order Fulfillment &amp; Courier Escalation</option>
                  <option>Catalog Moderation / Rejection Dispute</option>
                  <option>Technical API / Webhook Integration</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of operational issue..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide order IDs, error codes, or screenshots..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenTicketModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Live Chat Modal ─────────────────────────────────────── */}
        <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 fill-amber-500 text-amber-500" />
                Priority 24/7 Seller Chat
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Connected with Level 3 Platinum Specialist • Estimated wait: &lt; 1 min
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
              <div className="font-bold text-slate-900">Agent Marcus (Logistics Architect)</div>
              <p className="text-slate-600">
                "Hello Nova Electronics! I see your current batch cycle #2026-20 is scheduled for ACH trigger tomorrow. How may I assist your fulfillment team today?"
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                End Session
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Book Call Modal ─────────────────────────────────────── */}
        <Dialog open={isBookCallModalOpen} onOpenChange={setIsBookCallModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-700" />
                Schedule Strategy Session
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                With your dedicated Account Manager: Sarah Jenkins
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-slate-900">Next Available Slots</div>
                <div className="mt-2 space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded bg-white border border-slate-200 cursor-pointer">
                    <input type="radio" name="slot" defaultChecked />
                    <span>Tomorrow at 10:00 AM CST</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-white border border-slate-200 cursor-pointer">
                    <input type="radio" name="slot" />
                    <span>Thursday at 2:30 PM CST</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBookCallModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Calendar appointment booked! Invitation sent to your email.');
                  setIsBookCallModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Confirm Booking
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Ticket History Modal ─────────────────────────────────── */}
        <Dialog open={isTicketHistoryModalOpen} onOpenChange={setIsTicketHistoryModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-slate-700" />
                Ticket History &amp; Audit Log
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                12 tickets resolved with average resolution time of 1.4 hours.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 text-xs max-h-60 overflow-y-auto">
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="font-bold text-slate-900">#TK-8491: Multi-variant sync query</div>
                <div className="text-[10px] text-slate-400">Closed Feb 24 • Satisfied rating 5/5</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="font-bold text-slate-900">#TK-8204: Tax nexus certificate check</div>
                <div className="text-[10px] text-slate-400">Closed Jan 19 • Satisfied rating 5/5</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTicketHistoryModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />

        {/* ── Toast Notification ───────────────────────────────────── */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

// Helper icon component
const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
