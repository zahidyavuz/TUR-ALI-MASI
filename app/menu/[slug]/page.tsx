'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import { useLocale } from '../../context/LocaleContext';
import Navbar from '../../components/Navbar';
import FavoriteButton from '../../components/FavoriteButton';

// MOCK: Restoran Menü Verisi
const MOCK_MENU = {
    id: 'm1',
    title: 'Şefin Özel Kapadokya Testi Kebabı Menüsü',
    restaurantName: 'Ziyade Ocakbaşı & Kebap',
    location: 'Göreme, Kapadokya',
    rating: 4.9,
    reviews: 320,
    price: 1450,
    originalPrice: 1800,
    discount: '%20',
    description: 'Kapadokya’nın binlerce yıllık geleneksel lezzeti Testi Kebabı, şefimizin özel reçetesiyle toprak küplerde 4 saat boyunca ağır ateşte pişiriliyor. Bu menü sadece bir yemek değil, Anadolu’nun derinliklerine uzanan bir gastronomi yolculuğudur.',
    imageMain: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80',
    imageSub1: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    imageSub2: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    included: [
        'Zengin Başlangıç Tabağı (12 Çeşit)',
        'Özel Yapım Testi Kebabı (Şov Eşliğinde Açılış)',
        'Mevsim Salatası',
        'Sıcak Humus & Pastırma',
        'Geleneksel Tatlı Tabağı (Kabak Tatlısı & İncir)',
        'Sınırsız Çay & Kahve İkramı'
    ],
    excluded: [
        'Alkollü ve Alkolsüz Ekstra İçecekler',
        'Menü Dışı Ekstra Siparişler',
        'Bahşişler'
    ],
    availabilitySlots: [
        { id: 's1', date: '2026-05-10', time: '19:00', remaining: 4 },
        { id: 's2', date: '2026-05-10', time: '21:00', remaining: 8 },
        { id: 's3', date: '2026-05-11', time: '19:00', remaining: 2 },
    ],
    maxCapacity: 12
};

export default function MenuDetailPage() {
    const { t, locale, formatPrice } = useLocale();
    const router = useRouter();
    const params = useParams();
    const slug = params.slug;

    const [menu, setMenu] = useState<any>(MOCK_MENU);
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [guests, setGuests] = useState(2);
    const [isSticky, setIsSticky] = useState(false);
    const [isVip, setIsVip] = useState(false);

    const EXTRAS = [
        { id: 'vip_table', name: 'Cam Kenarı VIP Masa Garantisi', price: 400, icon: '🪟', desc: 'En iyi manzara garantisi' },
        { id: 'birthday', name: 'Doğum Günü Pastası & Sürpriz', price: 1000, icon: '🎂', desc: 'Pasta + Özel Karşılama' },
        { id: 'transfer', name: 'Gidiş-Dönüş VIP Transfer', price: 1600, icon: '🚐', desc: 'Adresten alım ve dönüş' }
    ];

    useEffect(() => {
        const handleScroll = () => setIsSticky(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        
        if (typeof window !== 'undefined') {
            const vipData = localStorage.getItem('vip_membership');
            if (vipData) {
                const { level, expiry } = JSON.parse(vipData);
                if (level === 'VIP' && new Date(expiry) > new Date()) {
                    setIsVip(true);
                }
            }
        }
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const baseMenuPrice = (isVip ? menu.price * 0.95 : menu.price) * guests;
    const extrasTotal = EXTRAS.filter(e => selectedExtras.includes(e.id)).reduce((acc, curr) => acc + curr.price, 0);
    const totalPriceAmount = baseMenuPrice + extrasTotal;

    return (
        <main className="min-h-screen font-sans text-slate-900 dark:text-white pb-20 bg-gradient-to-br from-[#fdf5f2] via-[#fffbf9] to-[#f9f1ee] dark:from-[#0B132B] dark:via-[#0D1B3E] dark:to-[#0B132B] transition-colors duration-1000">
            <Navbar />

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex flex-col lg:flex-row gap-8 relative items-start">
                
                {/* Left Column: Content */}
                <div className="w-full lg:w-2/3">
                    {/* Gallery Section */}
                    <div className="flex flex-col md:flex-row gap-4 h-[400px] md:h-[500px] rounded-[32px] overflow-hidden shadow-2xl mb-8 border border-white/10 dark:border-white/5">
                        <div className="w-full md:w-2/3 h-full relative group cursor-pointer">
                            <Image
                                src={menu.imageMain}
                                alt={menu.title}
                                fill
                                priority
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute top-6 right-6 z-20">
                                <FavoriteButton tourId={menu.id} className="p-3 rounded-full !bg-white/90 dark:!bg-slate-900/90 hover:!bg-red-50 dark:hover:!bg-red-900/20 hover:!text-red-500 shadow-xl" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 shadow-lg">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Gurme Seçimi
                                </div>
                                <div className="bg-white/90 dark:bg-slate-900/90 text-orange-800 dark:text-orange-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 ml-2 shadow-lg backdrop-blur-sm border border-white/50 dark:border-white/10">
                                    ✨ Mistik & Otantik
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black drop-shadow-md leading-tight mb-2">{menu.title}</h1>
                                <div className="flex items-center gap-4 text-sm font-semibold text-gray-200">
                                    <span className="flex items-center gap-1">📍 {menu.location}</span>
                                    <span className="flex items-center gap-1">⭐ {menu.rating} ({menu.reviews} Yorum)</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex w-1/3 flex-col gap-4">
                            <div className="h-1/2 rounded-[24px] overflow-hidden relative group cursor-pointer">
                                <Image src={menu.imageSub1} alt="Mekan" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="h-1/2 rounded-[24px] overflow-hidden relative group cursor-pointer">
                                <Image src={menu.imageSub2} alt="Yemek" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-800 dark:text-white font-bold px-4 py-2 rounded-xl text-sm shadow-xl">+8 Görsel Seç</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What's Included Card */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[40px] p-8 md:p-10 shadow-xl border border-gray-100 dark:border-white/10 mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10">
                            <span className="text-9xl">🍽️</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
                            <span className="w-8 h-1 bg-orange-500 rounded-full"></span>
                            Bu Menüde Neler Var?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-xl shadow-sm">🥗</span>
                                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Başlangıçlar</h4>
                                </div>
                                <ul className="space-y-3">
                                    {['Zengin Başlangıç Tabağı (12 Çeşit)', 'Mevsim Salatası', 'Sıcak Humus & Pastırma'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                                            <span className="text-orange-500 mt-1">●</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-xl shadow-sm">🥩</span>
                                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Ana Yemek</h4>
                                </div>
                                <ul className="space-y-3">
                                    {['Özel Yapım Testi Kebabı', 'Közlenmiş Sebze Garnitür', 'Tereyağlı Şehriyeli Pilav'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                                            <span className="text-red-500 mt-1">●</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-xl shadow-sm">🍰</span>
                                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Tatlı & İçecek</h4>
                                </div>
                                <ul className="space-y-3">
                                    {['Geleneksel Tatlı Tabağı', 'Sınırsız Çay & Kahve', 'Ev Yapımı Ayran/Şerbet'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                                            <span className="text-blue-500 mt-1">●</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4">
                            <div className="text-2xl">✨</div>
                            <p className="text-sm md:text-base font-black text-slate-800 dark:text-slate-200 leading-tight">
                                Ödemenizi şimdi yapın, restoranda hesabı düşünmeden sadece anın tadını çıkarın.
                            </p>
                        </div>
                    </div>

                    {/* Detailed Info Sections */}
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-[40px] p-8 md:p-10 shadow-2xl border border-orange-100 dark:border-white/10 mb-12">
                        <h2 className="text-2xl md:text-3xl font-black mb-8 text-orange-800 dark:text-orange-400 flex items-center gap-3">
                            <span className="w-8 h-1 bg-current rounded-full"></span>
                            Menü Detayları ve Özellikler
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Mutfak', value: 'Anadolu / Kebap', icon: '🥘' },
                                { label: 'Hazırlık Süresi', value: '4 Saat (Fırın)', icon: '⏳' },
                                { label: 'Porsiyon', value: 'Doyurucu / VIP', icon: '🍽️' },
                                { label: 'İçerik', value: '%100 Kuzu Eti', icon: '🥩' }
                            ].map((detail, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-white/60 dark:border-white/5">
                                    <div className="text-2xl">{detail.icon}</div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">{detail.label}</span>
                                        <span className="text-sm font-extrabold text-slate-800 dark:text-white">{detail.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-12">
                        <h3 className="text-2xl md:text-3xl font-black mb-6 text-orange-900 dark:text-orange-300">Gerçek Bir Kapadokya Ritüeli...</h3>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed font-medium text-lg italic mb-6">
                            "Şefimizin kendi elleriyle hazırladığı bu testi kebabı, sadece damak tadınıza değil, ruhunuza da hitap edecek."
                        </p>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed font-medium text-lg">
                            {menu.description}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 mb-12 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-white/10">
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">✓ Menü İçeriği</h4>
                            <ul className="space-y-3">
                                {menu.included.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-slate-400 font-medium text-sm">
                                        <span className="text-green-500 dark:text-green-400 font-bold mt-0.5">✓</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">✕ Dahil Olmayanlar</h4>
                            <ul className="space-y-3">
                                {menu.excluded.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-slate-400 font-medium text-sm">
                                        <span className="text-red-500 dark:text-red-400 font-bold mt-0.5">✕</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div className="w-full lg:w-1/3 z-10">
                    <div className={`bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-white/10 sticky top-24 transition-all duration-300 ${isSticky ? 'shadow-blue-900/10' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                {menu.originalPrice && (
                                    <p className="text-gray-400 dark:text-slate-500 text-sm font-bold line-through">{formatPrice(menu.originalPrice)}</p>
                                )}
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{formatPrice(isVip ? menu.price * 0.95 : menu.price)} <span className="text-sm font-medium text-gray-500 tracking-normal">/kişi</span></h3>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isVip ? 'bg-yellow-50 dark:bg-yellow-900/20 text-orange-600 dark:text-orange-400 border border-yellow-200 dark:border-yellow-900/50' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border border-gray-200 dark:border-white/5 opacity-60'}`}>
                                        <span className={isVip ? 'animate-pulse' : ''}>👑 VIP Fiyatı:</span>
                                        <span>{formatPrice(menu.price * 0.95)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/50 flex flex-col items-center">
                                <span>{menu.discount}</span>
                                <span>İNDİRİM</span>
                            </div>
                        </div>

                        <div className="bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-3 mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-500 shrink-0">🔥</div>
                            <div>
                                <p className="text-orange-800 dark:text-orange-300 font-bold text-sm">Hemen Ayır!</p>
                                <p className="text-orange-600 dark:text-orange-400 text-[11px] font-semibold">Bu menü için bu akşam sadece 3 masa boş kaldı!</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex gap-2">
                                <div className="flex-1 border border-gray-200 dark:border-white/10 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/50 relative">
                                    <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Tarih Seçin</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none text-xs cursor-pointer"
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 border border-gray-200 dark:border-white/10 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/50 relative">
                                    <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Servis Saati</label>
                                    <select 
                                        className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none text-xs appearance-none cursor-pointer"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                    >
                                        <option value="">Saat</option>
                                        <option value="19:00">19:00</option>
                                        <option value="20:00">20:00</option>
                                        <option value="21:00">21:00</option>
                                    </select>
                                </div>
                            </div>
                            <div className="border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block">Kişi Sayısı</label>
                                    <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400">(Masa Kapasitesi)</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 flex items-center justify-center font-bold text-gray-600 dark:text-white hover:text-orange-600 hover:border-orange-300 transition">-</button>
                                    <span className="font-extrabold text-slate-800 dark:text-white w-4 text-center">{guests}</span>
                                    <button onClick={() => setGuests(Math.min(menu.maxCapacity, guests + 1))} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 flex items-center justify-center font-bold text-gray-600 dark:text-white hover:text-orange-600 hover:border-orange-300 transition" disabled={guests >= menu.maxCapacity}>+</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-white/10 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-slate-800 dark:text-white text-lg">Toplam Tutar</span>
                                <span className="text-2xl font-black text-[#008cb3] dark:text-[#38bdf8] tracking-tighter">{formatPrice(totalPriceAmount)}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mt-2 italic text-center">İçecekler ve ekstra servisler restoranda ödenir.</p>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                Deneyimini Tamamla
                            </h4>
                            <div className="space-y-3">
                                {EXTRAS.map((extra) => (
                                    <div 
                                        key={extra.id} 
                                        onClick={() => {
                                            if (selectedExtras.includes(extra.id)) {
                                                setSelectedExtras(selectedExtras.filter(id => id !== extra.id));
                                            } else {
                                                setSelectedExtras([...selectedExtras, extra.id]);
                                            }
                                        }}
                                        className={`group relative p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${selectedExtras.includes(extra.id) ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50 shadow-md ring-1 ring-orange-200' : 'bg-slate-50 dark:bg-slate-800/30 border-gray-100 dark:border-white/5 hover:border-orange-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-xl shadow-sm border border-gray-100 dark:border-white/10 shrink-0">
                                                {extra.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h5 className="font-black text-[12px] text-slate-800 dark:text-white leading-tight truncate">{extra.name}</h5>
                                                    <span className="text-[11px] font-black text-orange-600 dark:text-orange-400">+{formatPrice(extra.price)}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold truncate">{extra.desc}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedExtras.includes(extra.id) ? 'bg-orange-500 border-orange-500 scale-110' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 group-hover:border-orange-300'}`}>
                                                {selectedExtras.includes(extra.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => alert('Ödeme sayfasına yönlendiriliyor...')}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            Rezervasyonu Tamamla
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>

                        <div className="mt-8 bg-slate-900 dark:bg-black rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                            <h4 className="text-sm font-black mb-4 flex items-center gap-2">
                                <span className="text-lg">🏬</span> Mekan Bilgileri
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest">Restoran</p>
                                    <p className="font-bold text-xs">{menu.restaurantName}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest">İletişim</p>
                                    <p className="font-bold text-xs">+90 384 --- -- --</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest">Adres</p>
                                    <p className="font-bold text-xs">Göreme Kasabası, Kapadokya</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
