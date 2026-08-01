import { fetchAPI } from './api';

export interface ComboTourAvailability {
  id: number;
  date: string;
  max_capacity: number;
  booked_count: number;
  remaining: number;
  is_available: boolean;
  price_override: string | null;
  is_closed: boolean;
}

export interface ComboTour {
  id: string;
  title: string;
  location: string;
  price: number | string;
  duration: string;
  image_main: string;
}

export interface ComboMenu {
  id: number;
  restaurant: number;
  name: string;
  description: string | null;
  category_display: string;
  price: number | string;
  effective_price: number | string;
  image: string | null;
}

export interface Combo {
  id: string;
  title: string;
  description: string | null;
  discount_rate: number | string;
  is_active: boolean;
  tour: ComboTour;
  menu: ComboMenu;
  tour_availability: ComboTourAvailability[];
  original_price: number | string;
  bundle_price: number | string;
  savings: number | string;
}

/**
 * No fallback/mock data — fetchAPI() returns null on any error (network down,
 * 4xx/5xx); callers must handle null and show a visible error/empty state.
 */
export async function fetchCombos(): Promise<Combo[]> {
  const response = await fetchAPI('/combos/', { next: { revalidate: 60 } });
  if (!response) return [];
  const results = response.results ? response.results : response;
  return Array.isArray(results) ? results : [];
}

export async function fetchCombo(id: string): Promise<Combo | null> {
  const response = await fetchAPI(`/combos/${id}/`, { next: { revalidate: 60 } });
  if (!response || response.detail) return null;
  return response as Combo;
}
