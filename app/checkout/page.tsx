'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchAPI } from '../lib/api';
import { auth } from '../lib/auth';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy_key_change_me_to_run_real_tests');

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tourId = searchParams.get('tourId');
    const guests = searchParams.get('guests') || '1';
    const date = searchParams.get('date');

    const [clientSecret, setClientSecret] = useState('');
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        if (!tourId) {
            setPageError('Geçersiz rezervasyon bilgisi (Tour ID eksik).');
            return;
        }

        const loadIntent = async () => {
            const token = auth.getAccessToken();
            try {
                // Use the standard BookingViewSet create endpoint
                const data = await fetchAPI('/bookings/', {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        tour_slug: tourId,
                        guests: parseInt(guests),
                        start_date: date || undefined,
                        date_label: date || undefined
                    }),
                });

                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else if (data.client_secret) {
                    setClientSecret(data.client_secret);
                } else {
                    setPageError('Sunucudan geçerli bir ödeme anahtarı alınamadı.');
                }
            } catch (err: any) {
                setPageError(err.message || 'Ödeme başlatılamadı. Lütfen giriş yaptığınızdan emin olun.');
            }
        };

        loadIntent();
    }, [tourId, guests]);

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#005e85',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
        },
    };
    const options = {
        clientSecret,
        appearance: appearance as any,
    };

    return (
        <div className="App w-full max-w-lg mx-auto mt-8">
            {clientSecret ? (
                <Elements options={options} stripe={stripePromise}>
                    <CheckoutForm />
                </Elements>
            ) : pageError ? (
                <div className="flex flex-col gap-4 text-center items-center justify-center min-h-[50vh] p-6 bg-red-50 border border-red-100 rounded-2xl shadow-sm">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
                        🛡️
                    </div>
                    <h3 className="text-lg font-bold text-red-800">İşlem Onaylanamadı</h3>
                    <p className="text-sm font-medium text-red-600">
                        {pageError}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        Rezervasyon yapabilmek için giriş yapmanız veya doğru linkten gelmeniz gerekmektedir.
                    </p>
                    <button onClick={() => router.push('/login')} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">Giriş Yap</button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 text-center text-slate-400 font-semibold items-center justify-center min-h-[50vh]">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    Güvenli ödeme altyapısı (PCI-DSS) yükleniyor...
                </div>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-8 left-8">
                <Link href="/" className="text-[#008cb3] font-bold text-sm tracking-tight hover:underline flex items-center gap-2">
                    <span>←</span> İptal ve Geri Dön
                </Link>
            </div>

            <Suspense fallback={<div className="text-center py-20 text-gray-500">Yükleniyor...</div>}>
                <CheckoutContent />
            </Suspense>
        </div>
    );
}
