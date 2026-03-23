import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchTours } from '../../lib/tours';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
    apiVersion: '2026-02-25.clover',
});

export async function POST(req: NextRequest) {
    try {
        const { tourId, guests, simulateError } = await req.json();

        // Simulate an internal server error if requested
        if (simulateError) {
            throw new Error('Sistemde geçici bir hata oluştu. Lütfen tekrar deneyin.');
        }

        const tourData: any = await fetchTours();
        const tourList = tourData.tours || [];
        const tour = tourList.find((t: any) => String(t.id) === String(tourId) || t.slug === tourId);
        if (!tour) throw new Error('Geçersiz tur seçimi');

        // Reserve Now, Pay Later logic -> We use payment mode with manual capture
        // This puts a hold (authorization) on the card for 7 days without charging it immediately.
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'try',
                        product_data: {
                            name: tour.title,
                            description: 'Reserve Now, Pay Later. Bu tur için kartınızdan şu an çekim yapılmayacaktır (Provizyon alınacaktır).',
                            images: [tour.imageMain],
                        },
                        unit_amount: tour.price * 100, // in kuruş
                    },
                    quantity: guests,
                }
            ],
            payment_intent_data: {
                capture_method: 'manual', // The crucial part for Reserve Now, Pay Later
            },
            success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/tour/${tourId}`,
            metadata: {
                tourId,
                guests: guests.toString(),
                reserveNowPayLater: 'true',
            },
        });

        return NextResponse.json({ id: session.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
