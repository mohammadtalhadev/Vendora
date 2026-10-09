import React, { useState } from 'react';
import {
  Bike,
  Car,
  Navigation,
  Package,
  Power,
  Zap,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';

export interface RiderHeaderProps {
  /** Current shift status; if omitted, component manages internal state */
  isOnline?: boolean;
  /** Callback fired when rider flips the shift switch */
  onToggleShift?: (isOnline: boolean) => void;
  /** Vehicle type category */
  vehicleType?: 'motorcycle' | 'bicycle' | 'ebike' | 'car' | 'scooter' | string;
  /** Custom label for vehicle display (e.g. 'Honda CB125' or 'E-Bike Express') */
  vehicleLabel?: string;
  /** Count of currently dispatched / active sub-orders */
  activeDeliveries?: number;
  /** Optional custom rider display name */
  riderName?: string;
  className?: string;
  /** Callback when SOS emergency button is pressed */
  onEmergencySos?: () => void;
  /** Callback to change vehicle */
  onSelectVehicle?: (vehicle: string) => void;
  /** GPS state */
  isGpsActive?: boolean;
  onToggleGps?: () => void;
}

export const RiderHeader: React.FC<RiderHeaderProps> = ({
  isOnline: controlledIsOnline,
  onToggleShift,
  vehicleType = 'motorcycle',
  vehicleLabel,
  activeDeliveries = 0,
  riderName,
  className,
  onEmergencySos,
  onSelectVehicle,
  isGpsActive = true,
  onToggleGps,
}) => {
  const { user } = useAuthStore();
  const [internalIsOnline, setInternalIsOnline] = useState(true);
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(vehicleLabel || 'Honda CB125 Express');

  const isOnline = controlledIsOnline !== undefined ? controlledIsOnline : internalIsOnline;

  const handleToggle = () => {
    const nextState = !isOnline;
    if (controlledIsOnline === undefined) {
      setInternalIsOnline(nextState);
    }
    onToggleShift?.(nextState);
  };

  const displayName = riderName || user?.name || 'Sam Express Rider';

  // Helper to render appropriate vehicle icon
  const renderVehicleIcon = () => {
    const normalized = vehicleType.toLowerCase();
    if (normalized.includes('car')) {
      return <Car className="h-3.5 w-3.5" />;
    }
    if (normalized.includes('bike') || normalized.includes('cycle')) {
      return <Bike className="h-3.5 w-3.5" />;
    }
    return <Navigation className="h-3.5 w-3.5" />;
  };

  const resolvedVehicleLabel = currentVehicle;

  const VEHICLE_OPTIONS = [
    { label: 'Honda CB125 Express', type: 'motorcycle' },
    { label: 'Yamaha YBR 125', type: 'motorcycle' },
    { label: 'E-Cargo Bike Pro', type: 'ebike' },
    { label: 'Compact City Car', type: 'car' },
  ];

  return (
    <header
      data-testid="rider-header"
      className={cn(
        'w-full rounded-3xl border border-slate-200/90 bg-white/95 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-all',
        className
      )}
      aria-label="Rider Shift and Delivery Console"
    >
      <div className="flex flex-col gap-3">
        {/* Main top bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Rider status & Shift Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xs">
              <span>{displayName.charAt(0)}</span>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                Express Rider • Shift Active
              </div>
            </div>
          </div>

          {/* Right Action Cluster: SOS Button + Online/Offline Shift Switch */}
          <div className="flex items-center gap-2">
            {/* SOS Emergency Help Button */}
            <button
              type="button"
              onClick={onEmergencySos}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:text-rose-800 transition-all cursor-pointer active:scale-95"
              title="Emergency SOS / Dispatch Support"
            >
              <ShieldAlert className="h-4 w-4 text-rose-600 animate-pulse" />
              <span>SOS</span>
            </button>

            {/* Online/Offline Shift Toggle Pill */}
            <button
              type="button"
              role="switch"
              aria-checked={isOnline}
              aria-label="Toggle rider shift online/offline"
              onClick={handleToggle}
              className={cn(
                'group relative inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all select-none cursor-pointer',
                isOnline
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-transform',
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                )}
              />
              <Power className={cn('h-3.5 w-3.5', isOnline ? 'text-emerald-600' : 'text-slate-500')} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* Secondary Info Strip: Vehicle Selector + Active Counter + GPS Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          {/* Vehicle Selector Pill with Dropdown */}
          <div className="relative">
            <button
              type="button"
              data-testid="vehicle-indicator"
              onClick={() => setVehicleMenuOpen(!vehicleMenuOpen)}
              className="glass-pill inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition-all cursor-pointer"
              title={`Vehicle Mode: ${resolvedVehicleLabel} (Click to switch)`}
            >
              <span className="text-[#00B8C8]">{renderVehicleIcon()}</span>
              <span>{resolvedVehicleLabel}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {vehicleMenuOpen && (
              <div className="absolute top-9 left-0 w-48 rounded-2xl border border-white/80 bg-white/95 backdrop-blur-xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Vehicle
                </div>
                {VEHICLE_OPTIONS.map((v) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => {
                      setCurrentVehicle(v.label);
                      setVehicleMenuOpen(false);
                      onSelectVehicle?.(v.label);
                    }}
                    className={cn(
                      'w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
                      currentVehicle === v.label
                        ? 'bg-[#FF7A1A]/10 text-[#EA6C13]'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Active Deliveries Counter Pill */}
            <div
              data-testid="active-deliveries-counter"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-2xs transition-all',
                activeDeliveries > 0
                  ? 'border-orange-200 bg-orange-50 text-[#EA6C13]'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
              title={`${activeDeliveries} deliveries actively assigned`}
            >
              <Package className="h-3.5 w-3.5" />
              <span data-testid="delivery-count">{activeDeliveries}</span>
              <span> {activeDeliveries === 1 ? 'Delivery' : 'Active Deliveries'}</span>
            </div>

            {/* GPS Telemetry Pill */}
            <button
              type="button"
              onClick={onToggleGps}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                isGpsActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700 animate-pulse'
              )}
              title={isGpsActive ? 'GPS Signal Strong' : 'GPS Disconnected - Tap to reconnect'}
            >
              {isGpsActive ? (
                <>
                  <Zap className="h-3 w-3 text-emerald-500" />
                  <span>GPS Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                  <span>GPS Inactive</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

