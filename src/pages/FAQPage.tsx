import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  Search,
  ChevronRight,
  ChevronDown,
  Truck,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Store,
  Lock,
  MessageSquare,
  Send,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
} from '../components/ui/dialog';


interface TopicCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
  articleCount: number;
}

interface FAQItem {
  id: string;
  tab: 'buyer' | 'seller';
  category: string;
  question: string;
  answer: string;
  helpfulCount: number;
}

type FAQTab = 'buyer' | 'seller';

const FAQ_TAB_ORDER: readonly FAQTab[] = ['buyer', 'seller'];

const firstOpenIdForTab = (tab: FAQTab): string => (tab === 'buyer' ? 'faq-b1' : 'faq-s1');

const SUPPORT_TOPICS: TopicCategory[] = [
  {
    id: 'orders-tracking',
    title: 'Orders & Tracking',
    icon: Truck,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40',
    iconColor: 'text-sun-orange',
    badgeBg: 'bg-orange-50/70 dark:bg-orange-950/30',
    badgeColor: 'text-sun-orange',
    description:
      'Real-time courier telemetry, live carrier lookup, dispatch checkpoints, and 4-digit delivery OTP management.',
    articleCount: 24,
  },
  {
    id: 'escrow-protection',
    title: 'Escrow & Buyer Protection',
    icon: ShieldCheck,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50/70 dark:bg-blue-950/30',
    badgeColor: 'text-blue-600 dark:text-blue-400',
    description:
      'Vendora Safe Vault protection, 30-day inspection period, neutral third-party dispute hold, and 100% money-back guarantee.',
    articleCount: 18,
  },
  {
    id: 'returns-refunds',
    title: 'Returns, Exchanges & Refunds',
    icon: RotateCcw,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50/70 dark:bg-rose-950/30',
    badgeColor: 'text-rose-600 dark:text-rose-400',
    description:
      'Instant QR-prepaid return label generation, complimentary door pick-up booking, and rapid ledger refund timelines.',
    articleCount: 31,
  },
  {
    id: 'payments-invoicing',
    title: 'Payments & Invoicing',
    icon: CreditCard,
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
    badgeColor: 'text-cyan-600 dark:text-cyan-400',
    description:
      'Stripe gateway verification, Visa/Mastercard 3D Secure, cash-on-delivery restrictions, and automated VAT invoices.',
    articleCount: 19,
  },
  {
    id: 'vendor-support',
    title: 'Vendor & Merchant Support',
    icon: Store,
    iconBg: 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50/70 dark:bg-purple-950/30',
    badgeColor: 'text-purple-600 dark:text-purple-400',
    description:
      'Shop onboarding checklist, bulk catalog CSV sync, Fulfilled by Vendora (FBV) warehouse intake, and payout cycles.',
    articleCount: 42,
  },
  {
    id: 'security-privacy',
    title: 'Account Security & Privacy',
    icon: Lock,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50/70 dark:bg-amber-950/30',
    badgeColor: 'text-amber-600 dark:text-amber-400',
    description:
      'Two-Factor Authentication (2FA), active session revoke, identity verification badges, and privacy GDPR compliance.',
    articleCount: 14,
  },
];

const FAQ_DATABASE: FAQItem[] = [
  // Tab 1: Buyer Protection & Orders
  {
    id: 'faq-b1',
    tab: 'buyer',
    category: 'Escrow & Safety',
    question: 'How does Vendora Buyer Protection and Escrow work?',
    answer:
      'When you place an order on Vendora, your payment does not immediately go to the merchant. Instead, funds are securely buffered in the Vendora Escrow Vault. The merchant is only credited once you verify the parcel on your doorstep and enter your 4-digit Delivery Handshake OTP. If an item arrives damaged, defective, or not as described, our neutral arbitration system guarantees a full replacement or 100% money-back refund within 24 hours.',
    helpfulCount: 524,
  },
  {
    id: 'faq-b2',
    tab: 'buyer',
    category: 'Express Shipping',
    question: 'What happens if my Express Delivery parcel is delayed beyond 6 hours?',
    answer:
      'All 3–6 Hour Express deliveries in metropolitan clusters (Karachi, Lahore, Islamabad/Rawalpindi) are backed by the Vendora Express SLA Guarantee. If your order exceeds the promised 6-hour delivery threshold due to logistics bottlenecks, you automatically receive a $10 / PKR 2,500 shipping credit voucher deposited to your account wallet, while your delivery remains expedited on priority high-speed courier routing.',
    helpfulCount: 389,
  },
  {
    id: 'faq-b3',
    tab: 'buyer',
    category: 'Returns & Replacements',
    question: 'How do I request a replacement for defective electronic devices?',
    answer:
      'Electronic devices from verified brand stores are covered by a complimentary 14-day direct exchange policy and official brand manufacturer warranty. Simply navigate to "Returns & Replacements", choose the defective item, upload a photo or short diagnostic clip, and choose between free doorstep rider pickup or an instant QR-code drop-off at any authorized Vendora Logistics Hub.',
    helpfulCount: 412,
  },
  {
    id: 'faq-b4',
    tab: 'buyer',
    category: 'Multi-Vendor Logistics',
    question: 'Can I split an order across multiple independent marketplace vendors?',
    answer:
      'Yes! Vendora is a unified multi-vendor platform. You can check out items from different independent sellers in a single transaction. Each merchant dispatches their portion independently, and you receive unique consignment numbers with real-time GPS tracking for each shipment. The Vendora checkout calculates shipping fees transparently with automated bundle discounts when purchasing from FBV (Fulfilled by Vendora) warehouses.',
    helpfulCount: 298,
  },
  {
    id: 'faq-b5',
    tab: 'buyer',
    category: 'Delivery Security',
    question: 'How do I verify the courier rider’s identity upon doorstep handoff?',
    answer:
      'Every official Vendora and partner rider (SpeedXpert, TCS Air) carries an active digital telemetry badge. When your rider is within 2km, your Track Order page displays their verified profile picture, rider badge ID, and real-time GPS coordinate pin. Never disclose your 4-digit OTP until you physically inspect the security tamper tape on your parcel package.',
    helpfulCount: 215,
  },

  // Tab 2: Sellers & Payout Terms
  {
    id: 'faq-s1',
    tab: 'seller',
    category: 'Merchant Payouts',
    question: 'When are merchant funds released from the escrow vault?',
    answer:
      'Once a customer inputs their doorstep delivery OTP or the standard 7-day inspection window expires without an open dispute claim, funds automatically transition from escrow reserve into your available merchant balance. Payouts are settled on a scheduled bi-weekly cycle directly into your local IBAN bank account or international Stripe Connect payout profile.',
    helpfulCount: 442,
  },
  {
    id: 'faq-s2',
    tab: 'seller',
    category: 'Fulfillment by Vendora (FBV)',
    question: 'What are the Fulfilled by Vendora (FBV) intake requirements?',
    answer:
      'Merchants using FBV warehouses must pre-label all inventory cartons with Vendora standardized GS1 barcode tags and generate an Advance Shipping Notice (ASN) in the Vendor Portal. FBV regional hubs in Karachi, Lahore, and Islamabad complete inbound inspection, quality triage, and live stock sync within 24 hours of delivery arrival.',
    helpfulCount: 310,
  },
  {
    id: 'faq-s3',
    tab: 'seller',
    category: 'Store Performance & SEO',
    question: 'How do seller ratings affect payout frequency and search ranking?',
    answer:
      'Sellers maintaining a 98%+ on-time dispatch rate and customer satisfaction score above 4.8 stars unlock "Vendora Premier Merchant" status. Benefits include accelerated 48-hour escrow payout clearance, algorithmic spotlight placement on category carousels, and reduced marketplace platform commission fees.',
    helpfulCount: 268,
  },
  {
    id: 'faq-s4',
    tab: 'seller',
    category: 'Dispute Arbitration',
    question: 'What happens if a buyer claims an item is not received or damaged?',
    answer:
      'Vendora provides comprehensive Merchant Protection against fraudulent claims. Because all parcels require photographic proof of delivery and OTP verification, fraudulent chargebacks are blocked. In case of transit damage, insurance covers the wholesale invoice value directly to the merchant without deductions.',
    helpfulCount: 195,
  },
];

const POPULAR_SEARCH_TAGS = [
  'Order cancellation',
  'Escrow release timeline',
  'Damaged item return',
  'Seller payout delay',
  'Express 3-6h delivery',
];

export const FAQPage: React.FC = () => {
  // Search query & active tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaqTab, setActiveFaqTab] = useState<FAQTab>('buyer');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-b1');
  const [votedFaqs, setVotedFaqs] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedFaqId, setCopiedFaqId] = useState<string | null>(null);

  // Live Concierge Sophia Modal
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'sophia' | 'user'; text: string; time: string }>>([
    {
      sender: 'sophia',
      text: 'Hello! I am Sophia from Vendora 24/7 Concierge Support. How can I assist your order, escrow dispute, or return today?',
      time: 'Just now',
    },
  ]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleVote = (id: string, vote: 'up' | 'down') => {
    if (votedFaqs[id]) return;
    setVotedFaqs((prev) => ({ ...prev, [id]: vote }));
    showToast(vote === 'up' ? 'Thanks! We recorded your positive feedback.' : 'Feedback recorded. Our editorial team will clarify this policy.');
  };

  const handleCopyFaqLink = (id: string) => {
    const url = `${window.location.origin}/help#${id}`;
    navigator.clipboard?.writeText(url);
    setCopiedFaqId(id);
    showToast('Direct article link copied to clipboard.');
    setTimeout(() => setCopiedFaqId(null), 2500);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: 'Just now' }]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'sophia',
          text: `Thank you for sharing details regarding "${userMsg}". I am scanning your active Vendora telemetry and account ledger now. A senior concierge agent will assist in under 2 minutes!`,
          time: 'Just now',
        },
      ]);
    }, 900);
  };

  // Filter FAQs based on tab and optional search query
  const filteredFaqs = useMemo(() => {
    return FAQ_DATABASE.filter((item) => {
      const matchesTab = item.tab === activeFaqTab;
      if (!searchQuery.trim()) return matchesTab;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [activeFaqTab, searchQuery]);

  const selectTopic = (topic: (typeof SUPPORT_TOPICS)[number]) => {
    if (topic.id === 'orders-tracking') setActiveFaqTab('buyer');
    if (topic.id === 'vendor-support') setActiveFaqTab('seller');
    showToast(`Showing articles for ${topic.title}`);
  };

  const activateFaqTab = (tab: FAQTab) => {
    setActiveFaqTab(tab);
    setExpandedFaqId(firstOpenIdForTab(tab));
  };

  const handleFaqTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = FAQ_TAB_ORDER.indexOf(activeFaqTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % FAQ_TAB_ORDER.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + FAQ_TAB_ORDER.length) % FAQ_TAB_ORDER.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = FAQ_TAB_ORDER.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = FAQ_TAB_ORDER[nextIndex];
    activateFaqTab(next);
    document.getElementById(`faq-tab-${next}`)?.focus();
  };

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* =========================================================================
            2. Breadcrumbs Strip
           ========================================================================= */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-slate-500 dark:text-slate-400">Care &amp; Support</span>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Help Hub &amp; Knowledgebase</span>
        </nav>

        {/* =========================================================================
            3. Hero Section: How Can We Help You Today?
           ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-sun-orange shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-sun-orange animate-pulse" />
            <span>24/7 VENDORA CONCIERGE &amp; HELP HUB</span>
          </div>

          <h1 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            How Can We Help You Today?
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Search hundreds of articles, track escrow disputes, or initiate instant live chat with an agent.
          </p>

          {/* Search Box Card with Frosted Glass */}
          <div className="pt-2">
            <div className="relative rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-3 sm:p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    showToast(`Filtering knowledgebase for "${searchQuery}"`);
                  }
                }}
                className="flex flex-col sm:flex-row items-center gap-2"
              >
                <div className="relative flex-1 w-full flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-slate-400 shrink-0" aria-hidden="true" />
                  <input
                    id="faq-search"
                    type="text"
                    aria-label="Search the Vendora help centre"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions, tracking issues, escrow rules, or return policies..."
                    className="w-full rounded-2xl border-0 bg-transparent pl-12 pr-4 py-3.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sun-orange to-[#EA580C] px-7 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 hover:from-[#EA580C] hover:to-sun-orange-700 transition-all cursor-pointer hover:shadow-orange-500/35 active:scale-[0.98] shrink-0"
                >
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>

              {/* Popular Search Pills Bar */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-3 px-2 border-t border-slate-100 dark:border-white/5 text-xs">
                <span className="font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-sun-orange" />
                  Popular:
                </span>
                {POPULAR_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      showToast(`Searching for: ${tag}`);
                    }}
                    className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-sun-orange dark:hover:bg-orange-950/60 dark:hover:text-sun-orange border border-slate-200/80 dark:border-white/10 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. KNOWLEDGE BASE CATEGORIES: Explore by Support Topic
           ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
                KNOWLEDGE BASE CATEGORIES
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Explore by Support Topic
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              Curated step-by-step documentation, escrow protocols, and self-service buyer &amp; seller workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SUPPORT_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <div
                  key={topic.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTopic(topic)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTopic(topic);
                    }
                  }}
                  className="group relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  {/* Subtle hover gradient wash */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-orange-50/20 dark:to-orange-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="relative z-10 space-y-4">
                    {/* Topic Icon */}
                    <div className="flex items-center justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${topic.iconBg} ${topic.iconColor} shadow-xs`}>
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${topic.badgeBg} ${topic.badgeColor} border border-current/20`}>
                        Verified Guide
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="font-outfit text-lg font-black text-slate-900 dark:text-white group-hover:text-sun-orange transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  </div>

                  {/* Section label — no invented article count the page cannot back */}
                  <div className="relative z-10 pt-5 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-sun-orange">
                    <span>Guides &amp; answers</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            5. ANSWERS & POLICIES: Frequently Asked Questions
           ========================================================================= */}
        <section className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
              ANSWERS &amp; POLICIES
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Transparent guidelines protecting both shoppers and merchants across every transaction.
            </p>
          </div>

          {/* Segmented Control Tabs: Buyer Protection & Orders vs Sellers & Payout Terms */}
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="FAQ audience"
              onKeyDown={handleFaqTabListKeyDown}
              className="inline-flex items-center p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-white/10 shadow-inner"
            >
              <button
                type="button"
                id="faq-tab-buyer"
                role="tab"
                aria-selected={activeFaqTab === 'buyer'}
                aria-controls="faq-panel"
                tabIndex={activeFaqTab === 'buyer' ? 0 : -1}
                onClick={() => activateFaqTab('buyer')}
                className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeFaqTab === 'buyer'
                    ? 'bg-gradient-to-r from-sun-orange to-[#EA580C] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Buyer Protection &amp; Orders
              </button>
              <button
                type="button"
                id="faq-tab-seller"
                role="tab"
                aria-selected={activeFaqTab === 'seller'}
                aria-controls="faq-panel"
                tabIndex={activeFaqTab === 'seller' ? 0 : -1}
                onClick={() => activateFaqTab('seller')}
                className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeFaqTab === 'seller'
                    ? 'bg-gradient-to-r from-sun-orange to-[#EA580C] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sellers &amp; Payout Terms
              </button>
            </div>
          </div>

          {/* Accordion List Cards */}
          <div
            id="faq-panel"
            role="tabpanel"
            aria-labelledby={`faq-tab-${activeFaqTab}`}
            className="max-w-4xl mx-auto space-y-3.5"
          >
            {filteredFaqs.length === 0 ? (
              <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-8 text-center backdrop-blur-xl">
                <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                  No matching policy articles found
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching for keywords like "escrow", "delay", "refund", or click one of the popular tags.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = expandedFaqId === faq.id;
                const userVote = votedFaqs[faq.id];
                return (
                  <div
                    key={faq.id}
                    id={faq.id}
                    className="overflow-hidden rounded-2xl sm:rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.03)] transition-all"
                  >
                    {/* Header Question Bar */}
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer hover:bg-orange-50/30 dark:hover:bg-white/[0.02] transition-colors"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${faq.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex rounded-md bg-orange-100 text-sun-orange dark:bg-orange-950/60 dark:text-orange-400 px-2 py-0.5 text-[10px] font-extrabold uppercase shrink-0">
                          {faq.category}
                        </span>
                        <span className="font-outfit text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 bg-orange-100 text-sun-orange dark:bg-orange-950/60 dark:text-sun-orange' : ''
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </button>

                    {/* Collapsible Answer Content */}
                    {isOpen && (
                      <div id={`faq-answer-${faq.id}`} className="border-t border-slate-100 dark:border-white/5 px-5 sm:px-6 py-5 bg-white/40 dark:bg-white/[0.01] space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {faq.answer}
                        </p>

                        {/* Footer Bar: Helpful feedback + direct link */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>Was this helpful?</span>
                            <button
                              type="button"
                              onClick={() => handleVote(faq.id, 'up')}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all cursor-pointer ${
                                userVote === 'up'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Yes ({faq.helpfulCount + (userVote === 'up' ? 1 : 0)})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVote(faq.id, 'down')}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all cursor-pointer ${
                                userVote === 'down'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>No</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyFaqLink(faq.id)}
                            aria-live="polite"
                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-sun-orange transition-colors cursor-pointer"
                          >
                            {copiedFaqId === faq.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                                <span className="text-emerald-600">Copied Link</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Copy Article Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =========================================================================
            6. "Still can't find what you need?" Frosted Banner
           ========================================================================= */}
        <section className="pt-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            {/* Subtle internal glow reflections */}
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-sun-orange-200/30 blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-aqua-100/35 blur-[90px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <h3 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Still can't find what you need?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our support team is updated weekly with new seller policies and return guidelines.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLiveChatOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-6 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <MessageSquare className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                  <span>Ask Sophia in Live Chat</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          Interactive Live Chat with Sophia Modal
         ========================================================================= */}
      <Dialog open={isLiveChatOpen} onOpenChange={setIsLiveChatOpen}>
        <DialogContent aria-label="Vendora live chat with Sophia" className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                  alt="Sophia M."
                  className="h-10 w-10 rounded-full object-cover border-2 border-orange-500"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-outfit font-black text-sm text-white">Sophia M.</h4>
                  <span className="rounded-full bg-orange-500/20 text-sun-orange border border-orange-500/30 px-2 py-0.2 text-[9px] font-black uppercase">
                    AI Concierge
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Vendora Senior Escalations Specialist • Online</p>
              </div>
            </div>
          </div>

          {/* Messages stream */}
          <div role="log" aria-live="polite" aria-label="Chat messages" className="p-5 h-80 overflow-y-auto space-y-3.5 bg-slate-50/70 dark:bg-slate-950/50">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'sophia' && (
                  <div className="h-7 w-7 rounded-full bg-sun-orange text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    S
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-sun-orange to-[#EA580C] text-white rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className={`text-[9px] mt-1 block ${msg.sender === 'user' ? 'text-orange-100 text-right' : 'text-slate-400'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChat} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2">
            <input
              id="sophia-chat-input"
              type="text"
              aria-label="Type your message or order inquiry"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message or order inquiry..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sun-orange"
            />
            <button
              type="submit"
              aria-label="Send message to Sophia"
              className="rounded-full bg-sun-orange hover:bg-sun-orange-600 p-2.5 text-white transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FAQPage;
