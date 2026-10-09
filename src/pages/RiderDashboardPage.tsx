import React, { useState, useMemo } from 'react';
import type { SubOrder, SubOrderStatus } from '../types/domain';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderHeader } from '../features/rider/components/RiderHeader';
import { HandoverVerificationModal } from '../features/rider/components/HandoverVerificationModal';
import {
  ReportIssueModal,
  type DeliveryIssueReason,
} from '../features/rider/components/ReportIssueModal';
import { mockDb } from '../mocks/db';
import { useAuthStore } from '../store/auth-store';
import { cn } from '../lib/utils';
import {
  Package,
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  RotateCcw,
  History,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Map as MapIcon,
  PhoneCall,
  ShieldAlert,
  Compass,
  Layers,
  Banknote,
  AlertCircle,
  Truck,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export interface RiderDeliveryItem extends SubOrder {
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  packageType?: string;
  pickupPhone?: string;
  deliveryNotes?: string;
  isCod?: boolean;
  codAmount?: number;
  pickupDistance?: string;
  pickupEta?: string;
  dropoffDistance?: string;
  dropoffEta?: string;
  deadline?: string;
  packageWeight?: string;
}

const DEFAULT_RIDER_DELIVERIES: RiderDeliveryItem[] = [
  {
    id: 'sub-98421-A',
    orderGroupId: 'ord-98421',
    sellerId: 'vendor-tech-1',
    sellerName: 'KeebCraft Studio',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-98421-1',
        productId: 'prod-vend-2',
        title: 'KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard',
        price: 159.0,
        quantity: 1,
        maxStock: 8,
        image:
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'KeebCraft Studio',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 159.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 11.13,
    netPayout: 147.87,
    status: 'ready_for_pickup',
    deliveryCode: '4921',
    pickupAddress: '120 Industrial Pkwy',
    dropoffAddress: '742 Evergreen Terrace, Apt 4B',
    customerName: 'Sarah Jenkins',
    customerPhone: '+1 (555) 234-5678',
    pickupPhone: '+1 (555) 880-9912',
    deliveryNotes: 'Security gate code #4920. Leave at door if resident is unavailable.',
    isCod: true,
    codAmount: 159.0,
    pickupDistance: '1.8 km',
    pickupEta: '6 min',
    dropoffDistance: '3.4 km',
    dropoffEta: '12 min',
    deadline: '6:30 PM',
    packageWeight: '1.6 kg',
    packageType: 'Standard Express Parcel',
    history: [
      {
        status: 'ready_for_pickup',
        timestamp: new Date().toISOString(),
        actor: 'Vendor',
        note: 'Staged at vendor loading bay',
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub-98422-A',
    orderGroupId: 'ord-98422',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-98422-1',
        productId: 'prod-vend-1',
        title: 'Aura Precision Studio Reference In-Ear Monitors',
        price: 189.0,
        quantity: 1,
        maxStock: 14,
        image:
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 189.0,
    shippingFee: 0.0,
    commissionRate: 0.07,
    commissionAmount: 13.23,
    netPayout: 175.77,
    status: 'shipped',
    deliveryCode: '7103',
    pickupAddress: '88 Audio Blvd, Bay 3',
    dropoffAddress: '1042 Ocean View Dr, Apt 12',
    customerName: 'Marcus Vance',
    customerPhone: '+1 (555) 876-5432',
    pickupPhone: '+1 (555) 321-4567',
    deliveryNotes: 'Deliver to 2nd floor concierge desk.',
    isCod: false,
    pickupDistance: '0.9 km',
    pickupEta: '3 min',
    dropoffDistance: '4.8 km',
    dropoffEta: '16 min',
    deadline: '7:15 PM',
    packageWeight: '0.9 kg',
    packageType: 'Fragile Electronics',
    history: [
      {
        status: 'shipped',
        timestamp: new Date().toISOString(),
        actor: 'Rider',
        note: 'Package picked up from merchant',
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub-98421-B',
    orderGroupId: 'ord-98421',
    sellerId: 'platform',
    sellerName: 'Vendora Flagship Hub',
    sellerType: 'platform',
    type: 'physical',
    items: [
      {
        id: 'item-98421-B-1',
        productId: 'prod-v-1',
        title: 'Vendora One Wireless ANC Flagship Headphones',
        price: 249.0,
        quantity: 1,
        maxStock: 25,
        image:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        sellerId: 'platform',
        sellerName: 'Vendora Flagship Hub',
        sellerType: 'platform',
        type: 'physical',
      },
    ],
    subtotal: 249.0,
    shippingFee: 0.0,
    commissionRate: 1.0,
    commissionAmount: 249.0,
    netPayout: 0,
    status: 'out_for_delivery',
    deliveryCode: '1942',
    pickupAddress: '250 Commerce Blvd, Suite 100',
    dropoffAddress: '550 Market St, Floor 8',
    customerName: 'Elena Rostova',
    customerPhone: '+1 (555) 345-6789',
    pickupPhone: '+1 (555) 990-2211',
    deliveryNotes: 'Building elevator requires keycard. Call customer upon arrival.',
    isCod: false,
    pickupDistance: '2.5 km',
    pickupEta: '8 min',
    dropoffDistance: '2.1 km',
    dropoffEta: '7 min',
    deadline: '6:45 PM',
    packageWeight: '1.2 kg',
    packageType: 'Priority Parcel',
    history: [
      {
        status: 'out_for_delivery',
        timestamp: new Date().toISOString(),
        actor: 'Rider',
        note: 'On final delivery route to recipient',
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_HISTORY: RiderDeliveryItem[] = [
  {
    id: 'sub-98410-Z',
    orderGroupId: 'ord-98410',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-98410-1',
        productId: 'prod-vend-1',
        title: 'Aura Studio Monitors',
        price: 189.0,
        quantity: 1,
        maxStock: 5,
        image:
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 189.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 13.23,
    netPayout: 175.77,
    status: 'delivered',
    deliveryCode: '1092',
    pickupAddress: '88 Audio Blvd',
    dropoffAddress: '1240 University Ave, Apt 3',
    customerName: 'David Kim',
    customerPhone: '+1 (555) 901-2345',
    packageType: 'Delivered Parcel',
    history: [
      {
        status: 'delivered',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        actor: 'Rider',
        note: 'Handover verified with PIN 1092',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

function resolveInitialDeliveries(): RiderDeliveryItem[] {
  const activePhysicalFromDb = mockDb.subOrders.filter(
    (so) =>
      so.type === 'physical' &&
      ['ready_for_pickup', 'shipped', 'out_for_delivery'].includes(so.status)
  );

  if (activePhysicalFromDb.length > 0) {
    return activePhysicalFromDb.map((so) => {
      const orderGroup = mockDb.orderGroups.find((og) => og.id === so.orderGroupId);
      const sellerId = so.sellerId;
      const pickupAddress =
        sellerId === 'platform'
          ? '250 Commerce Blvd, Suite 100'
          : sellerId === 'vendor-tech-1'
          ? '120 Industrial Pkwy'
          : '88 Audio Blvd, Bay 3';

      const customerName =
        orderGroup?.shippingAddress?.fullName || 'Sarah Jenkins';
      const dropoffAddress =
        orderGroup?.shippingAddress?.street || '742 Evergreen Terrace, Apt 4B';
      const customerPhone =
        orderGroup?.shippingAddress?.phone || '+1 (555) 234-5678';

      return {
        ...so,
        pickupAddress,
        dropoffAddress,
        customerName,
        customerPhone,
        pickupPhone: '+1 (555) 880-9912',
        deliveryNotes: 'Security gate code #4920. Leave at door if resident is unavailable.',
        isCod: so.id.endsWith('A'),
        codAmount: so.subtotal,
        pickupDistance: '1.8 km',
        pickupEta: '6 min',
        dropoffDistance: '3.4 km',
        dropoffEta: '12 min',
        deadline: '6:30 PM',
        packageWeight: '1.5 kg',
        packageType: so.sellerType === 'platform' ? 'Platform Express' : 'Vendor Parcel',
        deliveryCode: so.deliveryCode || '4921',
      };
    });
  }

  return DEFAULT_RIDER_DELIVERIES;
}

export const RiderDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'map' | 'history'>('queue');

  // Sub-orders state
  const [deliveries, setDeliveries] = useState<RiderDeliveryItem[]>(resolveInitialDeliveries);
  const [historyItems, setHistoryItems] = useState<RiderDeliveryItem[]>(INITIAL_HISTORY);

  // Performance stats (initial baseline: 8 completed, $64.00, 98.5%)
  const [completedCount, setCompletedCount] = useState(8);
  const [earningsToday, setEarningsToday] = useState(64.0);
  const onTimeRate = '98.5%';

  // Modal control states
  const [handoverModalOrder, setHandoverModalOrder] = useState<RiderDeliveryItem | null>(null);
  const [issueModalOrder, setIssueModalOrder] = useState<RiderDeliveryItem | null>(null);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Filter deliveries that are currently active
  const activeDeliveries = useMemo(() => {
    return deliveries.filter((d) =>
      ['ready_for_pickup', 'shipped', 'out_for_delivery'].includes(d.status)
    );
  }, [deliveries]);

  // Synchronize status update to mockDb if the item exists there
  const syncToMockDb = (subOrderId: string, nextStatus: SubOrderStatus, note?: string) => {
    try {
      const dbMatch = mockDb.subOrders.find((so) => so.id === subOrderId);
      if (dbMatch) {
        mockDb.updateSubOrderStatus(subOrderId, nextStatus, 'Rider', note);
      }
    } catch {
      // Ignore mockDb synchronization error in demo/isolated test environments
    }
  };

  // Progressive Action Button handler
  const handleProgressiveAction = (delivery: RiderDeliveryItem) => {
    if (delivery.status === 'ready_for_pickup') {
      // 1. Advance to 'shipped'
      const updated: RiderDeliveryItem = {
        ...delivery,
        status: 'shipped',
        history: [
          ...delivery.history,
          {
            status: 'shipped',
            timestamp: new Date().toISOString(),
            actor: 'Rider',
            note: 'Picked up from vendor location',
          },
        ],
      };
      setDeliveries((prev) => prev.map((item) => (item.id === delivery.id ? updated : item)));
      syncToMockDb(delivery.id, 'shipped', 'Picked up from vendor location');
      showToast(`Package #${delivery.id} confirmed picked up! Route active.`);
    } else if (delivery.status === 'shipped') {
      // 2. Advance to 'out_for_delivery'
      const updated: RiderDeliveryItem = {
        ...delivery,
        status: 'out_for_delivery',
        history: [
          ...delivery.history,
          {
            status: 'out_for_delivery',
            timestamp: new Date().toISOString(),
            actor: 'Rider',
            note: 'En route to customer dropoff destination',
          },
        ],
      };
      setDeliveries((prev) => prev.map((item) => (item.id === delivery.id ? updated : item)));
      syncToMockDb(delivery.id, 'out_for_delivery', 'En route to customer dropoff');
      showToast(`Started delivery route for #${delivery.id}!`);
    } else if (delivery.status === 'out_for_delivery') {
      // 3. Open Handover Verification PIN Modal
      setHandoverModalOrder(delivery);
    }
  };

  // Complete handover with verified PIN
  const handleVerifyHandover = async (enteredPin: string) => {
    if (!handoverModalOrder) return;

    const delivery = handoverModalOrder;
    const updated: RiderDeliveryItem = {
      ...delivery,
      status: 'delivered',
      history: [
        ...delivery.history,
        {
          status: 'delivered',
          timestamp: new Date().toISOString(),
          actor: 'Rider',
          note: `Handover verified with PIN ${enteredPin}`,
        },
      ],
    };

    // Remove from active queue & append to history
    setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
    setHistoryItems((prev) => [updated, ...prev]);
    setCompletedCount((prev) => prev + 1);
    setEarningsToday((prev) => Math.round((prev + 8.0) * 100) / 100);

    syncToMockDb(delivery.id, 'delivered', `Handover verified with PIN ${enteredPin}`);
    showToast(`Sub-order ${delivery.id} successfully delivered! +$8.00 earned.`);
  };

  // Report delivery issue / exception
  const handleReportIssue = async (data: { reason: DeliveryIssueReason; notes: string }) => {
    if (!issueModalOrder) return;

    const delivery = issueModalOrder;
    const updated: RiderDeliveryItem = {
      ...delivery,
      status: 'delivery_failed',
      history: [
        ...delivery.history,
        {
          status: 'delivery_failed',
          timestamp: new Date().toISOString(),
          actor: 'Rider',
          note: `Delivery failed: ${data.reason}. ${data.notes}`,
        },
      ],
    };

    setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
    setHistoryItems((prev) => [updated, ...prev]);
    syncToMockDb(delivery.id, 'delivery_failed', `${data.reason}: ${data.notes}`);
    showToast(`Delivery exception logged for ${delivery.id}: ${data.reason}`);
  };

  // Safe reset deliveries handler
  const handleResetDeliveries = () => {
    setDeliveries(resolveInitialDeliveries());
    setIsResetConfirmOpen(false);
    showToast('Reset delivery queue to initial assignments.');
  };

  const getStatusBadge = (status: SubOrderStatus) => {
    switch (status) {
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Ready for Pickup
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 shadow-2xs">
            <Package className="h-3.5 w-3.5 text-sky-600" />
            Picked Up / In Transit
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 shadow-2xs animate-pulse">
            <Navigation className="h-3.5 w-3.5 text-purple-600" />
            Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Delivered
          </span>
        );
      case 'delivery_failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Delivery Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDisplayId = (id: string) => {
    if (id.startsWith('#')) return id;
    return `#${id.toUpperCase()}`;
  };

  return (
    <WorkspaceLayout
      role="rider"
      roleBadgeText="DELIVERY RIDER"
      title="Delivery Rider Workspace"
      subtitle="Mobile dispatch cockpit, turn-by-turn routing, and customer handover"
    >
      <div className="w-full space-y-4 sm:space-y-6 pb-24 sm:pb-16">
        {/* Rider Top Header Bar */}
        <RiderHeader
          isOnline={isOnline}
          onToggleShift={(online) => setIsOnline(online)}
          vehicleType="motorcycle"
          vehicleLabel="Honda CB125 Express"
          activeDeliveries={activeDeliveries.length}
          riderName={user?.name || 'Sam Express Rider'}
          isGpsActive={isGpsActive}
          onToggleGps={() => setIsGpsActive(!isGpsActive)}
          onEmergencySos={() => setIsSosModalOpen(true)}
        />

        {/* GPS Inactive Warning Banner */}
        {!isGpsActive && (
          <div
            role="alert"
            data-testid="gps-alert-banner"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 text-xs font-medium text-rose-950 shadow-md animate-in fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-rose-900 text-sm">GPS Tracking Disconnected</p>
                <p className="text-rose-700">
                  Live location cannot be verified by dispatch or recipient. Please ensure device location is enabled.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsGpsActive(true);
                showToast('GPS Signal Re-established! Location streaming active.');
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
            >
              Reconnect GPS
            </button>
          </div>
        )}

        {/* Shift Offline Warning Banner */}
        {!isOnline && (
          <div
            data-testid="offline-banner"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-300/90 bg-amber-50/95 p-4 text-xs font-medium text-amber-900 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                You are currently offline. New incoming delivery assignments are paused.
                You can still complete active assigned packages.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOnline(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Go Online
            </button>
          </div>
        )}

        {/* =========================================================================
            Performance Stats: Ergonomic 2x2 Grid on Mobile with Earnings Prioritized
            ========================================================================= */}
        <section
          aria-label="Today's Performance Stats"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4"
        >
          {/* 1. Earnings Today (Prioritized #1) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Earnings Today
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-[#EA6C13]">
                <DollarSign className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                data-testid="stat-earnings"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                ${earningsToday.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-emerald-600">
              Avg. $8.00 / dropoff
            </div>
          </div>

          {/* 2. Completed Deliveries with Daily Progress Bar */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Completed
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                data-testid="stat-completed"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                {completedCount}
              </span>
              <span className="text-xs text-slate-500">orders</span>
            </div>
            {/* Daily Target Progress Bar */}
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>Target: 10 daily</span>
                <span className="font-bold text-slate-800">{completedCount}/10</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min((completedCount / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. On-Time Rate */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                On-Time Rate
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                data-testid="stat-ontime"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                {onTimeRate}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Top Tier Rider (Today)</span>
            </div>
          </div>

          {/* 4. Active Assigned */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Queue
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                data-testid="stat-active"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                {activeDeliveries.length}
              </span>
              <span className="text-xs text-slate-500">in queue</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              {activeDeliveries.length > 0 ? 'Suggested route order' : 'Queue clear'}
            </div>
          </div>
        </section>

        {/* =========================================================================
            Queue, Route Map & History Segmented Switcher
            ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
            {/* Active Queue Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none',
                activeTab === 'queue'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Package className="h-4 w-4" />
              <span>Active Queue</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px]',
                  activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                )}
              >
                {activeDeliveries.length}
              </span>
            </button>

            {/* Live Route Map Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none',
                activeTab === 'map'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <MapIcon className="h-4 w-4 text-[#00B8C8]" />
              <span>Route Map</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-800">
                LIVE
              </span>
            </button>

            {/* Completed History Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none',
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <History className="h-4 w-4" />
              <span>Completed History</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px]',
                  activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                )}
              >
                {historyItems.length}
              </span>
            </button>
          </div>

          {/* Reset Queue Button (Protected with modal) */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            title="Reset demo active assignments (Dev Tool)"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 font-medium transition-colors cursor-pointer px-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Queue</span>
          </button>
        </div>

        {/* =========================================================================
            Active Deliveries Queue Tab Content
            ========================================================================= */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {activeDeliveries.length === 0 ? (
              /* Empty State */
              <div
                data-testid="empty-queue"
                className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 shadow-xs">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  All deliveries completed! Take a break or wait for new assignments
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md">
                  Great job clearing the active queue today. New orders will automatically appear
                  here once vendors confirm package readiness.
                </p>
                <button
                  type="button"
                  onClick={handleResetDeliveries}
                  className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#FF7A1A] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#EA6C13] transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Load Sample Assignments
                </button>
              </div>
            ) : (
              /* Active Delivery Cards List */
              <div className="space-y-4">
                {activeDeliveries.map((delivery, index) => {
                  const getActionButtonText = () => {
                    switch (delivery.status) {
                      case 'ready_for_pickup':
                        return 'Confirm Package Picked Up from Vendor';
                      case 'shipped':
                        return 'Start Delivery Route';
                      case 'out_for_delivery':
                        return 'Confirm Customer Handover';
                      default:
                        return 'Action Completed';
                    }
                  };

                  const formattedSubOrderId = formatDisplayId(delivery.id);

                  return (
                    <article
                      key={delivery.id}
                      data-testid={`delivery-card-${delivery.id}`}
                      className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all hover:shadow-md"
                    >
                      {/* Card Header: Stop Priority, Sub-Order ID, Badges, and Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 p-3.5 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-black text-xs">
                            {index + 1}
                          </span>
                          <span
                            data-testid="sub-order-id"
                            className="font-mono text-sm sm:text-base font-black text-slate-900 tracking-tight"
                          >
                            {formattedSubOrderId}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            <Package className="h-3 w-3 text-slate-500" />
                            <span>{delivery.packageType || 'Physical Parcel'}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {delivery.deadline && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              By {delivery.deadline}
                            </span>
                          )}
                          {getStatusBadge(delivery.status)}
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 space-y-4">
                        {/* Cash on Delivery (COD) Notice Banner if applicable */}
                        {delivery.isCod && (
                          <div className="flex items-center justify-between rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-3 sm:p-4 text-xs font-bold text-amber-950 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <Banknote className="h-5 w-5 text-amber-600 shrink-0" />
                              <div>
                                <span className="uppercase tracking-wider text-[10px] text-amber-800 font-extrabold block">
                                  Cash on Delivery (COD)
                                </span>
                                <span>Collect from customer before handover PIN:</span>
                              </div>
                            </div>
                            <span className="font-mono text-base font-black text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-xl">
                              ${delivery.codAmount?.toFixed(2) || delivery.subtotal.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* =============================================================
                            Route Stops: Stacked Vertically on Mobile (Stop 1 then Stop 2)
                            ============================================================= */}
                        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                          {/* 1. Stop 1: Vendor Pickup */}
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                Stop 1 • Vendor Pickup
                              </span>
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                {delivery.pickupDistance || '1.8 km'} • {delivery.pickupEta || '6 min'}
                              </span>
                            </div>

                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {delivery.sellerName}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                {delivery.pickupAddress}
                              </div>
                            </div>

                            {/* Large Touch Action Targets (Min 44px) */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-200/60">
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(`Opening turn-by-turn map navigation to ${delivery.pickupAddress}...`)
                                }
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-[#00B8C8] shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                              >
                                <Navigation className="h-4 w-4" />
                                <span>Navigate to Pickup</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </button>

                              <a
                                href={`tel:${delivery.pickupPhone || '+15558809912'}`}
                                onClick={(e) => {
                                  if (typeof window !== 'undefined' && !window.navigator?.userAgent?.includes('Mobi')) {
                                    e.preventDefault();
                                    showToast(`Calling vendor: ${delivery.pickupPhone || '+1 (555) 880-9912'}`);
                                  }
                                }}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
                              >
                                <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
                                <span>Call Vendor</span>
                              </a>
                            </div>
                          </div>

                          {/* 2. Stop 2: Customer Dropoff */}
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                Stop 2 • Customer Dropoff
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                {delivery.dropoffDistance || '3.4 km'} • {delivery.dropoffEta || '12 min'}
                              </span>
                            </div>

                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {delivery.customerName}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                {delivery.dropoffAddress}
                              </div>
                              {delivery.deliveryNotes && (
                                <div className="mt-2 text-[11px] bg-white rounded-lg p-2 border border-slate-200/70 text-slate-600">
                                  <span className="font-bold text-slate-700">Note: </span>
                                  {delivery.deliveryNotes}
                                </div>
                              )}
                            </div>

                            {/* Large Touch Action Targets (Min 44px) */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-200/60">
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(`Opening turn-by-turn navigation to ${delivery.dropoffAddress}...`)
                                }
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                              >
                                <Navigation className="h-4 w-4" />
                                <span>Navigate to Dropoff</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </button>

                              <a
                                href={`tel:${delivery.customerPhone}`}
                                onClick={(e) => {
                                  if (typeof window !== 'undefined' && !window.navigator?.userAgent?.includes('Mobi')) {
                                    e.preventDefault();
                                    showToast(`Calling customer: ${delivery.customerPhone}`);
                                  }
                                }}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                              >
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Call Customer</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Package Contents Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <span>
                              Package Contents ({delivery.items.length}{' '}
                              {delivery.items.length === 1 ? 'item' : 'items'})
                            </span>
                            {delivery.packageWeight && (
                              <span className="text-slate-500 font-medium">
                                Weight: {delivery.packageWeight}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {delivery.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 pr-3.5 shadow-2xs"
                              >
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="h-10 w-10 rounded-xl object-cover border border-slate-100"
                                />
                                <div>
                                  <div className="text-xs font-semibold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-[280px]">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    Qty: {item.quantity} • ${item.price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* =============================================================
                            Card Actions: Progressive Thumb-Friendly Action Button + Report Issue
                            ============================================================= */}
                        <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                          {/* Main Full-Width Progressive Delivery Action Button (Min 48px Height) */}
                          <button
                            type="button"
                            onClick={() => handleProgressiveAction(delivery)}
                            className={cn(
                              'inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm sm:text-base font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer',
                              delivery.status === 'ready_for_pickup'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                : delivery.status === 'shipped'
                                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                                : 'bg-[#FF7A1A] hover:bg-[#EA6C13] text-white shadow-orange-500/25'
                            )}
                          >
                            <span>{getActionButtonText()}</span>
                            <ChevronRight className="h-5 w-5" />
                          </button>

                          {/* Secondary: Report Delivery Issue */}
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setIssueModalOrder(delivery)}
                              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all cursor-pointer"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Report Issue</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            Live Route Map Tab Content
            ========================================================================= */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Compass className="h-5 w-5 text-[#00B8C8]" />
                    Optimized Multi-Stop Delivery Route
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live GPS waypoint routing calculated based on current traffic and parcel SLA
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold">
                    Total: 9.8 km • ~32 mins
                  </span>
                </div>
              </div>

              {/* Simulated Visual Route Canvas */}
              <div className="relative h-64 sm:h-80 w-full rounded-2xl bg-slate-900 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                {/* Simulated Map Elements */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="h-full w-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="rounded-xl bg-slate-800/90 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white flex items-center gap-2 border border-slate-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Current Position: 4th Ave & Main St</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Connecting to GPS satellite lock... Accuracy +/- 3m.')}
                    className="rounded-xl bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700"
                  >
                    Center My Location
                  </button>
                </div>

                {/* Waypoint nodes representation */}
                <div className="relative z-10 flex items-center justify-around py-4">
                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                      Rider
                    </div>
                    <span className="text-[10px] text-slate-300 font-semibold mt-1">You</span>
                  </div>

                  <div className="h-0.5 w-16 sm:w-24 bg-gradient-to-r from-blue-500 to-amber-500" />

                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                      1
                    </div>
                    <span className="text-[10px] text-slate-300 font-semibold mt-1">Vendor Bay</span>
                  </div>

                  <div className="h-0.5 w-16 sm:w-24 bg-gradient-to-r from-amber-500 to-emerald-500" />

                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                      2
                    </div>
                    <span className="text-[10px] text-slate-300 font-semibold mt-1">Dropoff 1</span>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Routing Engine: OpenStreetMap / OSRM Live
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast('Launching external Google Maps Navigation app...')}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#FF7A1A] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#EA6C13]"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>Launch Full GPS App</span>
                  </button>
                </div>
              </div>

              {/* Waypoint Steps Accordion */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Next Waypoint Instructions
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold">
                        1
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Head to KeebCraft Studio</div>
                        <div className="text-[11px] text-slate-500">120 Industrial Pkwy • Bay 2</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-700">1.8 km (6 min)</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                        2
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Deliver to Sarah Jenkins</div>
                        <div className="text-[11px] text-slate-500">742 Evergreen Terrace, Apt 4B</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-700">3.4 km (12 min)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            Completed Deliveries History Tab Content
            ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No delivery history recorded today yet.
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        item.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      )}
                    >
                      {item.status === 'delivered' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatDisplayId(item.id)}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        To {item.customerName} • {item.dropoffAddress}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                    <span className="font-bold text-emerald-700">+$8.00 payout</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(
                        item.history[item.history.length - 1]?.timestamp || item.createdAt
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          Mobile Bottom Navigation Bar (Fixed for Street / Bike Riding)
          ========================================================================= */}
      <nav
        aria-label="Mobile rider actions"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-xl px-2 py-2 sm:hidden shadow-lg"
      >
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
            activeTab === 'queue' ? 'text-slate-900 font-bold' : 'text-slate-400'
          )}
        >
          <div className="relative">
            <Package className="h-5 w-5" />
            {activeDeliveries.length > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF7A1A] text-[9px] font-bold text-white">
                {activeDeliveries.length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
            activeTab === 'map' ? 'text-[#00B8C8] font-bold' : 'text-slate-400'
          )}
        >
          <MapIcon className="h-5 w-5" />
          <span className="text-[10px]">Map</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
            activeTab === 'history' ? 'text-slate-900 font-bold' : 'text-slate-400'
          )}
        >
          <History className="h-5 w-5" />
          <span className="text-[10px]">History</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSosModalOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 font-bold"
        >
          <ShieldAlert className="h-5 w-5 animate-pulse" />
          <span className="text-[10px]">SOS</span>
        </button>
      </nav>

      {/* =========================================================================
          SOS / Emergency Dispatch Modal
          ========================================================================= */}
      <Dialog open={isSosModalOpen} onOpenChange={setIsSosModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center sm:text-center items-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-black text-rose-950">
              Rider Emergency & Dispatch SOS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 max-w-xs mx-auto">
              Direct emergency line to platform dispatchers and roadside assistance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <a
              href="tel:+18005557433"
              onClick={() => showToast('Connecting call to Dispatcher Emergency Desk...')}
              className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-rose-300 bg-rose-50/70 hover:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white font-bold">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-rose-950">Dispatcher Hot-Line</div>
                  <div className="text-[11px] text-rose-700">Priority call line • 24/7 Live Desk</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-500" />
            </a>

            <button
              type="button"
              onClick={() => {
                setIsSosModalOpen(false);
                showToast('Roadside breakdown report transmitted to fleet operations.');
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white font-bold">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Roadside Mechanical Help</div>
                  <div className="text-[11px] text-slate-500">Puncture, battery failure, or collision</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSosModalOpen(false)}
              className="w-full rounded-full min-h-[44px]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Reset Confirmation Modal (Protects against accidental wiping on road)
          ========================================================================= */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center sm:text-center items-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <RotateCcw className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Reset Active Deliveries?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 max-w-xs mx-auto">
              This will restore all sample packages back to the initial queue. Use this only for demo or testing.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetConfirmOpen(false)}
              className="w-full sm:w-auto rounded-full order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetDeliveries}
              className="w-full sm:w-auto rounded-full min-h-[44px] order-1 sm:order-2"
            >
              Yes, Reset Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover Verification Modal */}
      {handoverModalOrder && (
        <HandoverVerificationModal
          isOpen={!!handoverModalOrder}
          onClose={() => setHandoverModalOrder(null)}
          expectedCode={handoverModalOrder.deliveryCode || '4921'}
          subOrderId={formatDisplayId(handoverModalOrder.id)}
          customerName={handoverModalOrder.customerName}
          onVerify={handleVerifyHandover}
        />
      )}

      {/* Report Issue Modal */}
      {issueModalOrder && (
        <ReportIssueModal
          isOpen={!!issueModalOrder}
          onClose={() => setIssueModalOrder(null)}
          subOrderId={formatDisplayId(issueModalOrder.id)}
          customerName={issueModalOrder.customerName}
          onSubmit={handleReportIssue}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          data-testid="rider-toast"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm"
        >
          <Sparkles className="h-4 w-4 text-[#FF7A1A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </WorkspaceLayout>
  );
};
