import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { agencyId, amount, transactions } = body;

        // Gerçek bir senaryoda:
        // 1. İşlemlerin ('Redeemed' statüsündekilerin) durumu 'Pending_Payout' yapılır.
        // 2. Admin paneline "Acenta Hakediş Talep Etti" bildirimi (WebSocket / DB Push) yollanır.
        
        console.log(`[PAYOUT-REQUEST] Acenta (${agencyId || 'Anonim'}) ödeme talep etti.`);
        console.log(`Talep Edilen Tutar: ₺${amount}`);
        console.log(`İlgili İşlemler:`, transactions);

        // MOCK VERİTABANI İŞLEMİ
        // await db.payouts.create({ data: { agencyId, amount, status: 'Pending' } });
        
        return NextResponse.json({ 
            success: true, 
            message: 'Hakediş talebi başarıyla alındı ve Admin paneline iletildi.',
            status: 'Pending'
        });
    } catch (error) {
        console.error('Ödeme talep hatası:', error);
        return NextResponse.json({ error: 'İşlem başarısız oldu' }, { status: 500 });
    }
}
