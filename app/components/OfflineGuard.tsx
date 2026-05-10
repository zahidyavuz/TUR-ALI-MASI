'use client';
import { useState, useEffect } from 'react';
import { getAllOfflineTickets } from '../lib/offline-db';
import { OfflineTicket } from '../lib/offline-types';
import Navbar from './Navbar';

export default function OfflineGuard({ children }: { children: React.ReactNode }) {
    const [isOffline, setIsOffline] = useState(false);
    const [tickets, setTickets] = useState<OfflineTicket[]>([]);
    const [selected, setSelected] = useState<OfflineTicket | null>(null);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    useEffect(() => {
        if (isOffline) {
            getAllOfflineTickets().then(list => {
                setTickets(list);
                if (list.length > 0) setSelected(list[0]);
            });
        }
    }, [isOffline]);

    if (isOffline) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0B132B] flex flex-col">
                {/* Offline Warning Banner */}
                <div className="bg-orange-600 text-white text-center py-4 px-6 font-black text-sm flex items-center justify-center gap-3 shadow-lg relative z-20">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.172 9.172a4 4 0 015.656 5.656m2.828-8.486a9 9 0 011.272 1.272M7.071 7.071a9 9 0 00-1.272 1.272M10 10l4 4" />
                        </svg>
                    </div>
                    <p className="max-w-2xl">Şu an çevrimdışısınız. Ancak endişelenmeyin, biletleriniz burada güvende!</p>
                </div>

                <Navbar />

                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">Çevrimdışı Cüzdanınız</h2>
                        
                        {tickets.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xl">
                                <div className="text-6xl mb-6">📴</div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bilet Bulunamadı</h3>
                                <p className="text-gray-500 dark:text-slate-400">Daha önce satın aldığınız bir bilet bulunmuyor veya önbelleğe alınmamış.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {selected && (
                                    <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
                                        <div className="p-8 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[10px] font-black tracking-widest text-[#008cb3] uppercase">#{selected.bookingRef}</span>
                                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Çevrimdışı Hazır</div>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight mb-2">{selected.tourTitle}</h3>
                                            <p className="text-gray-500 font-bold">{selected.location} · {selected.dateLabel}</p>
                                        </div>

                                        <div className="p-10 flex flex-col items-center justify-center bg-white dark:bg-slate-900">
                                            <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] mb-6">
                                                <img 
                                                    src={selected.qrDataUrl} 
                                                    alt="Ticket QR" 
                                                    className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                                                />
                                            </div>
                                            <p className="text-xs font-black text-slate-400 tracking-widest uppercase mb-10">Giriş sırasında bu kodu okutun</p>
                                            
                                            <div className="w-full grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Misafir</p>
                                                    <p className="font-black text-slate-800 dark:text-white">{selected.guests} Kişi</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Durum</p>
                                                    <p className="font-black text-emerald-500">Doğrulandı</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tickets.length > 1 && (
                                    <div className="space-y-3 pt-6">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Diğer Biletleriniz</p>
                                        {tickets.map(t => (
                                            <button 
                                                key={t.id}
                                                onClick={() => setSelected(t)}
                                                className={`w-full text-left p-5 rounded-2xl transition-all border ${selected?.id === t.id ? 'bg-blue-50 dark:bg-blue-900/20 border-[#008cb3]' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}
                                            >
                                                <p className="font-black text-slate-800 dark:text-white truncate">{t.tourTitle}</p>
                                                <p className="text-xs text-gray-400 font-bold mt-1">{t.location} · {t.dateLabel}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 border-t border-gray-100 dark:border-slate-800 text-center">
                    <p className="text-xs font-bold text-gray-400">Tourkia Offline Wallet v1.0 • Tüm biletler yerel hafızada şifrelenmiştir.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
