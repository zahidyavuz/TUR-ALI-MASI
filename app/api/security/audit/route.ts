import { NextRequest, NextResponse } from 'next/server';
import { runSecurityAudit } from '../../../lib/securityScanner';

export async function GET(req: NextRequest) {
    const adminToken = req.headers.get('x-admin-token');
    
    // Güvenlik: Sadece admin görebilir
    if (adminToken !== (process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await runSecurityAudit();
        return NextResponse.json(report);
    } catch {
        return NextResponse.json({ error: 'Tarama başarısız' }, { status: 500 });
    }
}
