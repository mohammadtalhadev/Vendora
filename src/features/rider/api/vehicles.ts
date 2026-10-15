/**
 * The canonical rider vehicle types. `rider_profiles.vehicle_type` is a free
 * text column (default 'Motorcycle', no CHECK constraint), so this list is the
 * one vocabulary the fleet actually runs on: 'Motorcycle' is the schema
 * default and the demo fleet's value, and Car / Van / Bicycle / Truck are the
 * vehicles the rider header's icon logic recognises. Every surface that asks
 * for a vehicle — the rider profile today, the onboarding form next — offers
 * exactly this set instead of free text, so dispatch data stays comparable.
 */
export const RIDER_VEHICLE_TYPES = ['Motorcycle', 'Car', 'Van', 'Bicycle', 'Truck'] as const;

export type RiderVehicleType = (typeof RIDER_VEHICLE_TYPES)[number];

/**
 * The options a vehicle picker offers for a row that currently holds
 * `current`: the canonical set, plus the stored value verbatim when it is a
 * legacy free-text entry outside the set — an existing row is never silently
 * rewritten or left unselectable just because it predates the list.
 */
export function vehicleOptions(current: string): string[] {
  if (current && !(RIDER_VEHICLE_TYPES as readonly string[]).includes(current)) {
    return [...RIDER_VEHICLE_TYPES, current];
  }
  return [...RIDER_VEHICLE_TYPES];
}
