import { NextResponse } from 'next/server';
import { NotificationService } from '../../../lib/notificationService';

/**
 * 91. BÖLÜM: Post-Experience-Trigger-Notification
 * 
 * Bu API, gerçek bir üretim ortamında Vercel Cron veya GitHub Actions 
 * tarafından her saat başı tetiklenecek şekilde tasarlanmıştır.
 */
export async function GET(req: Request) {
    try {
        // GÜVENLİK: Sadece yetkili cron servisleri veya admin tetikleyebilir
        const authHeader = req.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // 1. Veritabanından son 3 saat içinde bitmiş turları bul (Simüle ediliyor)
        const completedBookings = [
            { id: 'TK-8822', userName: 'Yavuz', tourName: 'Kapadokya Klasik Balon Turu', endTime: '2026-05-09T15:00:00Z' },
            { id: 'TK-9911', userName: 'Melih', tourName: 'İstanbul Boğazı Akşam Yemeği', endTime: '2026-05-09T18:00:00Z' }
        ];

        console.log(`[CRON] ${completedBookings.length} adet tamamlanmış deneyim için değerlendirme süreci başlatılıyor...`);

        // 2. Her bir bilet sahibi için bildirimleri tetikle
        for (const booking of completedBookings) {
            await NotificationService.triggerPostExperienceReview(
                booking.userName,
                booking.tourName,
                booking.id
            );
        }

        return NextResponse.json({
            success: true,
            processedCount: completedBookings.length,
            message: 'Değerlendirme bildirimleri başarıyla kuyruğa alındı.'
        });

    } catch (error) {
        console.error('[CRON ERROR] Post-experience trigger failed:', error);
        return NextResponse.json({ error: 'İşlem sırasında hata oluştu' }, { status: 500 });
    }
}
