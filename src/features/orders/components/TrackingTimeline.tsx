import React, { useState } from 'react';
import type { SubOrder, PhysicalSubOrderStatus, TrackingEvent } from '../../../types/domain';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  ShoppingBag,
  CheckCircle2,
  Package,
  Clock,
  Truck,
  Bike,
  CheckCheck,
  KeyRound,
  Key,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  List,
} from 'lucide-react';

export interface TrackingTimelineProps {
  subOrder: SubOrder;
  className?: string;
  defaultOrientation?: 'horizontal' | 'vertical';
  allowToggleOrientation?: boolean;
}

export interface StageDefinition {
  key: PhysicalSubOrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PHYSICAL_STAGES: readonly StageDefinition[] = [
  {
    key: 'placed',
    label: 'Order Placed',
    shortLabel: 'Placed',
    description: 'Order placed & payment verified',
    icon: ShoppingBag,
  },
  {
    key: 'confirmed',
    label: 'Confirmed by Seller',
    shortLabel: 'Confirmed',
    description: 'Seller accepted and confirmed stock',
    icon: CheckCircle2,
  },
  {
    key: 'packed',
    label: 'Order Packed',
    shortLabel: 'Packed',
    description: 'Packed into parcel and labeled',
    icon: Package,
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready for Pickup',
    shortLabel: 'Ready',
    description: 'Awaiting courier collection at hub',
    icon: Clock,
  },
  {
    key: 'shipped',
    label: 'Shipped / In Transit',
    shortLabel: 'Shipped',
    description: 'In transit with logistics courier',
    icon: Truck,
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    shortLabel: 'Out for Delivery',
    description: 'Courier en route to your doorstep',
    icon: Bike,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    shortLabel: 'Delivered',
    description: 'Package delivered and code confirmed',
    icon: CheckCheck,
  },
] as const;

function formatEventTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  subOrder,
  className = '',
  defaultOrientation = 'horizontal',
  allowToggleOrientation = true,
}) => {
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(defaultOrientation);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);

  const isDigital = subOrder.type === 'digital';
  const currentStatus = subOrder.status;

  // Handle Copy Digital License Key
  const handleCopyKey = () => {
    const key = subOrder.licenseKey || 'VEN-LIC-DEMO-KEY-8942';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(key).catch(() => {});
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Handle Copy Delivery PIN Code
  const handleCopyDeliveryCode = () => {
    const code = subOrder.deliveryCode || '4291';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Calculate current stage index in the 7-stage physical workflow
  const currentStageIndex = PHYSICAL_STAGES.findIndex((s) => s.key === currentStatus);
  const isTerminalDelivered = currentStatus === 'delivered';
  const isCancelled = currentStatus === 'cancelled';
  const isReturnFlow =
    currentStatus === 'return_requested' ||
    currentStatus === 'return_approved' ||
    currentStatus === 'refunded';

  // Effective index for stepper progress display:
  // If delivered, full progress (all 7 completed).
  // If not among the 7 (e.g. cancelled early), fallback to whatever stage was recorded in history.
  const resolvedActiveIndex = (() => {
    if (isTerminalDelivered) return 6;
    if (currentStageIndex >= 0) return currentStageIndex;

    // Search backwards in history to find the highest physical stage reached
    for (let i = subOrder.history.length - 1; i >= 0; i--) {
      const histStatus = subOrder.history[i].status;
      const idx = PHYSICAL_STAGES.findIndex((s) => s.key === histStatus);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const activeStage = PHYSICAL_STAGES[resolvedActiveIndex] ?? PHYSICAL_STAGES[0];
  const highlightedStage = selectedStageIndex !== null ? PHYSICAL_STAGES[selectedStageIndex] : activeStage;

  const deliveryDigits = (subOrder.deliveryCode || '4291').split('');

  return (
    <div className={`space-y-6 ${className}`} data-testid="tracking-timeline">
      {/* 1. Header with orientation toggle and current status badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isCancelled
                ? 'discount-coral'
                : isTerminalDelivered || currentStatus === 'available'
                ? 'in-stock'
                : 'vendora-platform'
            }
            size="default"
            data-testid="current-status-badge"
          >
            {isCancelled
              ? 'Cancelled'
              : isReturnFlow
              ? `Return: ${currentStatus.replace('_', ' ')}`
              : isTerminalDelivered
              ? 'Delivered'
              : isDigital
              ? currentStatus === 'available'
                ? 'Ready for Download'
                : 'Digital Order'
              : activeStage.label}
          </Badge>
          <span className="text-xs text-slate-500">
            Package from <strong className="text-slate-800">{subOrder.sellerName}</strong>
          </span>
        </div>

        {!isDigital && allowToggleOrientation && (
          <div className="flex items-center rounded-full border border-slate-200 bg-white/80 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                orientation === 'horizontal'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Horizontal Stepper View"
              aria-label="Horizontal View"
            >
              <LayoutGrid className="h-3 w-3" />
              <span className="hidden sm:inline">Horizontal</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                orientation === 'vertical'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vertical Stepper View"
              aria-label="Vertical View"
            >
              <List className="h-3 w-3" />
              <span className="hidden sm:inline">Vertical</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Cancellation or Return Notice if applicable */}
      {isCancelled && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-xs">
            <p className="font-bold">This sub-order was cancelled</p>
            <p className="mt-0.5 text-rose-700">
              {subOrder.returnReason || 'Cancellation processed. Any captured payment will be refunded to your source card.'}
            </p>
          </div>
        </div>
      )}

      {isReturnFlow && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
          <RotateCcw className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs">
            <p className="font-bold">Return Request Active ({currentStatus})</p>
            <p className="mt-0.5 text-amber-700">
              {subOrder.returnReason || 'Return has been submitted and is currently being evaluated.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. DIGITAL SUB-ORDER: License Key Card */}
      {isDigital ? (
        <div
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl"
          data-testid="digital-license-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-orange/20 text-[#FF7A1A]">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Digital Asset License Key</h4>
                <p className="text-xs text-slate-300">
                  Instant Commercial License · Lifetime Perpetual Access
                </p>
              </div>
            </div>
            <Badge
              variant="vendor-verified"
              size="default"
              className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
            >
              License Active
            </Badge>
          </div>

          <div className="mt-5 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Key:
              </span>
              <code
                className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#FFD43B] select-all break-all"
                data-testid="license-key-value"
              >
                {subOrder.licenseKey || 'VEN-LIC-DEMO-KEY-8942'}
              </code>
            </div>
            <Button
              type="button"
              variant="glass-pill"
              size="sm"
              onClick={handleCopyKey}
              className="gap-2 text-xs font-bold text-slate-900"
              data-testid="copy-key-button"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Key</span>
                </>
              )}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-300">
            <span>
              Asset:{' '}
              <strong className="text-white">
                {subOrder.items[0]?.title || 'Vendora Digital Product'}
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[#FF7A1A]" />
              <button
                type="button"
                onClick={() => {
                  setDownloadStarted(true);
                  const element = document.createElement('a');
                  const content = `Vendora Verified Digital License Package\nOrder: ${subOrder.id}\nLicense Key: ${subOrder.licenseKey || 'VEN-LIC-DEMO-KEY-8942'}\nAsset: ${subOrder.items[0]?.title || 'Vendora Digital Product'}\nGenerated: ${new Date().toISOString()}`;
                  const file = new Blob([content], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = `license-${subOrder.id}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  setTimeout(() => setDownloadStarted(false), 2000);
                }}
                className="font-semibold text-[#FF7A1A] hover:underline"
              >
                {downloadStarted ? 'Downloading Package...' : 'Download Package (.ZIP)'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 4. PHYSICAL SUB-ORDER: 7-Stage Horizontal / Vertical Stepper */
        <div className="space-y-6">
          {/* HORIZONTAL STEPPER VIEW */}
          {orientation === 'horizontal' ? (
            <div
              className="overflow-x-auto pb-4 pt-2 no-scrollbar"
              data-testid="horizontal-stepper"
             data-lenis-prevent>
              <div className="min-w-[680px] px-2">
                <ol className="flex items-center justify-between">
                  {PHYSICAL_STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const isCompleted = isTerminalDelivered || idx < resolvedActiveIndex;
                    const isCurrent = !isTerminalDelivered && idx === resolvedActiveIndex;

                    return (
                      <li
                        key={stage.key}
                        className="relative flex flex-1 flex-col items-center group cursor-pointer"
                        onClick={() => setSelectedStageIndex(idx)}
                        data-testid={`stepper-stage-${stage.key}`}
                      >
                        {/* Connecting bar to next stage */}
                        {idx < PHYSICAL_STAGES.length - 1 && (
                          <div
                            className={`absolute left-1/2 top-5 -z-10 h-0.5 w-full transition-colors ${
                              isCompleted && (idx < resolvedActiveIndex || isTerminalDelivered)
                                ? 'bg-emerald-500'
                                : 'bg-slate-200'
                            }`}
                            aria-hidden="true"
                          />
                        )}

                        {/* Node Circle */}
                        <div className="relative flex items-center justify-center">
                          {/* Active Pulse Ring Indicator on Current Stage */}
                          {isCurrent && (
                            <span
                              className="absolute -inset-2 rounded-full bg-[#FF7A1A]/30 animate-ping opacity-75"
                              data-testid="active-pulse-indicator"
                            />
                          )}

                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                              isCompleted
                                ? 'bg-emerald-500 text-white shadow-md'
                                : isCurrent
                                ? 'bg-[#FF7A1A] text-white shadow-lg ring-4 ring-[#FF7A1A]/20 animate-pulse'
                                : 'border-2 border-slate-300 bg-white text-slate-400 group-hover:border-slate-400'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-5 w-5 stroke-[2.5]" />
                            ) : (
                              <StageIcon className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {/* Label & Description */}
                        <div className="mt-3 text-center">
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent
                                ? 'text-[#EA6C13]'
                                : isCompleted
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {stage.shortLabel}
                          </p>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {isCurrent
                              ? 'In Progress'
                              : isCompleted
                              ? 'Done'
                              : `Step ${idx + 1}`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          ) : (
            /* VERTICAL STEPPER VIEW */
            <div className="py-2" data-testid="vertical-stepper">
              <ol className="relative ml-4 space-y-6 border-l-2 border-slate-200">
                {PHYSICAL_STAGES.map((stage, idx) => {
                  const StageIcon = stage.icon;
                  const isCompleted = isTerminalDelivered || idx < resolvedActiveIndex;
                  const isCurrent = !isTerminalDelivered && idx === resolvedActiveIndex;
                  const isPending = !isTerminalDelivered && idx > resolvedActiveIndex;

                  return (
                    <li
                      key={stage.key}
                      className="ml-6 group cursor-pointer"
                      onClick={() => setSelectedStageIndex(idx)}
                      data-testid={`stepper-stage-${stage.key}`}
                    >
                      {/* Node circle on left border */}
                      <span className="absolute -left-4 flex items-center justify-center">
                        {isCurrent && (
                          <span
                            className="absolute -inset-1.5 rounded-full bg-[#FF7A1A]/30 animate-ping opacity-75"
                            data-testid="active-pulse-indicator"
                          />
                        )}
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isCurrent
                              ? 'bg-[#FF7A1A] text-white ring-4 ring-[#FF7A1A]/20 shadow-md animate-pulse'
                              : 'border-2 border-slate-300 bg-white text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[2.5]" />
                          ) : (
                            <StageIcon className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </span>

                      <div
                        className={`rounded-2xl p-3 transition-colors ${
                          isCurrent
                            ? 'bg-orange-50/70 border border-orange-200/80'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-sm font-bold ${
                              isCurrent
                                ? 'text-[#EA6C13]'
                                : isCompleted
                                ? 'text-slate-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {stage.label}
                          </h4>
                          {isCurrent && (
                            <Badge variant="vendora-platform" size="sm">
                              Active Stage
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="in-stock" size="sm">
                              Completed
                            </Badge>
                          )}
                          {isPending && (
                            <span className="text-[11px] text-slate-400">Upcoming</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{stage.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Focused Stage Details Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Selected Stage Inspection:
              </span>
              <span className="text-xs font-bold text-slate-800">
                {highlightStageText(highlightedStage, resolvedActiveIndex, isTerminalDelivered)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{highlightedStage.description}</p>
          </div>

          {/* RIDER ASSIGNMENT & SIMULATED DELIVERY CODE CARDS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Delivery Rider Assignment Badge */}
            <div
              className="flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-xs"
              data-testid="rider-assignment-card"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <Bike className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Assigned Courier
                  </span>
                  <Badge variant="in-stock" size="sm">
                    {subOrder.riderId ? 'Assigned' : 'Vendora Logistics'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm font-extrabold text-slate-900 truncate">
                  {subOrder.riderId
                    ? `Express Courier (${subOrder.riderId})`
                    : 'Sam Express · Urban Courier #842'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentStatus === 'out_for_delivery'
                    ? 'Rider is currently on route to your delivery address.'
                    : currentStatus === 'delivered'
                    ? 'Delivered safely by rider.'
                    : 'Assigned for dispatch when order is ready.'}
                </p>
              </div>
            </div>

            {/* Simulated Delivery Code Display */}
            <div
              className="flex flex-col justify-between rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50/90 to-amber-50/60 p-4 shadow-xs"
              data-testid="delivery-code-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#FF7A1A]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Delivery Verification PIN
                  </span>
                </div>
                <Badge variant="vendora-platform" size="sm">
                  4-Digit OTP
                </Badge>
              </div>

              <p className="mt-1 text-[11px] text-slate-600">
                Share this PIN with the courier on delivery to complete receipt verification.
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" data-testid="delivery-code-digits">
                  {deliveryDigits.map((digit, i) => (
                    <span
                      key={i}
                      className="flex h-10 w-8 items-center justify-center rounded-xl border border-orange-200 bg-white font-mono text-lg font-black text-slate-900 shadow-xs"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDeliveryCode}
                  className="gap-1.5 bg-white text-xs font-bold"
                  data-testid="copy-delivery-code-button"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy PIN</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Timestamped Event Log */}
      <div className="border-t border-slate-200/80 pt-5" data-testid="tracking-event-log">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Audit History & Event Log ({subOrder.history.length})</span>
          </h4>
          <span className="text-[11px] text-slate-400">Order ID: {subOrder.id}</span>
        </div>

        {subOrder.history.length === 0 ? (
          <p className="text-xs text-slate-400">No events recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {[...subOrder.history].reverse().map((event: TrackingEvent, index: number) => (
              <div
                key={`${event.status}-${index}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3.5 text-xs shadow-xs"
                data-testid={`event-log-entry-${index}`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {event.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <Badge variant="secondary" size="sm">
                      {event.actor}
                    </Badge>
                  </div>
                  {event.note && <p className="text-slate-600">{event.note}</p>}
                </div>
                <time className="shrink-0 font-mono text-[11px] text-slate-400">
                  {formatEventTimestamp(event.timestamp)}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function highlightStageText(
  stage: StageDefinition,
  activeIndex: number,
  isDelivered: boolean,
): string {
  const stageIdx = PHYSICAL_STAGES.findIndex((s) => s.key === stage.key);
  if (isDelivered || stageIdx < activeIndex) return `${stage.label} (Completed)`;
  if (stageIdx === activeIndex) return `${stage.label} (Current Active)`;
  return `${stage.label} (Pending)`;
}

export default TrackingTimeline;
