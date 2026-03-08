'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PostTourReviewPage() {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState<string>('');
    const [reviewText, setReviewText] = useState('');

    const TIPS = [50, 100, 200];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // İleride API'ye gönderilecek veri nesnesi
        const finalTip = selectedTip === -1 ? Number(customTip) : selectedTip;
        // console.log('Gönderilen Veri:', { rating, tip: finalTip, reviewText });
        alert('Değerlendirmeniz ve bahşişiniz başarıyla iletildi! 🎉');
    };

    return (
        <main className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 font-sans py-12">
            <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">

                {/* 1. Header & Görsel Banner */}
                <div className="relative h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white px-6 overflow-hidden">
                    {/* Arkaplan Şehir Gridi (Hafif Şeffaf) */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

                    <Link href="/" className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </Link>

                    <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg border-4 border-white/20 mb-2">
                        🌟
                    </div>
                    <h1 className="relative z-10 text-xl font-black tracking-tight text-center">Deneyimin Nasıldı?</h1>
                    <p className="relative z-10 text-white/80 text-xs font-medium text-center">Kapadokya Balon Turu - 15 Mart</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-8">

                    {/* 2. Rehber Puanlama (Rating) */}
                    <div className="flex flex-col items-center gap-3">
                        <label className="text-sm font-bold text-slate-700 text-center">
                            Rehberimiz Ahmet'i nasıl buldun?
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="relative transition-transform active:scale-75 focus:outline-none"
                                >
                                    <svg
                                        width="36" height="36"
                                        viewBox="0 0 24 24"
                                        fill={(hoverRating || rating) >= star ? '#FBBF24' : 'none'}
                                        stroke={(hoverRating || rating) >= star ? '#FBBF24' : '#E2E8F0'}
                                        strokeWidth="1.5"
                                        className="transition-colors duration-200"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.115-1.07.81L12 17.617a.562.562 0 00-.54 0l-4.703 2.518c-.54.289-1.218-.204-1.07-.825l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest h-4">
                            {rating === 1 ? 'Hiç Beğenmedim 😞' :
                                rating === 2 ? 'Geliştirilmeli 😕' :
                                    rating === 3 ? 'İdare Eder 😐' :
                                        rating === 4 ? 'Çok İyiydi 🙂' :
                                            rating === 5 ? 'Muazzam Bir Deneyim! 😍' : ''}
                        </span>
                    </div>

                    {/* 3. Bahşiş (Tip) Alanı */}
                    <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl pointer-events-none">☕</div>
                        <div className="relative z-10 flex flex-col gap-3">
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">☕</span>
                                Rehberine bir kahve ısmarla
                            </h3>
                            <p className="text-[11px] font-medium text-slate-500 leading-tight">
                                Harika bir gün geçirdiysen rehberine küçük bir teşekkür edebilirsin.
                            </p>

                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {TIPS.map((tip) => (
                                    <button
                                        key={tip}
                                        type="button"
                                        onClick={() => { setSelectedTip(tip); setCustomTip(''); }}
                                        className={`py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${selectedTip === tip
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                                            : 'bg-white border-orange-200 text-orange-600 hover:border-orange-300'
                                            }`}
                                    >
                                        ₺{tip}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setSelectedTip(-1)}
                                    className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all duration-200 ${selectedTip === -1
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                                        : 'bg-white border-orange-200 text-orange-600 hover:border-orange-300'
                                        }`}
                                >
                                    Farklı
                                </button>
                            </div>

                            {/* Özel İstenen Miktar Inputu */}
                            {selectedTip === -1 && (
                                <div className="mt-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₺</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={customTip}
                                            onChange={(e) => setCustomTip(e.target.value)}
                                            placeholder="Örn: 500"
                                            className="w-full bg-white border border-orange-200 py-3 pl-8 pr-4 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-bold text-slate-800"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Yorum / Değerlendirme Metni */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                            Özel Yorumun (İsteğe Bağlı)
                        </label>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Tur nasıldı? Kapadokya sence de büyüleyici değil miydi? 🎈"
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-[#008cb3] focus:bg-white focus:ring-4 focus:ring-[#008cb3]/10 transition-all text-sm font-medium text-slate-700 min-h-[100px] resize-none"
                        />
                    </div>

                    {/* 5. Butonlar (Gönder & Paylaş) */}
                    <div className="flex flex-col gap-3 mt-2">
                        <button
                            type="submit"
                            disabled={rating === 0}
                            className={`w-full py-4 rounded-xl font-black text-[15px] transition-all flex items-center justify-center gap-2 ${rating > 0
                                ? 'bg-[#008cb3] text-white hover:bg-[#005e85] active:scale-95 shadow-lg shadow-blue-500/30'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Değerlendirmeyi Gönder
                        </button>

                        <button
                            type="button"
                            onClick={() => alert("Instagram Story arayüzü tetikleniyor...")}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-xl font-bold text-white text-[13px] hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-pink-500/20"
                        >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            Anıyı Instagram'da Paylaş
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}
