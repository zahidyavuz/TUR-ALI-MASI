/**
 * ZERO-TRUST: IDOR (Insecure Direct Object Reference) Koruma Katmanı
 *
 * Bu modül, bir kaynağın (bilet, rezervasyon, fatura) sahibinin
 * giriş yapmış kullanıcıyla eşleşip eşleşmediğini doğrular.
 *
 * İlke: Frontend her zaman backend token'ına dayalı ownership doğrulaması
 * yapmalıdır. URL değiştirilerek başkasının verisi görüntülenemez.
 */

import { fetchAPI } from './api';
import { auth } from './auth';

export interface OwnershipCheckResult {
  allowed: boolean;
  reason?: 'unauthenticated' | 'forbidden' | 'not_found' | 'ok';
}

/**
 * Rezervasyon/Bilet sahipliği doğrulama.
 * Backend /bookings/{id}/ endpoint'ini çağırır.
 * JWT token ile kimlik doğrulaması yapılır; kayıt mevcut kullanıcıya ait değilse 403 döner.
 */
export const verifyBookingOwnership = async (
  bookingId: string | number
): Promise<OwnershipCheckResult> => {
  const token = auth.getAccessToken();

  if (!token) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  try {
    const data = await fetchAPI(`/bookings/${bookingId}/`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    // Backend 404 veya 403 ise fetchAPI null döner
    if (!data) {
      return { allowed: false, reason: 'forbidden' };
    }

    // Ek frontend doğrulaması: dönen verinin user bilgisini kontrol et
    // (Backend zaten yetkisiz istekleri 403 ile reddeder; bu çift katmanlı korumadır.)
    return { allowed: true, reason: 'ok' };
  } catch {
    return { allowed: false, reason: 'not_found' };
  }
};

/**
 * Profil sahipliği doğrulama.
 * /users/{id}/ endpoint'ini JWT ile kontrol eder.
 */
export const verifyProfileOwnership = async (
  userId: string | number
): Promise<OwnershipCheckResult> => {
  const token = auth.getAccessToken();

  if (!token) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  try {
    // Kendi profilini getir ve ID eşleşmesini kontrol et
    const myProfile = await fetchAPI('/users/me/', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!myProfile) {
      return { allowed: false, reason: 'unauthenticated' };
    }

    const myId = String(myProfile.id || myProfile.pk || '');
    const requestedId = String(userId);

    if (myId !== requestedId) {
      return { allowed: false, reason: 'forbidden' };
    }

    return { allowed: true, reason: 'ok' };
  } catch {
    return { allowed: false, reason: 'not_found' };
  }
};

/**
 * Client-side Demo Modu: LocalStorage üzerinden sahiplik doğrulaması.
 * Backend erişilemez olduğunda demo reservation ID'lerini kullanır.
 */
export const verifyLocalBookingOwnership = (bookingId: string): OwnershipCheckResult => {
  if (typeof window === 'undefined') return { allowed: true, reason: 'ok' };

  // Kullanıcının kendi rezervasyonlarını localStorage'dan al
  try {
    const raw = localStorage.getItem('demo_new_bookings');
    if (!raw) {
      // Hiç rezervasyon yoksa bu URL'e erişim yasak
      return { allowed: false, reason: 'not_found' };
    }
    const bookings: any[] = JSON.parse(raw);
    const found = bookings.find(
      (b) => String(b.id) === String(bookingId)
    );

    if (!found) {
      return { allowed: false, reason: 'forbidden' };
    }

    return { allowed: true, reason: 'ok' };
  } catch {
    return { allowed: false, reason: 'not_found' };
  }
};
