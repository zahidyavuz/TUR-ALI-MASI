'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { findNearbyTour, getCurrentPosition, watchPosition, clearWatch } from '../lib/geofence';
import type { NearbyResult } from '../lib/geofence';
import { GEOFENCE_SPOTS } from '../lib/geofence-data';

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

type GeofenceContextValue = {
  permission: PermissionStatus;
  nearby: NearbyResult | null;
  bannerVisible: boolean;
  isLoading: boolean;
  error: string | null;
  dismissBanner: () => void;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
};

const GeofenceContext = createContext<GeofenceContextValue | null>(null);

const BANNER_DISMISS_KEY = 'tourkia_geofence_banner_dismissed';

function getBannerDismissedId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(BANNER_DISMISS_KEY);
  } catch {
    return null;
  }
}

function setBannerDismissedId(spotSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BANNER_DISMISS_KEY, spotSlug);
  } catch {
    // ignore
  }
}

export function GeofenceProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [nearby, setNearby] = useState<NearbyResult | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const checkPosition = useCallback((lat: number, lon: number) => {
    const result = findNearbyTour(lat, lon);
    if (result) {
      const dismissed = getBannerDismissedId();
      if (dismissed !== result.spot.slug) {
        setNearby(result);
        setBannerVisible(true);
      }
    } else {
      setNearby(null);
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const demo = urlParams.get('geofence_demo') === '1';

    if (demo) {
      setIsLoading(true);
      setError(null);
      setPermission('granted');
      const spot = GEOFENCE_SPOTS[0];
      checkPosition(spot.lat, spot.lon);
      setBannerVisible(true);
      setIsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setPermission('unsupported');
      setError('Konum desteklenmiyor.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPermission('granted');
      const { latitude, longitude } = pos.coords;
      checkPosition(latitude, longitude);

      watchIdRef.current = watchPosition(
        (p) => checkPosition(p.coords.latitude, p.coords.longitude),
        (err) => {
          setError(err.message || 'Konum alınamadı');
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Konum alınamadı';
      setError(message);
      if (message.toLowerCase().includes('denied') || message.toLowerCase().includes('permission')) {
        setPermission('denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkPosition]);

  const dismissBanner = useCallback(() => {
    if (nearby) setBannerDismissedId(nearby.spot.slug);
    setBannerVisible(false);
  }, [nearby]);

  const value: GeofenceContextValue = {
    permission,
    nearby,
    bannerVisible,
    isLoading,
    error,
    dismissBanner,
    startWatching,
    stopWatching,
  };

  return (
    <GeofenceContext.Provider value={value}>
      {children}
    </GeofenceContext.Provider>
  );
}

export function useGeofence(): GeofenceContextValue {
  const ctx = useContext(GeofenceContext);
  if (!ctx) throw new Error('useGeofence must be used within GeofenceProvider');
  return ctx;
}
