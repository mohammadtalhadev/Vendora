import { describe, expect, it } from 'vitest';
import { LocationSendThrottle, freshnessLabel, mapsUrl, osmEmbedUrl } from './location';

describe('osmEmbedUrl / mapsUrl', () => {
  it('builds an OSM embed with a bbox around the fix and a marker on it', () => {
    const url = osmEmbedUrl(24.8608, 67.0011);
    expect(url).toContain('openstreetmap.org/export/embed.html');
    expect(url).toContain('marker=24.8608,67.0011');
    expect(url).toContain('bbox=66.991');
    expect(url).toContain('24.850');
    expect(url).toContain('layer=mapnik');
  });

  it('builds a maps link for the same fix', () => {
    expect(mapsUrl(24.8608, 67.0011)).toBe('https://www.google.com/maps?q=24.8608,67.0011');
  });
});

describe('freshnessLabel', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');

  it('names a missing fix honestly', () => {
    expect(freshnessLabel(null, now)).toBe('not shared yet');
    expect(freshnessLabel('not-a-date', now)).toBe('not shared yet');
  });

  it('scales from seconds to hours', () => {
    expect(freshnessLabel('2026-10-14T11:59:40.000Z', now)).toBe('just now');
    expect(freshnessLabel('2026-10-14T11:58:00.000Z', now)).toBe('2 min ago');
    expect(freshnessLabel('2026-10-14T10:00:00.000Z', now)).toBe('2 h ago');
  });
});

describe('LocationSendThrottle', () => {
  const base = { lat: 24.8608, lng: 67.0011 };

  it('always sends the first fix', () => {
    const throttle = new LocationSendThrottle();
    expect(throttle.shouldSend(base, 1_000)).toBe(true);
  });

  it('suppresses a fix that is soon and barely moved', () => {
    const throttle = new LocationSendThrottle();
    throttle.record(base, 1_000);
    // ~5 metres north, two seconds later: the dot has not visibly moved.
    expect(throttle.shouldSend({ lat: 24.860845, lng: 67.0011 }, 3_000)).toBe(false);
  });

  it('sends again once ten seconds have passed', () => {
    const throttle = new LocationSendThrottle();
    throttle.record(base, 1_000);
    expect(throttle.shouldSend(base, 11_500)).toBe(true);
  });

  it('sends again once the rider has moved about 25 metres', () => {
    const throttle = new LocationSendThrottle();
    throttle.record(base, 1_000);
    // ~40 metres east, three seconds later.
    expect(throttle.shouldSend({ lat: 24.8608, lng: 67.0015 }, 4_000)).toBe(true);
  });

  it('measures a known distance sanely', () => {
    // One degree of latitude is ~111km anywhere on earth.
    const d = LocationSendThrottle.distanceM(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});
