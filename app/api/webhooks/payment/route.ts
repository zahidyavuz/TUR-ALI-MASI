/**
 * PAYMENT-WEBHOOK-ARMOR
 * Merkezi Ödeme Webhook Alıcısı — Next.js App Router API Route
 *
 * Endpoint: POST /api/webhooks/payment
 *
 * Bu route tüm ödeme sağlayıcılarından gelen webhook'ları tek noktada alır.
 * Sağlayıcıyı header'lardan otomatik tespit eder ve ilgili imza doğrulamasını uygular.
 *
 * Güvenlik Politikaları:
 * - İmza doğrulaması ZORUNLU — başarısız olursa 401 döner
 * - Raw body (ham içerik) kullanılır — JSON parse edilmiş gövde imzayı bozar
 * - Her başarısız istek FraudAlert olarak loglanır
 * - 5 dakikadan eski Stripe event'leri reddedilir (Replay Attack koruması)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyStripeSignature,
  verifyIyzicoSignature,
  verifyPayTRSignature,
  logFraudAlert,
  sendFraudAlertEmail,
  getFraudLog,
} from '@/app/lib/webhookArmor';

// ─── Yardımcı: IP Tespiti ─────────────────────────────────────────────────────
const getClientIp = (req: NextRequest): string => {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
};

// ─── Yardımcı: Sağlayıcı Tespiti ─────────────────────────────────────────────
const detectProvider = (req: NextRequest): 'stripe' | 'iyzico' | 'paytr' | 'unknown' => {
  if (req.headers.get('stripe-signature')) return 'stripe';
  if (req.headers.get('x-iyz-signature') || req.headers.get('x-iyzi-signature')) return 'iyzico';
  if (req.headers.get('x-paytr-signature') || req.headers.get('x-paytr-request-id')) return 'paytr';
  return 'unknown';
};

// ─── Ana POST Handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const provider = detectProvider(req);

  // Ham body'yi oku — JSON.parse() değil! İmza hesaplaması raw body gerektirir.
  const rawBody = await req.text();

  // Header'ları loglama için topla
  const rawHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Authorization header'ı loglama
    if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
      rawHeaders[key] = value;
    }
  });

  // ─── Bilinmeyen Sağlayıcı Reddi ────────────────────────────────────────────
  if (provider === 'unknown') {
    const alert = logFraudAlert({
      timestamp: new Date().toISOString(),
      provider: 'unknown',
      ip,
      reason: 'Tanımsız ödeme sağlayıcısı — imza header\'ı bulunamadı',
      rawHeaders,
      severity: 'high',
    });
    await sendFraudAlertEmail(alert);

    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNKNOWN_PROVIDER' },
      { status: 401 }
    );
  }

  // ─── STRIPE Doğrulaması ─────────────────────────────────────────────────────
  if (provider === 'stripe') {
    const signatureHeader = req.headers.get('stripe-signature') || '';
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!secret) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET env değişkeni tanımlanmamış!');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const result = verifyStripeSignature(rawBody, signatureHeader, secret);

    if (!result.valid) {
      const alert = logFraudAlert({
        timestamp: new Date().toISOString(),
        provider: 'stripe',
        ip,
        reason: result.reason || 'Stripe imza doğrulaması başarısız',
        rawHeaders,
        severity: 'critical',
      });
      await sendFraudAlertEmail(alert);

      return NextResponse.json(
        { error: 'Invalid signature', code: 'STRIPE_SIG_MISMATCH', alertId: alert.id },
        { status: 401 }
      );
    }

    // İmza doğrulandı — event'i işle
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    await handleStripeEvent(event);
    return NextResponse.json({ received: true, provider: 'stripe' }, { status: 200 });
  }

  // ─── İYZİCO Doğrulaması ────────────────────────────────────────────────────
  if (provider === 'iyzico') {
    const signatureHeader = req.headers.get('x-iyz-signature') || req.headers.get('x-iyzi-signature') || '';
    const secret = process.env.IYZICO_WEBHOOK_SECRET || '';

    if (!secret) {
      console.error('[WEBHOOK] IYZICO_WEBHOOK_SECRET env değişkeni tanımlanmamış!');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const result = verifyIyzicoSignature(rawBody, signatureHeader, secret);

    if (!result.valid) {
      const alert = logFraudAlert({
        timestamp: new Date().toISOString(),
        provider: 'iyzico',
        ip,
        reason: result.reason || 'İyzico imza doğrulaması başarısız',
        rawHeaders,
        severity: 'critical',
      });
      await sendFraudAlertEmail(alert);

      return NextResponse.json(
        { error: 'Invalid signature', code: 'IYZICO_SIG_MISMATCH', alertId: alert.id },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    await handleIyzicoEvent(payload);
    return NextResponse.json({ received: true, provider: 'iyzico' }, { status: 200 });
  }

  // ─── PAYTR Doğrulaması ──────────────────────────────────────────────────────
  if (provider === 'paytr') {
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const result = verifyPayTRSignature(
      payload.merchant_id || '',
      payload.merchant_oid || '',
      payload.status || '',
      payload.hash || '',
      process.env.PAYTR_MERCHANT_KEY || '',
      process.env.PAYTR_MERCHANT_SALT || ''
    );

    if (!result.valid) {
      const alert = logFraudAlert({
        timestamp: new Date().toISOString(),
        provider: 'paytr',
        ip,
        reason: result.reason || 'PayTR imza doğrulaması başarısız',
        rawHeaders,
        severity: 'critical',
      });
      await sendFraudAlertEmail(alert);

      return NextResponse.json(
        { error: 'Invalid signature', code: 'PAYTR_SIG_MISMATCH', alertId: alert.id },
        { status: 401 }
      );
    }

    await handlePayTREvent(payload);
    return NextResponse.json({ received: true, provider: 'paytr' }, { status: 200 });
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

// ─── GET: Admin Fraud Log Görüntüleme ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Sadece dahili sistem çağrıları için (admin token kontrolü)
  const adminToken = req.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret';

  if (adminToken !== expectedToken) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const log = getFraudLog();
  return NextResponse.json({ alerts: log, count: log.length }, { status: 200 });
}

// ─── Event Handler'ları (Sağlayıcı Başına) ───────────────────────────────────
async function handleStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log(`[STRIPE] ✅ Ödeme onaylandı: ${event.data.object.id}`);
      // Rezervasyonu onayla, bileti oluştur, e-posta gönder
      break;

    case 'payment_intent.payment_failed':
      console.warn(`[STRIPE] ❌ Ödeme başarısız: ${event.data.object.id}`);
      // Rezervasyonu iptal et
      break;

    case 'charge.dispute.created':
      console.error(`[STRIPE] 🚨 Ödeme itirazı (Chargeback): ${event.data.object.id}`);
      // Admin'e alarm gönder
      break;

    default:
      console.log(`[STRIPE] Event işlenmedi: ${event.type}`);
  }
}

async function handleIyzicoEvent(payload: any): Promise<void> {
  const status = payload?.paymentStatus || payload?.status;
  console.log(`[IYZICO] Event alındı: status=${status}, conversationId=${payload?.conversationId}`);

  if (status === 'SUCCESS') {
    // Rezervasyonu onayla
    console.log('[IYZICO] ✅ Ödeme onaylandı');
  } else {
    console.warn(`[IYZICO] ❌ Ödeme başarısız: ${status}`);
  }
}

async function handlePayTREvent(payload: any): Promise<void> {
  console.log(`[PAYTR] Event alındı: orderId=${payload?.merchant_oid}, status=${payload?.status}`);

  if (payload?.status === 'success') {
    console.log('[PAYTR] ✅ Ödeme onaylandı');
  } else {
    console.warn(`[PAYTR] ❌ Ödeme başarısız: ${payload?.failed_reason_msg}`);
  }
}
