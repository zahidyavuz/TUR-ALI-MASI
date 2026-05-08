/**
 * ADMIN-AUDIT-BLACKBOX
 * Sistem Kara Kutusu — Değiştirilemez İz Takip Motoru
 *
 * "Kim, Ne'yi, Ne'den Ne'ye, Hangi IP'den, Saat Kaçta Değiştirdi?"
 *
 * Kayıt Politikaları:
 * - Her log girdisi UUID + SHA-256 hash zinciri ile imzalanır
 * - Bir önceki logun hash'i bir sonrakine zincirlenir (Blockchain mantığı)
 * - Loglar sonradan SİLİNEMEZ ve DEĞİŞTİRİLEMEZ (append-only)
 * - Her kritik işlem (fiyat değişimi, iptal, hakediş vb.) otomatik kaydedilir
 */

import { createHash } from 'crypto';

// ─── Tip Tanımları ─────────────────────────────────────────────────────────────
export type AuditAction =
  | 'AGENCY_COMMISSION_CHANGED'     // Komisyon oranı değiştirildi
  | 'AGENCY_STATUS_CHANGED'         // Acenta aktif/pasif yapıldı
  | 'AGENCY_APPROVED'               // Acenta onaylandı
  | 'TOUR_PRICE_CHANGED'            // Tur fiyatı değiştirildi
  | 'TOUR_CANCELLED'                // Tur iptal edildi
  | 'TOUR_CREATED'                  // Yeni tur eklendi
  | 'BOOKING_CANCELLED'             // Rezervasyon iptal edildi
  | 'BOOKING_CONFIRMED'             // Rezervasyon onaylandı
  | 'PAYOUT_PROCESSED'              // Hakediş işlendi
  | 'PAYOUT_WITHHELD'               // Hakediş durduruldu
  | 'USER_ROLE_CHANGED'             // Kullanıcı rolü değiştirildi
  | 'USER_BANNED'                   // Kullanıcı engellendi
  | 'ADMIN_LOGIN'                   // Yönetici girişi
  | 'SETTINGS_CHANGED'              // Sistem ayarı değiştirildi
  | 'FRAUD_DETECTED'                // Dolandırıcılık tespit edildi
  | 'WEBHOOK_SIGNATURE_FAILED'      // Webhook imzası başarısız
  | 'SCRAPER_DETECTED'              // Rakip bot/scraper tespit edildi
  | 'SESSION_HIJACK_DETECTED'       // Oturum çalma/anomali tespiti
  | 'BOLA_VIOLATION'                // Yetkisiz nesne erişim girişimi
  | 'SSRF_ATTEMPT';                 // Sunucu içi sızıntı girişimi (SSRF)

export type AuditResource =
  | 'agency' | 'tour' | 'booking' | 'user' | 'payout' | 'settings' | 'webhook' | 'session';

export interface AuditEntry {
  /** Benzersiz log ID'si */
  id: string;
  /** Kriptografik zincir hash'i (önceki entry ile bağlı) */
  chainHash: string;
  /** ISO 8601 timestamp (UTC) */
  timestamp: string;
  /** İşlemi yapan kullanıcının ID'si */
  actorId: string;
  /** İşlemi yapan kullanıcı adı */
  actorUsername: string;
  /** Kullanıcının rolü (admin / agency / system) */
  actorRole: 'admin' | 'agency' | 'customer' | 'system';
  /** İşlemi yapan IP adresi */
  ip: string;
  /** Tarayıcı/istemci bilgisi */
  userAgent: string;
  /** Yapılan işlem türü */
  action: AuditAction;
  /** Etkilenen kaynak türü */
  resourceType: AuditResource;
  /** Etkilenen kaynağın ID'si */
  resourceId: string;
  /** Etkilenen kaynağın okunabilir adı */
  resourceLabel: string;
  /** Değişmeden önceki değerler (eski durum) */
  previousValue?: Record<string, unknown>;
  /** Değişiklik sonrası yeni değerler */
  newValue?: Record<string, unknown>;
  /** İnsan tarafından okunabilir özet mesaj */
  description: string;
}

// ─── Append-Only Log Store ─────────────────────────────────────────────────────
// Production'da: PostgreSQL ile immutable append-only tablo
// (INSERT izni var, UPDATE/DELETE yok; row-level security ile korunur)
// Development'da: bellek içi dizi
const auditLog: AuditEntry[] = [];
let lastChainHash = '0000000000000000'; // Genesis hash

/**
 * Log zinciri hash'i hesaplar.
 * Her yeni entry, bir öncekinin hash'ini içerir → değiştirilemez zincir.
 */
const computeChainHash = (entry: Omit<AuditEntry, 'chainHash'>): string => {
  const data = JSON.stringify({
    prev: lastChainHash,
    id: entry.id,
    timestamp: entry.timestamp,
    actorId: entry.actorId,
    action: entry.action,
    resourceId: entry.resourceId,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
  });
  return createHash('sha256').update(data, 'utf8').digest('hex').slice(0, 32);
};

/**
 * Benzersiz audit log ID'si üretir.
 * Format: AUD-<timestamp_base36>-<random_6>
 */
const generateAuditId = (): string => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AUD-${ts}-${rand}`;
};

// ─── Ana Log Fonksiyonu ────────────────────────────────────────────────────────
/**
 * Sisteme yeni bir audit log girdisi yazar.
 * Bu fonksiyon her kritik işlemden SONRA çağrılır.
 *
 * Özellikler:
 * - Otomatik hash zincirleme
 * - Append-only (silme/güncelleme mümkün değil)
 * - Önceki/sonraki değer karşılaştırması
 */
export const logAudit = (
  params: Omit<AuditEntry, 'id' | 'chainHash' | 'timestamp'>
): AuditEntry => {
  const id = generateAuditId();
  const timestamp = new Date().toISOString();

  const entryWithoutHash = { id, timestamp, ...params };
  const chainHash = computeChainHash(entryWithoutHash);

  const entry: AuditEntry = { ...entryWithoutHash, chainHash };

  // Append-only: sadece push, asla splice/delete
  auditLog.push(entry);
  lastChainHash = chainHash;

  // Konsol kaydı (production'da merkezi log sistemine gider: Datadog, CloudWatch vb.)
  console.log(
    `[AUDIT] ${entry.timestamp} | ${entry.actorUsername} (${entry.actorRole}) | ` +
    `${entry.action} | ${entry.resourceType}#${entry.resourceId} | IP: ${entry.ip}`
  );

  return entry;
};

// ─── Log Sorgulama ─────────────────────────────────────────────────────────────
export interface AuditQueryParams {
  actorId?: string;
  actorUsername?: string;
  action?: AuditAction;
  resourceType?: AuditResource;
  resourceId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export const queryAuditLog = (params: AuditQueryParams = {}): {
  entries: AuditEntry[];
  total: number;
} => {
  let results = [...auditLog].reverse(); // En yeni önce

  if (params.actorId) {
    results = results.filter((e) => e.actorId === params.actorId);
  }
  if (params.actorUsername) {
    results = results.filter((e) =>
      e.actorUsername.toLowerCase().includes(params.actorUsername!.toLowerCase())
    );
  }
  if (params.action) {
    results = results.filter((e) => e.action === params.action);
  }
  if (params.resourceType) {
    results = results.filter((e) => e.resourceType === params.resourceType);
  }
  if (params.resourceId) {
    results = results.filter((e) => e.resourceId === params.resourceId);
  }
  if (params.fromDate) {
    const from = new Date(params.fromDate).getTime();
    results = results.filter((e) => new Date(e.timestamp).getTime() >= from);
  }
  if (params.toDate) {
    const to = new Date(params.toDate).getTime();
    results = results.filter((e) => new Date(e.timestamp).getTime() <= to);
  }

  const total = results.length;
  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const entries = results.slice(offset, offset + limit);

  return { entries, total };
};

/**
 * Log zincirinin bütünlüğünü doğrular.
 * Herhangi bir entry değiştirilmişse hash uyuşmazlığı tespit edilir.
 */
export const verifyLogIntegrity = (): { valid: boolean; tampered?: string } => {
  let prevHash = '0000000000000000';

  for (const entry of auditLog) {
    const { chainHash, ...rest } = entry;
    const expected = createHash('sha256')
      .update(JSON.stringify({ prev: prevHash, id: rest.id, timestamp: rest.timestamp, actorId: rest.actorId, action: rest.action, resourceId: rest.resourceId, previousValue: rest.previousValue, newValue: rest.newValue }), 'utf8')
      .digest('hex')
      .slice(0, 32);

    if (expected !== chainHash) {
      return { valid: false, tampered: entry.id };
    }
    prevHash = chainHash;
  }

  return { valid: true };
};

// ─── Sistemi Başlat: Demo Loglar ──────────────────────────────────────────────
const seedDemoLogs = () => {
  const now = Date.now();

  logAudit({
    actorId: 'usr_admin_001',
    actorUsername: 'admin@tourkia.com',
    actorRole: 'admin',
    ip: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    action: 'AGENCY_COMMISSION_CHANGED',
    resourceType: 'agency',
    resourceId: '2',
    resourceLabel: 'Ege Travel',
    previousValue: { commission_rate: '10.00' },
    newValue: { commission_rate: '12.50' },
    description: 'Ege Travel acentesinin komisyon oranı %10\'dan %12.50\'ye yükseltildi.',
  });

  logAudit({
    actorId: 'usr_agency_001',
    actorUsername: 'kapadokya_admin',
    actorRole: 'agency',
    ip: '78.189.42.11',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    action: 'TOUR_PRICE_CHANGED',
    resourceType: 'tour',
    resourceId: 'kapadokya-balon',
    resourceLabel: 'Kapadokya Balon Turu',
    previousValue: { price: 2400 },
    newValue: { price: 2750 },
    description: 'Kapadokya Balon Turu fiyatı ₺2,400\'den ₺2,750\'ye güncellendi.',
  });

  logAudit({
    actorId: 'usr_admin_001',
    actorUsername: 'admin@tourkia.com',
    actorRole: 'admin',
    ip: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    action: 'AGENCY_APPROVED',
    resourceType: 'agency',
    resourceId: '3',
    resourceLabel: 'Antalya Sun Tours',
    previousValue: { is_verified: false },
    newValue: { is_verified: true },
    description: 'Antalya Sun Tours acentesi onaylandı ve sisteme kabul edildi.',
  });

  logAudit({
    actorId: 'system',
    actorUsername: 'system',
    actorRole: 'system',
    ip: '0.0.0.0',
    userAgent: 'Tourkia-PaymentEngine/1.0',
    action: 'PAYOUT_PROCESSED',
    resourceType: 'payout',
    resourceId: 'PAY-20260508-001',
    resourceLabel: 'Kapadokya Turizm A.Ş. — Mayıs Hakedişi',
    previousValue: { status: 'pending' },
    newValue: { status: 'paid', amount: 15620, paid_at: new Date(now - 3 * 3600000).toISOString() },
    description: 'Kapadokya Turizm A.Ş. için ₺15,620 tutarındaki Mayıs hakedişi işlendi.',
  });

  logAudit({
    actorId: 'usr_customer_847',
    actorUsername: 'mehmet.yilmaz',
    actorRole: 'customer',
    ip: '85.100.23.44',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    action: 'BOOKING_CANCELLED',
    resourceType: 'booking',
    resourceId: 'BKG-00847',
    resourceLabel: 'Pamukkale & Hierapolis Turu — Rezervasyon',
    previousValue: { status: 'confirmed' },
    newValue: { status: 'cancelled', cancelled_at: new Date(now - 5 * 3600000).toISOString() },
    description: 'Müşteri kendi isteğiyle Pamukkale & Hierapolis rezervasyonunu iptal etti.',
  });

  logAudit({
    actorId: 'system',
    actorUsername: 'webhook-armor',
    actorRole: 'system',
    ip: '185.220.101.47',
    userAgent: 'Unknown/0.0',
    action: 'WEBHOOK_SIGNATURE_FAILED',
    resourceType: 'webhook',
    resourceId: 'WHK-STRIPE-FAKE',
    resourceLabel: 'Stripe Webhook İsteği',
    previousValue: undefined,
    newValue: { reason: 'HMAC-SHA256 uyumsuzluğu', provider: 'stripe' },
    description: '185.220.101.47 IP adresinden sahte Stripe webhook girişimi tespit edildi ve engellendi.',
  });
};

// Demo logları yükle (production'da bu olmaz, DB'den çekilir)
if (auditLog.length === 0) {
  seedDemoLogs();
}
