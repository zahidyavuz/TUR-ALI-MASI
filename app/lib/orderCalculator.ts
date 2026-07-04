import { fetchTour } from './tours';

/**
 * Server-side, provider-agnostic order pricing. Mirrors the bundle/promo math
 * in app/checkout/page.tsx's calculateBundleDiscount and the tour-price
 * lookup in app/api/checkout/route.tsx — this is the single source of truth
 * both should eventually share (checkout/route.tsx migration tracked in
 * TODOS.md, deferred to keep this change's blast radius small).
 *
 * NOTE: fetchTour() falls back to static demo data (TOUR_DATA) when the
 * Django backend is unreachable, and scrambles price via the anti-scraping
 * shield when isScraperDetected() is true. The scrambling path cannot trigger
 * here: recordRequestActivity() in antiScraping.ts short-circuits on
 * `typeof window === 'undefined'`, which is always true in this server-side
 * call path. The demo-data fallback, however, IS a real risk once this
 * calculator is wired into a live payment flow — do not treat its output as
 * authoritative if fetchTour() silently returned fallback data.
 */

export class OrderValidationError extends Error {}
export class TourNotFoundError extends Error {}

export interface OrderItem {
  /** Whether this line item is the tour itself or its linked restaurant meal. */
  type: 'tour' | 'meal';
  /** Tour id/slug — for 'meal' items, the parent tour (meal price comes from tour.linked_restaurant). */
  tourId: string;
  guests: number;
}

export interface CalculateOrderAmountParams {
  items: OrderItem[];
  /** 'COMBO15' | 'WELCOME10' — unknown codes are ignored, matching the client's alert-only behavior. */
  promoCode?: string;
  currency?: string;
}

export interface OrderAmountResult {
  /** Amount in the currency's minor unit (e.g. kuruş for TRY, cents for USD). */
  amount: number;
  currency: string;
  breakdown: {
    tourAmount: number;
    mealAmount: number;
    bundleDiscount: number;
    promoDiscount: number;
  };
}

export async function calculateOrderAmount(
  params: CalculateOrderAmountParams,
): Promise<OrderAmountResult> {
  const { items, promoCode, currency = 'try' } = params;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError('Sepet boş.');
  }

  let tourAmount = 0;
  let mealAmount = 0;

  for (const item of items) {
    if (!item || typeof item.guests !== 'number' || item.guests <= 0) {
      throw new OrderValidationError('Geçersiz misafir sayısı.');
    }
    if (!item.tourId) {
      throw new OrderValidationError('Geçersiz tur seçimi.');
    }

    const tour = await fetchTour(item.tourId);
    if (!tour) {
      throw new TourNotFoundError('Geçersiz tur seçimi.');
    }

    if (item.type === 'tour') {
      tourAmount += tour.price * item.guests;
    } else if (item.type === 'meal') {
      if (!tour.linked_restaurant || typeof tour.linked_restaurant.price !== 'number') {
        throw new OrderValidationError('Bu tur için restoran menüsü bulunamadı.');
      }
      mealAmount += tour.linked_restaurant.price * item.guests;
    } else {
      throw new OrderValidationError('Geçersiz sepet öğesi tipi.');
    }
  }

  // Mirrors calculateBundleDiscount in app/checkout/page.tsx exactly, so a
  // future test can assert numeric equality against that client-side logic.
  let bundleDiscount = 0;
  let promoDiscount = 0;

  if (tourAmount > 0 && mealAmount > 0) {
    bundleDiscount = (tourAmount + mealAmount) * 0.1;
  }

  if (promoCode) {
    const code = promoCode.toUpperCase();
    if (code === 'COMBO15') {
      promoDiscount = (tourAmount + mealAmount) * 0.15;
      bundleDiscount = 0;
    } else if (code === 'WELCOME10') {
      promoDiscount = (tourAmount + mealAmount - bundleDiscount) * 0.1;
    }
  }

  const finalTotal = tourAmount + mealAmount - bundleDiscount - promoDiscount;

  if (finalTotal <= 0) {
    throw new OrderValidationError('Hesaplanan tutar geçersiz.');
  }

  return {
    amount: Math.round(finalTotal * 100),
    currency,
    breakdown: { tourAmount, mealAmount, bundleDiscount, promoDiscount },
  };
}
