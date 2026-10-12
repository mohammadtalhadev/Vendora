import React from 'react';
import { Bike, Car, Navigation, Package, Loader2, Power, Clock, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { RiderAvailability } from '../api/board';

export interface RiderHeaderProps {
  /** From the signed-in rider's own profile row. */
  riderName: string;
  /** `rider_profiles.vehicle_type` — a free-text label like 'Motorcycle'. */
  vehicleType: string;
  /** `rider_profiles.status`, controlled by the page, not by local state. */
  status: RiderAvailability;
  /** Writes the new availability through `setAvailability`; the page owns the mutation. */
  onStatusChange: (status: RiderAvailability) => void;
  /** Parcels currently on this rider's board. */
  activeDeliveries: number;
  /** A status write is in flight: the switch must not fire twice. */
  pending?: boolean;
  className?: string;
}

type StatusOption = {
  value: RiderAvailability;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  dotClass: string;
};

/** The three values of the Postgres enum `public.rider_availability`. */
const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'available',
    label: 'Available',
    hint: 'Open for dispatch',
    Icon: Zap,
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'busy',
    label: 'Busy',
    hint: 'At capacity right now',
    Icon: Clock,
    activeClass: 'border-orange-300 bg-orange-50 text-[#EA6C13]',
    dotClass: 'bg-[#FF7A1A]',
  },
  {
    value: 'offline',
    label: 'Offline',
    hint: 'Off shift',
    Icon: Power,
    activeClass: 'border-slate-300 bg-slate-100 text-slate-600',
    dotClass: 'bg-slate-400',
  },
];

export const RiderHeader: React.FC<RiderHeaderProps> = ({
  riderName,
  vehicleType,
  status,
  onStatusChange,
  activeDeliveries,
  pending = false,
  className,
}) => {
  const current = STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[2];

  // Free-text `vehicle_type` label: pick the closest glyph, fall back to a neutral marker.
  const renderVehicleIcon = () => {
    const normalized = vehicleType.toLowerCase();
    if (normalized.includes('car') || normalized.includes('van')) {
      return <Car className="h-3.5 w-3.5" />;
    }
    if (normalized.includes('bike') || normalized.includes('cycle')) {
      return <Bike className="h-3.5 w-3.5" />;
    }
    return <Navigation className="h-3.5 w-3.5" />;
  };

  return (
    <header
      data-testid="rider-header"
      className={cn(
        'w-full rounded-3xl border border-slate-200/90 bg-white/95 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-all',
        className
      )}
      aria-label="Rider status and delivery console"
    >
      <div className="flex flex-col gap-3">
        {/* Main top bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          {/* Left: Rider identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xs">
              <span>{riderName.charAt(0)}</span>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
                  current.dotClass
                )}
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                {riderName}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                Express Rider • {current.hint}
              </div>
            </div>
          </div>

          {/* Right: availability control — writes rider_profiles.status */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {pending && (
              <span
                data-testid="rider-status-pending"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Updating…</span>
              </span>
            )}

            <div
              data-testid="rider-status-select"
              role="group"
              aria-label="Rider availability"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50/80 p-1 shadow-2xs"
            >
              {STATUS_OPTIONS.map((option) => {
                const { Icon } = option;
                const isActive = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-testid={`rider-status-${option.value}`}
                    onClick={() => onStatusChange(option.value)}
                    disabled={pending}
                    aria-pressed={isActive}
                    title={option.hint}
                    className={cn(
                      'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all select-none',
                      isActive
                        ? cn(option.activeClass, 'shadow-xs cursor-default')
                        : cn(
                            'border-transparent text-slate-500',
                            pending
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer bg-transparent hover:bg-white'
                          )
                    )}
                  >
                    <span
                      className={cn('h-2 w-2 rounded-full', isActive ? option.dotClass : 'bg-slate-300')}
                      aria-hidden="true"
                    />
                    <Icon className="h-3.5 w-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Secondary Info Strip: Vehicle (read-only) + Parcel Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          {vehicleType ? (
            <div
              data-testid="rider-vehicle-type"
              className="glass-pill inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs"
              title={`Vehicle type: ${vehicleType}`}
            >
              <span className="text-[#00B8C8]">{renderVehicleIcon()}</span>
              <span>{vehicleType}</span>
            </div>
          ) : (
            <span />
          )}

          {/* Parcels on board Counter Pill */}
          <div
            data-testid="rider-active-deliveries"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-2xs transition-all',
              activeDeliveries > 0
                ? 'border-orange-200 bg-orange-50 text-[#EA6C13]'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            )}
            title={`${activeDeliveries} parcels on your board`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>{activeDeliveries}</span>
            <span> {activeDeliveries === 1 ? 'Parcel' : 'Parcels'} on board</span>
          </div>
        </div>
      </div>
    </header>
  );
};
