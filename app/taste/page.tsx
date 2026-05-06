'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '../context/LocaleContext';
import Navbar from '../components/Navbar';

const RESTAURANTS = [
    {
        id: 'r1',
        name: 'Ziyade Kebap & Ocakbaşı',
        location: 'İstanbul, Türkiye',
        cuisine: 'Kebap',
        category: 'Türk Mutfağı',
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
        category: 'Türk Mutfağı',
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
        location: 'Sultanahmet, İstanbul',
        cuisine: 'Dünya Mutfağı',
        category: 'Avrupa Mutfağı',
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
        category: 'Asya Mutfağı',
        priceLevel: '₺₺₺₺',
        rating: 5.0,
        reviews: 450,
        image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&q=80',
        specialMenuPrice: 2200,
        tags: ['Taze', 'Otantik']
    },
    {
        id: 'r5',
        name: 'Al-Sultan Lebanese',
        location: 'Beyrut, Lübnan',
        cuisine: 'Lübnan Mutfağı',
        category: 'Arap Mutfağı',
        priceLevel: '₺₺₺',
        rating: 4.6,
        reviews: 630,
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
        specialMenuPrice: 1100,
        tags: ['Otantik', 'Meze']
    },
    {
        id: 'r6',
        name: 'La Trattoria',
        location: 'Roma, İtalya',
        cuisine: 'İtalyan Mutfağı',
        category: 'Avrupa Mutfağı',
        priceLevel: '₺₺₺',
        rating: 4.8,
        reviews: 510,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
        specialMenuPrice: 600,
        tags: ['Taze Makarna', 'Şarap']
    }
];

const TRENDING_TASTES = [
    {
        id: 't-kapadokya',
        name: 'VIP Mağara Restoranda Geleneksel Testi Kebabı',
        origin: 'Kapadokya',
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80',
        rating: 4.9,
        category: 'Türk Mutfağı',
        tag: '🔥 En Çok Tercih Edilen'
    },
    {
        id: 't-istanbul',
        name: 'Boğaz Manzaralı Levrek & Meze Tadımı',
        origin: 'İstanbul',
        image: 'https://images.unsplash.com/photo-1534080564607-cc4039a2144a?w=800&q=80',
        rating: 4.8,
        category: 'Türk Mutfağı',
        tag: '💎 Premium Deneyim'
    },
    {
        id: 't-antalya',
        name: 'Falezlere Karşı Sınırsız Serpme Kahvaltı',
        origin: 'Antalya',
        image: 'https://images.unsplash.com/photo-1541014741259-df5294bc008b?w=800&q=80',
        rating: 5.0,
        category: 'Türk Mutfağı',
        tag: '☀️ Sabahın Yıldızı'
    },
    {
        id: 't-paella',
        name: 'Geleneksel Deniz Ürünleri Paella',
        origin: 'Valencia, İspanya',
        image: 'https://images.unsplash.com/photo-1534080564607-cc4039a2144a?w=800&q=80',
        rating: 4.7,
        category: 'Avrupa Mutfağı'
    },
    {
        id: 't-padthai',
        name: 'Otantik Pad Thai',
        origin: 'Bangkok, Tayland',
        image: 'https://images.unsplash.com/photo-1559311648-d46f4d8593d8?w=800&q=80',
        rating: 4.8,
        category: 'Asya Mutfağı'
    },
    {
        id: 't-kunefe',
        name: 'Hatay Usulü Peynirli Künefe',
        origin: 'Antakya, Türkiye',
        image: 'https://images.unsplash.com/photo-1512414686113-d46816867375?w=800&q=80',
        rating: 4.9,
        category: 'Türk Mutfağı'
    },
    {
        id: 't-sushi',
        name: 'Dragon Roll Sushi',
        origin: 'Osaka Usulü',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
        rating: 5.0,
        category: 'Asya Mutfağı'
    },
    {
        id: 't-pizza',
        name: 'Napoliten Pizza',
        origin: 'İtalyan Klasiği',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80',
        rating: 4.8,
        category: 'Avrupa Mutfağı'
    },
    {
        id: 't-hummus',
        name: 'Kıymalı Sıcak Humus',
        origin: 'Ortadoğu Esintisi',
        image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800&q=80',
        rating: 4.7,
        category: 'Arap Mutfağı'
    },
    {
        id: 't-french',
        name: 'Geleneksel Fransız Soğan Çorbası',
        origin: 'Paris, Fransa',
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
        rating: 4.6,
        category: 'Avrupa Mutfağı'
    },
    {
        id: 't-dimsum',
        name: 'Karışık Dim Sum Sepeti',
        origin: 'Hong Kong',
        image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80',
        rating: 4.9,
        category: 'Asya Mutfağı'
    },
    {
        id: 't-mezze',
        name: 'Lübnan Meze Koleksiyonu',
        origin: 'Beyrut',
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
        rating: 4.8,
        category: 'Arap Mutfağı'
    }
];

export default function TastePage() {
    const { t, formatPrice, locale } = useLocale();

    const [isVip, setIsVip] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = [
        { 
            id: 'Popular',
            label: 'Popüler Mutfaklar',
            icon: <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-sm">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </div>
        },
        { 
            id: 'Türk Mutfağı', 
            label: 'Türk Mutfağı',
            icon: <div className="w-8 h-8 relative rounded-full overflow-hidden border border-gray-100 shadow-sm">
                    <Image src="/images/cuisines/turkish.png" fill alt="TR" className="object-cover" />
                  </div>
        },
        { 
            id: 'Avrupa Mutfağı', 
            label: 'Avrupa Mutfağı',
            icon: <div className="w-8 h-8 relative rounded-full overflow-hidden border border-gray-100 shadow-sm">
                    <Image src="/images/cuisines/european.png" fill alt="EU" className="object-cover" />
                  </div>
        },
        { 
            id: 'Asya Mutfağı', 
            label: 'Asya Mutfağı',
            icon: <div className="w-8 h-8 relative rounded-full overflow-hidden border border-gray-100 shadow-sm">
                    <Image src="/images/cuisines/asian.png" fill alt="AS" className="object-cover" />
                  </div>
        },
        { 
            id: 'Arap Mutfağı', 
            label: 'Arap Mutfağı',
            icon: <div className="w-8 h-8 relative rounded-full overflow-hidden border border-gray-100 shadow-sm">
                    <Image src="/images/cuisines/arabic.png" fill alt="AR" className="object-cover" />
                  </div>
        }
    ];

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


    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            <Navbar />

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

            {/* Global Cuisine Pill Navigation */}
            <div className="max-w-[1400px] mx-auto px-4 mt-12">
                <div className="flex flex-row justify-center gap-2 md:gap-3 lg:gap-4 flex-wrap sm:flex-nowrap">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id === 'Popular' ? null : cat.id)}
                            className={`px-3 md:px-5 lg:px-8 py-2.5 md:py-4 rounded-full font-black text-[9px] md:text-[11px] lg:text-sm uppercase tracking-wider transition-all duration-500 shadow-sm active:scale-95 border-2 flex items-center gap-2 md:gap-3 flex-shrink-0 ${(activeCategory === cat.id || (cat.id === 'Popular' && activeCategory === null)) ? 'bg-[#008cb3] text-white border-[#008cb3] shadow-xl shadow-blue-500/20 scale-105' : 'bg-white text-slate-500 border-gray-100 hover:border-gray-200 hover:text-slate-700'}`}
                        >
                            <span className={(activeCategory === cat.id || (cat.id === 'Popular' && activeCategory === null)) ? 'text-white' : 'text-[#008cb3]'}>
                                {cat.icon}
                            </span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>


            {/* Restaurant Grid or Welcome Showcase */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 relative min-h-[600px]">
                {activeCategory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        {RESTAURANTS.filter(res => res.category === activeCategory).map((res, i) => (
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
                ) : (
                    <div className="py-12 animate-in fade-in slide-in-from-top-4 duration-700">
                        {/* Trending Tastes Showcase */}
                        <div className="mb-20">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-8 flex items-center gap-4">
                                <span className="w-12 h-1.5 bg-[#008cb3] rounded-full"></span>
                                Popüler Lezzetler
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {TRENDING_TASTES.map((taste) => (
                                    <div 
                                        key={taste.id}
                                        onClick={() => setActiveCategory(taste.category)}
                                        className="group cursor-pointer"
                                    >
                                        <div className="relative h-72 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 group-hover:shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-500 border border-white">
                                            <Image 
                                                src={taste.image}
                                                fill
                                                alt={taste.name}
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                            
                                            {taste.tag && (
                                                <div className="absolute top-4 left-4">
                                                    <span className="bg-white/90 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm text-slate-800 uppercase tracking-tight">
                                                        {taste.tag}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="absolute bottom-6 left-6 right-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-yellow-400 font-black text-xs">★ {taste.rating}</span>
                                                    <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                                    <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{taste.origin}</span>
                                                </div>
                                                <h3 className="text-xl font-black text-white">{taste.name}</h3>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Business Onboarding CTA */}
            <div className="max-w-7xl mx-auto px-6 mt-20">
                <div className="bg-white rounded-[40px] p-8 md:p-12 border-2 border-dashed border-orange-200 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-orange-500 transition-all duration-500">
                    <div className="flex-1 text-center md:text-left">
                        <span className="bg-orange-100 text-orange-600 text-[10px] uppercase font-black px-3 py-1 rounded-full mb-4 inline-block tracking-widest">İşletme Sahipleri İçin</span>
                        <h2 className="text-2xl md:text-4xl font-black text-slate-800 mb-4 transition-colors group-hover:text-orange-600">Restoranınızı veya Cafenizi <br /> Sisteme Ekleyin!</h2>
                        <p className="text-gray-500 font-bold max-w-xl">Maliyetleri düşürün, rezervasyonlarınızı tek panelden yönetin ve binlerce turiste anında ulaşın. Üstelik ilk 3 ay komisyon ödemeyin.</p>
                    </div>
                    <Link href="/?showAgencyModal=true" className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black text-lg transition-all shadow-xl hover:bg-orange-500 hover:shadow-orange-500/20 active:scale-95 whitespace-nowrap">
                        Hemen Başvur ➔
                    </Link>
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-7xl mx-auto px-6 mt-12 mb-20">
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
