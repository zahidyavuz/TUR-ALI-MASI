'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Örnek Bilet Verileri (Database'den geliyormuş gibi)
const MOCK_TICKETS = {
    upcoming: [
        {
            id: 'TKT-89301A',
            title: 'Kapadokya Balon & Peri Bacaları Turu',
            date: '15 Mart 2026',
            time: '04:30 AM',
            status: 'Onaylandı',
            statusColor: 'text-green-600 bg-green-50 border-green-200',
            image: 'https://images.unsplash.com/photo-1642320008433-286a512c1fb3?auto=format&fit=crop&q=80',
            qrLink: '/offline-tickets/kapadokya',
        },
        {
            id: 'TKT-55102B',
            title: 'Büyük İtalya Turu',
            date: '5 Nisan 2026',
            time: '14:00 PM',
            status: 'Onay Bekliyor',
            statusColor: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            image: 'https://images.unsplash.com/photo-1515542622106-78b28af7815b?auto=format&fit=crop&q=80',
            qrLink: '/offline-tickets/italya',
        }
    ],
    past: [
        {
            id: 'TKT-11099C',
            title: 'Maldivler Lüks Bungalov Turu',
            date: '1 Şubat 2025',
            time: '09:00 AM',
            status: 'Tamamlandı',
            statusColor: 'text-gray-600 bg-gray-100 border-gray-200',
            image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80',
            qrLink: '#',
        }
    ]
};

export default function MyBookingsPage() {
    // Sekme yönetimi (Segmented Control)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    // Aktif sekmeye göre gösterilecek liste
    const displayTickets = activeTab === 'upcoming' ? MOCK_TICKETS.upcoming : MOCK_TICKETS.past;

    return (
        <main className="min-h-screen bg-[#F2F2F7] pb-20 pt-8 sm:py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <div className="mb-8 pl-1">
                    <Link href="/" className="inline-flex items-center gap-2 text-[#008cb3] font-bold text-sm mb-4 hover:underline">
                        <span>←</span> Ana Sayfaya Dön
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Biletlerim</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">Gelecek maceralarınızı ve geçmiş seyahatlerinizi yönetin.</p>
                </div>

                {/* iOS Style Segmented Control */}
                <div className="bg-gray-200/60 p-1 rounded-xl mb-8 flex relative z-10 w-full max-w-sm mx-auto sm:mx-0">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-[9px] transition-all duration-300 z-10 ${activeTab === 'upcoming' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Gelecek Turlar
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-[9px] transition-all duration-300 z-10 ${activeTab === 'past' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Geçmiş Turlar
                    </button>
                </div>

                {/* FlatList (Bilet Kartları Listesi) */}
                <div className="flex flex-col gap-5">
                    {displayTickets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Bu kategoride biletiniz bulunmuyor.</div>
                    ) : (
                        displayTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                // Apple Style Gölgelendirme (shadow-sm, hafif saydam) ve BorderRadius (rounded-[15px])
                                className="bg-white rounded-[15px] p-4 sm:p-5 flex gap-4 sm:gap-5 relative border border-gray-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] group"
                            >
                                {/* Sol: Tur Fotoğrafı */}
                                <div className="w-24 h-28 sm:w-32 sm:h-32 rounded-[12px] overflow-hidden shrink-0 relative bg-slate-100">
                                    <Image
                                        src={ticket.image}
                                        alt={ticket.title}
                                        fill
                                        sizes="(max-width: 768px) 96px, 128px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {/* Orta: Detaylar */}
                                <div className="flex flex-col justify-between flex-1 py-1">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <span className="text-[10px] font-black tracking-widest text-[#008cb3] uppercase">{ticket.id}</span>
                                            {/* Durum (Onaylandı / Beklemede) */}
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border ${ticket.statusColor} uppercase tracking-wider`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 max-w-[90%]">
                                            {ticket.title}
                                        </h3>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-1.5 justify-end">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
                                            <span className="opacity-70 text-base">📅</span> {ticket.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
                                            <span className="opacity-70 text-base">⏰</span> {ticket.time}
                                        </div>
                                    </div>
                                </div>

                                {/* Sağ Alt: QR İkon/Kısayol */}
                                {activeTab === 'upcoming' && (
                                    <Link
                                        href={ticket.qrLink}
                                        className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-10 h-10 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-slate-700 rounded-full flex items-center justify-center transition-colors active:scale-90"
                                        aria-label="Bileti Görüntüle / QR Kod"
                                    >
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
                                            {/* İç Noktalar (QR Detayı) */}
                                            <path d="M6 6h2v2H6zm10 0h2v2h-2zm-10 10h2v2H6zm10 10h2v2h-2zm2-4h2v2h-2z" fill="currentColor" />
                                        </svg>
                                    </Link>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
