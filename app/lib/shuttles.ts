import { fetchAPI } from './api';

export interface ShuttleAvailabilitySlot {
  id: number;
  date: string;
  time: string;
  max_capacity: number;
  booked_count: number;
  remaining: number;
  is_available: boolean;
}

export interface ShuttleRoute {
  id: string;
  title: string;
  description?: string;
  origin: string;
  destination: string;
  vehicle_type: string;
  capacity: number;
  price_per_person: number | string;
  min_passengers: number;
  max_passengers: number;
  duration_minutes: number;
  image_main: string;
  image_sub1?: string;
  image_sub2?: string;
  availability_slots?: ShuttleAvailabilitySlot[];
}

interface ShuttleListParams {
  origin?: string;
  destination?: string;
  vehicle_type?: string;
  date?: string;
  passengers?: string;
}

interface ShuttleListResult {
  shuttles: ShuttleRoute[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * No fallback/mock data here, unlike app/lib/tours.ts — the shuttle module
 * has no legacy demo dataset. fetchAPI() already returns null on any error
 * (network down, 4xx/5xx); callers must handle null and show a visible
 * error state rather than assume an empty list.
 */
export async function fetchShuttles(params: ShuttleListParams = {}): Promise<ShuttleListResult | null> {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const endpoint = queryString ? `/shuttles/?${queryString}` : '/shuttles/';

  const response = await fetchAPI(endpoint, {
    next: { revalidate: 60 },
  });

  if (!response) return null;

  const results = response.results ? response.results : response;
  const shuttles = Array.isArray(results) ? results : [];

  return {
    shuttles,
    count: response.count ?? shuttles.length,
    next: response.next ?? null,
    previous: response.previous ?? null,
  };
}

export async function fetchShuttle(id: string): Promise<ShuttleRoute | null> {
  const response = await fetchAPI(`/shuttles/${id}/`, {
    next: { revalidate: 60 },
  });

  if (!response || response.detail) return null;
  return response as ShuttleRoute;
}
