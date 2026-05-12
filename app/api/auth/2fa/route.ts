/**
 * 2FA API Route
 * POST /api/auth/2fa — Initiate or Verify 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiate2FA, verify2FACode } from '@/app/lib/twoFactor';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, userId, username, sessionId, code } = body;

        // 1. İkinci adımı başlat (Kod üret ve gönder)
        if (action === 'initiate') {
            if (!userId || !username) return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
            
            const newSessionId = await initiate2FA(userId, username);
            return NextResponse.json({ sessionId: newSessionId });
        }

        // 2. Kodu doğrula
        if (action === 'verify') {
            if (!sessionId || !code) return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
            
            const result = verify2FACode(sessionId, code);
            if (result.success) {
                return NextResponse.json({ success: true });
            } else {
                return NextResponse.json({ error: result.error }, { status: 401 });
            }
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
