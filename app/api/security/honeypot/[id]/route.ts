/**
 * HONEYPOT TRAP API
 * GET /api/security/honeypot/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerTrap } from '../../../../lib/honeypot';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const trapId = params.id;

    // Saldırganı banla!
    triggerTrap(ip, userAgent, trapId);

    // Audit Log'a bildir (Arka planda)
    fetch(`${req.nextUrl.origin}/api/audit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-key': 'tourkia_audit_internal'
        },
        body: JSON.stringify({
            actorId: 'honeypot-system',
            actorUsername: 'Honey-Trap',
            actorRole: 'system',
            action: 'USER_BANNED',
            resourceType: 'user',
            resourceId: ip,
            resourceLabel: 'Siber Saldırgan',
            description: `Honeypot Tuzağına Düştü: ${trapId}. IP adresi süresiz olarak yasaklandı.`,
            ip: ip,
            newValue: { userAgent, trapId }
        })
    }).catch(() => {});

    // Şüpheli görünmemek için gerçek bir hata veya sahte bir sayfa dönebiliriz.
    // Ama hacker zaten banlandığı için bir sonraki isteği 403 alacak.
    return new NextResponse('Access Denied', { status: 403 });
}
