'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '../context/LocaleContext';
import CurrencySelector from '../components/CurrencySelector';

const RESTAURANTS = [
    {
        id: 'r1',
        name: 'Ziyade Kebap & Ocakbaşı',
        location: 'İstanbul, Türkiye',
        cuisine: 'Kebap',
        priceLevel: '₺₺₺',
        rating: 4.9,
        reviews: 320,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        specialMenuPrice: 450,
        tags: ['Geleneksel', 'Meşhur']
    },
    {
        id: 'r2',
        name: 'Van Kahvaltı Evi',
        location: 'Kapadokya, Türkiye',
        cuisine: 'Kahvaltı',
        priceLevel: '₺₺',
        rating: 4.8,
        reviews: 850,
        image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
        specialMenuPrice: 250,
        tags: ['Yöresel', 'Serpme']
    },
    {
        id: 'r3',
        name: 'Le Globe - World Cuisine',
        location: 'Roma, İtalya',
        cuisine: 'Dünya Mutfağı',
        priceLevel: '₺₺₺₺',
        rating: 4.7,
        reviews: 1200,
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
        specialMenuPrice: 850,
        tags: ['Şık', 'Gourmet']
    },
    {
        id: 'r4',
        name: 'Suşi & More',
        location: 'Tokyo, Japonya',
        cuisine: 'Uzak Doğu',
        priceLevel: '₺₺₺₺',
        rating: 5.0,
        reviews: 450,
        image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&q=80',
        specialMenuPrice: 2200,
        tags: ['Taze', 'Otantik']
    },
    {
        id: 'r5',
        name: 'Kalamış Sahil Restaurant',
        location: 'İstanbul, Türkiye',
        cuisine: 'Deniz Ürünleri',
        priceLevel: '₺₺₺',
        rating: 4.6,
        reviews: 630,
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
        specialMenuPrice: 1100,
        tags: ['Manzara', 'Rakı-Balık']
    },
    {
        id: 'r6',
        name: 'Anadolu Sofrası',
        location: 'Gaziantep, Türkiye',
        cuisine: 'Etnik / Yerel',
        priceLevel: '₺₺₺',
        rating: 4.8,
        reviews: 510,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
        specialMenuPrice: 600,
        tags: ['Baharatlı', 'Meşhur']
    }
];

export default function TastePage() {
    const { t, formatPrice, locale } = useLocale();

    // Filters
    const [selectedLoc, setSelectedLoc] = useState('All');
    const [selectedCuisine, setSelectedCuisine] = useState('All');
    const [selectedPrice, setSelectedPrice] = useState('All');

    const locations = ['All', ...Array.from(new Set(RESTAURANTS.map(r => r.location)))];
    const cuisines = ['All', ...Array.from(new Set(RESTAURANTS.map(r => r.cuisine)))];
    const prices = ['All', '₺₺', '₺₺₺', '₺₺₺₺'];

    const [isVip, setIsVip] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const vipData = localStorage.getItem('vip_membership');
            if (vipData) {
                const { level, expiry } = JSON.parse(vipData);
                if (level === 'VIP' && new Date(expiry) > new Date()) {
                    setIsVip(true);
                }
            }
        }
    }, []);

    const filteredRestaurants = RESTAURANTS.filter(r => {
        return (selectedLoc === 'All' || r.location === selectedLoc) &&
               (selectedCuisine === 'All' || r.cuisine === selectedCuisine) &&
               (selectedPrice === 'All' || r.priceLevel === selectedPrice);
    });

    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <Link href="/" className="text-4xl font-extrabold text-[#008cb3] tracking-tighter">
                    tour<span className="text-[#005e85]">kia</span>
                </Link>
                <div className="flex gap-4 items-center">
                    <CurrencySelector />
                    <Link href="/" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">Ana Sayfa</Link>
                </div>
            </nav>

            {/* Header */}
            <div className="relative h-[250px] md:h-[350px] w-full flex items-center justify-center overflow-hidden bg-slate-900">
                <Image
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80"
                    alt="Gastronomy"
                    fill
                    className="object-cover opacity-60"
                />
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-3xl md:text-6xl font-black text-white mb-4 drop-shadow-xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {t.tastePage.title}
                    </h1>
                    <p className="text-sm md:text-xl text-white/90 font-medium max-w-2xl mx-auto drop-shadow-md">
                        {t.tastePage.subtitle}
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
                <div className="bg-white p-4 rounded-[24px] shadow-2xl border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4 items-center flex-1">
                        <div className="flex flex-col gap-1 min-w-[150px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t.tastePage.filters.location}</label>
                            <select
                                value={selectedLoc}
                                onChange={(e) => setSelectedLoc(e.target.value)}
                                className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#008cb3] transition-colors"
                            >
                                {locations.map(loc => <option key={loc} value={loc}>{loc === 'All' ? (locale === 'tr-TR' ? 'Tüm Bölgeler' : 'All Spots') : loc}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 min-w-[150px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t.tastePage.filters.cuisine}</label>
                            <select
                                value={selectedCuisine}
                                onChange={(e) => setSelectedCuisine(e.target.value)}
                                className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#008cb3] transition-colors"
                            >
                                {cuisines.map(c => <option key={c} value={c}>{c === 'All' ? (locale === 'tr-TR' ? 'Tüm Mutfaklar' : 'All Cuisines') : c}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 min-w-[120px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t.tastePage.filters.price}</label>
                            <select
                                value={selectedPrice}
                                onChange={(e) => setSelectedPrice(e.target.value)}
                                className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#008cb3] transition-colors"
                            >
                                {prices.map(p => <option key={p} value={p}>{p === 'All' ? (locale === 'tr-TR' ? 'Tümü' : 'All') : p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-gray-400 bg-slate-100 px-4 py-2 rounded-full hidden lg:block">
                        {filteredRestaurants.length} sonuç bulundu
                    </div>
                </div>
            </div>

            {/* Restaurant Grid */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredRestaurants.map((res, i) => (
                        <div
                            key={res.id}
                            className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 flex flex-col group"
                        >
                            <div className="relative h-64">
                                <Image
                                    src={res.image}
                                    alt={res.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm">
                                    <span className="text-yellow-500 font-black text-sm">★ {res.rating}</span>
                                    <span className="text-gray-400 text-xs ml-1 font-bold">({res.reviews})</span>
                                </div>
                                <div className="absolute bottom-4 left-6 text-white">
                                    <div className="flex gap-2 mb-1">
                                        {res.tags.map(tag => (
                                            <span key={tag} className="bg-white/20 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="text-2xl font-black">{res.name}</h3>
                                    <p className="text-xs font-bold text-white/80">{res.location} • {res.cuisine}</p>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-end mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Özel Menü Fiyatı</span>
                                        <span className="text-xl font-black text-slate-800">{formatPrice(isVip ? res.specialMenuPrice * 0.95 : res.specialMenuPrice)}</span>
                                        
                                        <div className={`mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${isVip ? 'bg-yellow-50 text-orange-600 border border-yellow-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                            <span>👑 VIP: {formatPrice(res.specialMenuPrice * 0.95)}</span>
                                            {!isVip && <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 5a3 3 0 016 0v3H9V7zm3 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>}
                                        </div>
                                    </div>
                                    <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-xl border border-green-100 text-[10px] font-black uppercase tracking-widest h-fit">
                                        {t.tastePage.stats.prepaid}
                                    </div>
                                </div>

                                {!isVip && (
                                    <Link href="/profile" className="text-[10px] font-bold text-[#008cb3] hover:underline mb-4 block">VIP Ol, Bu Fiyattan Satın Al</Link>
                                )}

                                <div className="space-y-3 mt-auto">
                                    <button
                                        onClick={() => alert('Ödeme sayfasına yönlendiriliyor...')}
                                        className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm"
                                    >
                                        {t.tastePage.actions.buyMenu}
                                    </button>
                                    <button
                                        onClick={() => alert('Rezervasyon talebiniz alındı!')}
                                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-black py-4 rounded-2xl border border-gray-200 transition-all active:scale-95 text-sm"
                                    >
                                        {t.tastePage.actions.reserve}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredRestaurants.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Seçimlerinizle eşleşen yer bulamadık</h3>
                        <p className="text-gray-500 font-bold">Filtreleri temizleyerek daha fazla lezzeti keşfedebilirsiniz.</p>
                        <button
                            onClick={() => { setSelectedLoc('All'); setSelectedCuisine('All'); setSelectedPrice('All'); }}
                            className="mt-6 bg-[#008cb3] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#005e85] transition shadow-md"
                        >
                            Filtreleri Sıfırla
                        </button>
                    </div>
                )}
            </div>

            {/* CTA Section */}
            <div className="max-w-7xl mx-auto px-6 mt-20">
                <div className="bg-[#005e85] rounded-[48px] p-8 md:p-16 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black mb-6">Kendi Gurme Rotanı Tasarla</h2>
                        <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto font-medium">Tur Rezervasyonunun yanına restoran menüsünü ekle, tatile çıkmadan tüm planlarını tamamla.</p>
                        <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-5 rounded-[24px] font-black text-lg transition-all shadow-2xl shadow-orange-500/40 inline-block active:scale-95">
                            Turları İncele
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
