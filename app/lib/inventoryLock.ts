/**
 * TRANSACTION-RACE-CONDITION-LOCK
 * Stok Kilitleme ve Race Condition Koruması
 * 
 * Nasıl Çalışır:
 *     1. Müşteri ödeme formunu açtığında bir "Geçici Rezervasyon" (hold) oluşturulur
 *     2. Bu hold, seçilen tarih ve kontenjan sayısını 5 dakika (300 saniye) kilitler
 *     3. Aynı anda başka bir müşteri aynı tur + tarih + kontenjan için hold talep ederse
 *        "Şu an başka bir müşteri işlem yapıyor" mesajı alır
 *     4. 5 dakika sonra hold dolunca kilit otomatik açılır
 *     5. Ödeme başarılıysa hold kalıcı rezervasyona dönüşür
 *     6. Ödeme başarısızsa hold anında serbest bırakılır
 * 
 * Veritabanı Katmanı:
 *     Django'da BookingHold modeli: select_for_update() + atomic transaction
 *     Bu modül Next.js katmanındaki hafıza içi kilit simülasyonudur.
 *     Production'da gerçek kilit Django tarafından yönetilir.
 * 
 * İndirim Kodu Kilidi:
 *     Aynı mantık promo kodları için de uygulanır:
 *     Bir kod aynı anda birden fazla kişi tarafından kullanılamaz.
 */

export interface InventoryHold {
  /** Benzersiz hold ID'si */
  holdId: string;
  /** Hangi kaynağı kilitlediği (tur ID'si, promo kodu vb.) */
  resourceId: string;
  /** Kaynak türü */
  resourceType: 'tour_slot' | 'promo_code' | 'ticket';
  /** Belirli bir tarih için (tur slotları) */
  date?: string;
  /** Kilitlenen kontenjan miktarı */
  quantity: number;
  /** Kilidi tutan kullanıcı/oturum ID'si */
  sessionId: string;
  /** Kilidin oluşturulma zamanı (Unix ms) */
  createdAt: number;
  /** Kilidin sona erme zamanı (Unix ms) */
  expiresAt: number;
  /** Kilit durumu */
  status: 'active' | 'released' | 'converted';
}

// ─── Merkezi Kilit Deposu ─────────────────────────────────────────────────────
// Production'da Redis'e taşınır:
// SETNX tourkia:hold:<resourceId>:<date> <holdId> PX 300000
const holdRegistry = new Map<string, InventoryHold>();

/** Süresi dolmuş kilitları temizler */
const evictExpiredHolds = (): void => {
  const now = Date.now();
  for (const [key, hold] of holdRegistry.entries()) {
    if (hold.expiresAt <= now && hold.status === 'active') {
      holdRegistry.delete(key);
    }
  }
};

/** Hold'un registry anahtarını üretir */
const holdKey = (resourceId: string, date?: string): string =>
  date ? `${resourceId}::${date}` : resourceId;

// ─── Kilit Edinme ─────────────────────────────────────────────────────────────
export const HOLD_TTL_MS = 5 * 60 * 1000; // 5 dakika
export const PROMO_HOLD_TTL_MS = 30 * 1000; // 30 saniye (promo kodları için)

export interface AcquireLockResult {
  success: boolean;
  holdId?: string;
  expiresAt?: number;
  /** Başarısız olduğunda mevcut kilitin kalan süresi (ms) */
  remainingMs?: number;
  reason?: string;
}

/**
 * Belirtilen kaynak için kilit edinmeyi dener.
 *
 * Atomik Çalışma Prensibi:
 * 1. Önce mevcut aktif kilitları temizle (TTL geçmişleri)
 * 2. Kaynak için aktif kilit var mı kontrol et
 * 3. Yoksa yeni kilit oluştur ve kaydet
 * 4. Varsa kalan süreyi döndür
 *
 * Production'da bu işlem Redis SETNX veya
 * PostgreSQL SELECT FOR UPDATE SKIP LOCKED ile yapılır.
 */
export const acquireInventoryLock = (
  resourceId: string,
  sessionId: string,
  quantity: number,
  resourceType: InventoryHold['resourceType'] = 'tour_slot',
  date?: string,
  ttlMs: number = HOLD_TTL_MS
): AcquireLockResult => {
  evictExpiredHolds();

  const key = holdKey(resourceId, date);
  const now = Date.now();

  // Mevcut aktif kilit kontrolü
  const existingHold = holdRegistry.get(key);
  if (existingHold && existingHold.status === 'active' && existingHold.expiresAt > now) {
    // Aynı oturum mu? (kullanıcı sayfayı yeniledi)
    if (existingHold.sessionId === sessionId) {
      // Kendi kilidi — TTL'i yenile
      existingHold.expiresAt = now + ttlMs;
      holdRegistry.set(key, existingHold);
      return {
        success: true,
        holdId: existingHold.holdId,
        expiresAt: existingHold.expiresAt,
      };
    }

    // Başka bir oturumun kilidi
    return {
      success: false,
      remainingMs: existingHold.expiresAt - now,
      reason: `Bu ${resourceType === 'promo_code' ? 'indirim kodu' : 'bilet'} şu an başka bir müşterinin sepetinde işlem görüyor.`,
    };
  }

  // Yeni kilit oluştur
  const holdId = `HOLD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const hold: InventoryHold = {
    holdId,
    resourceId,
    resourceType,
    date,
    quantity,
    sessionId,
    createdAt: now,
    expiresAt: now + ttlMs,
    status: 'active',
  };

  holdRegistry.set(key, hold);

  return {
    success: true,
    holdId,
    expiresAt: hold.expiresAt,
  };
};

// ─── Kilidi Serbest Bırakma ────────────────────────────────────────────────────
/**
 * Bir kilidi serbest bırakır.
 * Ödeme başarısızsa HEMEN çağrılmalı — başka kullanıcı bekletilmesin.
 */
export const releaseInventoryLock = (
  resourceId: string,
  holdId: string,
  sessionId: string,
  date?: string
): { success: boolean; reason?: string } => {
  const key = holdKey(resourceId, date);
  const hold = holdRegistry.get(key);

  if (!hold) {
    return { success: false, reason: 'Kilit bulunamadı veya zaten serbest' };
  }
  if (hold.holdId !== holdId) {
    return { success: false, reason: 'Kilit ID uyuşmazlığı — yetkisiz serbest bırakma girişimi' };
  }
  if (hold.sessionId !== sessionId) {
    return { success: false, reason: 'Oturum uyuşmazlığı — bu kilidi başka oturum edinmiş' };
  }

  holdRegistry.delete(key);
  return { success: true };
};

// ─── Kilidi Kalıcı Rezervasyona Dönüştür ─────────────────────────────────────
/**
 * Ödeme başarılıysa kilidi "converted" olarak işaretle.
 * Bu, kilidin başarıyla tüketime döndüğünü gösterir.
 */
export const convertHoldToBooking = (
  resourceId: string,
  holdId: string,
  date?: string
): boolean => {
  const key = holdKey(resourceId, date);
  const hold = holdRegistry.get(key);
  if (!hold || hold.holdId !== holdId) return false;

  hold.status = 'converted';
  holdRegistry.set(key, hold);
  return true;
};

// ─── İndirim Kodu Kilidi (Özel Kısayol) ──────────────────────────────────────
/**
 * Promo kodunu 30 saniyeliğine kilitler.
 * Aynı anda 10 kişi aynı kodu kullansa bile sadece 1 tanesi geçer.
 */
export const acquirePromoLock = (
  promoCode: string,
  sessionId: string
): AcquireLockResult => {
  return acquireInventoryLock(
    `promo:${promoCode.toUpperCase()}`,
    sessionId,
    1,
    'promo_code',
    undefined,
    PROMO_HOLD_TTL_MS
  );
};

export const releasePromoLock = (promoCode: string, holdId: string, sessionId: string) =>
  releaseInventoryLock(`promo:${promoCode.toUpperCase()}`, holdId, sessionId);

// ─── Durum Sorgulama ──────────────────────────────────────────────────────────
export const getHoldStatus = (resourceId: string, date?: string): {
  locked: boolean;
  remainingMs?: number;
  holdId?: string;
} => {
  evictExpiredHolds();
  const key = holdKey(resourceId, date);
  const hold = holdRegistry.get(key);
  if (!hold || hold.status !== 'active') {
    return { locked: false };
  }
  const remainingMs = hold.expiresAt - Date.now();
  if (remainingMs <= 0) {
    holdRegistry.delete(key);
    return { locked: false };
  }
  return { locked: true, remainingMs, holdId: hold.holdId };
};

/** Tüm aktif kilitların listesi (admin/debug için) */
export const listActiveHolds = (): InventoryHold[] => {
  evictExpiredHolds();
  return Array.from(holdRegistry.values()).filter((h) => h.status === 'active');
};
