import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { applyAsRider, fetchOwnRiderApplication } from './onboarding';
import { profileRow, riderRow, supabaseDouble } from '../../../test/supabase-double';

const APPLICANT = 'applicant-1';
const PROFILE = '00000000-0000-4000-8000-000000001601';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: APPLICANT, email: 'new@demo.test', roles: ['customer'] }));
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: APPLICANT, email: 'new@demo.test' },
  };
});

describe('fetchOwnRiderApplication', () => {
  it('returns null when the account has no rider row at all', async () => {
    await expect(fetchOwnRiderApplication()).resolves.toBeNull();
  });

  it('maps the caller’s own pending application, city and plate included', async () => {
    supabaseDouble.seedRider(
      riderRow({
        id: PROFILE,
        user_id: APPLICANT,
        full_name: 'New Rider',
        status: 'pending',
        city: 'Lahore',
        vehicle_plate: 'LEA-100',
      }),
    );

    const application = await fetchOwnRiderApplication();
    expect(application).toMatchObject({
      id: PROFILE,
      fullName: 'New Rider',
      status: 'pending',
      city: 'Lahore',
      vehiclePlate: 'LEA-100',
    });
  });
});

describe('applyAsRider', () => {
  it('files the application as pending and lands the rider role on the profile', async () => {
    const application = await applyAsRider({
      vehicleType: 'Motorcycle',
      phone: '0300-111',
      city: 'Lahore',
      vehiclePlate: 'LEA-100',
    });

    expect(application.status).toBe('pending');
    expect(application.city).toBe('Lahore');
    const call = supabaseDouble.rpcCalls.find((entry) => entry.fn === 'apply_as_rider');
    expect(call?.args).toEqual({
      p_vehicle_type: 'Motorcycle',
      p_phone: '0300-111',
      p_city: 'Lahore',
      p_vehicle_plate: 'LEA-100',
    });
    const profile = supabaseDouble.tables.profiles.find((row) => row.id === APPLICANT);
    expect(profile?.roles).toContain('rider');
  });

  it('surfaces the database’s own validation prose for a blank field', async () => {
    await expect(
      applyAsRider({ vehicleType: 'Motorcycle', phone: '  ', city: 'Lahore', vehiclePlate: 'LEA-100' }),
    ).rejects.toThrow(/phone number/);
  });

  it('fails soft with an honest sentence while the migration is not yet run', async () => {
    supabaseDouble.failRpc(
      'Could not find the function public.apply_as_rider(p_vehicle_type, p_phone, p_city, p_vehicle_plate) in the schema cache',
    );
    await expect(
      applyAsRider({
        vehicleType: 'Motorcycle',
        phone: '0300-111',
        city: 'Lahore',
        vehiclePlate: 'LEA-100',
      }),
    ).rejects.toThrow(/not open yet/);
  });
});
