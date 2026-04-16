'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Style {
    id: string;
    title: string;
    icon: string;
    desc: string;
    color: string;
    bgImage: string;
}

export default function StylesPage() {
    const STYLES: Style[] = [
        { id: 'adrenalin', title: 'Adrenalin Tutkunu', icon: '🧗‍♂️', desc: 'Rüzgarı hisset, yamaç paraşütünden rafting turlarına.', color: 'from-orange-500 to-red-600', bgImage: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=400' },
        { id: 'kultur', title: 'Kültür Avcısı', icon: '🏛️', desc: 'Antik kentler, müzeler ve tarihin tozlu sayfalarında gezin.', color: 'from-blue-600 to-indigo-800', bgImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=400' },
        { id: 'gurme', title: 'Gurme Gezgin', icon: '🍲', desc: 'Sokak lezzetlerinden Michelin yıldızlı restoranlara.', color: 'from-amber-400 to-orange-500', bgImage: 'https://images.unsplash.com/photo-1544025162-836f3c153303?auto=format&fit=crop&q=80&w=400' },
        { id: 'huzur', title: 'Huzur Arayan', icon: '🧘‍♀️', desc: 'Yoga kampları, ıssız koylar ve doğayla iç içe sessizlik.', color: 'from-emerald-400 to-teal-600', bgImage: 'https://images.unsplash.com/photo-1499806981882-843f54d193ba?auto=format&fit=crop&q=80&w=400' }
    ];

    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const saved = localStorage.getItem('tourkia_style');
        if (saved) setSelectedStyle(saved);
    }, []);

    const handleSelect = (id: string) => {
        setSelectedStyle(id);
        localStorage.setItem('tourkia_style', id);
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Macera Stilim</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1">Sen nasıl bir gezginsin? Stilini seç, TourGo anasayfasını sana özel filtrelesin.</p>
                    </div>
                    <Link href="/" className="hidden sm:flex text-gray-500 hover:text-[#008cb3] text-sm font-bold items-center gap-2 transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Anasayfaya Dön
                    </Link>
                </div>

                {selectedStyle && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-8 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl bg-white p-2 rounded-full shadow-sm">{STYLES.find(s => s.id === selectedStyle)?.icon}</span>
                            <div>
                                <h4 className="font-bold text-sm">Harika Seçim! Seni tanıyoruz kanka.</h4>
                                <p className="text-xs mt-0.5 opacity-90">Anasayfadaki turlar artık senin için optimize ediliyor. Yakında sadece sana özel rotalar göreceksin.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {STYLES.map(style => {
                        const isSelected = selectedStyle === style.id;
                        return (
                            <div
                                key={style.id}
                                onClick={() => handleSelect(style.id)}
                                className={`relative h-64 rounded-[24px] overflow-hidden cursor-pointer group transition-all duration-300 ${isSelected ? 'ring-4 ring-offset-4 ring-[#008cb3] scale-[1.02] shadow-2xl' : 'hover:scale-[1.02] hover:shadow-xl'}`}
                            >
                                <div className="absolute inset-0 bg-gray-900/60 z-10 group-hover:bg-gray-900/40 transition-colors"></div>
                                <div className={`absolute inset-0 bg-gradient-to-t ${style.color} mix-blend-multiply opacity-60 z-10`}></div>
                                <img src={style.bgImage} alt={style.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

                                <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-4xl drop-shadow-md">{style.icon}</span>
                                        {isSelected && (
                                            <span className="bg-white text-gray-900 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">BENİM STİLİM</span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black mb-2 drop-shadow-lg tracking-tight">{style.title}</h3>
                                    <p className="text-sm font-medium opacity-90 leading-relaxed drop-shadow-md">{style.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="h-20"></div>
            </div>
        </div>
    );
}
