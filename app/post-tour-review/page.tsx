'use client';
import React, { useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ReviewContent() {
    const searchParams = useSearchParams();
    const tourTitle = searchParams.get('tourTitle') || 'Tur Deneyimi';
    const bookingId = searchParams.get('bookingId') || 'TKT-PENDING';

    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [reviewText, setReviewText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const TAGS = ['Harika rehber', 'Lezzetli yemekler', 'Muazzam manzara', 'Dakik servis', 'Güvenli sürüş', 'Eğlenceli'];

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
        // İleride API'ye gönderilecek
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isSubmitted) {
        return (
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_20px_70px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100 text-center p-10 animate-in zoom-in-95 duration-500">
                <div className="relative mb-8">
                    {/* Konfeti Efekti (Basit Animasyonlu) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
                    </div>
                    <div className="text-7xl mb-4 relative z-10 animate-bounce">🎉</div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Harika!</h2>
                    <p className="text-gray-500 font-medium px-4">Değerli vaktini ayırıp yorum bıraktığın için teşekkür ederiz. Senin sayende diğer gezginler de doğru kararı verebilecek!</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-slate-100 font-black text-4xl select-none group-hover:scale-110 transition-transform">GIFT</div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-3">Sana Özel Hediyen</p>
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Bir sonraki deneyiminde geçerli %10 indirim kodun:</h3>
                    
                    <div className="flex items-center gap-2 bg-white border-2 border-dashed border-orange-200 p-2 rounded-2xl">
                        <code className="flex-1 font-black text-2xl text-slate-900 tracking-widest pl-2">THANKYOU10</code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText('THANKYOU10');
                                alert('İndirim kodu kopyalandı! 🎟️');
                            }}
                            className="bg-[#008cb3] hover:bg-[#005e85] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-90"
                        >
                            Kopyala
                        </button>
                    </div>
                </div>

                <Link href="/" className="inline-flex items-center gap-2 text-[#008cb3] font-black text-sm hover:underline">
                    <span>←</span> Ana Sayfaya Dön ve Keşfetmeye Devam Et
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_20px_70px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
            {/* 1. Luxury Header */}
            <div className="relative h-44 bg-slate-900 flex flex-col items-center justify-center text-white px-6 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
                
                <Link href="/" className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md transition-all active:scale-90 border border-white/10">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </Link>

                <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl border-4 border-white/20 mb-3 animate-float">
                    ⭐
                </div>
                <h1 className="relative z-10 text-2xl font-black tracking-tight text-center">Nasıl Geçti?</h1>
                <p className="relative z-10 text-amber-400/90 text-[10px] font-black uppercase tracking-[0.2em] text-center mt-1">{tourTitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-10">
                {/* 2. Glowing Star Rating */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="relative transition-all duration-300 active:scale-75 hover:scale-110"
                            >
                                <svg
                                    width="44" height="44"
                                    viewBox="0 0 24 24"
                                    fill={(hoverRating || rating) >= star ? 'url(#starGradient)' : 'none'}
                                    stroke={(hoverRating || rating) >= star ? 'transparent' : '#E2E8F0'}
                                    strokeWidth="1.5"
                                    className={`drop-shadow-xl transition-all ${(hoverRating || rating) >= star ? 'scale-110' : ''}`}
                                >
                                    <defs>
                                        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#FBBF24" />
                                            <stop offset="100%" stopColor="#EA580C" />
                                        </linearGradient>
                                    </defs>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.115-1.07.81L12 17.617a.562.562 0 00-.54 0l-4.703 2.518c-.54.289-1.218-.204-1.07-.825l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                </svg>
                                {(hoverRating || rating) >= star && (
                                    <div className="absolute inset-0 bg-orange-400 blur-xl opacity-20 -z-10 animate-pulse"></div>
                                )}
                            </button>
                        ))}
                    </div>
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                        {rating === 1 ? 'Üzücü 😞' :
                            rating === 2 ? 'Zayıf 😕' :
                                rating === 3 ? 'Güzel 😐' :
                                    rating === 4 ? 'Harika 🙂' :
                                        rating === 5 ? 'Efsanevi! 😍' : 'Puanını Seç'}
                    </span>
                </div>

                {/* 3. Fast Tags (Hazır Etiketler) */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">
                        Hızlı Değerlendirme
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-4 py-2.5 rounded-2xl text-[12px] font-bold border-2 transition-all duration-300 active:scale-95 ${
                                    selectedTags.includes(tag)
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Yorum & Fotoğraf */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">
                            Deneyim Notların
                        </label>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Anılarını paylaş..."
                            className="w-full bg-slate-50 border-none p-5 rounded-3xl outline-none focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-medium text-slate-700 min-h-[120px] resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleImageChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-500 hover:bg-slate-100 transition-colors group"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-[13px] font-bold uppercase tracking-widest">Görsel Ekle</span>
                        </button>
                        
                        {imagePreview && (
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white animate-in zoom-in-50 duration-300">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setImagePreview(null)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Submit Button */}
                <button
                    type="submit"
                    disabled={rating === 0}
                    className={`w-full py-5 rounded-[2rem] font-black text-[16px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                        rating > 0
                        ? 'bg-gradient-to-r from-[#008cb3] to-[#005e85] text-white hover:shadow-[0_15px_40px_rgba(0,140,179,0.3)] active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    Gönder ve Bitir
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>

                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                    Tourkia • Güvenli Değerlendirme Sistemi
                </p>
            </form>
        </div>
    );
}

export default function PostTourReviewPage() {
    return (
        <main className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 font-sans py-12">
            <Suspense fallback={<div className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Premium Arayüz Yükleniyor...</div>}>
                <ReviewContent />
            </Suspense>
        </main>
    );
}
