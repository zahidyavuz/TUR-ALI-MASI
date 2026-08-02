import { fetchAPI } from './api';

export interface SpaAvailabilitySlot {
  id: number;
  date: string;
  time: string;
  max_capacity: number;
  booked_count: number;
  remaining: number;
  is_available: boolean;
}

export interface SpaService {
  id: string;
  venue: string;
  title: string;
  description?: string;
  price_per_person: number | string;
  duration_minutes: number;
  min_guests: number;
  max_guests: number;
  image?: string;
  is_active?: boolean;
  availability_slots?: SpaAvailabilitySlot[];
}

export interface SpaVenue {
  id: string;
  name: string;
  description?: string;
  location: string;
  image_main: string;
  image_sub1?: string;
  image_sub2?: string;
  is_active?: boolean;
  agency?: { id: number; name: string } | null;
  services?: SpaService[];
}

interface SpaVenueListParams {
  location?: string;
  search?: string;
}

interface SpaVenueListResult {
  venues: SpaVenue[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * No mock fallback: fetchAPI() returns null on any error (network/4xx/5xx),
 * so callers must render a visible error state rather than an empty list.
 */
export async function fetchSpaVenues(params: SpaVenueListParams = {}): Promise<SpaVenueListResult | null> {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const endpoint = queryString ? `/spas/venues/?${queryString}` : '/spas/venues/';

  const response = await fetchAPI(endpoint, {
    next: { revalidate: 60 },
  });

  if (!response) return null;

  const results = response.results ? response.results : response;
  const venues = Array.isArray(results) ? results : [];

  return {
    venues,
    count: response.count ?? venues.length,
    next: response.next ?? null,
    previous: response.previous ?? null,
  };
}

export async function fetchSpaVenue(id: string): Promise<SpaVenue | null> {
  const response = await fetchAPI(`/spas/venues/${id}/`, {
    next: { revalidate: 60 },
  });

  if (!response || response.detail) return null;
  return response as SpaVenue;
}

/**
 * Service detail carries the availability_slots the booking card needs;
 * the venue detail only nests the lightweight service list.
 */
export async function fetchSpaService(id: string): Promise<SpaService | null> {
  const response = await fetchAPI(`/spas/services/${id}/`, {
    next: { revalidate: 60 },
  });

  if (!response || response.detail) return null;
  return response as SpaService;
}
