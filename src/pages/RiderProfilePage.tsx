import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderNav } from '../features/rider/components/RiderNav';
import { RiderHeader } from '../features/rider/components/RiderHeader';
import { useRiderActions, useRiderBoard } from '../features/rider/hooks/useRider';
import type { RiderAvailability } from '../features/rider/api/board';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormField } from '../components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { vehicleOptions } from '../features/rider/api/vehicles';

/** `rider_availability` in Postgres; anything else the row holds is shown as offline. */
const AVAILABILITY: RiderAvailability[] = ['available', 'busy', 'offline'];
const availabilityOf = (status: string | undefined): RiderAvailability =>
  AVAILABILITY.find((option) => option === status) ?? 'offline';

const ReadOnlyFact: React.FC<{ label: string; value: string; testId?: string }> = ({ label, value, testId }) => (
  <div>
    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</span>
    <p data-testid={testId} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
      {value || '—'}
    </p>
  </div>
);

/**
 * The rider's own profile: the `rider_profiles` row dispatch holds for this
 * account. Availability reuses the board's write (`setAvailability`), and phone /
 * vehicle save through the same `riders_update_self` policy that write uses.
 * Name and the SLA ceiling are dispatch-managed facts, so they are shown as
 * read-only rather than offered as edits nothing would honour.
 */
export const RiderProfilePage: React.FC = () => {
  const board = useRiderBoard();
  const actions = useRiderActions();
  const user = useAuthStore((s) => s.user);
  const rider = board.data?.rider ?? null;

  // The form edits the row Postgres holds: an untouched field shows the board
  // read's value, and only a field the rider typed into carries a local edit.
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const [vehicleEdit, setVehicleEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const phone = phoneEdit ?? rider?.phone ?? '';
  const vehicleType = vehicleEdit ?? rider?.vehicleType ?? '';

  const readError =
    board.isError && board.error instanceof Error
      ? board.error.message
      : 'Your rider profile could not be read.';

  const saveError =
    actions.profile.isError && actions.profile.error instanceof Error
      ? actions.profile.error.message
      : null;

  const availabilityError =
    actions.availability.isError && actions.availability.error instanceof Error
      ? actions.availability.error.message
      : null;

  const dirty = rider !== null && (phone !== rider.phone || vehicleType !== rider.vehicleType);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    actions.profile.mutate(
      // The vehicle comes from the canonical Select (or the row's own stored
      // value), so it is saved verbatim — no trim rewriting a legacy value.
      { phone: phone.trim(), vehicleType },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <WorkspaceLayout
      role="rider"
      roleBadgeText="DELIVERY RIDER"
      title="Rider Profile"
      subtitle="Your dispatch profile, availability and contact details"
      sidebar={<RiderNav />}
    >
      <div className="w-full space-y-4 pb-10 sm:space-y-6">
        {board.isError ? (
          <section
            role="alert"
            data-testid="profile-error"
            className="space-y-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-rose-950">Your profile could not be read</p>
                <p className="mt-1 text-xs font-medium text-rose-900">{readError}</p>
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-retry-profile"
              disabled={board.isFetching}
              onClick={() => void board.refetch()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {board.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span>Retry</span>
            </button>
          </section>
        ) : board.isPending || !rider ? (
          <div data-testid="profile-loading" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
            Reading your rider profile…
          </div>
        ) : (
          <>
            <RiderHeader
              riderName={rider.fullName}
              vehicleType={rider.vehicleType}
              status={availabilityOf(rider.status)}
              onStatusChange={(status) => actions.availability.mutate(status)}
              activeDeliveries={board.data?.drops.length ?? 0}
              pending={actions.availability.isPending}
            />

            {availabilityError && (
              <div
                role="alert"
                data-testid="availability-error"
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{availabilityError}</span>
              </div>
            )}

            <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="text-sm font-black text-slate-900">Dispatch profile</h2>
              <p className="mt-1 text-xs text-slate-500">
                Phone and vehicle are yours to keep current - the desk and buyers reach you on
                them. Your name and handling window are held by dispatch; contact the desk to
                change those.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyFact label="Full name" value={rider.fullName} testId="profile-full-name" />
                <ReadOnlyFact label="Account email" value={user?.email ?? ''} testId="profile-email" />
                <ReadOnlyFact
                  label="Handling window (SLA ceiling)"
                  value={rider.slaCeilingHours > 0 ? `${rider.slaCeilingHours}h` : ''}
                  testId="profile-sla"
                />
                <ReadOnlyFact label="Availability" value={availabilityOf(rider.status)} testId="profile-status" />
              </div>

              <form onSubmit={save} className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <FormField label="Phone" htmlFor="rider-phone">
                  <Input
                    id="rider-phone"
                    data-testid="profile-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhoneEdit(event.target.value);
                      setSaved(false);
                    }}
                    placeholder="Phone dispatch can reach you on"
                  />
                </FormField>
                <FormField label="Vehicle type" htmlFor="rider-vehicle">
                  <Select
                    value={vehicleType}
                    onValueChange={(value) => {
                      setVehicleEdit(value);
                      setSaved(false);
                    }}
                  >
                    <SelectTrigger id="rider-vehicle" data-testid="profile-vehicle-input">
                      <SelectValue placeholder="Select your vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleOptions(vehicleType).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <Button
                    type="submit"
                    data-testid="btn-save-profile"
                    disabled={!dirty || actions.profile.isPending}
                  >
                    {actions.profile.isPending ? 'Saving…' : 'Save contact details'}
                  </Button>
                  {saved && !dirty && (
                    <span data-testid="profile-saved" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved to your rider profile
                    </span>
                  )}
                </div>

                {saveError && (
                  <div
                    role="alert"
                    data-testid="profile-save-error"
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 sm:col-span-2"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{saveError}</span>
                  </div>
                )}
              </form>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
