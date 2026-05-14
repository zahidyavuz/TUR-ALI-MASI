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
        culturalIdentity: 'Geleneksel Anadolu mutfağının asırlık sırları ve ocakbaşı kültürü',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        location: 'Kapadokya',
        priceLevel: 2,
        rating: 4.9
    },
    {
        id: 'r2',
        name: 'Van Kahvaltı Evi',
        culturalIdentity: 'İpekyolu\'nun bereketli sofralarından günümüze uzanan yöresel lezzet şöleni',
        image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        location: 'İstanbul',
        priceLevel: 1,
        rating: 4.8
    },
    {
        id: 'r3',
        name: 'Mavi Ege Restoran',
        culturalIdentity: 'Ege\'nin otantik lezzetleri ve deniz kokan taze sofraları',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
        cuisine: 'Ege & Akdeniz',
        location: 'Antalya',
        priceLevel: 3,
        rating: 4.7
    },
    {
        id: 'r4',
        name: 'Asitane',
        culturalIdentity: 'Osmanlı Saray mutfağının unutulmuş reçeteleri ve asil sunumları',
        image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=1200&q=80',
        cuisine: 'İç Anadolu',
        location: 'İstanbul',
        priceLevel: 3,
        rating: 4.9
    },
    {
        id: 'r5',
        name: 'Suna\'nın Yeri',
        culturalIdentity: 'Boğaz\'ın kıyısında, samimi ve asırlık balıkçı gelenekleri',
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=80',
        cuisine: 'Ege & Akdeniz',
        location: 'İstanbul',
        priceLevel: 2,
        rating: 4.6
    },
    {
        id: 'r6',
        name: 'Anadolu Sofrası',
        culturalIdentity: 'Mezopotamya\'nın baharatlı ruhu ve misafirperverliği',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        location: 'Mardin',
        priceLevel: 2,
        rating: 4.8
    },
    {
        id: 'r7',
        name: 'Il Padrino',
        culturalIdentity: 'Napoli\'den gelen asırlık tarifler ve el yapımı makarnalar',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?w=1200&q=80',
        cuisine: 'İtalyan Mutfağı',
        location: 'İstanbul',
        priceLevel: 2,
        rating: 4.5
    },
    {
        id: 'r8',
        name: 'Sakura Sushi',
        culturalIdentity: 'Uzakdoğu\'nun disiplini ve taze deniz ürünlerinin sanatı',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80',
        cuisine: 'Asya Mutfağı',
        location: 'Antalya',
        priceLevel: 3,
        rating: 4.7
    }
];

const CUISINES = [
    { id: 'All', name: 'Tümü', icon: '🍽️', description: 'Türkiye ve dünyanın en iyi lezzet duraklarını keşfedin' },
    { id: 'Ege & Akdeniz', name: 'Ege & Akdeniz', icon: '🌿', description: 'Zeytinyağlılar, deniz ürünleri ve hafif mezeleri keşfediyorsunuz' },
    { id: 'Güneydoğu & Doğu Anadolu', name: 'Güneydoğu & Doğu Anadolu', icon: '🌶️', description: 'Kebaplar, baharatlı etler ve yöresel tatları keşfediyorsunuz' },
    { id: 'Karadeniz', name: 'Karadeniz', icon: '🐟', description: 'Pide, balık çeşitleri ve yöresel otları keşfediyorsunuz' },
    { id: 'İç Anadolu', name: 'İç Anadolu', icon: '🥐', description: 'Hamur işleri, geleneksel ev yemekleri ve tencere lezzetlerini keşfediyorsunuz' },
    { id: 'İtalyan Mutfağı', name: 'İtalyan Mutfağı', icon: '🍕', description: 'Pizza, makarna ve Akdeniz esintilerini keşfediyorsunuz' },
    { id: 'Asya Mutfağı', name: 'Asya Mutfağı', icon: '🍣', description: 'Sushi, noodle ve egzotik doğu lezzetlerini keşfediyorsunuz' },
    { id: 'Fransız & Avrupa', name: 'Fransız & Avrupa', icon: '🍷', description: 'Gurme soslar, etler ve modern Avrupa mutfağını keşfediyorsunuz' },
];

export default function TastePage() {
    const { t, formatPrice, locale } = useLocale();

    // Advanced Filters State
    const [selectedCuisine, setSelectedCuisine] = useState('All');
    const [selectedLocation, setSelectedLocation] = useState('All');
    const [selectedPriceLevel, setSelectedPriceLevel] = useState('All');
    const [showHighRated, setShowHighRated] = useState(false);

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

    // Filter Logic
    const filteredRestaurants = RESTAURANTS.filter(res => {
        const matchesCuisine = selectedCuisine === 'All' || res.cuisine === selectedCuisine;
        const matchesLocation = selectedLocation === 'All' || res.location === selectedLocation;
        const matchesPrice = selectedPriceLevel === 'All' || res.priceLevel.toString() === selectedPriceLevel;
        const matchesRating = !showHighRated || res.rating >= 4.5;
        return matchesCuisine && matchesLocation && matchesPrice && matchesRating;
    });

    const locations = ['All', 'İstanbul', 'Kapadokya', 'Antalya', 'Mardin'];
    const priceLevels = [
        { id: 'All', label: 'Bütçe Seçin' },
        { id: '1', label: 'Ekonomik (₺)' },
        { id: '2', label: 'Orta Segment (₺₺)' },
        { id: '3', label: 'Lüks/Gurme (₺₺₺)' }
    ];

    const currentCuisine = CUISINES.find(c => c.id === selectedCuisine) || CUISINES[0];

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-foreground pb-20 transition-colors duration-500">
            <Navbar />

            {/* Header */}
            <div className="relative h-[300px] md:h-[400px] w-full flex items-center justify-center overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80"
                    alt="Gastronomy"
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-slate-50 dark:to-slate-950"></div>
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-3xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 tracking-tighter">
                        Lezzet Durakları
                    </h1>
                    <p className="text-sm md:text-xl text-white/80 font-medium max-w-3xl mx-auto drop-shadow-md tracking-wide">
                        Kültürel mirasın ve modern lezzetlerin buluşma noktası.
                    </p>
                </div>
            </div>

            {/* Advanced Filter Bar - Design inspired by Tour Search Bar */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 md:-mt-24 relative z-20">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-4 md:p-8 shadow-2xl border border-gray-100 dark:border-slate-800">
                    
                    {/* Category Icons Bar */}
                    <div className="flex items-center gap-4 overflow-x-auto pb-6 scrollbar-hide no-scrollbar">
                        {CUISINES.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCuisine(c.id)}
                                className={`flex flex-col items-center gap-2 min-w-[120px] p-4 rounded-2xl transition-all duration-300 ${
                                    selectedCuisine === c.id 
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105' 
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                }`}
                            >
                                <span className="text-3xl mb-1">{c.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{c.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-slate-800 w-full mb-6"></div>

                    {/* Secondary Filters: Location, Price, Rating */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* Location Dropdown */}
                        <div className="relative group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-2">Bölge / Şehir</label>
                            <select 
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-orange-500 transition-all"
                            >
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc === 'All' ? 'Tüm Bölgeler' : loc}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 bottom-4 pointer-events-none text-slate-400">▼</div>
                        </div>

                        {/* Price Level Dropdown */}
                        <div className="relative group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-2">Fiyat Aralığı</label>
                            <select 
                                value={selectedPriceLevel}
                                onChange={(e) => setSelectedPriceLevel(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-orange-500 transition-all"
                            >
                                {priceLevels.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 bottom-4 pointer-events-none text-slate-400">▼</div>
                        </div>

                        {/* Rating Toggle */}
                        <div className="flex items-center justify-between md:justify-center bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 md:mt-6">
                            <span className="text-sm font-bold">⭐ 4.5+ Puanlılar</span>
                            <button 
                                onClick={() => setShowHighRated(!showHighRated)}
                                className={`w-12 h-6 rounded-full transition-all relative ${showHighRated ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showHighRated ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Search Action / Info */}
                        <div className="text-center md:text-right md:mt-6">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">
                                {filteredRestaurants.length} Restoran Listelendi
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Info Sentence */}
                <div className="mt-12 px-4 animate-in fade-in slide-in-from-left-4 duration-700">
                    <p className="text-xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                        <span className="text-4xl">{currentCuisine.icon}</span>
                        Şu an <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-[12px]">{currentCuisine.id === 'All' ? "tüm Türkiye'nin" : currentCuisine.name}</span> en iyi lezzet duraklarını keşfediyorsunuz.
                    </p>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-4 font-bold italic tracking-wide">
                        "{currentCuisine.description}"
                    </p>
                </div>
            </div>

            {/* Restaurant Grid */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-16 min-h-[400px]">
                {filteredRestaurants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {filteredRestaurants.map((res, i) => (
                            <Link
                                key={res.id}
                                href={`/restaurant-menu/${res.id}`}
                                className="relative aspect-[16/10] md:aspect-[16/9] rounded-[48px] overflow-hidden group shadow-2xl transition-all duration-700 hover:scale-[1.02] animate-in fade-in zoom-in-95 duration-500"
                            >
                                {/* Background Image */}
                                <Image
                                    src={res.image}
                                    alt={res.name}
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                                
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>

                                {/* Content */}
                                <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                            {res.cuisine}
                                        </span>
                                        <span className="text-yellow-400 font-black text-sm drop-shadow-md">⭐ {res.rating}</span>
                                        <span className="text-white/60 font-black text-xs uppercase tracking-widest">
                                            {Array(res.priceLevel).fill('₺').join('')}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter drop-shadow-lg">
                                        {res.name}
                                    </h3>
                                    <p className="text-base md:text-lg text-white/70 font-medium max-w-md leading-relaxed line-clamp-2 italic">
                                        {res.culturalIdentity}
                                    </p>
                                    
                                    <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">RESTORANI İNCELE</span>
                                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">➔</div>
                                    </div>
                                </div>
                                
                                {/* Location Badge */}
                                <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2">
                                    <span className="text-white text-xs font-black tracking-widest">📍 {res.location}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="text-6xl mb-6 grayscale opacity-50">🍽️</span>
                        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Aradığınız kriterlerde restoran bulunamadı</h2>
                        <p className="text-slate-500 font-bold mb-8">Filtreleri sıfırlayarak daha fazla lezzet keşfedebilirsiniz.</p>
                        <button 
                            onClick={() => { setSelectedCuisine('All'); setSelectedLocation('All'); setSelectedPriceLevel('All'); setShowHighRated(false); }}
                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-orange-500 shadow-xl"
                        >
                            Filtreleri Sıfırla
                        </button>
                    </div>
                )}
            </div>

            {/* Business Onboarding CTA */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 mt-20">
                <div className="bg-white dark:bg-slate-900/50 rounded-[48px] p-8 md:p-16 border-2 border-dashed border-orange-200 dark:border-orange-900/30 flex flex-col lg:flex-row items-center justify-between gap-10 group hover:border-orange-500 transition-all duration-500 shadow-xl">
                    <div className="flex-1 text-center lg:text-left">
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] uppercase font-black px-4 py-1.5 rounded-full mb-6 inline-block tracking-widest shadow-sm">İşletme Sahipleri İçin</span>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white mb-6 transition-colors group-hover:text-orange-600 tracking-tight">Kültürel Mirasınızı <br className="hidden md:block" /> Dünyaya Tanıtın</h2>
                        <p className="text-gray-500 dark:text-slate-400 font-bold max-w-xl text-lg">Menünüzü bir hikayeye dönüştürün, binlerce global gezgine anında ulaşın ve rezervasyonlarınızı Tourkia güvencesiyle yönetin.</p>
                    </div>
                    <Link href="/?showAgencyModal=true" className="bg-slate-900 dark:bg-slate-800 text-white px-12 py-6 rounded-[32px] font-black text-xl transition-all shadow-2xl hover:bg-orange-500 hover:shadow-orange-500/20 active:scale-95 whitespace-nowrap">
                        Hemen Başvur ➔
                    </Link>
                </div>
            </div>

            {/* Final CTA Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 mt-16 mb-24">
                <div className="bg-[#005e85] dark:bg-[#004a6b] rounded-[64px] p-10 md:p-24 text-center text-white relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,94,133,0.3)]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full -ml-48 -mb-48 blur-[100px]"></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Damak Tadınıza Göre <br /> Bir Yolculuğa Hazır Mısınız?</h2>
                        <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">Lezzet duraklarını seyahat rotanızla birleştirin, tatilinizin her anını bir gastronomi şölenine dönüştürün.</p>
                        <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-6 rounded-[32px] font-black text-xl transition-all shadow-[0_20px_50px_rgba(249,115,22,0.4)] inline-block active:scale-95">
                            Turları İncele 🌍
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
