'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { saveOfflineTicket } from '@/app/lib/offline-db';
import { DEFAULT_ITINERARY } from '@/app/lib/offline-types';

function SuccessContent() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const [isInjected, setIsInjected] = useState(false);
    const [countdown, setCountdown] = useState(7);

    const city = searchParams.get('city') || 'Türkiye';
    const tourId = searchParams.get('tourId');
    const guests = searchParams.get('guests');
    const date = searchParams.get('date');

    useEffect(() => {
        // 86. BÖLÜM: Auto-redirect to Wallet Logic
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/tickets');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [router]);

    useEffect(() => {
        // 85. BÖLÜM: Silent-QR-Wallet-Injection Trigger
        async function injectTicket() {
            if (!tourId) return;
            
            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tourId,
                        userId: user?.id || 'guest',
                        guests,
                        date,
                        customerEmail: user?.email
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setIsInjected(true);
                    
                    // 87. BÖLÜM: Arka Plan Bilet Önbellekleme (Offline Cache)
                    if (data.success) {
                        await saveOfflineTicket({
                            id: data.ticketRef,
                            tourId: tourId,
                            tourTitle: city + " Deneyimi",
                            location: city,
                            duration: "Günlük Tur",
                            guests: parseInt(guests || '1'),
                            bookingRef: data.ticketRef,
                            qrDataUrl: data.qrCode || '', // Backend'den gelen QR
                            itinerary: DEFAULT_ITINERARY,
                            included: ["Rehberlik", "Transfer", "Öğle Yemeği"],
                            excluded: ["Kişisel Harcamalar"],
                            savedAt: new Date().toISOString()
                        });
                        console.log("%c[OFFLINE-DB] Bilet çevrimdışı kullanım için yerel hafızaya kaydedildi.", "color: #3b82f6; font-weight: bold;");
                    }
                    
                    console.log("%c[SILENT-QR] Bilet anında cüzdanınıza (My Tickets) enjekte edildi.", "color: #10b981; font-weight: bold;");
                }
            } catch (err) {
                console.error("[SILENT-QR] Enjeksiyon başarısız oldu.", err);
            }
        }
        
        injectTicket();
    }, [tourId, user, guests, date]);

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Onay Animasyonu */}
            <div className="relative mb-12">
                <div className="w-36 h-36 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center relative z-10">
                    <svg className="w-20 h-20 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path className="check-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div className="absolute inset-0 rounded-full bg-emerald-400 blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -inset-4 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 animate-ping duration-[3000ms] opacity-30"></div>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                Harika Seçim! <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Rezervasyonunuz Onaylandı.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
                Ödemeniz başarıyla alındı. {city}'deki unutulmaz deneyiminiz için her şey hazır. 
                Tüm detaylar ve dijital biletiniz e-posta adresinize gönderildi.
            </p>

            {/* 86. BÖLÜM: Bouncing Redirect Arrow */}
            <div className="flex flex-col items-center gap-4 mb-8">
                <div className="animate-bounce w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#008cb3] dark:text-[#38bdf8] shadow-sm">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </div>

            <div className="flex flex-col items-center gap-6 w-full">
                <Link 
                    href="/tickets" 
                    className="w-full max-w-md bg-gradient-to-r from-[#008cb3] to-[#005e85] hover:from-slate-900 hover:to-slate-900 text-white font-black px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,140,179,0.3)] transition-all hover:-translate-y-1 active:scale-95 text-lg flex items-center justify-center gap-3 group"
                >
                    <span>Biletlerim ve QR Cüzdanıma Git</span>
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">➔</span>
                </Link>
                
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-slate-500 tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#008cb3] animate-ping"></span>
                    {countdown} saniye içinde otomatik yönlendiriliyorsunuz...
                </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
                <Link href="/" className="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-all px-6 py-4 flex items-center gap-2 text-sm border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                    Ana Sayfaya Dön
                </Link>
            </div>

            {/* Support Note */}
            <div className="mt-20 pt-10 border-t border-gray-100 dark:border-white/5 w-full max-w-md">
                <p className="text-sm text-gray-400 font-semibold mb-4">Bir sorunuz mu var?</p>
                <div className="flex justify-center gap-8">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                        <span className="text-emerald-500">●</span> 7/24 Destek
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                        <span className="text-emerald-500">●</span> Anında Onay
                    </div>
                </div>
            </div>

            <style jsx>{`
                .check-path {
                    stroke-dasharray: 100;
                    stroke-dashoffset: 100;
                    animation: draw 0.8s cubic-bezier(0.65, 0, 0.45, 1) forwards 0.5s;
                }
                @keyframes draw {
                    to { stroke-dashoffset: 0; }
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
                <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-black animate-pulse">Yükleniyor...</div>}>
                    <SuccessContent />
                </Suspense>
            </div>
            <Footer />
        </main>
    );
}
