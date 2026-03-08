import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_change_me', {
    apiVersion: '2023-10-16' as any,
});

/**
 * ESNEK İPTAL POLİTİKASI MOTORU (Flexible Cancellation Engine Webhook)
 *
 * Bu Webhook; web sitesinden, mobil uygulamadan rezervasyon iptaline basan kullanıcının veya bir
 * 3. parti dağıtım sisteminin (TripAdvisor, Viator) iptal sinyalini karşılar.
 * Tur kalkışına 24 saatten fazla süre varsa onay mekanizmasını bypass edip Stripe'ta iadeyi başlatır.
 */
export async function POST(request: Request) {
    try {
        // 1) Gelen Payload'u Al: Stripe Payment ID ve Tur Başlangıç Tarihi Gerekli
        const body = await request.json();
        const { bookingId, paymentIntentId, tourStartDate, userEmail } = body;

        // Geçerlilik Denetimi
        if (!paymentIntentId || !tourStartDate) {
            return NextResponse.json(
                { success: false, error: 'Eksik parametreler (paymentIntentId, tourStartDate zorunlu).' },
                { status: 400 } // Bad Request
            );
        }

        // 2) Kalan Zaman Yönetimi
        // tourStartDate ISO string (Örn: "2026-06-15T09:00:00.000Z")
        const tourDate = new Date(tourStartDate);
        const nowLocal = new Date();

        // Aradaki milisaniye ve saat farkını hesapla
        const diffInMs = tourDate.getTime() - nowLocal.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // 3) Esnek İptal (Flexible Cancellation) Kural Seti
        if (diffInHours >= 24) {
            // console.log(`[Auto-Refund] Kural doğrulandı. Tura kalan süre: ${diffInHours.toFixed(1)} saat. Booking: ${bookingId}`);

            // Onay beklemeden arka planda (Background Worker) Stripe üzerinden tam iade (Refund) başlatır.
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer', // Finansal kayıtlarda yasal açıklama: Müşteri isteği
                metadata: {
                    bookingId: bookingId || 'Bilinmiyor',
                    userEmail: userEmail || 'Bilinmiyor',
                    cancellationType: 'esnek_iptal_otomatiği',
                    hoursBeforeTourStart: diffInHours.toFixed(1)
                }
            });

            // console.log(`[Auto-Refund] İade başlatıldı! Stripe Refund ID: ${refund.id} - Durum: ${refund.status}`);

            // TODO: İade başlatıldıktan sonra kullanıcının bilet durumu veritabanında UPDATE edilir ve email yollanır...

            // 4) Başarı ve Webhook Onayı Dönüşü
            return NextResponse.json(
                {
                    success: true,
                    message: 'Turu kalkışına 24 saatten fazla süre kala iptal ettiğiniz için ödemenizin tamamı kredi kartınıza hiçbir işlem ücreti olmadan (Otomatik olarak) iade ediliyor.',
                    autoRefunded: true,
                    stripeRefundId: refund.id,
                    stripeStatus: refund.status
                },
                { status: 200 } // OK
            );

        } else {
            // Tura 24 saatten az süre kaldıysa, otomatik webhook reddeder. Müşteri temsilcisine atar. (Strict Policy)
            console.warn(`[Auto-Refund Denied] İptal reddedildi. Kalan Saat: ${diffInHours.toFixed(1)}, Booking: ${bookingId}`);

            return NextResponse.json(
                {
                    success: false,
                    autoRefunded: false,
                    message: 'Esnek İptal Politikası ihlali: Tura 24 saatten az bir süre (Tam olarak ' + Math.max(0, diffInHours).toFixed(1) + ' Saat) kaldığı için iptal ve iade sistem tarafından otomatik işleme alınamamıştır. Lütfen çağrı merkezimizle iletişime geçin.',
                    hoursLeft: Math.max(0, diffInHours).toFixed(1)
                },
                { status: 406 } // Not Acceptable
            );
        }

    } catch (err: any) {
        console.error('[Webhook Error] İade/İptal işlemi sırasında sunucu hatası:', err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 } // Internal Server Error
        );
    }
}
