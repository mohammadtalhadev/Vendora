import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  User,
  Package,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { useWishlistStore } from '../store/wishlist-store';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { useOrders, useUpdateSubOrderStatus } from '../features/orders/hooks/useOrders';
import type { SubOrder } from '../types/domain';

export const ReturnsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const displayName = user?.name || user?.email || 'there';
  const { formatPrice } = useCurrency();
  const wishlistCount = useWishlistStore((s) => s.items.length);

  // Real orders from the data layer. The "recent purchases" the customer can return
  // are derived from their delivered physical packages, never from a seed array.
  const ordersQuery = useOrders();
  const orderGroups = ordersQuery.data?.orderGroups ?? [];
  const subOrders: SubOrder[] = ordersQuery.data?.subOrders ?? [];
  const deliveredItems = subOrders.filter((so) => so.type === 'physical' && so.status === 'delivered');

  // Wizard modal state (now keyed to a real SubOrder, not an invented item)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedItem, setSelectedItem] = useState<SubOrder | null>(null);
  const [returnReason, setReturnReason] = useState('Item defective / does not turn on');
  const [resolutionType, setResolutionType] = useState<'replacement' | 'refund' | 'credit'>('replacement');
  const [returnMethod, setReturnMethod] = useState<'tcs' | 'bykea'>('bykea');

  const returnMutation = useUpdateSubOrderStatus();

  // Search lookup state
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupQuery, setLookupQuery] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>('ret-faq-1');

  // When a lookup has been submitted, resolve it against the customer's real orders.
  const matchedGroup = lookupQuery
    ? orderGroups.find((og) => og.id.toLowerCase() === lookupQuery.replace(/^#/, '').toLowerCase())
    : undefined;
  const matchedItems = matchedGroup
    ? subOrders.filter((so) => so.orderGroupId === matchedGroup.id && so.type === 'physical' && so.status === 'delivered')
    : [];
  const lookupNotFound = lookupQuery !== null && !matchedGroup;
  const lookupLoading = lookupQuery !== null && ordersQuery.isLoading;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupOrderId.trim();
    if (!trimmed) return;
    setLookupQuery(trimmed);
  };

  const startReturnForItem = (item: SubOrder) => {
    setSelectedItem(item);
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleFinishReturn = () => {
    if (!selectedItem) return;
    returnMutation.mutate(
      {
        subOrderId: selectedItem.id,
        nextStatus: 'return_requested',
        note: `Customer return requested: ${returnReason} (${resolutionType}, ${returnMethod})`,
      },
      {
        onSuccess: () => setWizardStep(4),
      },
    );
  };

  const itemsForGrid = lookupQuery ? matchedItems : deliveredItems;

  const dropOffLocations = [
    {
      name: 'TCS Express Center',
      address: 'Participating TCS branches nationwide',
      tag: 'No Box or Label Required • Instant Barcode Scan',
      color: 'border-emerald-200 bg-emerald-50/60 text-emerald-800',
    },
    {
      name: 'Bykea Instant Doorstep Hub',
      address: 'Direct Rider Dispatch across major cities',
      tag: 'Rider Collects at Doorstep',
      color: 'border-orange-200 bg-orange-50/60 text-orange-800',
    },
    {
      name: 'Leopards Courier Express Hub',
      address: 'Leopards main branches nationwide',
      tag: 'Prepaid Digital Return Pass Accepted',
      color: 'border-blue-200 bg-blue-50/60 text-blue-800',
    },
  ];

  const returnFAQs = [
    {
      id: 'ret-faq-1',
      question: 'How do I return an item without a printer or box?',
      answer:
        'Select the paperless drop-off option. Bring your unboxed item and the digital pass on your phone to a participating courier center or hand it to the pickup rider, who scans it and issues a receipt.',
    },
    {
      id: 'ret-faq-2',
      question: 'Can I get a free replacement if my item arrived damaged or defective?',
      answer:
        'If your item arrived broken, defective, or not as described, choose "Free Replacement" when filing the return. The seller reviews the request before dispatch.',
    },
    {
      id: 'ret-faq-3',
      question: 'How does the refund work?',
      answer:
        'Refunds follow your original payment method. Once the seller approves the return — or the dispute desk upholds it — the refund is issued back to the method you paid with.',
    },
    {
      id: 'ret-faq-4',
      question: 'What items are NOT eligible for return?',
      answer:
        'Customized items altered by special request, opened hygiene or cosmetics products, and digital codes once activated are non-returnable.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased overflow-hidden pb-20">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sun-orange-200/65 via-sun-orange-100/70 to-sun-orange-200/40 blur-[130px] dark:from-sun-orange/10 dark:via-sun-orange-200/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[140px] dark:from-aqua/10 dark:via-transparent pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sun-orange-100/70 via-aqua-100/50 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6">
        {/* Header Banner */}
        <div className="overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-sun-orange shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Returns &amp; Replacements Hub
                  </h1>
                  <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 px-2.5 py-0.5 text-[10px] font-bold text-sun-orange border border-orange-200">
                    {displayName}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Submit and track return requests for eligible delivered orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/30 p-3.5 px-4 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-orange text-white">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">Return Policy</h4>
                <p className="text-[11px] text-slate-500">Request a return on delivered packages</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Menu */}
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 shadow-sm space-y-1.5">
              <button
                type="button"
                onClick={() => navigate('/orders?tab=overview')}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/orders?tab=addresses')}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <span>Profile &amp; Addresses</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Settings</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/orders?tab=orders')}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <span>Track Orders</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">History</span>
              </button>

              <button
                type="button"
                aria-current="page"
                className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-sun-orange to-[#FF9040] px-4 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/20"
              >
                <span>Returns &amp; Refunds</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{deliveredItems.length} eligible</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/wishlist')}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <span>My Wishlist</span>
                <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold">{wishlistCount} items</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/downloads')}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <span>My Downloads</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Licenses</span>
              </button>
            </div>

            <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4" />
                <h4 className="font-outfit text-xs font-bold">Buyer Protection</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                If a seller declines your return and you believe it is eligible, raise a dispute from the order and the dispute desk reviews it.
              </p>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {ordersQuery.isError && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{ordersQuery.error.message}</span>
                </div>
                <button type="button" onClick={() => ordersQuery.refetch()} aria-label="Retry loading orders" className="underline">
                  Retry
                </button>
              </div>
            )}

            {/* 3 Core Guarantees Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm backdrop-blur-xl flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-sun-orange">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Request a Return</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Open a return on any delivered package; the seller reviews your request.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm backdrop-blur-xl flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Courier Handover</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Once approved, hand the item to the courier or drop it at a center.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm backdrop-blur-xl flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Refund on Approval</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Refunds are issued to your original payment method once the return is approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Order Lookup Form */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-outfit text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Find Order to Request a Return
                  </h3>
                  <p className="text-xs text-slate-500">Enter one of your order numbers, or pick from recently delivered packages</p>
                </div>
              </div>

              <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label htmlFor="lookup-order" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Order Number
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="lookup-order"
                      type="text"
                      placeholder={orderGroups[0] ? `e.g. ${orderGroups[0].id}` : 'Enter your order number'}
                      value={lookupOrderId}
                      onChange={(e) => setLookupOrderId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-sun-orange"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4 flex items-end">
                  <button
                    type="submit"
                    disabled={!lookupOrderId.trim()}
                    className="w-full rounded-xl bg-sun-orange hover:bg-sun-orange-600 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 text-xs font-bold text-white transition-all shadow-sm"
                  >
                    Find Items
                  </button>
                </div>
              </form>

              {lookupLoading && <p role="status" className="text-xs text-slate-500">Searching your orders…</p>}
              {lookupNotFound && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    We couldn't find an order matching “{lookupQuery}” on your account. Check the number, or pick from the delivered items below.
                  </span>
                </div>
              )}
            </div>

            {/* Eligible Items for Return */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-4">
              <h3 className="font-outfit text-xs font-bold text-slate-400">
                {lookupQuery ? `Delivered Packages in Order #${matchedGroup?.id ?? lookupQuery}` : 'Delivered Packages Eligible for Return'}
              </h3>

              {ordersQuery.isLoading ? (
                <p className="text-xs text-slate-500">Loading your orders…</p>
              ) : itemsForGrid.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {orderGroups.length === 0
                    ? 'You have no orders yet. Delivered packages will appear here once an order arrives.'
                    : 'None of your delivered packages are open for a return right now.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {itemsForGrid.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={item.items[0]?.image || '/images/placeholder.png'}
                          alt={item.items[0]?.title || item.sellerName}
                          className="h-16 w-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="inline-block rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                            Delivered
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2">
                            {item.items[0]?.title || `${item.items.length} item${item.items.length === 1 ? '' : 's'}`}
                          </h4>
                          <div className="text-[11px] text-slate-500">
                            {item.sellerName} • <strong className="text-slate-800 dark:text-slate-200">{formatPrice(item.subtotal + item.shippingFee)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">#{item.orderGroupId}</span>
                        <button
                          type="button"
                          onClick={() => startReturnForItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sun-orange hover:bg-sun-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
                        >
                          <span>Start Return</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Courier Drop-off Hubs */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-4">
              <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                Courier Drop-off &amp; Doorstep Partners
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dropOffLocations.map((loc) => (
                  <div key={loc.name} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{loc.name}</h4>
                    <p className="text-[11px] text-slate-500">{loc.address}</p>
                    <div className="pt-1">
                      <span className={`inline-block text-[10px] font-bold rounded-lg px-2 py-0.5 border ${loc.color}`}>{loc.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-3">
              <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white mb-2">
                Frequently Asked Return Questions
              </h3>
              <div className="space-y-2">
                {returnFAQs.map((faq) => {
                  const isOpen = expandedFAQ === faq.id;
                  return (
                    <div key={faq.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 overflow-hidden">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`${faq.id}-panel`}
                        onClick={() => setExpandedFAQ(isOpen ? null : faq.id)}
                        className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div id={`${faq.id}-panel`} className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Return Request Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-white/20">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              {wizardStep === 4 ? 'Return Requested' : 'Request a Return'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedItem ? (selectedItem.items[0]?.title || selectedItem.sellerName) : 'Select a delivered package'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Reason */}
          {wizardStep === 1 && (
            <div className="space-y-4 pt-2">
              <div>
                <label htmlFor="return-reason" className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Select Return Reason
                </label>
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="native-select w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-white"
                >
                  <option>Item defective / does not turn on</option>
                  <option>Item damaged or cracked during transit</option>
                  <option>Wrong item or color delivered</option>
                  <option>Missing parts or accessories</option>
                  <option>Changed mind (Unopened packaging)</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Resolution Type (real radio group) */}
          {wizardStep === 2 && (
            <div className="space-y-4 pt-2">
              <fieldset className="space-y-2">
                <legend className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Choose Resolution
                </legend>

                {(
                  [
                    { key: 'replacement', title: 'Free Replacement', desc: 'The seller ships a replacement after review' },
                    { key: 'refund', title: 'Bank Refund', desc: 'Reversed to your original payment method' },
                    { key: 'credit', title: 'Store Credit', desc: 'Credited to your Vendora balance' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className={`block p-3 rounded-xl border cursor-pointer text-xs ${
                      resolutionType === opt.key
                        ? 'border-sun-orange bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="resolution"
                        value={opt.key}
                        checked={resolutionType === opt.key}
                        onChange={() => setResolutionType(opt.key)}
                        className="accent-sun-orange"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{opt.title}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{opt.desc}</span>
                  </label>
                ))}
              </fieldset>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Courier Method (real radio group) */}
          {wizardStep === 3 && (
            <div className="space-y-4 pt-2">
              <fieldset className="space-y-2">
                <legend className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Select Handover Method
                </legend>

                {(
                  [
                    { key: 'bykea', title: 'Doorstep Pickup', desc: 'A rider collects from your address' },
                    { key: 'tcs', title: 'Courier Drop-off', desc: 'Drop off at a participating center' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className={`block p-3 rounded-xl border cursor-pointer text-xs ${
                      returnMethod === opt.key
                        ? 'border-sun-orange bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="method"
                        value={opt.key}
                        checked={returnMethod === opt.key}
                        onChange={() => setReturnMethod(opt.key)}
                        className="accent-sun-orange"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{opt.title}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {returnMutation.isError && (
                <p className="text-[11px] font-semibold text-rose-700" role="alert">{returnMutation.error.message}</p>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinishReturn}
                  disabled={returnMutation.isPending}
                  className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 disabled:opacity-60 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  {returnMutation.isPending ? 'Submitting…' : 'Submit Return Request'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmed */}
          {wizardStep === 4 && (
            <div className="space-y-4 pt-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Your return request was filed on package <span className="font-mono font-bold">#{selectedItem?.id}</span>. The seller will review it and you'll see the status update on the order page.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsWizardOpen(false);
                  if (selectedItem && selectedItem.orderGroupId) navigate(`/orders/${selectedItem.orderGroupId}`);
                }}
                className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-xs font-bold"
              >
                View order
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsPage;
