import { NextResponse } from 'next/server';
import { generateTicketQrDataUrl } from '@/app/lib/qr';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const agencyId = searchParams.get('agencyId');

    // MOCK VERİTABANI - Sadece seçilen tarihe (Örn: 2026-05-15) ait yolcuları döndürür
    // Gerçekte: await db.bookings.findMany({ where: { date, agencyId }, include: { tour: true, user: true } })
    
    console.log(`[MANIFEST-SYNC] Tarih: ${date} | Acenta: ${agencyId} listesi çekiliyor.`);

    const mockManifest = {
        date: date,
        tours: [
            { id: 1, title: 'Kapadokya VIP Balon Turu', time: '05:30 AM', vehicle: 'Minibüs 1 (Plaka: 50 ABC 123)' },
            { id: 2, title: 'Kırmızı Tur (Göreme)', time: '09:30 AM', vehicle: 'Minibüs 2 (Plaka: 50 XYZ 789)' }
        ],
        passengers: [
            { id: 'TKT-8924', tourId: 1, name: 'John Doe', phone: '+1 555 123 4567', hotel: 'Argos in Cappadocia', pax: 2, status: 'Onaylandı' },
            { id: 'TKT-8925', tourId: 1, name: 'Ayşe Yılmaz', phone: '+90 555 987 6543', hotel: 'Museum Hotel', pax: 1, status: 'Onaylandı' },
            { id: 'TKT-8926', tourId: 1, name: 'Hans Müller', phone: '+49 151 2345678', hotel: 'Kelebek Cave Hotel', pax: 4, status: 'Onaylandı' },
            { id: 'TKT-8927', tourId: 1, name: 'Elena Rossi', phone: '+39 333 1234567', hotel: 'Sultan Cave Suites', pax: 2, status: 'Beklemede' },
            { id: 'TKT-9001', tourId: 2, name: 'Tarik S', phone: '+90 532 000 0000', hotel: 'Göreme Kaya', pax: 3, status: 'Onaylandı' }
        ]
    };

    return NextResponse.json({ success: true, data: mockManifest });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tourId, userId, date, guests, customerEmail } = body;

        if (!tourId) {
            return NextResponse.json({ error: 'Eksik tur bilgisi' }, { status: 400 });
        }

        // 1. Benzersiz bir bilet referans kodu üret (TK- prefix ile)
        const ticketRef = `TK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // 2. Güvenli QR Kod üret (Base64 Data URL)
        const qrDataUrl = await generateTicketQrDataUrl(ticketRef, tourId);

        // 3. Veritabanına 'Cüzdan/Biletlerim' Enjeksiyonu (MOCK)
        // NOT: Gerçek bir backend'de bu veri Prisma/PostgreSQL veya MongoDB'ye kaydedilir.
        // Bu sistemde cüzdana 'Inject' mantığı simüle edilmektedir.
        console.log(`[SILENT-INJECTION] Bilet Ref: ${ticketRef} | Kullanıcı: ${userId || customerEmail} | Cüzdana yüklendi.`);

        const bookingData = {
            ref: ticketRef,
            tourId,
            userId: userId || 'guest',
            date: date || new Date().toISOString(),
            guests: guests || 1,
            qrCode: qrDataUrl,
            status: 'active',
            type: tourId.includes('menu') || tourId.includes('rest') ? 'food' : 'tour',
            injectedAt: new Date().toISOString()
        };

        // Veritabanı işlemi burada gerçekleşir...
        // await db.bookings.create({ data: bookingData });

        return NextResponse.json({ 
            success: true, 
            message: 'Bilet arka planda başarıyla cüzdana yüklendi.',
            ticketRef,
            qrCode: qrDataUrl
        });
    } catch (error) {
        console.error('Silent QR Injection Error:', error);
        return NextResponse.json({ error: 'Bilet oluşturulamadı' }, { status: 500 });
    }
}
