import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Headphones,
  HelpCircle,
  Lock,
  Mail,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Wallet,
} from 'lucide-react';

interface TopicCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  description: string;
  /** FAQ entry ids this topic filters to. */
  entryIds: string[];
}

interface FaqEntry {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  answer: string;
}

/**
 * The Help Center hub (/faq and /help render this page). Structure: hero +
 * search, topic cards, the returns front door, then the FAQ itself in the
 * clean two-column editorial style (icon tile, bold question, plain answer —
 * no accordion), full width, with a faded Load-more tail.
 *
 * Every answer describes behaviour the storefront actually has (checkout
 * payment methods, the 30-day returns flow, the dispute flow, the Batch 23
 * email rules, the Batch 10 card-storage rules). The invented escrow vault,
 * courier-partner claims, SLA vouchers, payout cycles and helpful-vote
 * counts that an earlier version of this page carried are gone for good.
 */
const SUPPORT_TOPICS: TopicCategory[] = [
  {
    id: 'orders-tracking',
    title: 'Orders & Tracking',
    icon: Truck,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40',
    iconColor: 'text-sun-orange',
    description:
      'Live order status, delivery codes, and how multi-seller orders arrive as separate shipments.',
    entryIds: ['track-order', 'multi-seller'],
  },
  {
    id: 'payments-cards',
    title: 'Payments & Cards',
    icon: CreditCard,
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    description:
      'Paying by card or Cash on Delivery, what a saved payment method stores, and prices in PKR.',
    entryIds: ['payment-methods', 'card-storage'],
  },
  {
    id: 'returns-refunds',
    title: 'Returns & Refunds',
    icon: RotateCcw,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    description: 'The 30-day return window, doorstep pickup, and where to follow your refund.',
    entryIds: ['returns', 'refunds'],
  },
  {
    id: 'buyer-protection',
    title: 'Buyer Protection',
    icon: ShieldCheck,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Filing a dispute from your order, and how our team reviews and resolves it.',
    entryIds: ['dispute'],
  },
  {
    id: 'selling',
    title: 'Selling on Vendora',
    icon: Store,
    iconBg: 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    description: 'Applying to become a seller, getting approved, and requesting payouts.',
    entryIds: ['become-seller', 'seller-payouts'],
  },
  {
    id: 'account-email',
    title: 'Account & Email',
    icon: Lock,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Changing your account email — self-serve for customers, via our admin team for vendors.',
    entryIds: ['change-email'],
  },
];

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'track-order',
    icon: Truck,
    question: 'How can I track my order?',
    answer:
      'Open Account → Orders to see the live status of every order, from confirmation to dispatch to delivery. When your parcel arrives, the rider may ask for the delivery code shown on your order — only share it once the parcel is physically in your hands.',
  },
  {
    id: 'payment-methods',
    icon: CreditCard,
    question: 'What payment methods can I use?',
    answer:
      'You can pay by card at checkout, or choose Cash on Delivery (COD) and pay the rider when your parcel arrives. Prices across Vendora are in Pakistani Rupees (PKR).',
  },
  {
    id: 'returns',
    icon: RotateCcw,
    question: 'How do returns work?',
    answer:
      'Most items can be returned within 30 days of delivery. Start from the Returns page or from the order in your account, book a doorstep pickup, and follow the return status in your account until it completes.',
  },
  {
    id: 'refunds',
    icon: Receipt,
    question: 'When will I get my refund?',
    answer:
      'Refunds are processed once the returned item reaches the seller and the return is approved. You can follow the refund status from your orders and returns pages; for Cash on Delivery orders, our support team will contact you to arrange the refund.',
  },
  {
    id: 'multi-seller',
    icon: ShoppingBag,
    question: 'Can I order from more than one seller at once?',
    answer:
      'Yes. Add items from different sellers to one cart and check out in a single payment. Each seller packs and dispatches their own items, so the items arrive as separate orders that you track individually in your account.',
  },
  {
    id: 'become-seller',
    icon: Store,
    question: 'How do I start selling on Vendora?',
    answer:
      'Apply from the Become a Seller page. Our team reviews every application; once you are approved, you get a vendor dashboard where you can add products, manage orders and track your earnings.',
  },
  {
    id: 'seller-payouts',
    icon: Wallet,
    question: 'When do sellers get paid?',
    answer:
      'Your earnings are tracked in the vendor dashboard as your orders are delivered. You can request and follow payouts from the Payouts page of your vendor workspace.',
  },
  {
    id: 'change-email',
    icon: Mail,
    question: 'How do I change the email on my account?',
    answer:
      'Customers can change their email from Account Settings — we send a confirmation link to the new address, and the change takes effect once you confirm it. Vendor accounts keep their email locked to the store identity, so sellers contact our admin team to change it.',
  },
  {
    id: 'dispute',
    icon: ShieldCheck,
    question: 'What if something goes wrong with my order?',
    answer:
      'Open the order in your account and file a dispute with the details of what went wrong — photos help. Our team reviews both sides and resolves the case, including a refund where the claim is valid.',
  },
  {
    id: 'card-storage',
    icon: Lock,
    question: 'Do you store my card details?',
    answer:
      'No. Vendora never stores full card numbers. A saved payment method keeps only the display details — the card brand and the last digits — so you can recognise it at checkout.',
  },
];

const POPULAR_SEARCH_TAGS: Array<{ label: string; query: string }> = [
  { label: 'Track my order', query: 'track' },
  { label: 'Return an item', query: 'return' },
  { label: 'Refund status', query: 'refund' },
  { label: 'Cash on Delivery', query: 'cash' },
  { label: 'Become a seller', query: 'seller' },
];

const VISIBLE_COUNT = 6;

const FaqItem: React.FC<{ entry: FaqEntry }> = ({ entry }) => {
  const Icon = entry.icon;
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sun-orange shadow-xs dark:border-white/10 dark:bg-slate-900">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-outfit text-sm font-bold text-slate-900 sm:text-base dark:text-white">
          {entry.question}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {entry.answer}
        </p>
      </div>
    </div>
  );
};

export const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const faqSectionRef = useRef<HTMLElement | null>(null);

  const isFiltering = searchQuery.trim().length > 0 || activeTopicId !== null;

  const filteredFaqs = useMemo(() => {
    const topic = SUPPORT_TOPICS.find((t) => t.id === activeTopicId);
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ENTRIES.filter((entry) => {
      if (topic && !topic.entryIds.includes(entry.id)) return false;
      if (!q) return true;
      return (
        entry.question.toLowerCase().includes(q) || entry.answer.toLowerCase().includes(q)
      );
    });
  }, [activeTopicId, searchQuery]);

  const visible = isFiltering ? filteredFaqs : filteredFaqs.slice(0, VISIBLE_COUNT);
  const remaining = isFiltering ? [] : filteredFaqs.slice(VISIBLE_COUNT);

  const scrollToFaqs = () => {
    faqSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectTopic = (topic: TopicCategory) => {
    setActiveTopicId((prev) => (prev === topic.id ? null : topic.id));
    setSearchQuery('');
    scrollToFaqs();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTopicId(null);
  };

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 sm:px-6 sm:space-y-12 lg:px-8">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="transition-colors hover:text-sun-orange">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-500 dark:text-slate-400">Care &amp; Support</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">
            Help Hub &amp; Knowledgebase
          </span>
        </nav>

        {/* Hero: How can we help — with the FAQ search */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
            How Can We Help You Today?
          </h1>
          <p className="mx-auto text-xs leading-relaxed text-slate-600 sm:text-sm md:text-base dark:text-slate-300">
            Search the questions below, browse by topic, or message our support team.
          </p>

          <div className="pt-2">
            <div className="relative rounded-3xl border border-white/80 bg-white/80 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-4 dark:border-white/10 dark:bg-slate-900/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  scrollToFaqs();
                }}
                className="flex flex-col items-center gap-2 sm:flex-row"
              >
                <div className="relative flex w-full flex-1 items-center">
                  <Search
                    className="absolute left-4 h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="faq-search"
                    type="text"
                    aria-label="Search the Vendora help centre"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveTopicId(null);
                    }}
                    placeholder="Search questions — try “track”, “return”, “refund”…"
                    className="w-full rounded-2xl border-0 bg-transparent py-3.5 pl-12 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="cursor-pointer px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sun-orange px-7 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-[0.98] sm:w-auto sm:text-sm"
                >
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 px-2 pt-3 text-xs sm:justify-start dark:border-white/5">
                <span className="flex items-center gap-1 font-bold text-slate-400 dark:text-slate-500">
                  <Sparkles className="h-3 w-3 text-sun-orange" />
                  Popular:
                </span>
                {POPULAR_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag.query);
                      setActiveTopicId(null);
                      scrollToFaqs();
                    }}
                    className="cursor-pointer rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 transition-all hover:bg-orange-50 hover:text-sun-orange dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-orange-950/60"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Topic categories */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200/60 pb-4 sm:flex-row sm:items-end dark:border-white/10">
            <div className="space-y-1">
              <span className="block text-[10px] font-black uppercase tracking-wider text-sun-orange">
                KNOWLEDGE BASE CATEGORIES
              </span>
              <h2 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
                Explore by Support Topic
              </h2>
            </div>
            {activeTopicId && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-fit cursor-pointer text-xs font-bold text-sun-orange hover:underline"
              >
                Clear topic filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SUPPORT_TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isActive = activeTopicId === topic.id;
              return (
                <div
                  key={topic.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => selectTopic(topic)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTopic(topic);
                    }
                  }}
                  className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border bg-white/75 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:bg-slate-900/75 ${
                    isActive
                      ? 'border-sun-orange ring-2 ring-sun-orange/40'
                      : 'border-white/80 dark:border-white/10'
                  }`}
                >
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs ${topic.iconBg} ${topic.iconColor}`}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <span className="rounded-full border border-current/20 bg-orange-50/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sun-orange dark:bg-orange-950/30">
                        {isActive ? 'Filtering' : 'Guides'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-outfit text-lg font-black text-slate-900 transition-colors group-hover:text-sun-orange dark:text-white">
                        {topic.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-5 text-xs font-bold text-sun-orange dark:border-white/5">
                    <span>Guides &amp; answers</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Returns front door */}
        <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200/80 bg-orange-50 text-sun-orange shadow-2xs dark:border-orange-800/40 dark:bg-orange-950/40">
              <RotateCcw className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-outfit text-lg font-black text-slate-900 sm:text-xl dark:text-white">
                Changed your mind? No hard feelings — returns are easy here.
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                Most items can be returned within 30 days of delivery. Book a free doorstep
                pickup, drop the parcel, and track your refund step by step — no phone
                calls, no paperwork.
              </p>
            </div>
            <Link
              to="/returns"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-sun-orange px-6 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-[0.98] sm:text-sm"
            >
              <span>Start a Return</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* FAQ — the reference-style open grid, FULL WIDTH */}
        <section ref={faqSectionRef} className="scroll-mt-28 space-y-8 pt-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Quick answers to questions you may have. Can&apos;t find what you&apos;re
                looking for?{' '}
                <Link
                  to="/contact"
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-sun-orange hover:decoration-sun-orange dark:text-white dark:decoration-slate-600"
                >
                  Message our support team
                </Link>
                .
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
            >
              Contact Us
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isFiltering && (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400" role="status">
              {filteredFaqs.length} matching question{filteredFaqs.length === 1 ? '' : 's'}
              {' — '}
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer font-bold text-sun-orange hover:underline"
              >
                show all
              </button>
            </p>
          )}

          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
              <HelpCircle className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
              <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                No matching questions found
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try a shorter keyword like “track”, “refund” or “seller” — or message our
                support team.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 cursor-pointer rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
                {visible.map((entry) => (
                  <FaqItem key={entry.id} entry={entry} />
                ))}
                {expanded &&
                  remaining.map((entry) => <FaqItem key={entry.id} entry={entry} />)}
              </div>

              {!expanded && remaining.length > 0 && (
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none grid max-h-44 select-none gap-x-12 gap-y-10 overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)] md:grid-cols-2"
                  >
                    {remaining.map((entry) => (
                      <FaqItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                  <div className="relative z-10 mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-md transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                    >
                      Load more
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Still-have-questions banner */}
        <section className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200/70 bg-slate-50 px-6 py-6 sm:px-8 md:flex-row md:items-center dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun-orange text-white shadow-md shadow-orange-500/25">
              <Headphones className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-outfit text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                Still have questions?
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                Can&apos;t find the answer you&apos;re looking for? Please{' '}
                <Link
                  to="/contact"
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-sun-orange hover:decoration-sun-orange dark:text-white dark:decoration-slate-600"
                >
                  chat to our friendly team
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
            >
              Track Your Order
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
            >
              Get in Touch
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQPage;
