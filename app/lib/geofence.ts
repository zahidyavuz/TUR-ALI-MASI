/**
 * Geofencing: GPS konumu ile tur noktalarına mesafe hesaplama ve "yakında mı?" kontrolü.
 */

import type { GeofenceSpot } from './geofence-data';
import { GEOFENCE_SPOTS } from './geofence-data';

/** İki koordinat arası mesafe (metre) — Haversine formülü. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Dünya yarıçapı metre
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface NearbyResult {
  spot: GeofenceSpot;
  distanceMeters: number;
}

/**
 * Verilen konuma en yakın tur noktasını bulur; radiusMeters içindeyse döner.
 */
export function findNearbyTour(
  userLat: number,
  userLon: number,
  maxRadiusMeters: number = 500
): NearbyResult | null {
  let closest: NearbyResult | null = null;

  for (const spot of GEOFENCE_SPOTS) {
    const d = distanceMeters(userLat, userLon, spot.lat, spot.lon);
    if (d <= Math.min(spot.radiusMeters, maxRadiusMeters)) {
      if (!closest || d < closest.distanceMeters) {
        closest = { spot, distanceMeters: Math.round(d) };
      }
    }
  }
  return closest;
}

/**
 * Tarayıcı konum izni isteyip mevcut konumu döndürür.
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    });
  });
}

/**
 * Konum değişimini izler; her güncellemede callback çağrılır (geofence kontrolü için).
 */
export function watchPosition(
  onUpdate: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): number | null {
  if (typeof window === 'undefined' || !navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    onUpdate,
    onError ?? (() => {}),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  );
}

export function clearWatch(watchId: number): void {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}
