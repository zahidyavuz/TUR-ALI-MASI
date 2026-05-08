/**
 * ADMIN-AUDIT-BLACKBOX: API Route
 * GET  /api/audit — Log listesi sorgulama
 * POST /api/audit — Yeni log girdisi yazma
 *
 * Güvenlik:
 * - GET: Admin token doğrulaması gerekli
 * - POST: Server-side internal çağrılar için (JWT doğrulaması)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  logAudit,
  queryAuditLog,
  verifyLogIntegrity,
  type AuditAction,
  type AuditResource,
} from '../../lib/auditLog';

const getClientIp = (req: NextRequest): string =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  req.headers.get('x-real-ip') ||
  'unknown';

// ─── GET: Log Sorgulama ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Admin token kontrolü
  const adminToken = req.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret';

  if (adminToken !== expectedToken) {
    return NextResponse.json({ error: 'Forbidden — Admin token gerekli' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  const { entries, total } = queryAuditLog({
    actorUsername: searchParams.get('actor') || undefined,
    action: (searchParams.get('action') as AuditAction) || undefined,
    resourceType: (searchParams.get('resource') as AuditResource) || undefined,
    resourceId: searchParams.get('resourceId') || undefined,
    fromDate: searchParams.get('from') || undefined,
    toDate: searchParams.get('to') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  // Log zinciri bütünlüğünü kontrol et
  const integrity = verifyLogIntegrity();

  return NextResponse.json({
    entries,
    total,
    integrity,
    generatedAt: new Date().toISOString(),
  });
}

// ─── POST: Log Yazma ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Internal server-side çağrı doğrulaması
  const internalKey = req.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_AUDIT_KEY || 'tourkia_audit_internal';

  if (internalKey !== expectedKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const ip = body.ip || getClientIp(req);
    const userAgent = body.userAgent || req.headers.get('user-agent') || 'unknown';

    const entry = logAudit({ ...body, ip, userAgent });
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
