import { NextResponse } from 'next/server';

// Geçici Bellek İçi Veritabanı
const mockTicketsDatabase = [
    {
        id: 'TKT-VALID',
        customer: 'John Doe',
        pax: 4,
        menu: "Şefin Özel Testi Kebabı + Cam Kenarı",
        status: 'active',
        date: new Date().toISOString().split('T')[0] // Bugün
    },
    {
        id: 'TKT-USED',
        customer: 'Ayşe Yılmaz',
        pax: 2,
        menu: "Geleneksel Türk Gecesi Fix Menü",
        status: 'redeemed', // Zaten kullanılmış
        date: new Date().toISOString().split('T')[0],
        usedAt: '14:00'
    },
    {
        id: 'TKT-FUTURE',
        customer: 'Elena Rossi',
        pax: 2,
        menu: "Anadolu Ateşi VIP Akşam Yemeği",
        status: 'active',
        // Yarına ait bir bilet
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0] 
    }
];

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ticketId } = body;

        console.log(`[QR-SCANNER] Bilet taranıyor: ${ticketId}`);

        const ticket = mockTicketsDatabase.find(t => t.id === ticketId);

        // Durum 3: Bilet bulunamadı (Sahte bilet)
        if (!ticket) {
            return NextResponse.json({
                valid: false,
                reason: 'invalid_ticket',
                message: 'Geçersiz veya Sahte Bilet'
            }, { status: 404 });
        }

        const today = new Date().toISOString().split('T')[0];

        // Durum 3 (Devamı): Bilet başka bir güne aitse
        if (ticket.date !== today) {
            return NextResponse.json({
                valid: false,
                reason: 'wrong_date',
                message: `Bu bilet bugüne ait değil! (Tarih: ${ticket.date})`
            }, { status: 400 });
        }

        // Durum 2: Bilet daha önce kullanılmışsa (Dolandırıcılık Koruması)
        if (ticket.status === 'redeemed') {
            return NextResponse.json({
                valid: false,
                reason: 'already_used',
                message: `UYARI: Bu bilet saat ${ticket.usedAt || 'önceden'} zaten kullanılmış!`
            }, { status: 403 });
        }

        // Durum 1: Bilet geçerliyse (Onay)
        if (ticket.status === 'active') {
            // Gerçekte veritabanında güncellenir: await db.tickets.update({ where: { id: ticketId }, data: { status: 'redeemed' } })
            ticket.status = 'redeemed';
            ticket.usedAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            return NextResponse.json({
                valid: true,
                message: 'ONAYLANDI - Bilet Geçerli',
                ticket: {
                    customer: ticket.customer,
                    pax: ticket.pax,
                    menu: ticket.menu
                }
            });
        }

        return NextResponse.json({ valid: false, message: 'Bilinmeyen Hata' }, { status: 500 });

    } catch (error) {
        console.error('Bilet doğrulama hatası:', error);
        return NextResponse.json({ error: 'Doğrulama servisi çalışmıyor' }, { status: 500 });
    }
}
