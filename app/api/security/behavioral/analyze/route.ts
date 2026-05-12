import { NextRequest, NextResponse } from 'next/server';
import { analyzeBehavior } from '@/app/lib/behavioralAI';

export async function POST(req: NextRequest) {
    try {
        const telemetry = await req.json();
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
        
        const result = analyzeBehavior(telemetry);

        if (result.isBot) {
            console.error(`[BEHAVIORAL-AI] BOT TESPİT EDİLDİ! IP: ${ip} | Skor: ${result.score}`);
            console.error(`Nedenler: ${result.reasons.join(', ')}`);
            
            // SHADOWBAN SİMÜLASYONU:
            // Gerçek projede burada IP Redis'teki 'shadowban' listesine eklenir.
            // fetchAPI bu listedeki IP'ler için boş veri döner.

            // Audit Log'a kaydet
            fetch(`${req.nextUrl.origin}/api/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': 'tourkia_audit_internal'
                },
                body: JSON.stringify({
                    actorId: 'ai-behavioral-guard',
                    actorUsername: 'AI-Guard',
                    actorRole: 'system',
                    action: 'SCRAPER_DETECTED',
                    resourceType: 'session',
                    resourceId: ip,
                    resourceLabel: 'AI Bot / Taklitçi',
                    description: `Yapay Zeka Destekli Davranış Analizi ile bot saptandı. Sebepler: ${result.reasons.join('; ')}`,
                    ip: ip
                })
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, botScore: result.score });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
