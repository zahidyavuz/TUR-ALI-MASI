import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// NOTE: Replace with your actual Stripe Secret Key (e.g., in a .env local file as STRIPE_SECRET_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_change_me_to_run_real_tests', {
    apiVersion: '2023-10-16' as any,
});

// Basit In-Memory Fraud Protection & Rate Limiting (Geçici IP bazlı koruma)
// Gerçek bir senaryoda Redis veya veritabanı kullanılmalıdır.
const ipAttemptMap = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5; // 15 dakika içinde maksimum ödeme denemesi
const BLOCK_DURATION = 15 * 60 * 1000; // 15 dakika

export async function POST(request: Request) {
    try {
        // İstemci IP adresini ve User-Agent bilgisini al (Fraud tespiti için)
        let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (ip.includes(',')) ip = ip.split(',')[0].trim();
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Rate Limiting Kontrolü (Aynı IP'den çoklu deneme)
        if (ip !== 'unknown') {
            const now = Date.now();
            const record = ipAttemptMap.get(ip);

            if (record) {
                if (now - record.timestamp < BLOCK_DURATION) {
                    record.count += 1;
                    if (record.count > MAX_ATTEMPTS) {
                        console.warn(`[FRAUD ALERT] Şüpheli aktivite tespit edildi. Çok fazla ödeme denemesi engellendi. IP: ${ip}`);
                        return NextResponse.json(
                            { error: 'Şüpheli aktivite tespit edildi. Güvenlik nedeniyle işleminiz bir süreliğine kısıtlanmıştır.' },
                            { status: 429 }
                        );
                    }
                } else {
                    // Süre dolduysa sıfırla
                    ipAttemptMap.set(ip, { count: 1, timestamp: now });
                }
            } else {
                ipAttemptMap.set(ip, { count: 1, timestamp: now });
            }
        }

        const { items, currency = 'usd' } = await request.json();

        // calculate order amount here (DO NOT TRUST CLIENT AMOUNT, always calculate on server)
        const orderAmount = 240000; // e.g., $2400.00 -> 240000 cents

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: orderAmount,
            currency: currency,
            // Forces 3D Secure 2.0 when supported by the card and required by European PSD2 regulations:
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any', // Dinamik olarak zorlar
                },
            },
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: {
                enabled: true,
            },
            // Stripe Radar için metadata gönderimi
            metadata: {
                client_ip: ip,
                user_agent: userAgent,
                fraud_check: 'passed'
            },
            // Gelişmiş Radar kuralları için (isteğe bağlı) 
            // risk_level ve benzeri özellikler Stripe tarafında işlenir.
            receipt_email: undefined, // Gerekirse kullanıcının e-posta adresi atanabilir.
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err: any) {
        console.error('Error in payment intent:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
