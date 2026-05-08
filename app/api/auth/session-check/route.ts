/**
 * SESSION-GUARD API
 * POST /api/auth/session-check
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSessionIntegrity } from '../../../lib/sessionGuard';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId, userId } = body;
        
        // IP Adresini al (Proxy/Load Balancer desteği ile)
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                   req.headers.get('x-real-ip') || 
                   '127.0.0.1';

        if (!sessionId || !userId) {
            return NextResponse.json({ error: 'Eksik oturum bilgisi' }, { status: 400 });
        }

        const result = await validateSessionIntegrity(sessionId, userId, ip);

        if (!result.valid) {
            // Anomali durumunda log tut (Internal API üzerinden)
            fetch(`${req.nextUrl.origin}/api/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': 'tourkia_audit_internal'
                },
                body: JSON.stringify({
                    actorId: userId.toString(),
                    actorUsername: 'Session-Guard',
                    actorRole: 'system',
                    action: 'SESSION_HIJACK_DETECTED',
                    resourceType: 'session',
                    resourceId: sessionId,
                    resourceLabel: 'Kritik Oturum Anomalisi',
                    description: result.reason,
                    ip: ip
                })
            }).catch(() => {});

            return NextResponse.json({ 
                error: 'SESSION_ANOMALY', 
                message: result.reason 
            }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
