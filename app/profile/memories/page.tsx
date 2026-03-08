'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface MemoryFolder {
    id: string;
    tourName: string;
    year: string;
    coverPhoto: string;
    photosCount: number;
}

export default function MemoriesPage() {
    const folders: MemoryFolder[] = [
        { id: '1', tourName: 'Kapadokya Balon & Vadi Turu', year: '2024', coverPhoto: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=400', photosCount: 24 },
        { id: '2', tourName: 'Büyük İtalya Rotası', year: '2023', coverPhoto: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&q=80&w=400', photosCount: 56 },
        { id: '3', tourName: 'Karadeniz Rüyası', year: '2023', coverPhoto: 'https://images.unsplash.com/photo-1589133177309-dd773addb838?auto=format&fit=crop&q=80&w=400', photosCount: 12 },
    ];

    const [isClient, setIsClient] = useState(false);

    useEffect(() => setIsClient(true), []);

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Dijital Albümüm (Anılar)</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1">TourGo ile biriktirdiğin eşsiz anılar ölümsüzleşti.</p>
                    </div>
                    <Link href="/" className="text-gray-500 hover:text-[#008cb3] text-sm font-bold flex items-center gap-2 transition-colors self-start sm:self-auto">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Anasayfaya Dön
                    </Link>
                </div>

                {/* Hero / Scrapbook Banner */}
                <div className="bg-[url('https://images.unsplash.com/photo-1506501139174-099022df5260?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center rounded-[30px] p-8 md:p-12 mb-12 relative overflow-hidden shadow-lg group cursor-pointer">
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-500 z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-white text-center md:text-left">
                            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block shadow-sm">Sezonun Özeti</span>
                            <h2 className="text-4xl md:text-5xl font-black mb-3">2024 Yaz Hatıraları</h2>
                            <p className="text-lg opacity-90 max-w-lg font-medium">Bu yaz birlikte 3 ülke, 8 şehir gezdik. İnanılmaz anılar biriktirdin.</p>
                        </div>
                        <button className="bg-white text-pink-600 hover:text-white hover:bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 font-extrabold px-8 py-4 rounded-full transition-all shadow-xl hover:shadow-pink-500/30 flex items-center gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            Instagram'da Paylaş
                        </button>
                    </div>
                </div>

                {/* Klasörler */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {folders.map(folder => (
                        <div key={folder.id} className="group cursor-pointer">
                            <div className="relative h-64 w-full rounded-[24px] overflow-hidden shadow-sm group-hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 bg-white">
                                <Image src={folder.coverPhoto} alt={folder.tourName} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>

                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-white/30">
                                    <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-white text-xs font-bold">{folder.photosCount}</span>
                                </div>

                                <div className="absolute bottom-5 left-5 right-5">
                                    <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-lg">{folder.tourName}</h3>
                                    <span className="text-white/80 font-semibold text-xs mt-1 block drop-shadow">{folder.year}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="h-64 rounded-[24px] border-2 border-dashed border-gray-200 bg-slate-50 flex items-center justify-center flex-col gap-3 group hover:border-[#008cb3] hover:bg-blue-50 transition-colors cursor-pointer text-gray-400 hover:text-[#008cb3]">
                        <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center">
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-bold text-sm">Eski Tatil Fotoğraflarını Yükle</span>
                    </div>
                </div>

                <div className="h-20"></div>
            </div>
        </div>
    );
}
