import { NextResponse } from 'next/server';

// Simüle edilmiş global veritabanı (MOCK DB)
// Gerçek projede Prisma (MongoDB/PostgreSQL), Supabase veya Firebase kullanılır.
const globalForDb = globalThis as unknown as { mockTours: any[] };

if (!globalForDb.mockTours) {
    globalForDb.mockTours = [
        {
          id: 1,
          title: 'Kapadokya VIP Balon Uçuşu',
          price: 3500,
          capacity: 16,
          sold: 16,
          status: 'sold_out',
          image: 'https://images.unsplash.com/photo-1600298882283-40b4dcb8b211?q=80&w=2070&auto=format&fit=crop',
          description: 'Özel sepet, 16 kişilik VIP uçuş deneyimi.'
        },
        {
          id: 2,
          title: 'Göreme Açık Hava Müzesi ve Peri Bacaları',
          price: 850,
          capacity: 45,
          sold: 12,
          status: 'active',
          image: 'https://images.unsplash.com/photo-1570939274717-7eda259b5088?q=80&w=2070&auto=format&fit=crop',
          description: 'Rehberli tam gün bölge turu.'
        }
    ];
}

export async function GET() {
    return NextResponse.json({ tours: globalForDb.mockTours });
}

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get('content-type') || '';
        let title, price, capacity, image, description;
        let filesCount = 0;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            title = formData.get('title') as string;
            price = formData.get('price') as string;
            capacity = formData.get('capacity') as string;
            description = formData.get('description') as string;
            
            // Count files
            for (const key of Array.from(formData.keys())) {
                if (key.startsWith('file_')) {
                    filesCount++;
                }
            }
            
            // Simüle edilmiş görsel URL (Gerçekte S3/Cloudinary yüklenir)
            image = 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop';
        } else {
            const body = await req.json();
            title = body.title;
            price = body.price;
            capacity = body.capacity;
            description = body.description;
            image = body.image;
        }

        const uploadedImageUrl = image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';

        const newTour = {
            id: Date.now(),
            title,
            price: Number(price),
            capacity: parseInt(capacity) || 0,
            sold: 0,
            status: 'active',
            image: uploadedImageUrl,
            description
        };

        globalForDb.mockTours.unshift(newTour);
        console.log(`[DB-MOCK] Yeni Tur Oluşturuldu. Başlık: ${newTour.title}, Eklenen Dosya Sayısı: ${filesCount}`);

        return NextResponse.json({ success: true, tour: newTour });
    } catch (error) {
        console.error('Tur oluşturma hatası:', error);
        return NextResponse.json({ error: 'Tur eklenirken hata oluştu' }, { status: 500 });
    }
}
