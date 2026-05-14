import { NextResponse } from 'next/server';

const globalForDb = globalThis as unknown as { mockTours: any[] };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const contentType = req.headers.get('content-type') || '';
        let price, capacity, additionalSold;
        let filesCount = 0;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            price = formData.get('price') as string;
            capacity = formData.get('capacity') as string;
            // Count files
            for (const key of Array.from(formData.keys())) {
                if (key.startsWith('file_')) {
                    filesCount++;
                }
            }
        } else {
            const body = await req.json();
            price = body.price;
            capacity = body.capacity;
            additionalSold = body.additionalSold;
        }
        
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);

        if (!globalForDb.mockTours) {
            return NextResponse.json({ error: 'Veritabanı başlatılamadı' }, { status: 500 });
        }

        const tourIndex = globalForDb.mockTours.findIndex(t => t.id === id);
        if (tourIndex === -1) {
            return NextResponse.json({ error: 'Tur bulunamadı' }, { status: 404 });
        }

        const tour = globalForDb.mockTours[tourIndex];

        // Güncelleme İşlemleri
        if (price !== undefined && price !== null) tour.price = Number(price);
        if (capacity !== undefined && capacity !== null) tour.capacity = parseInt(capacity as string);
        if (additionalSold !== undefined && additionalSold !== null) tour.sold += parseInt(additionalSold as string);

        // INVENTORY LOGIC (Trigger Simülasyonu):
        if (tour.sold >= tour.capacity) {
            tour.sold = tour.capacity;
            tour.status = 'sold_out';
            console.log(`[TRIGGER ALERT] Tur (${tour.title}) maksimum kapasiteye ulaştı. Satışa kapatıldı.`);
        } else {
            tour.status = 'active';
        }

        console.log(`[DB-MOCK] Tur Güncellendi (ID: ${id}). Yeni Dosyalar: ${filesCount}`);

        return NextResponse.json({ success: true, tour });
    } catch (error) {
        console.error('Tur güncelleme hatası:', error);
        return NextResponse.json({ error: 'Tur güncellenirken hata oluştu' }, { status: 500 });
    }
}
