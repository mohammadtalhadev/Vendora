import { describe, expect, it } from 'vitest';
import { RIDER_VEHICLE_TYPES, vehicleOptions } from './vehicles';

describe('rider vehicle types', () => {
  it('is the canonical set the schema default and fleet use', () => {
    expect(RIDER_VEHICLE_TYPES).toEqual(['Motorcycle', 'Car', 'Van', 'Bicycle', 'Truck']);
  });

  it('offers exactly the canonical set for a canonical stored value', () => {
    expect(vehicleOptions('Motorcycle')).toEqual([...RIDER_VEHICLE_TYPES]);
    expect(vehicleOptions('Van')).toEqual([...RIDER_VEHICLE_TYPES]);
  });

  it('offers the canonical set when nothing is stored yet', () => {
    expect(vehicleOptions('')).toEqual([...RIDER_VEHICLE_TYPES]);
  });

  it('keeps a legacy free-text value selectable, verbatim, after the canonical set', () => {
    expect(vehicleOptions('Rickshaw')).toEqual([...RIDER_VEHICLE_TYPES, 'Rickshaw']);
  });
});
