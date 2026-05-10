import { NextResponse } from 'next/server';
import { generateTicketQrDataUrl } from '../../lib/qr';

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
