import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  Crosshair,
  FileText,
  ShieldCheck,
  Clock,
  Bike,
  MapPin,
  Phone,
  MessageSquare,
  Share2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Zap,
  AlertCircle,
  Headphones,
  Mail,
  Copy,
  Check,
  Navigation,
  Compass,
  Barcode,
  Send,
  MessageCircle,
} from 'lucide-react';


import { useToast } from '../hooks/useToast';

import { Toast } from '../components/common/Toast';


// Order Tracking Models
interface TrackingMilestone {
  stage: string;
  title: string;
  description: string;
  status: 'completed' | 'in_transit' | 'pending';
}

interface TrackedOrderData {
  orderId: string;
  trackingNumber: string;
  carrierName: string;
  dispatchBadge: string;
  carrierBadge: string;
  originHub: string;
  destination: string;
  estimatedDelivery: string;
  itemTitle: string;
  itemQty: number;
  sellerName: string;
  itemImage: string;
  price: number;
  rider: {
    name: string;
    id: string;
    avatar: string;
    phone: string;
    distance: string;
    speed: string;
    verified: boolean;
  };
  otp: string;
  milestones: TrackingMilestone[];
}

const PRESET_ORDERS: Record<string, TrackedOrderData> = {
  'VEN-002410-PK': {
    orderId: 'VEN-948210',
    trackingNumber: 'VEN-002410-PK',
    carrierName: 'Vendora Express (3–6h)',
    dispatchBadge: '3-Hour Express Dispatch',
    carrierBadge: 'Carrier: SpeedXpert Local',
    originHub: 'Hub 04 Nazimabad, Karachi',
    destination: 'Gulshan Block 4, KHI',
    estimatedDelivery: 'Today by 3:45 PM',
    itemTitle: 'Cyan 8 – 4075 10,000mAh Power Bank + Dopplers TWS Earbuds',
    itemQty: 2,
    sellerName: 'Doppler Authorized Official Store',
    itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    price: 153.5,
    rider: {
      name: 'Arslan Khan',
      id: 'SpeedXpert Telemetry ID: 641',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      phone: '+92 312 9842109',
      distance: '2.1km away',
      speed: '27km/h',
      verified: true,
    },
    otp: '6492',
    milestones: [
      {
        stage: 'COMPLETED • 10:30 AM',
        title: 'Order Placed & Paid',
        description: 'Payment escrow verified on Vendora 2.4 treaty. Merchant acknowledged.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • 11:45 AM',
        title: 'Picked & Bubble Sealed',
        description: 'Inspected at Hub 04 Bay 4. Quality hologram applied.',
        status: 'completed',
      },
      {
        stage: 'IN TRANSIT • 01:15 PM',
        title: 'Out for Express Courier',
        description: 'Assigned to Express Rider Arslan. En route across Shahrah-e-Faisal.',
        status: 'in_transit',
      },
      {
        stage: 'PENDING STEP',
        title: 'Delivered to Doorstep',
        description: 'Requires customer OTP signature upon courier handoff for escrow release.',
        status: 'pending',
      },
    ],
  },
  'VEN-948210': {
    orderId: 'VEN-948210',
    trackingNumber: 'VEN-002410-PK',
    carrierName: 'Vendora Express (3–6h)',
    dispatchBadge: '3-Hour Express Dispatch',
    carrierBadge: 'Carrier: SpeedXpert Local',
    originHub: 'Hub 04 Nazimabad, Karachi',
    destination: 'Gulshan Block 4, KHI',
    estimatedDelivery: 'Today by 3:45 PM',
    itemTitle: 'Cyan 8 – 4075 10,000mAh Power Bank + Dopplers TWS Earbuds',
    itemQty: 2,
    sellerName: 'Doppler Authorized Official Store',
    itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    price: 153.5,
    rider: {
      name: 'Arslan Khan',
      id: 'SpeedXpert Telemetry ID: 641',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      phone: '+92 312 9842109',
      distance: '2.1km away',
      speed: '27km/h',
      verified: true,
    },
    otp: '6492',
    milestones: [
      {
        stage: 'COMPLETED • 10:30 AM',
        title: 'Order Placed & Paid',
        description: 'Payment escrow verified on Vendora 2.4 treaty. Merchant acknowledged.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • 11:45 AM',
        title: 'Picked & Bubble Sealed',
        description: 'Inspected at Hub 04 Bay 4. Quality hologram applied.',
        status: 'completed',
      },
      {
        stage: 'IN TRANSIT • 01:15 PM',
        title: 'Out for Express Courier',
        description: 'Assigned to Express Rider Arslan. En route across Shahrah-e-Faisal.',
        status: 'in_transit',
      },
      {
        stage: 'PENDING STEP',
        title: 'Delivered to Doorstep',
        description: 'Requires customer OTP signature upon courier handoff for escrow release.',
        status: 'pending',
      },
    ],
  },
  'VEN-441290': {
    orderId: 'VEN-441290',
    trackingNumber: 'VEN-441290',
    carrierName: 'TCS Overnight Air',
    dispatchBadge: 'Next-Day Air Dispatch',
    carrierBadge: 'Carrier: TCS Express Logistics',
    originHub: 'Lahore Central Gateway Hub',
    destination: 'F-7/2, Islamabad',
    estimatedDelivery: 'Delivered Yesterday at 2:15 PM',
    itemTitle: 'Sony WH-1000XM5 Wireless Headphones (Midnight Matte)',
    itemQty: 1,
    sellerName: 'Sony Global Hub',
    itemImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
    price: 298.0,
    rider: {
      name: 'Usman Tariq',
      id: 'TCS Rider ID: 1044',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      phone: '+92 300 1234567',
      distance: 'Delivered',
      speed: '0km/h',
      verified: true,
    },
    otp: '9180',
    milestones: [
      {
        stage: 'COMPLETED • OCT 10',
        title: 'Order Placed & Paid',
        description: 'Payment escrow verified on Vendora 2.4 treaty.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • OCT 10',
        title: 'Picked & Bubble Sealed',
        description: 'Quality inspected and manifest created.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • OCT 11',
        title: 'Out for Delivery',
        description: 'Courier rider delivered package.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • 02:15 PM',
        title: 'Delivered to Doorstep',
        description: 'Delivered with verified digital signature & OTP handshake.',
        status: 'completed',
      },
    ],
  },
  'TCS-771203-PK': {
    orderId: 'VEN-771203',
    trackingNumber: 'TCS-771203-PK',
    carrierName: 'TCS Air Freight',
    dispatchBadge: 'Priority Air Transit',
    carrierBadge: 'Carrier: TCS Air Network',
    originHub: 'Karachi Cargo Hub',
    destination: 'University Town, Peshawar',
    estimatedDelivery: 'Tomorrow by 12:00 PM',
    itemTitle: 'Apple AirPods Max Space Gray Spatial Audio Headphones',
    itemQty: 1,
    sellerName: 'Vendora Warehouse',
    itemImage: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&auto=format&fit=crop&q=80',
    price: 479.0,
    rider: {
      name: 'Farhan Ali',
      id: 'Air Freight Cargo Pilot ID: 882',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      phone: '+92 333 9988776',
      distance: '140km away',
      speed: 'Flight In Transit',
      verified: true,
    },
    otp: '3157',
    milestones: [
      {
        stage: 'COMPLETED • 08:00 AM',
        title: 'Order Placed & Paid',
        description: 'Payment escrow verified on Vendora 2.4 treaty.',
        status: 'completed',
      },
      {
        stage: 'COMPLETED • 10:30 AM',
        title: 'Picked & Bubble Sealed',
        description: 'Package sorted into Air Cargo Container PK-904.',
        status: 'completed',
      },
      {
        stage: 'IN TRANSIT • NOW',
        title: 'Air Transit Hub Transfer',
        description: 'En route via domestic cargo flight.',
        status: 'in_transit',
      },
      {
        stage: 'PENDING STEP',
        title: 'Delivered to Doorstep',
        description: 'Scheduled for doorstep delivery tomorrow morning.',
        status: 'pending',
      },
    ],
  },
};

export const TrackOrderPage: React.FC = () => {
  const { trackingNumber: paramTracking } = useParams();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  // Active Lookup Form States
  const [activeTab, setActiveTab] = useState<'awb' | 'order_id'>('awb');
  const [consignInput, setConsignInput] = useState<string>(
    paramTracking || searchParams.get('trk') || 'VEN-002410-PK',
  );
  const [selectedCarrier, setSelectedCarrier] = useState<string>('Vendora Express (3–6h)');
  const [currentOrder, setCurrentOrder] = useState<TrackedOrderData>(
    PRESET_ORDERS['VEN-002410-PK'],
  );

  // Live Telemetry simulated seconds counter
  const [secondsAgo, setSecondsAgo] = useState(42);

  // Doorstep Instructions modal toggle
  const [instructionsSent, setInstructionsSent] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // FAQ Accordion State (Item 0 open by default)
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Synchronize URL param if present
  useEffect(() => {
    if (paramTracking && PRESET_ORDERS[paramTracking]) {
      setConsignInput(paramTracking);
      setCurrentOrder(PRESET_ORDERS[paramTracking]);
    }
  }, [paramTracking]);

  // Telemetry timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 60 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = consignInput.trim();
    if (!query) {
      showToast('Please enter a tracking number or Order ID', 'error');
      return;
    }

    if (PRESET_ORDERS[query]) {
      setCurrentOrder(PRESET_ORDERS[query]);
      setSecondsAgo(12);
      showToast(`Tracking record loaded for ${query}`, 'success');
    } else {
      // Dynamically synthesize a live tracked package for any custom input
      const customOrder: TrackedOrderData = {
        orderId: query.startsWith('VEN-') ? query : `VEN-${query}`,
        trackingNumber: query,
        carrierName: selectedCarrier,
        dispatchBadge: '3-Hour Express Dispatch',
        carrierBadge: `Carrier: ${selectedCarrier}`,
        originHub: 'Hub 04 Nazimabad, Karachi',
        destination: 'Gulshan Block 4, KHI',
        estimatedDelivery: 'Today by 4:15 PM',
        itemTitle: 'Verified Marketplace Order Package (2 Items)',
        itemQty: 2,
        sellerName: 'Vendora Verified Merchants Hub',
        itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
        price: 89.0,
        rider: {
          name: 'Arslan Khan',
          id: 'SpeedXpert Telemetry ID: 641',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          phone: '+92 312 9842109',
          distance: '1.8km away',
          speed: '24km/h',
          verified: true,
        },
        otp: '4721',
        milestones: [
          {
            stage: 'COMPLETED • 10:30 AM',
            title: 'Order Placed & Paid',
            description: 'Payment escrow verified on Vendora 2.4 treaty.',
            status: 'completed',
          },
          {
            stage: 'COMPLETED • 11:45 AM',
            title: 'Picked & Bubble Sealed',
            description: 'Inspected at Hub 04 Bay 4. Quality hologram applied.',
            status: 'completed',
          },
          {
            stage: 'IN TRANSIT • ACTIVE',
            title: 'Out for Express Courier',
            description: `Courier rider en route with parcel ${query}.`,
            status: 'in_transit',
          },
          {
            stage: 'PENDING STEP',
            title: 'Delivered to Doorstep',
            description: 'Requires customer OTP signature upon courier handoff.',
            status: 'pending',
          },
        ],
      };
      setCurrentOrder(customOrder);
      setSecondsAgo(4);
      showToast(`Tracking synced for ${query}`, 'success');
    }
  };

  const handleSelectRecent = (key: string) => {
    setConsignInput(key);
    if (PRESET_ORDERS[key]) {
      setCurrentOrder(PRESET_ORDERS[key]);
      setSecondsAgo(8);
      showToast(`Switched tracking to ${key}`, 'info');
    }
  };

  const handleCopyOtp = () => {
    navigator.clipboard?.writeText(currentOrder.otp);
    setCopiedOtp(true);
    showToast(`Doorstep Delivery OTP (${currentOrder.otp}) copied to clipboard`, 'success');
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  const handleCallRider = () => {
    showToast(`Dialing Courier Rider ${currentOrder.rider.name} at ${currentOrder.rider.phone}...`, 'info');
  };

  const handleSendInstructions = () => {
    setInstructionsSent(true);
    showToast('Doorstep delivery gate access instructions sent to rider.', 'success');
    setTimeout(() => setInstructionsSent(false), 4000);
  };

  return (
    <div className="pb-12">
      {/* Toast notifications */}
      {toast && <Toast toast={toast} onDismiss={hideToast} />}

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
        
        {/* =========================================================================
            1. Breadcrumbs Strip
            ========================================================================= */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <Link to="/help" className="hover:text-sun-orange transition-colors">
            Care &amp; Support
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white">
            Track Your Order
          </span>
        </nav>

        {/* =========================================================================
            2. Hero Section
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/75 border border-white/80 dark:border-white/10 p-6 sm:p-8 shadow-[0_15px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl">
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-sun-orange-200/30 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-aqua-100/35 blur-[90px] pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-2.5">
            <h1 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Real-Time Package Dispatch &amp; Live Carrier Tracking
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Track your multi-vendor parcel with sub-minute telemetry, rider sync, and escrow status.
            </p>
          </div>
        </div>

        {/* =========================================================================
            3. Search / Lookup Form Box (Floating Frosted Card)
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-5 sm:p-7 shadow-[0_15px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl space-y-5">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-sun-orange-200/25 blur-[90px] pointer-events-none" />
          <div className="relative z-10 space-y-5">
            {/* Top Toggle Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/10 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('awb')}
              aria-pressed={activeTab === 'awb'}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'awb'
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>Tracking Number / AWB</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('order_id')}
              aria-pressed={activeTab === 'order_id'}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'order_id'
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Order ID + Mobile/Email</span>
            </button>
          </div>

          {/* Input Lookup Form */}
          <form onSubmit={handleTrackSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-end">
            {/* Consignment ID Input */}
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="consign-id" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activeTab === 'awb' ? 'CONSIGNMENT / BATCH ID' : 'ORDER ID (VEN-XXXXXX)'}
              </label>
              <div className="relative flex items-center">
                <input
                  id="consign-id"
                  type="text"
                  value={consignInput}
                  onChange={(e) => setConsignInput(e.target.value)}
                  placeholder={activeTab === 'awb' ? 'e.g. VEN-002410-PK' : 'e.g. VEN-948210'}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sun-orange focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Courier Carrier Select */}
            <div className="md:col-span-4 space-y-1.5">
              <label htmlFor="carrier-select" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                COURIER / HUB CARRIER
              </label>
              <div className="relative">
                <select
                  id="carrier-select"
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-sun-orange focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all cursor-pointer shadow-inner pr-10"
                >
                  <option value="Vendora Express (3–6h)">Vendora Express (3–6h)</option>
                  <option value="SpeedXpert Local">SpeedXpert Local City</option>
                  <option value="TCS Overnight Air">TCS Overnight Air Freight</option>
                  <option value="Leopards Courier Ground">Leopards Courier Ground</option>
                  <option value="DHL Express Global">DHL Express Global Hub</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sun-orange to-[#EA580C] px-5 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 hover:from-[#EA580C] hover:to-sun-orange-700 transition-all cursor-pointer hover:shadow-orange-500/35 active:scale-[0.98]"
              >
                <span>Track Package Now</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Bottom Recent Queries Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Recent verified queries:</span>
            {['VEN-948210', 'VEN-441290', 'TCS-771203-PK'].map((key) => {
              const label =
                key === 'VEN-948210'
                  ? '#VEN-948210 (In Transit)'
                  : key === 'VEN-441290'
                  ? '#VEN-441290 (Delivered)'
                  : `#TCS-771203-PK`;
              const isSelected = currentOrder.orderId === key || currentOrder.trackingNumber === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectRecent(key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-100 text-sun-orange border border-orange-300 dark:bg-orange-950/60 dark:border-orange-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-sun-orange border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

        {/* =========================================================================
            4. Active Tracked Package Card (Card with Order Info, Milestones, Telemetry)
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-5 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] space-y-7">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sun-orange-200/25 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-aqua-100/30 blur-[110px] pointer-events-none" />
          <div className="relative z-10 space-y-7">
          {/* Header Bar: Order Number, Dispatch Badges & Estimated Delivery */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Order #{currentOrder.orderId}
                </h2>
                <span className="rounded-full bg-orange-100 text-sun-orange border border-orange-200 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                  {currentOrder.dispatchBadge}
                </span>
                <span className="rounded-full bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                  {currentOrder.carrierBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatched via Vendora Fulfilled Regional Hub North ({currentOrder.originHub}) to {currentOrder.destination}
              </p>
            </div>

            {/* Estimated Delivery Box */}
            <div className="flex items-center gap-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/30 px-4 py-2.5 self-start md:self-auto">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-orange text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  ESTIMATED DELIVERY
                </span>
                <span className="font-outfit text-sm sm:text-base font-extrabold text-sun-orange">
                  {currentOrder.estimatedDelivery}
                </span>
              </div>
            </div>
          </div>

          {/* Product Items Summary Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 p-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentOrder.itemImage}
                alt={currentOrder.itemTitle}
                className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-xs"
              />
              <div className="space-y-0.5">
                <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {currentOrder.itemTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Qty: {currentOrder.itemQty} items • Sold by:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{currentOrder.sellerName}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons: View Invoice, Share Link, Merchant Chat */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
              <Link
                to={`/orders/${currentOrder.orderId}/invoice`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:text-sun-orange transition-all"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>View Invoice</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast('Tracking link copied to clipboard', 'info');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:text-sun-orange transition-all cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Link</span>
              </button>
              <Link
                to="/customer/messages"
                className="inline-flex items-center gap-1.5 rounded-full bg-sun-orange px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-sun-orange-600 transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Merchant Chat</span>
              </Link>
            </div>
          </div>

          {/* Fulfillment Milestones Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50 text-sun-orange">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                Fulfillment Milestones
              </h3>
            </div>

            {/* Stepper Timeline Horizontal */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {currentOrder.milestones.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isInTransit = step.status === 'in_transit';
                return (
                  <div key={idx} className="relative flex flex-col space-y-2">
                    {/* Top Step Pill / Dot + Connecting bar */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                          isCompleted
                            ? 'bg-sun-orange text-white ring-4 ring-orange-100 dark:ring-orange-950/40'
                            : isInTransit
                            ? 'bg-sun-orange text-white ring-4 ring-orange-200 dark:ring-orange-900/50 animate-pulse'
                            : 'border-2 border-slate-300 dark:border-slate-700 text-slate-400 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : isInTransit ? (
                          <Navigation className="h-3.5 w-3.5 fill-white" />
                        ) : (
                          <span className="text-[10px]">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            isCompleted || isInTransit ? 'bg-sun-orange' : 'bg-transparent'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="space-y-1 pr-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider block ${
                          isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isInTransit
                            ? 'text-sun-orange'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.stage}
                      </span>
                      <h4 className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              Live Carrier Telemetry & Designated Courier Rider (2-Column Grid)
              ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left: Live Carrier Telemetry Visual Map Box (Col 7) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4 flex flex-col justify-between">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-sun-orange" />
                  <span className="font-outfit text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Live Carrier Telemetry
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Updated {secondsAgo} seconds ago</span>
                </div>
              </div>

              {/* Simulated Map Visual Graphic */}
              <div className="relative h-44 sm:h-52 w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 border border-slate-200/80 dark:border-white/5 overflow-hidden flex items-center justify-between p-6">
                {/* SVG Route Line */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EA580C" />
                      <stop offset="60%" style={{ stopColor: 'var(--color-sun-orange)' }} />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 60 140 Q 200 40, 360 110 T 680 70"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                </svg>

                {/* Origin Hub Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 border-orange-500 text-orange-500 shadow-md">
                    <MapPin className="h-4 w-4 fill-orange-500 text-white" />
                  </div>
                  <div className="mt-1 rounded-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                    ORIGIN HUB: {currentOrder.originHub.split(',')[0]}
                  </div>
                </div>

                {/* Active Rider Pin along the route */}
                <div className="relative z-10 flex flex-col items-center -mt-6">
                  <div className="rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-lg border border-white/20">
                    <Bike className="h-3 w-3 text-sun-orange" />
                    <span>Rider: {currentOrder.rider.distance} • Speed: {currentOrder.rider.speed}</span>
                  </div>
                  <div className="relative flex h-6 w-6 items-center justify-center mt-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-sun-orange border-2 border-white"></span>
                  </div>
                </div>

                {/* Destination Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-500 shadow-md">
                    <MapPin className="h-4 w-4 fill-blue-500 text-white" />
                  </div>
                  <div className="mt-1 rounded-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                    DESTINATION: {currentOrder.destination}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Designated Courier Rider Card (Col 5) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4 flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  DESIGNATED COURIER RIDER
                </span>
                <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  Active Rider
                </span>
              </div>

              {/* Rider Profile Row */}
              <div className="flex items-center gap-3.5">
                <img
                  src={currentOrder.rider.avatar}
                  alt={currentOrder.rider.name}
                  className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                />
                <div className="space-y-0.5">
                  <h4 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                    {currentOrder.rider.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentOrder.rider.id}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Vendora Background Check Verified</span>
                  </div>
                </div>
              </div>

              {/* Doorstep Delivery OTP Card */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    DOORSTEP DELIVERY OTP
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-900 dark:text-white">
                      {currentOrder.otp}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="p-1 text-slate-400 hover:text-sun-orange transition-colors cursor-pointer"
                      title="Copy OTP"
                      aria-label="Copy OTP"
                    >
                      {copiedOtp ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Barcode className="h-9 w-9 text-slate-400" />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCallRider}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Rider Directly</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendInstructions}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/40 text-sun-orange border border-orange-200/80 dark:border-orange-800/40 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{instructionsSent ? 'Instructions Sent!' : 'Send Doorstep Access Instructions'}</span>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* =========================================================================
            5. Delivery Timelines by Region (3 Column Cards)
            ========================================================================= */}
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
              Delivery Timelines by Region
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Region 1: Karachi & Lahore */}
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-outfit text-3xl font-black text-orange-200 dark:text-orange-900/60">
                  01
                </span>
                <span className="rounded-full bg-orange-100 text-sun-orange px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Express Available
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                  Karachi &amp; Lahore
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Primary urban regional clusters with dual-fulfillment hubs and dedicated 24-hour flow stations.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Same-Day Express</span>
                  <span className="font-black text-sun-orange">3 – 6 Hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Standard Delivery</span>
                  <span className="font-bold text-slate-900 dark:text-white">1 – 2 Business Days</span>
                </div>
              </div>
              <div className="rounded-xl bg-orange-50/70 dark:bg-orange-950/20 p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-sun-orange" />
                <span>Order before 12 PM for same-day dispatch</span>
              </div>
            </div>

            {/* Region 2: Major Cities */}
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-outfit text-3xl font-black text-purple-200 dark:text-purple-900/60">
                  02
                </span>
                <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Priority Transit
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                  Major Cities
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Gujranwala, and Sialkot corridors.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Overnight Air Freight</span>
                  <span className="font-black text-purple-700 dark:text-purple-400">24 Hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ground Priority</span>
                  <span className="font-bold text-slate-900 dark:text-white">2 – 3 Business Days</span>
                </div>
              </div>
              <div className="rounded-xl bg-purple-50/70 dark:bg-purple-950/20 p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-purple-600" />
                <span>Daily cargo connected via TCS/Leopards</span>
              </div>
            </div>

            {/* Region 3: Other Towns & Regions */}
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-outfit text-3xl font-black text-blue-200 dark:text-blue-900/60">
                  03
                </span>
                <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Nationwide Coverage
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                  Other Towns &amp; Regions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All other nationwide postal codes including Azad Kashmir, Gilgit, and Balochistan regional hubs.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Standard Courier Ground</span>
                  <span className="font-bold text-slate-900 dark:text-white">3 – 5 Business Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Remote Logistics Line</span>
                  <span className="font-bold text-slate-900 dark:text-white">5 – 6 Business Days</span>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/20 p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-blue-600" />
                <span>Weather conditions may delay dispatch</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. Need Assistance with Your Order? (Concierge Support Box)
            ========================================================================= */}
        <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Headphones className="h-3 w-3" />
                <span>WE&apos;RE HERE TO HELP</span>
              </span>
              <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Need Assistance with Your Order?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                If you have any questions about courier dispatch delivery timelines, payment options, or address changes, our concierge is standing by with an average 15-minute response time.
              </p>
            </div>

            {/* 3 Contact Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              {/* Direct Line */}
              <a
                href="tel:021111948210"
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 hover:border-orange-400 hover:bg-orange-50/30 transition-all text-center group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-sun-orange group-hover:scale-110 transition-transform">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  Direct Line
                </span>
                <span className="text-[11px] font-bold text-sun-orange">
                  021-111-948-210
                </span>
                <span className="text-[10px] text-slate-400">
                  Mon-Sat, 9am-10pm
                </span>
              </a>

              {/* Instant WhatsApp */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-center group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  Instant WhatsApp
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Live Chat Agent
                </span>
                <span className="text-[10px] text-slate-400">
                  Average reply &lt; 2mins
                </span>
              </a>

              {/* Email Escalation */}
              <a
                href="mailto:support@vendora.pk"
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-center group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  Email Escalation
                </span>
                <span className="text-[11px] font-bold text-blue-600">
                  support@vendora.pk
                </span>
                <span className="text-[10px] text-slate-400">
                  Guaranteed 1h SLA
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* =========================================================================
            7. Frequently Asked Questions (FAQ Accordion)
            ========================================================================= */}
        <div className="space-y-4 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear answers about automated tracking updates, missed courier attempts, and online dispute resolution.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                question: 'How soon does my tracking number update after placing an order?',
                answer:
                  'Once your order is confirmed, our merchant partners have an advisory 4-hour window to pack and generate the official carrier consignment note. You will receive an SMS and email with your AWB link as soon as the package is scanned into the carrier hub.',
              },
              {
                question: "What happens if I miss the rider's delivery call?",
                answer:
                  'All couriers for Vendora Express attempt 3 delivery attempts before returning items. If you miss the first attempt, the rider leaves an automated sms and attempts re-delivery the following morning. You can also re-schedule via the direct call button in your tracker.',
              },
              {
                question: 'How does the Vendora Buyer Escrow Handshake work?',
                answer:
                  'Your payment remains safely buffered in Vendora Escrow until the courier inputs your 4-digit Handshake OTP on your doorstep. You retain a full 7-day hassle-free window to return under warranty even if the package shows as fully delivered.',
              },
              {
                question: 'Can I change my delivery address while the shipment is in transit?',
                answer:
                  'If your shipment is currently in the "Picked & Bubble Sealed" stage, you can modify the address directly from your order dashboard. If it is already "Out for Express Courier", please connect with our 24/7 WhatsApp Concierge to redirect the assigned rider.',
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    className="w-full flex items-center justify-between p-4.5 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-sun-orange transition-colors cursor-pointer gap-4"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-sun-orange shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div id={`faq-panel-${index}`} className="px-4.5 pb-4.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3">
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
  );
};

export default TrackOrderPage;
