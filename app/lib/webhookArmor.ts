/**
 * PAYMENT-WEBHOOK-ARMOR
 * Ödeme Webhook İmza Doğrulama Motoru
 *
 * Desteklenen Sağlayıcılar:
 * - Stripe    → Webhook-Signature (HMAC-SHA256, timestamp replay koruması)
 * - İyzico    → X-IYZ-Signature (HMAC-SHA1 Base64)
 * - PayTR     → hash (HMAC-SHA256)
 *
 * Güvenlik İlkesi:
 * - Gizli webhook anahtarı sadece ortam değişkeninde (.env) tutulur
 * - Her webhook isteğinin imzası HMAC ile yeniden hesaplanır ve karşılaştırılır
 * - 5 dakikadan eski Stripe event'leri reddedilir (Replay Attack koruması)
 * - İmza uyuşmazlığı → FraudAlert kaydı + yönetici e-postası
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ─── Fraud Alert Kaydı ────────────────────────────────────────────────────────
export interface FraudAlert {
  id: string;
  timestamp: string;
  provider: 'stripe' | 'iyzico' | 'paytr' | 'unknown';
  ip: string;
  reason: string;
  rawHeaders: Record<string, string>;
  severity: 'high' | 'critical';
}

/** Bellek içi fraud log (production'da DB'ye yazılmalı) */
const fraudLog: FraudAlert[] = [];

export const logFraudAlert = (alert: Omit<FraudAlert, 'id'>): FraudAlert => {
  const entry: FraudAlert = {
    id: `FRAUD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    ...alert,
  };
  fraudLog.unshift(entry);
  // Maksimum 100 kayıt tut (FIFO)
  if (fraudLog.length > 100) fraudLog.pop();

  console.error(`[FRAUD ALERT] ${entry.severity.toUpperCase()} — ${entry.reason} | IP: ${entry.ip} | ID: ${entry.id}`);
  return entry;
};

export const getFraudLog = (): FraudAlert[] => [...fraudLog];

// ─── Zamanlama Güvenli String Karşılaştırma ───────────────────────────────────
/**
 * Timing attack'a karşı güvenli karşılaştırma.
 * Normal === karşılaştırması süreye göre ipucu sızıntısına yol açabilir.
 */
const safeCompare = (a: string, b: string): boolean => {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

// ─── STRIPE İmza Doğrulaması ─────────────────────────────────────────────────
/**
 * Stripe webhook imzasını doğrular.
 * Header: stripe-signature: t=<timestamp>,v1=<hmac_sha256>
 *
 * Doğrulama adımları:
 * 1. Header'dan timestamp ve imzayı parse et
 * 2. "timestamp.rawBody" string'ini HMAC-SHA256 ile imzala
 * 3. Hesaplanan imzayı gelen v1 ile karşılaştır
 * 4. Timestamp'in 5 dakikadan eski olmadığını kontrol et
 */
export const verifyStripeSignature = (
  rawBody: string,
  signatureHeader: string,
  secret: string
): { valid: boolean; reason?: string } => {
  try {
    const parts = signatureHeader.split(',');
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tPart || !v1Part) {
      return { valid: false, reason: 'Stripe imza header\'ı eksik veya hatalı format' };
    }

    const timestamp = tPart.slice(2);
    const receivedSig = v1Part.slice(3);
    const signedPayload = `${timestamp}.${rawBody}`;

    // HMAC-SHA256 hesapla
    const expectedSig = createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Timing-safe karşılaştırma
    if (!safeCompare(expectedSig, receivedSig)) {
      return { valid: false, reason: 'Stripe imzası eşleşmedi — HMAC-SHA256 uyumsuzluğu' };
    }

    // Replay Attack koruması: 5 dakika tolerance
    const now = Math.floor(Date.now() / 1000);
    const eventTime = parseInt(timestamp, 10);
    const TOLERANCE_SECONDS = 5 * 60; // 5 dakika

    if (Math.abs(now - eventTime) > TOLERANCE_SECONDS) {
      return { valid: false, reason: `Stripe event zaman aşımı — ${Math.abs(now - eventTime)}s gecikme (limit: ${TOLERANCE_SECONDS}s)` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Stripe doğrulama hatası: ${String(err)}` };
  }
};

// ─── İYZİCO İmza Doğrulaması ─────────────────────────────────────────────────
/**
 * İyzico webhook imzasını doğrular.
 * İyzico imzalama: HMAC-SHA256(secretKey + base64(payload))
 */
export const verifyIyzicoSignature = (
  payload: string,
  receivedSignature: string,
  secretKey: string
): { valid: boolean; reason?: string } => {
  try {
    const dataToSign = secretKey + payload;
    const expectedSig = createHmac('sha256', secretKey)
      .update(dataToSign, 'utf8')
      .digest('base64');

    if (!safeCompare(expectedSig, receivedSignature)) {
      return { valid: false, reason: 'İyzico imzası eşleşmedi — HMAC-SHA256 uyumsuzluğu' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `İyzico doğrulama hatası: ${String(err)}` };
  }
};

// ─── PAYTR İmza Doğrulaması ──────────────────────────────────────────────────
/**
 * PayTR webhook imzasını doğrular.
 * PayTR imzalama: HMAC-SHA256(merchantId + orderId + status + merchantKey)
 */
export const verifyPayTRSignature = (
  merchantId: string,
  orderId: string,
  status: string,
  receivedHash: string,
  merchantKey: string,
  merchantSalt: string
): { valid: boolean; reason?: string } => {
  try {
    const dataToSign = `${merchantId}${orderId}${status}${merchantKey}${merchantSalt}`;
    const expectedHash = createHmac('sha256', merchantKey)
      .update(dataToSign, 'utf8')
      .digest('base64');

    if (!safeCompare(expectedHash, receivedHash)) {
      return { valid: false, reason: 'PayTR imzası eşleşmedi — HMAC-SHA256 uyumsuzluğu' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `PayTR doğrulama hatası: ${String(err)}` };
  }
};

// ─── Admin E-posta Bildirimi (Simülasyon) ─────────────────────────────────────
/**
 * Fraud tespitinde yöneticiye alarm gönderir.
 * Production'da SendGrid / Resend / SMTP ile gerçek e-posta atılır.
 */
export const sendFraudAlertEmail = async (alert: FraudAlert): Promise<void> => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@tourkia.com';

  console.warn(`
╔══════════════════════════════════════════════════════╗
║  🚨 TOURKIA FRAUD ALERT — ${alert.severity.toUpperCase().padEnd(8)} ║
╠══════════════════════════════════════════════════════╣
║  ID       : ${alert.id}
║  Zaman    : ${alert.timestamp}
║  Sağlayıcı: ${alert.provider}
║  IP       : ${alert.ip}
║  Sebep    : ${alert.reason}
║  Admin    : ${adminEmail}
╚══════════════════════════════════════════════════════╝
  `);

  // Production'da burada SendGrid/Resend API'si çağrılır:
  // await sendgrid.send({ to: adminEmail, subject: `🚨 FRAUD ALERT: ${alert.id}`, html: ... });
};
