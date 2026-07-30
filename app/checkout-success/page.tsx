'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchAPI } from '@/app/lib/api';

/**
 * Stripe `confirmPayment` sonrası dönülen sayfa.
 *
 * Ödemenin başarılı olması rezervasyonun onaylandığı anlamına gelmez:
 * `confirmed` durumuna geçiş Django'daki Stripe webhook'u ile asenkron
 * yapılır. Bu yüzden burada `pending` olduğu sürece kısa aralıklarla
 * durum sorgulanır.
 */

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~1 dakika

function SuccessContent() {
    const searchParams = useSearchParams();
    // `ref` Booking'in UUID id'sidir (DRF router bu alanla lookup yapar).
    const bookingId = searchParams.get('ref');

    const [booking, setBooking] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            setError('Rezervasyon referansı bulunamadı.');
            return;
        }

        let cancelled = false;
        let attempts = 0;
        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            attempts += 1;
            try {
                const data = await fetchAPI(`/bookings/${bookingId}/`, {
                    throwOnHttpError: true,
                });
                if (cancelled) return;

                if (!data) {
                    setError('Rezervasyon durumu sorgulanamadı. Sunucuya ulaşılamıyor.');
                    return;
                }

                setBooking(data);

                if (data.status === 'pending') {
                    if (attempts >= MAX_POLLS) {
                        setTimedOut(true);
                        return;
                    }
                    timer = setTimeout(poll, POLL_INTERVAL_MS);
                }
            } catch (err: any) {
                if (cancelled) return;
                setError(err?.message || 'Rezervasyon bulunamadı.');
            }
        };

        poll();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [bookingId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-8 text-4xl">
                    ⚠️
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Rezervasyon durumu görüntülenemedi
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg mb-10">
                    {error} Ödemeniz alındıysa rezervasyonunuz biletlerim sayfasında
                    görünecektir.
                </p>
                <Link
                    href="/dashboard/customer/tickets"
                    className="bg-[#008cb3] hover:bg-[#005e85] text-white font-black px-8 py-4 rounded-2xl transition-all"
                >
                    Biletlerime Git
                </Link>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-black animate-pulse">
                Rezervasyon durumu sorgulanıyor...
            </div>
        );
    }

    const isConfirmed = booking.status === 'confirmed';
    const isFailedOrCancelled =
        booking.status === 'failed' || booking.status === 'cancelled';

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative mb-12">
                <div
                    className={`w-36 h-36 rounded-full flex items-center justify-center relative z-10 ${
                        isConfirmed
                            ? 'bg-emerald-50 dark:bg-emerald-950/30'
                            : isFailedOrCancelled
                              ? 'bg-red-50 dark:bg-red-950/30'
                              : 'bg-amber-50 dark:bg-amber-950/30'
                    }`}
                >
                    {isConfirmed ? (
                        <svg
                            className="w-20 h-20 text-emerald-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                        >
                            <path
                                className="check-path"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    ) : isFailedOrCancelled ? (
                        <span className="text-6xl">✕</span>
                    ) : (
                        <div className="w-16 h-16 border-8 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                    )}
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                {isConfirmed
                    ? 'Rezervasyonunuz Onaylandı.'
                    : isFailedOrCancelled
                      ? 'Rezervasyon tamamlanamadı.'
                      : 'Ödemeniz onay bekleniyor...'}
            </h1>

            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-4 font-medium">
                {isConfirmed
                    ? 'Ödemeniz doğrulandı ve biletiniz oluşturuldu.'
                    : isFailedOrCancelled
                      ? 'Ödeme doğrulanamadığı için rezervasyonunuz tamamlanmadı. Tutar tahsil edildiyse otomatik olarak iade edilir.'
                      : 'Ödemeniz alındı; bankanızdan gelen onay işleniyor. Bu sayfayı kapatabilirsiniz, rezervasyonunuz onaylandığında biletiniz biletlerim sayfasında görünecektir.'}
            </p>

            {timedOut && !isConfirmed && (
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-4">
                    Onay beklenenden uzun sürüyor. Biletlerim sayfasından durumu
                    kontrol edebilirsiniz.
                </p>
            )}

            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">
                Rezervasyon No: {booking.booking_ref}
            </div>

            <div className="flex flex-col items-center gap-6 w-full">
                {isConfirmed ? (
                    <Link
                        href="/dashboard/customer/tickets"
                        className="w-full max-w-md bg-gradient-to-r from-[#008cb3] to-[#005e85] hover:from-slate-900 hover:to-slate-900 text-white font-black px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,140,179,0.3)] transition-all hover:-translate-y-1 active:scale-95 text-lg flex items-center justify-center gap-3 group"
                    >
                        <span>Biletlerim ve QR Cüzdanıma Git</span>
                        <span className="text-2xl group-hover:translate-x-1 transition-transform">
                            ➔
                        </span>
                    </Link>
                ) : (
                    <Link
                        href="/dashboard/customer/tickets"
                        className="w-full max-w-md border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-black px-8 py-5 rounded-2xl transition-all hover:bg-gray-50 dark:hover:bg-white/5 text-base flex items-center justify-center gap-3"
                    >
                        Biletlerime Git
                    </Link>
                )}

                <Link
                    href="/"
                    className="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-all px-6 py-4 text-sm"
                >
                    Ana Sayfaya Dön
                </Link>
            </div>

            <style jsx>{`
                .check-path {
                    stroke-dasharray: 100;
                    stroke-dashoffset: 100;
                    animation: draw 0.8s cubic-bezier(0.65, 0, 0.45, 1) forwards 0.5s;
                }
                @keyframes draw {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-[#0B132B] transition-colors duration-500 flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col justify-center">
                <Suspense
                    fallback={
                        <div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-black animate-pulse">
                            Yükleniyor...
                        </div>
                    }
                >
                    <SuccessContent />
                </Suspense>
            </div>
            <Footer />
        </main>
    );
}
