import React, { useState } from 'react';
import {
  Bike,
  Car,
  Navigation,
  Package,
  Power,
  Zap,
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
}

export const RiderHeader: React.FC<RiderHeaderProps> = ({
  isOnline: controlledIsOnline,
  onToggleShift,
  vehicleType = 'motorcycle',
  vehicleLabel,
  activeDeliveries = 0,
  riderName,
  className,
}) => {
  const { user } = useAuthStore();
  const [internalIsOnline, setInternalIsOnline] = useState(true);

  const isOnline = controlledIsOnline !== undefined ? controlledIsOnline : internalIsOnline;

  const handleToggle = () => {
    const nextState = !isOnline;
    if (controlledIsOnline === undefined) {
      setInternalIsOnline(nextState);
    }
    onToggleShift?.(nextState);
  };

  const displayName = riderName || user?.name || 'Rider';

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

  const resolvedVehicleLabel =
    vehicleLabel ||
    (vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1));

  return (
    <header
      data-testid="rider-header"
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-all',
        className
      )}
      aria-label="Rider Shift and Delivery Console"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Rider status & Shift Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs shadow-xs">
              <span>{displayName.charAt(0)}</span>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white',
                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-none">{displayName}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Express Delivery Hub</div>
            </div>
          </div>

          {/* Online/Offline Shift Toggle Pill */}
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            aria-label="Toggle rider shift online/offline"
            onClick={handleToggle}
            className={cn(
              'group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-xs transition-all select-none cursor-pointer',
              isOnline
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full transition-transform',
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            />
            <Power className={cn('h-3 w-3', isOnline ? 'text-emerald-600' : 'text-slate-500')} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {/* Right: Vehicle Indicator & Active Deliveries Counter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-slate-100 sm:border-0 sm:pt-0">
          {/* Vehicle Indicator (Bright Glass pill) */}
          <div
            data-testid="vehicle-indicator"
            className="glass-pill inline-flex items-center gap-1.5 border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs"
            title={`Vehicle Mode: ${resolvedVehicleLabel}`}
          >
            <span className="text-[#00B8C8]">{renderVehicleIcon()}</span>
            <span>{resolvedVehicleLabel}</span>
          </div>

          {/* Active Deliveries Counter Pill */}
          <div
            data-testid="active-deliveries-counter"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-xs transition-all',
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

          {/* Quick Battery / GPS Status on larger screens */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-600 font-medium pl-1">
            <Zap className="h-3 w-3 text-emerald-500" />
            <span>GPS Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
