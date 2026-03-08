'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import Link from 'next/link';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy_key_change_me_to_run_real_tests');

export default function App() {
    const [clientSecret, setClientSecret] = useState('');
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        // Create PaymentIntent as soon as the page loads
        fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: 'xl-tshirt' }] }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok && data.error) {
                    throw new Error(data.error);
                }
                return data;
            })
            .then((data) => setClientSecret(data.clientSecret))
            .catch((err) => setPageError(err.message));
    }, []);

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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute top-8 left-8">
                <Link href="/" className="text-[#008cb3] font-bold text-sm tracking-tight hover:underline flex items-center gap-2">
                    <span>←</span> Ana Sayfaya Dön
                </Link>
            </div>

            <div className="App">
                {clientSecret ? (
                    <Elements options={options} stripe={stripePromise}>
                        <CheckoutForm />
                    </Elements>
                ) : pageError ? (
                    <div className="flex flex-col gap-4 text-center items-center justify-center min-h-[50vh] max-w-md mx-auto p-6 bg-red-50 border border-red-100 rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
                            🛡️
                        </div>
                        <h3 className="text-lg font-bold text-red-800">Güvenlik Uyarısı</h3>
                        <p className="text-sm font-medium text-red-600">
                            {pageError}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Lütfen biraz bekledikten sonra tekrar deneyiniz veya destek ekibimizle iletişime geçiniz.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 text-center text-slate-400 font-semibold items-center justify-center min-h-[50vh]">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        Güvenli ödeme altyapısı (PCI-DSS) yükleniyor...
                    </div>
                )}
            </div>
        </div>
    );
}
