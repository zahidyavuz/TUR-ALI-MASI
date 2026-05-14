'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useLocale } from '../../context/LocaleContext';

// MOCK: Dinamik Veritabanı (Menus tablosunu ve Restaurants tablosunu simüle eder)
const RESTAURANT_DB: Record<string, any> = {
    'r1': {
        name: 'Ziyade Kebap & Ocakbaşı',
        coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
        logo: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&q=80',
        description: 'Kapadokya’nın binlerce yıllık geleneksel lezzeti Testi Kebabı ve eşsiz ocakbaşı deneyimi.',
        location: 'Kapadokya',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        rating: 4.9,
        reviews: 320,
        menus: [
            { id: 'm1', category: 'Başlangıçlar', name: 'Geleneksel Meze Tabağı', description: 'Acılı ezme, haydari, şakşuka ve sıcak humus.', price: 450, image: 'https://images.unsplash.com/photo-1548943487-a2e4f43bb2bb?w=600&q=80' },
            { id: 'm2', category: 'Başlangıçlar', name: 'Günün Çorbası', description: 'Sıcacık süzme mercimek veya yöresel tarhana.', price: 150, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80' },
            { id: 'm3', category: 'Ana Yemekler', name: 'Testi Kebabı', description: 'Kapadokya özel şov eşliğinde 4 saat pişmiş kuzu eti.', price: 1450, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80', badge: 'Şefin Tavsiyesi', badgeColor: 'bg-red-600' },
            { id: 'm4', category: 'Ana Yemekler', name: 'Karışık Izgara', description: 'Adana, Urfa, tavuk şiş ve kuzu pirzola.', price: 1200, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
            { id: 'm5', category: 'Tatlılar', name: 'Fıstıklı Baklava', description: 'Antep fıstıklı taze günlük baklava ve Maraş dondurması.', price: 350, image: 'https://images.unsplash.com/photo-1519915028121-7d3463d20eb4?w=600&q=80' },
            { id: 'm6', category: 'Tatlılar', name: 'Fırın Sütlaç', description: 'Üzeri nar gibi kızarmış, fındık serpmeli.', price: 200, image: 'https://images.unsplash.com/photo-1600289031464-74d374b64991?w=600&q=80' }
        ]
    },
    'r2': {
        name: 'Van Kahvaltı Evi',
        coverImage: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/ff6b00?text=VK',
        description: 'İpekyolu\'nun bereketli sofralarından günümüze uzanan yöresel lezzet şöleni',
        location: 'İstanbul',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        rating: 4.8,
        reviews: 410,
        menus: [] // Bilerek boş bırakıldı, Fallback testi için
    },
    'r3': {
        name: 'Mavi Ege Restoran',
        coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/006b85?text=ME',
        description: 'Ege\'nin otantik lezzetleri ve deniz kokan taze sofraları',
        location: 'Antalya',
        cuisine: 'Ege & Akdeniz',
        rating: 4.7,
        reviews: 280,
        menus: [
            { id: 'm10', category: 'Başlangıçlar', name: 'Deniz Börülcesi & Enginar', description: 'Taze otlar ve zeytinyağlı enginar kalbi.', price: 350, image: 'https://images.unsplash.com/photo-1548943487-a2e4f43bb2bb?w=600&q=80' },
            { id: 'm11', category: 'Ana Yemekler', name: 'Izgara Levrek', description: 'Mevsim yeşillikleri ve taze levrek.', price: 950, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', badge: 'Denizden Taze', badgeColor: 'bg-blue-600' }
        ]
    },
    'r4': {
        name: 'Asitane',
        coverImage: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/8b5cf6?text=AS',
        description: 'Osmanlı Saray mutfağının unutulmuş reçeteleri ve asil sunumları',
        location: 'İstanbul',
        cuisine: 'İç Anadolu',
        rating: 4.9,
        reviews: 512,
        menus: []
    },
    'r5': {
        name: 'Suna\'nın Yeri',
        coverImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/14b8a6?text=SY',
        description: 'Boğaz\'ın kıyısında, samimi ve asırlık balıkçı gelenekleri',
        location: 'İstanbul',
        cuisine: 'Ege & Akdeniz',
        rating: 4.6,
        reviews: 195,
        menus: []
    },
    'r6': {
        name: 'Anadolu Sofrası',
        coverImage: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/ef4444?text=AS',
        description: 'Mezopotamya\'nın baharatlı ruhu ve misafirperverliği',
        location: 'Mardin',
        cuisine: 'Güneydoğu & Doğu Anadolu',
        rating: 4.8,
        reviews: 340,
        menus: []
    },
    'r7': {
        name: 'Il Padrino',
        coverImage: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/3b82f6?text=IP',
        description: 'Napoli\'den gelen asırlık tarifler ve el yapımı makarnalar',
        location: 'İstanbul',
        cuisine: 'İtalyan Mutfağı',
        rating: 4.5,
        reviews: 210,
        menus: [
            { id: 'm20', category: 'Makarnalar', name: 'Pasta Carbonara', description: 'Geleneksel tarifle hazırlanan kremasız gerçek carbonara.', price: 550, image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80' }
        ]
    },
    'r8': {
        name: 'Sakura Sushi',
        coverImage: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1600&q=80',
        logo: 'https://placehold.co/200x200/ffffff/ec4899?text=SS',
        description: 'Uzakdoğu\'nun disiplini ve taze deniz ürünlerinin sanatı',
        location: 'Antalya',
        cuisine: 'Asya Mutfağı',
        rating: 4.7,
        reviews: 185,
        menus: [
            { id: 'm30', category: 'Sushiler', name: 'California Roll', description: 'Yengeç, avokado ve salatalık ile hazırlanan klasik sushi.', price: 650, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80' }
        ]
    }
};

export default function RestaurantMenuPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const { formatPrice } = useLocale();
    const [addedToCart, setAddedToCart] = useState<string | null>(null);
    const [restaurant, setRestaurant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Reviews State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewTarget, setReviewTarget] = useState<{ id: string, name: string, type: 'restaurant' | 'meal' } | null>(null);
    const [newReviewText, setNewReviewText] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(5);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [localReviews, setLocalReviews] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedReviews = localStorage.getItem('demo_reviews');
            if (storedReviews) {
                try {
                    setLocalReviews(JSON.parse(storedReviews));
                } catch (e) { }
            } else {
                const initialMockReviews = [
                    { id: 1, targetId: slug, type: 'restaurant', author: 'Ali K.', rating: 5, text: 'Harika bir ambiyans ve efsane lezzetler. Kesinlikle tavsiye ederim.', date: '10 Mayıs 2026' },
                    { id: 2, targetId: 'm3', type: 'meal', author: 'Ayşe Y.', rating: 4, text: 'Testi kebabı çok lezzetliydi ancak biraz bekledik.', date: '11 Mayıs 2026' }
                ];
                setLocalReviews(initialMockReviews);
                localStorage.setItem('demo_reviews', JSON.stringify(initialMockReviews));
            }
        }
    }, [slug]);

    // Veritabanından (Mock DB) dinamik olarak ID'ye göre veri çek (WHERE restaurant_id = slug)
    useEffect(() => {
        setIsLoading(true);
        // Gerçekte API'ye fetch atılacak yer
        setTimeout(() => {
            const data = RESTAURANT_DB[slug];
            if (data) {
                setRestaurant({ ...data, id: slug });
            } else {
                setRestaurant(null); // Bulunamadıysa null
            }
            setIsLoading(false);
        }, 400); // Yüklenme simülasyonu
    }, [slug]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white pb-24 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest">Restoran Verisi Yükleniyor...</p>
                </div>
            </main>
        );
    }

    // 404 Fallback
    if (!restaurant) {
        return (
            <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white pb-24 flex flex-col items-center justify-center">
                <h1 className="text-4xl font-black mb-4">Restoran Bulunamadı</h1>
                <button onClick={() => router.push('/taste')} className="text-orange-500 font-bold uppercase tracking-widest hover:underline">Lezzet Duraklarına Geri Dön</button>
            </main>
        );
    }

    // Şefin Seçimi ve Kategorileri gruplandır (WHERE restaurant_id = slug ile çekilen menus üzerinden)
    const chefSpecial = (restaurant?.menus || []).find((m: any) => m.badge === 'Şefin Tavsiyesi');
    const groupedMenu = (restaurant?.menus || []).reduce((acc: any, item: any) => {
        if (item.badge === 'Şefin Tavsiyesi') return acc; // Exclude from regular grid
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    const hasMenu = restaurant.menus && restaurant.menus.length > 0;

    const handleBuyNow = (item: any) => {
        setAddedToCart(item.id);
        // Hızlı Seçim: Doğrudan checkout'a yönlendir (type=meal flag'i ile)
        setTimeout(() => {
            router.push(`/checkout?menuId=${item.id}&type=meal`);
        }, 500);
    };

    const openReviewModal = (id: string, name: string, type: 'restaurant' | 'meal') => {
        setReviewTarget({ id, name, type });
        setIsReviewModalOpen(true);
        setNewReviewText('');
        setNewReviewRating(5);

        if (typeof window !== 'undefined') {
            const bookingsStr = localStorage.getItem('demo_new_bookings');
            if (bookingsStr) {
                try {
                    const bookings = JSON.parse(bookingsStr);
                    const purchased = bookings.some((b: any) => b.service_type === 'meal');
                    setHasPurchased(purchased);
                } catch (e) {
                    setHasPurchased(false);
                }
            } else {
                setHasPurchased(false);
            }
        }
    };

    const submitReview = () => {
        if (!newReviewText.trim()) return;
        const newReview = {
            id: Date.now(),
            targetId: reviewTarget?.id,
            type: reviewTarget?.type,
            author: 'Siz (Doğrulanmış Müşteri)',
            rating: newReviewRating,
            text: newReviewText,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        };
        const updated = [newReview, ...localReviews];
        setLocalReviews(updated);
        localStorage.setItem('demo_reviews', JSON.stringify(updated));
        setNewReviewText('');
    };

    const getTargetReviews = (id: string) => localReviews.filter(r => r.targetId === id);
    const getAverageRating = (id: string) => {
        const revs = getTargetReviews(id);
        if (revs.length === 0) return 0;
        const sum = revs.reduce((a, b) => a + b.rating, 0);
        return (sum / revs.length).toFixed(1);
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white pb-24 transition-colors duration-500">
            <Navbar />

            {/* Restoran Kapak ve Header Alanı - Dinamik Header Update (Küçültülmüş Height) */}
            <div className="relative h-[220px] md:h-[280px] w-full bg-slate-800">
                <Image
                    src={restaurant.coverImage}
                    alt={restaurant.name}
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 max-w-7xl mx-auto translate-y-1/2 flex items-center gap-6 z-10">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden relative bg-white shrink-0">
                        <img
                            src={restaurant.logo}
                            alt="Logo"
                            className="object-cover w-full h-full"
                        />
                    </div>
                    <div className="text-left mb-2 md:mb-6 mt-4 md:mt-0 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg tracking-tight mb-1">
                                {restaurant.name}
                            </h1>
                            <p className="text-white/80 font-medium text-xs md:text-sm max-w-xl drop-shadow-md hidden sm:block">
                                {restaurant.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-300 mt-2">
                                <span className="flex items-center gap-1">📍 {restaurant.location}</span>
                            </div>
                        </div>
                        
                        {/* İnceleme Tuşu (Banner) */}
                        <div className="flex shrink-0 -translate-y-2 md:translate-y-0">
                            <button 
                                onClick={() => openReviewModal(slug, restaurant.name, 'restaurant')}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl transition border border-white/20 shadow-lg"
                            >
                                <span className="text-yellow-400 text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">⭐</span>
                                <div className="flex flex-col text-left">
                                    <span className="text-white font-black text-sm leading-none">{getAverageRating(slug) || restaurant.rating}</span>
                                    <span className="text-white/70 text-[9px] uppercase tracking-widest leading-none mt-0.5">{getTargetReviews(slug).length || restaurant.reviews} Yorum</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menü İçeriği veya Fallback Uyarısı (Margin daraltıldı) */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-24 md:mt-24 relative z-0">
                {!hasMenu ? (
                    // FALLBACK: Menü yoksa gösterilecek dinamik mesaj
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-12 text-center shadow-xl border border-gray-100 dark:border-slate-800 mt-12 flex flex-col items-center">
                        <span className="text-6xl mb-6 opacity-80">👨‍🍳</span>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4">Menü Hazırlanıyor</h2>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-lg max-w-lg">
                            <span className="text-orange-600 dark:text-orange-400 font-bold">{restaurant.name}</span> isimli restoranımızın menüsü yakında eklenecektir. Şeflerimiz enfes lezzetler üzerinde çalışıyor!
                        </p>
                        <button onClick={() => router.push('/taste')} className="mt-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-6 py-3 rounded-xl font-bold transition-colors">
                            Diğer Restoranları Keşfet
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Şefin Seçimi Alanı */}
                        {chefSpecial && (
                            <div className="mb-16">
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                        👨‍🍳 Şefin Özel Tavsiyesi
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-orange-500/50 to-transparent"></div>
                                </div>

                                <div className="relative bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(249,115,22,0.15)] dark:shadow-[0_20px_50px_rgba(249,115,22,0.2)] border border-orange-200 dark:border-orange-900/50 flex flex-col md:flex-row group transition-transform duration-500">
                                    {/* Parlama Efekti */}
                                    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent rotate-45 group-hover:animate-[shimmer_2s_infinite] pointer-events-none z-20"></div>

                                    {/* Dev Görsel */}
                                    <div className="w-full md:w-1/2 h-[280px] md:h-[380px] relative overflow-hidden shrink-0">
                                        <Image
                                            src={chefSpecial.image}
                                            alt={chefSpecial.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xl z-30 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                            Günün En Popüler Lezzeti
                                        </div>
                                    </div>

                                    {/* İçerik */}
                                    <div className="p-8 md:p-12 flex flex-col justify-center flex-1 relative z-10 bg-gradient-to-br from-orange-50/50 to-white dark:from-slate-900 dark:to-slate-900">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white leading-tight">
                                                {chefSpecial.name}
                                            </h3>
                                            <button 
                                                onClick={() => openReviewModal(chefSpecial.id, chefSpecial.name, 'meal')}
                                                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-1.5"
                                            >
                                                <span className="text-yellow-400 text-sm">⭐</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{getAverageRating(chefSpecial.id) || '5.0'}</span>
                                            </button>
                                        </div>
                                        
                                        <p className="text-sm md:text-base font-medium text-gray-500 dark:text-slate-400 mb-8 leading-relaxed max-w-lg">
                                            {chefSpecial.description}
                                        </p>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-auto gap-6">
                                            <div className="text-3xl md:text-4xl font-black text-[#fbbf24] tracking-tighter drop-shadow-sm">
                                                <span suppressHydrationWarning>{formatPrice(chefSpecial.price)}</span>
                                            </div>
                                            <button
                                                onClick={() => handleBuyNow(chefSpecial)}
                                                className={`w-full sm:w-auto text-sm font-black px-8 py-4 rounded-2xl transition-all duration-300 active:scale-95 uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 relative z-30 ${
                                                    addedToCart === chefSpecial.id
                                                    ? 'bg-orange-600 border-orange-600 text-white'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white border border-orange-400'
                                                }`}
                                            >
                                                {addedToCart === chefSpecial.id ? (
                                                    <><span>⏳</span> Yönlendiriliyor</>
                                                ) : (
                                                    <><span>⚡</span> Hemen Sipariş Ver</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DATA FILTERING: O restoranın diğer kendi menülerini göster */}
                        {Object.entries(groupedMenu).map(([category, items]: any) => (
                        <div key={category} className="mb-16">
                            {/* Kategori Başlığı */}
                            <div className="flex items-center gap-4 mb-8">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    {category}
                                </h2>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                            </div>

                            {/* 4'lü Grid Düzeni */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {items.map((item: any) => (
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
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight group-hover:text-orange-500 transition-colors">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                                <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                                                    {item.description}
                                                </p>
                                            </div>

                                            <div className="flex items-end justify-between mt-auto">
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); openReviewModal(item.id, item.name, 'meal'); }} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                                        <span className="text-yellow-400 text-xs">⭐</span>
                                                        <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">{getAverageRating(item.id) || '4.9'}</span>
                                                        <span className="text-gray-400 text-[9px]">({getTargetReviews(item.id).length || Math.floor(Math.random() * 50) + 10})</span>
                                                    </button>
                                                    <div className="text-xl font-black text-[#fbbf24] tracking-tighter">
                                                        <span suppressHydrationWarning>{formatPrice(item.price)}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleBuyNow(item); }}
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
                    </>
                )}
            </div>

            {/* İnceleme (Review) Modal */}
            {isReviewModalOpen && reviewTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        
                        <div className="bg-orange-50 dark:bg-slate-800 p-6 border-b border-orange-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                                    {reviewTarget.name}
                                </h3>
                                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-1">
                                    Değerlendirmeler
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsReviewModalOpen(false)}
                                className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shadow-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                            {getTargetReviews(reviewTarget.id).length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <span className="text-4xl mb-4 block opacity-50">💭</span>
                                    <p className="font-medium">Henüz değerlendirme yapılmamış.</p>
                                </div>
                            ) : (
                                getTargetReviews(reviewTarget.id).map(review => (
                                    <div key={review.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white text-sm">{review.author}</div>
                                                <div className="text-[10px] text-slate-400">{review.date}</div>
                                            </div>
                                            <div className="flex text-yellow-400 text-xs">
                                                {Array.from({length: 5}).map((_, i) => (
                                                    <span key={i} className={i < review.rating ? "opacity-100" : "opacity-30"}>⭐</span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                            "{review.text}"
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                            {!hasPurchased ? (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4 rounded-2xl flex items-center gap-3">
                                    <span className="text-2xl">🔒</span>
                                    <p className="text-[11px] font-bold text-orange-800 dark:text-orange-200 leading-relaxed">
                                        Sadece bu lezzeti deneyimlemiş (satın almış) doğrulanmış müşterilerimiz yorum yapabilir.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Puanınız:</span>
                                        <div className="flex gap-1">
                                            {Array.from({length: 5}).map((_, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setNewReviewRating(i + 1)}
                                                    className={`text-xl transition-all hover:scale-110 ${i < newReviewRating ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}
                                                >
                                                    ⭐
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea 
                                        value={newReviewText}
                                        onChange={(e) => setNewReviewText(e.target.value)}
                                        placeholder="Deneyiminizi paylaşın..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-orange-500 outline-none transition-colors resize-none h-24"
                                    />
                                    <button 
                                        onClick={submitReview}
                                        disabled={!newReviewText.trim()}
                                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-colors"
                                    >
                                        Yorumu Gönder
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </main>
    );
}
