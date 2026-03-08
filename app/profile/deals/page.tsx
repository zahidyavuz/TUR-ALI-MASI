'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Deal {
    id: string;
    title: string;
    desc: string;
    discount: string;
    timeLeft: number; // in seconds
    bgClass: string;
    isPersonalized: boolean;
}

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([
        {
            id: '1',
            title: 'Kapadokya VIP Balon Turu',
            desc: 'Kanka, geçen hafta Kapadokya turlarına bakmıştın. Seni unutmadık, yarına kadar geçerli sana özel ekstra %15 indirim tanımladık!',
            discount: '%15 İndirim',
            timeLeft: 3600 * 5 + 60 * 59, // 5 hours 59 min
            bgClass: 'bg-gradient-to-br from-purple-600 to-indigo-800',
            isPersonalized: true
        },
        {
            id: '2',
            title: 'Hafta Sonu Fethiye Kaçamağı',
            desc: 'Son 2 koltuk! TourGo sistemine kayıtlı sadık kullanıcılara özel Fethiye yamaç paraşütü paketinde net 1000₺ indirim.',
            discount: '1000₺ Avantaj',
            timeLeft: 3600 * 1 + 60 * 14, // 1 hour 14 min
            bgClass: 'bg-gradient-to-tr from-orange-500 to-red-600',
            isPersonalized: false
        }
    ]);

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const timer = setInterval(() => {
            setDeals(prev => prev.map(d => ({
                ...d,
                timeLeft: Math.max(0, d.timeLeft - 1)
            })));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Sana Özel Fırsatlar</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-1.5">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                            Acele et, süre dolduktan sonra bu sayfadaki indirimler uçar gider!
                        </p>
                    </div>
                    <Link href="/" className="text-gray-500 hover:text-[#008cb3] text-sm font-bold flex items-center gap-2 transition-colors self-start sm:self-auto">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Anasayfaya Dön
                    </Link>
                </div>

                <div className="space-y-6">
                    {deals.map(deal => (
                        <div key={deal.id} className={`relative overflow-hidden rounded-[24px] text-white shadow-xl ${deal.bgClass} flex flex-col sm:flex-row group`}>
                            {/* Decorative background shapes */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>

                            <div className="p-8 sm:w-2/3 relative z-10">
                                {deal.isPersonalized && (
                                    <span className="bg-yellow-400 text-yellow-900 border border-yellow-300 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm mb-4 inline-block tracking-widest">✨ Sana Özel Tasarlandı</span>
                                )}
                                <h3 className="text-3xl font-black mb-3 leading-tight tracking-tight">{deal.title}</h3>
                                <p className="text-white/80 font-medium leading-relaxed mb-6">{deal.desc}</p>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <button className="bg-white text-gray-900 hover:bg-gray-100 font-black px-6 py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        Hemen Kullan: {deal.discount}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-black/20 sm:w-1/3 backdrop-blur-md p-8 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-white/10 relative z-10">
                                <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Fırsatın Bitmesine</span>
                                <div className="font-mono text-4xl sm:text-5xl font-black text-white drop-shadow-md tabular-nums tracking-tighter">
                                    {formatTime(deal.timeLeft)}
                                </div>
                                <span className="text-white/50 text-xs mt-2 font-medium">Kaldı ⏳</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-20"></div>
            </div>
        </div>
    );
}
