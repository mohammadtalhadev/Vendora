import { useCallback, useEffect, useRef, useState } from 'react';
import { LocationSendThrottle, updateRiderLocation } from '../api/location';

export interface RiderLocationSharing {
  sharing: boolean;
  /** The last fix Postgres accepted, for the "Sharing live location • sent …" line. */
  lastSentAt: Date | null;
  /** Honest failure copy: no permission, no geolocation, or a refused write. */
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * The rider's live share for one delivery.
 *
 * Nothing starts on its own: the rider taps Share, the browser asks for
 * permission, and only then does `watchPosition` run. Fixes pass through the
 * send throttle (10s / 25m) before each `update_rider_location` call, and the
 * watch is torn down on toggle-off, on unmount, and when the delivery stops
 * being active (delivered or failed elsewhere) - a share never outlives the
 * parcel it belongs to.
 */
export function useRiderLocationSharing(deliveryId: string, active: boolean): RiderLocationSharing {
  const [sharing, setSharing] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const throttle = useRef(new LocationSendThrottle());
  const sending = useRef(false);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not available on this device or browser, so your position cannot be shared.');
      return;
    }
    if (watchId.current !== null) return;
    throttle.current = new LocationSendThrottle();

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy ?? null,
        };
        const nowMs = Date.now();
        if (sending.current || !throttle.current.shouldSend(fix, nowMs)) return;
        sending.current = true;
        updateRiderLocation(deliveryId, fix)
          .then(() => {
            throttle.current.record(fix, Date.now());
            setLastSentAt(new Date());
          })
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Your location could not be sent.');
          })
          .finally(() => {
            sending.current = false;
          });
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Location permission was denied, so the customer cannot see your live position.');
        } else {
          setError('Your position could not be read from this device.');
        }
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    setSharing(true);
  }, [deliveryId, stop]);

  // A delivery that closes (or a card that unmounts) ends the share with it.
  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);
  useEffect(() => stop, [stop]);

  return { sharing, lastSentAt, error, start, stop };
}
