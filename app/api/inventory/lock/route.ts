/**
 * TRANSACTION-RACE-CONDITION-LOCK: API Routes
 *
 * POST /api/inventory/lock   — Kilit edin (ödeme başlamadan önce)
 * DELETE /api/inventory/lock — Kilidi serbest bırak (ödeme başarısız)
 * GET /api/inventory/lock    — Kilit durumunu sorgula
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  acquireInventoryLock,
  releaseInventoryLock,
  convertHoldToBooking,
  getHoldStatus,
  listActiveHolds,
  acquirePromoLock,
  type InventoryHold,
} from '../../lib/inventoryLock';

const getSessionId = (req: NextRequest): string => {
  // Gerçekte: JWT'den user ID veya session cookie'den
  return (
    req.cookies.get('session_id')?.value ||
    req.headers.get('x-session-id') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    'anonymous'
  );
};

// ─── POST: Kilit Edin ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resourceId,     // Tur ID'si veya promo kodu
      resourceType,   // 'tour_slot' | 'promo_code' | 'ticket'
      date,           // Tur tarihi (YYYY-MM-DD)
      quantity = 1,   // Kaç kişilik kontenjan
      action,         // 'acquire' | 'release' | 'convert'
      holdId,         // Mevcut kilit ID'si (release/convert için)
    } = body;

    const sessionId = getSessionId(req);

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId zorunlu' }, { status: 400 });
    }

    // ── Kilit Edin ───────────────────────────────────────────────────────────
    if (!action || action === 'acquire') {
      const isPromo = resourceType === 'promo_code';
      const result = isPromo
        ? acquirePromoLock(resourceId, sessionId)
        : acquireInventoryLock(resourceId, sessionId, quantity, resourceType || 'tour_slot', date);

      if (result.success) {
        return NextResponse.json({
          success: true,
          holdId: result.holdId,
          expiresAt: result.expiresAt,
          expiresIn: Math.round((result.expiresAt! - Date.now()) / 1000),
          message: 'Bilet başarıyla rezerve edildi. 5 dakika içinde ödemenizi tamamlayın.',
        }, { status: 200 });
      } else {
        const remainingSec = Math.ceil((result.remainingMs || 0) / 1000);
        return NextResponse.json({
          success: false,
          reason: result.reason,
          retryAfterSeconds: remainingSec,
          message: `${result.reason} Lütfen ${remainingSec} saniye içinde tekrar deneyin.`,
        }, { status: 409 }); // 409 Conflict — en doğru HTTP kodu
      }
    }

    // ── Kilidi Serbest Bırak ─────────────────────────────────────────────────
    if (action === 'release') {
      if (!holdId) return NextResponse.json({ error: 'holdId zorunlu' }, { status: 400 });
      const result = releaseInventoryLock(resourceId, holdId, sessionId, date);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // ── Kalıcı Rezervasyona Dönüştür ─────────────────────────────────────────
    if (action === 'convert') {
      if (!holdId) return NextResponse.json({ error: 'holdId zorunlu' }, { status: 400 });
      const success = convertHoldToBooking(resourceId, holdId, date);
      return NextResponse.json({ success }, { status: success ? 200 : 400 });
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// ─── GET: Durum Sorgula ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get('resourceId');
  const date = searchParams.get('date') || undefined;
  const adminToken = req.headers.get('x-admin-token');

  // Admin: tüm aktif kilitları listele
  if (adminToken === (process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret')) {
    const holds = listActiveHolds();
    return NextResponse.json({ holds, count: holds.length });
  }

  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId gerekli' }, { status: 400 });
  }

  const status = getHoldStatus(resourceId, date);
  return NextResponse.json({
    ...status,
    remainingSec: status.remainingMs ? Math.ceil(status.remainingMs / 1000) : undefined,
  });
}
