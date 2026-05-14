'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useLocale } from '../../context/LocaleContext';

// MOCK: Restoran Verisi
const RESTAURANT = {
    id: 'r1',
    name: 'Ziyade Kebap & Ocakbaşı',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&q=80',
    description: 'Kapadokya’nın binlerce yıllık geleneksel lezzeti Testi Kebabı ve eşsiz ocakbaşı deneyimi.',
    location: 'Göreme, Kapadokya',
    rating: 4.9,
    reviews: 320,
};

// MOCK: Mikro Menü Paketleri
const MENU_PACKAGES = [
    {
        id: 'm1',
        category: 'Başlangıçlar',
        name: 'Geleneksel Meze Tabağı',
        description: 'Acılı ezme, haydari, şakşuka ve sıcak humus.',
        price: 450,
        image: 'https://images.unsplash.com/photo-1548943487-a2e4f43bb2bb?w=600&q=80'
    },
    {
        id: 'm2',
        category: 'Başlangıçlar',
        name: 'Günün Çorbası',
        description: 'Sıcacık süzme mercimek veya yöresel tarhana.',
        price: 150,
        image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80'
    },
    {
        id: 'm3',
        category: 'Ana Yemekler',
        name: 'Testi Kebabı',
        description: 'Kapadokya özel şov eşliğinde 4 saat pişmiş kuzu eti.',
        price: 1450,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80',
        badge: 'Şefin Tavsiyesi',
        badgeColor: 'bg-red-600'
    },
    {
        id: 'm4',
        category: 'Ana Yemekler',
        name: 'Karışık Izgara',
        description: 'Adana, Urfa, tavuk şiş ve kuzu pirzola.',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80'
    },
    {
        id: 'm5',
        category: 'Tatlılar',
        name: 'Fıstıklı Baklava',
        description: 'Antep fıstıklı taze günlük baklava ve Maraş dondurması.',
        price: 350,
        image: 'https://images.unsplash.com/photo-1519915028121-7d3463d20eb4?w=600&q=80'
    },
    {
        id: 'm6',
        category: 'Tatlılar',
        name: 'Fırın Sütlaç',
        description: 'Üzeri nar gibi kızarmış, fındık serpmeli.',
        price: 200,
        image: 'https://images.unsplash.com/photo-1600289031464-74d374b64991?w=600&q=80'
    }
];

export default function RestaurantMenuPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug; // İleride API'den slug'a göre restoranı çekeceğiz
    const { formatPrice } = useLocale();
    const [addedToCart, setAddedToCart] = useState<string | null>(null);

    // Kategorileri gruplandır
    const groupedMenu = MENU_PACKAGES.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, typeof MENU_PACKAGES>);

    const handleBuyNow = (item: typeof MENU_PACKAGES[0]) => {
        setAddedToCart(item.id);
        // Hızlı Seçim: Doğrudan checkout'a yönlendir (type=meal flag'i ile)
        setTimeout(() => {
            router.push(`/checkout?menuId=${item.id}&type=meal`);
        }, 500);
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white pb-24 transition-colors duration-500">
            <Navbar />

            {/* Restoran Kapak ve Header Alanı */}
            <div className="relative h-[350px] md:h-[450px] w-full">
                <Image
                    src={RESTAURANT.coverImage}
                    alt={RESTAURANT.name}
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 max-w-7xl mx-auto translate-y-1/3 flex flex-col md:flex-row items-center md:items-end gap-6 z-10">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden relative bg-white shrink-0">
                        <Image
                            src={RESTAURANT.logo}
                            alt="Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="text-center md:text-left mb-4 md:mb-12 mt-4 md:mt-0">
                        <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg tracking-tight mb-2">
                            {RESTAURANT.name}
                        </h1>
                        <p className="text-white/80 font-medium text-sm md:text-base max-w-2xl drop-shadow-md">
                            {RESTAURANT.description}
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-bold text-gray-300 mt-3">
                            <span className="flex items-center gap-1">📍 {RESTAURANT.location}</span>
                            <span className="flex items-center gap-1 text-yellow-400">⭐ {RESTAURANT.rating} ({RESTAURANT.reviews} Yorum)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menü İçeriği */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-48 md:mt-32 relative z-0">
                {Object.entries(groupedMenu).map(([category, items]) => (
                    <div key={category} className="mb-16">
                        {/* Kategori Başlığı */}
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                {category}
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                        </div>

                        {/* 4'lü Grid Düzeni (Mikro Paket Tasarımı) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            {items.map((item) => (
                                <div 
                                    key={item.id}
                                    className="bg-white dark:bg-slate-900 rounded-[16px] overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-slate-800 flex flex-col h-[320px] group cursor-pointer"
                                >
                                    {/* Üst Yarı: Görsel */}
                                    <div className="relative h-[160px] w-full overflow-hidden shrink-0">
                                        <Image 
                                            src={item.image} 
                                            alt={item.name} 
                                            fill 
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        {item.badge && (
                                            <div className={`absolute top-3 left-3 ${item.badgeColor || 'bg-orange-500'} text-white text-[9px] font-black px-2 py-1 rounded-md shadow-md z-10 uppercase tracking-wider`}>
                                                {item.badge}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>

                                    {/* Alt Yarı: İçerik */}
                                    <div className="p-4 flex flex-col justify-between flex-1">
                                        <div>
                                            <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-orange-500 transition-colors">
                                                {item.name}
                                            </h3>
                                            <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className="flex items-end justify-between mt-4">
                                            <button 
                                                onClick={() => handleBuyNow(item)}
                                                className={`text-[10px] font-black px-4 py-2.5 rounded-xl transition-all duration-300 active:scale-95 uppercase tracking-widest shadow-sm border flex items-center gap-1.5 ${
                                                    addedToCart === item.id 
                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/20' 
                                                    : 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                                }`}
                                            >
                                                {addedToCart === item.id ? (
                                                    <><span>⏳</span> Yönlendiriliyor</>
                                                ) : (
                                                    <><span>⚡</span> Hemen Al</>
                                                )}
                                            </button>
                                            
                                            <div className="text-xl font-black text-[#fbbf24] tracking-tighter text-right">
                                                <span suppressHydrationWarning>{formatPrice(item.price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
