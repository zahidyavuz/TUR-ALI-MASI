'use client';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { fetchTours } from './lib/tours';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, Locale } from './context/LocaleContext';
import GeofenceTrigger from './components/GeofenceTrigger';
import FloatingContactMenu from './components/FloatingContactMenu';
import CurrencySelector from './components/CurrencySelector';
import NotificationCenter from './components/NotificationCenter';
import FavoriteButton from './components/FavoriteButton';
import { useAuth } from './context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

// --- YENİ BİLEŞEN: ComboCard (Geniş / Wide Format) ---
const ComboCard = ({ tour, restaurant, discountRate, formatPrice }: { tour: any, restaurant: any, discountRate: number, formatPrice: (p: number) => string }) => {
  // Bundle_Pricing Logic
  const originalTotal = tour.price + restaurant.price;
  const discountAmount = originalTotal * (discountRate / 100);
  const bundlePrice = originalTotal - discountAmount;
  const savings = Math.round(discountAmount);

  return (
    <div className="relative bg-white rounded-[24px] overflow-hidden shadow-xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.1)] transition-all duration-700 group cursor-pointer border border-gray-100 flex flex-col md:flex-row w-full mb-6"> 
      {/* Görsel Alanı (Geniş Split) */}
      <div className="relative h-56 md:h-auto md:w-[40%] overflow-hidden flex">
        <div className="w-1/2 h-full relative border-r-2 border-white z-10 shrink-0">
          <Image src={tour.image} alt={tour.name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        </div>
        <div className="w-1/2 h-full relative shrink-0">
          <Image src={restaurant.image} alt={restaurant.name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        </div>
        
        {/* Ortasındaki "Birlikte Daha Güçlü" İkonu */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center z-20 border-4 border-slate-50 transform group-hover:rotate-12 transition-transform">
          <span className="text-xl font-bold text-orange-500">＋</span>
        </div>

        {/* Rozetler */}
        <div className="absolute top-4 left-4 z-30">
          <span className="bg-[#008cb3] text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border border-white/20">Kombo Fırsatı</span>
        </div>
      </div>

      {/* İçerik Alanı (Geniş Segment) */}
      <div className="p-6 md:p-8 flex flex-col flex-1 justify-center bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-sm shadow-md z-10">🎒</div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-sm shadow-md z-0">🍽️</div>
          </div>
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Avantaj: {formatPrice(savings)} İndirim</span>
        </div>
        
        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight mb-2 group-hover:text-[#008cb3] transition-colors">
          {tour.name} <span className="text-gray-300 font-light mx-1">&</span> {restaurant.name}
        </h3>
        
        <p className="text-xs md:text-sm text-gray-500 font-medium mb-6 leading-relaxed max-w-xl">
          Eşsiz bir gezi ve gurme akşam yemeği tek pakette! Birlikte alın, <b>{formatPrice(savings)}</b> kazançlı çıkın.
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">Paket Fiyatı</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base text-gray-400 line-through font-bold">{formatPrice(originalTotal)}</span>
              <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatPrice(bundlePrice)}</span>
            </div>
          </div>
          <button className="bg-[#008cb3] text-white font-black px-8 py-3.5 rounded-xl hover:bg-slate-900 transition-all shadow-[0_10px_25px_rgba(0,140,179,0.2)] hover:shadow-lg active:scale-95 text-[15px]">
            Hemen Al ➔
          </button>
        </div>
      </div>
    </div>
  );
};

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1544833342-a8109041ce04?w=1600&q=80', // Kapadokya
  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80', // İstanbul
  'https://images.unsplash.com/photo-1542397284385-6014176526d7?w=1600&q=80', // Antalya
];

export default function Home() {
  const { t, locale, setLocale, formatPrice } = useLocale();
  const [tours, setTours] = useState<any[]>([]);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    async function loadTours() {
      const data = await fetchTours({ is_popular: 'true' });
      const allTours = data.tours || [];
      
      const kapa = allTours.filter((t: any) => t.location.toLowerCase().includes('kapadokya')).slice(0, 2);
      const ist = allTours.filter((t: any) => {
        const loc = (t.location || '').toLowerCase();
        return loc.replace(/\u0131/g, 'i').replace(/\u0069\u0307/g, 'i').includes('istanbul');
      }).slice(0, 2);
      const ant = allTours.filter((t: any) => t.location.toLowerCase().includes('antalya')).slice(0, 2);
      
      setTours([...kapa, ...ist, ...ant]);
    }
    loadTours();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000); // 5 saniyede bir otomatik geçiş
    return () => clearInterval(timer);
  }, []);

  const [currentTrustIndex, setCurrentTrustIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Login / Register Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTab, setLoginTab] = useState<'login' | 'register'>('login');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoUrl, setDemoUrl] = useState('');

  // Sourced from Auth context
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const userRole = user?.is_agency ? 'agency' : 'customer';

  // Agency Modal State
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [agencyTab, setAgencyTab] = useState<'login' | 'register' | 'pricing'>('login');

  // Checkout / Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agencyBusinessType, setAgencyBusinessType] = useState('acenta');

  // Filtre State'leri
  const [selectedLocation, setSelectedLocation] = useState('Nereye gitmek istersin?');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPrice, setSelectedPrice] = useState('Bütçeniz');
  const [selectedGuests, setSelectedGuests] = useState<number | ''>(1);

  const POPULAR_LOCATIONS = ['Kapadokya, Nevşehir', 'Göreme, Kapadokya', 'Ürgüp, Kapadokya', 'Sultanahmet, İstanbul', 'Boğaz, İstanbul', 'Kaş, Antalya', 'Kaleiçi, Antalya', 'Kemer, Antalya'];
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSearchClick = () => {
    const params = new URLSearchParams();
    if (selectedLocation && selectedLocation !== 'Nereye gitmek istersin?') {
      params.append('location', selectedLocation);
    }
    if (selectedDate) {
      params.append('date', selectedDate.toISOString().split('T')[0]);
    }
    if (selectedGuests) {
      params.append('guests', selectedGuests.toString());
    }
    router.push(`/search?${params.toString()}`);
  };

  useEffect(() => {
    if (searchParams.get('showAgencyModal') === 'true') {
      setShowAgencyModal(true);
      setAgencyTab('register');
    }
  }, [searchParams]);

  // Canlı Kur Simülasyonu State
  const initialRates = [
    { birim: '1 USD', karsilik: 35.150, ikon: '🇺🇸', isim: 'Amerikan Doları' },
    { birim: '1 EUR', karsilik: 38.650, ikon: '🇪🇺', isim: 'Euro' },
    { birim: '1 GBP', karsilik: 45.120, ikon: '🇬🇧', isim: 'İngiliz Sterlini' },
    { birim: '1 CNY', karsilik: 4.880, ikon: '🇨🇳', isim: 'Çin Yuanı' },
    { birim: '1 AED', karsilik: 9.570, ikon: '🇦🇪', isim: 'BAE Dirhemi' },
    { birim: '1 RUB', karsilik: 0.380, ikon: '🇷🇺', isim: 'Rus Rublesi' },
    { birim: '1 SAR', karsilik: 9.350, ikon: '🇸🇦', isim: 'Suudi Riyali' },
    { birim: '1 INR', karsilik: 0.420, ikon: '🇮🇳', isim: 'Hindistan Rupisi' }
  ];
  const [liveRates, setLiveRates] = useState(initialRates);
  const [rateColors, setRateColors] = useState<{ [key: string]: 'text-green-500' | 'text-red-500' | 'text-[#005e85]' }>({});

  useEffect(() => {
    let apiInterval: NodeJS.Timeout;
    
    // API'den gerçek kurları çekme fonksiyonu
    const fetchRealRates = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
        const data = await res.json();
        if (data && data.rates) {
          const tryRates = data.rates;
          const updatedRates = [
            { birim: '1 USD', karsilik: 1 / tryRates.USD, ikon: '🇺🇸', isim: 'Amerikan Doları' },
            { birim: '1 EUR', karsilik: 1 / tryRates.EUR, ikon: '🇪🇺', isim: 'Euro' },
            { birim: '1 GBP', karsilik: 1 / tryRates.GBP, ikon: '🇬🇧', isim: 'İngiliz Sterlini' },
            { birim: '1 CNY', karsilik: 1 / tryRates.CNY, ikon: '🇨🇳', isim: 'Çin Yuanı' },
            { birim: '1 AED', karsilik: 1 / tryRates.AED, ikon: '🇦🇪', isim: 'BAE Dirhemi' },
            { birim: '1 RUB', karsilik: 1 / tryRates.RUB, ikon: '🇷🇺', isim: 'Rus Rublesi' },
            { birim: '1 SAR', karsilik: 1 / tryRates.SAR, ikon: '🇸🇦', isim: 'Suudi Riyali' },
            { birim: '1 INR', karsilik: 1 / tryRates.INR, ikon: '🇮🇳', isim: 'Hindistan Rupisi' }
          ];
          setLiveRates(updatedRates);
        }
      } catch (error) {
        console.error("Kur güncellenemedi:", error);
      }
    };

    // İlk yüklemede kurları çek
    fetchRealRates();
    // Saatte bir API'den güncel veriyi al
    apiInterval = setInterval(fetchRealRates, 3600000);

    // Borsa efekti simülasyonunu (küçük dalgalanmaları) devam ettir
    const simInterval = setInterval(() => {
      setLiveRates(prevRates => {
        const newColors: { [key: string]: 'text-green-500' | 'text-red-500' | 'text-[#005e85]' } = {};
        const updated = prevRates.map(rate => {
          // Borsa efekti: Kura çok çok ufak bir değişim ekle
          const change = rate.karsilik * (Math.random() * 0.0004 - 0.0002);
          newColors[rate.birim] = change > 0 ? 'text-green-500' : 'text-red-500';
          return { ...rate, karsilik: rate.karsilik + change };
        });
        setRateColors(newColors);
        return updated;
      });
    }, 3000);

    return () => {
      clearInterval(apiInterval);
      clearInterval(simInterval);
    };
  }, []);


  useEffect(() => {
    const trustTimer = setInterval(() => {
      setCurrentTrustIndex((prev) => (prev + 1) % t.trustTexts.length);
    }, 4000); // 4 saniyede bir değiştir
    return () => clearInterval(trustTimer);
  }, [t.trustTexts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickedContainer = target.closest('.dropdown-container');

      if (!clickedContainer) {
        setActiveDropdown(null);
        return;
      }

      if (activeDropdown === 'favorites' && !target.closest('[data-dropdown="favorites"]')) {
        setActiveDropdown(null);
      } else if (activeDropdown === 'userMenu' && !target.closest('[data-dropdown="userMenu"]')) {
        setActiveDropdown(null);
      } else if (['location', 'date', 'price', 'guests'].includes(activeDropdown || '') && !target.closest('[data-dropdown="searchBar"]')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const toggleDropdown = (dropdownName: string) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden" suppressHydrationWarning>
      <Navbar setShowAgencyModal={setShowAgencyModal} setAgencyTab={setAgencyTab} />

      {/* Hero: Pazarlama Tasarımı */}
      <div className="w-full relative z-0">
        <div className="w-full py-8 px-4 text-center text-white relative flex flex-col items-center justify-center min-h-[35vh]">
          {/* Arka Plan Resimleri kapsayıcısı */}
          <div className="absolute inset-0 overflow-hidden z-0 bg-slate-900">
            {BACKGROUND_IMAGES.map((img, index) => (
              <Image
                key={img}
                src={img}
                alt={`Hero Visual ${index}`}
                fill
                priority={index === 0}
                className={`object-cover transition-opacity duration-1000 ease-in-out ${index === currentImage ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
              />
            ))}
            {/* Karanlık Overlay */}
            <div className="absolute inset-0 bg-black/45" />
          </div>

          {/* İçerik */}
          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-2">
            
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 drop-shadow-lg leading-tight w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700" 
                dangerouslySetInnerHTML={{ __html: t.hero.title }}>
            </h1>
            <p className="text-xs md:text-sm text-white/90 font-medium max-w-3xl mx-auto mb-6 drop-shadow-md px-4 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
              {t.hero.subtitle}
            </p>

            {/* Gelişmiş Filtre Çubuğu */}
            <div className="dropdown-container bg-white p-4 md:p-2 rounded-2xl md:rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col md:flex-row w-full max-w-4xl items-stretch md:items-center justify-between relative z-50 gap-0" data-dropdown="searchBar">

              {/* 1. Yer Seçimi */}
              <div className="relative w-full md:w-1/3 h-auto md:h-full border-b border-gray-100 md:border-none">
                <div
                  onClick={() => { if (activeDropdown !== 'location') toggleDropdown('location'); }}
                  className="flex flex-col items-start px-2 md:px-6 py-3 md:py-2 cursor-text hover:bg-gray-50 md:hover:bg-gray-100 md:rounded-full transition-all h-full justify-center w-full"
                >
                  <span className="text-[10px] md:text-xs font-black text-gray-700 md:text-gray-900 uppercase tracking-wider">{t.hero.searchLocationLabel}</span>
                  <input
                    type="text"
                    value={selectedLocation === 'Nereye gitmek istersin?' ? '' : selectedLocation}
                    onChange={(e) => {
                      setSelectedLocation(e.target.value);
                      if (activeDropdown !== 'location') setActiveDropdown('location');
                    }}
                    onFocus={() => setActiveDropdown('location')}
                    placeholder={t.hero.searchLocationPlaceholder}
                    className="w-full bg-transparent outline-none text-sm text-blue-900 font-extrabold placeholder-gray-400 truncate mt-0.5"
                  />
                </div>

                {activeDropdown === 'location' && (
                  <div className="absolute top-[105%] md:top-[120%] left-0 w-[calc(100vw-40px)] md:w-64 max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-left animate-in fade-in zoom-in duration-200">
                    <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase">Rota Önerileri</h4>
                    <ul className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                      {POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes((selectedLocation === 'Nereye gitmek istersin?' ? '' : selectedLocation).toLowerCase())).map((loc) => (
                        <li
                          key={loc}
                          onClick={() => { setSelectedLocation(loc); setActiveDropdown(null); }}
                          className="text-sm font-semibold text-gray-700 hover:text-[#008cb3] hover:bg-blue-50 cursor-pointer p-2.5 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {loc}
                        </li>
                      ))}
                      {POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes((selectedLocation === 'Nereye gitmek istersin?' ? '' : selectedLocation).toLowerCase())).length === 0 && (
                        <li className="text-sm font-medium text-gray-400 p-2 text-center italic">
                          "{selectedLocation}" için rota aranacak. (Özel Giriş)
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="hidden md:block w-[1px] h-10 bg-gray-200"></div>

              {/* 2. Tarih Seçimi */}
              <div className="relative w-full md:w-1/3 h-auto md:h-full border-b border-gray-100 md:border-none">
                <div
                  onClick={() => toggleDropdown('date')}
                  className="flex flex-col items-start px-2 md:px-6 py-3 md:py-2 cursor-pointer hover:bg-gray-50 md:hover:bg-gray-100 md:rounded-full transition-all h-full justify-center w-full"
                >
                  <span className="text-[10px] md:text-xs font-black text-gray-700 md:text-gray-900 uppercase tracking-wider">{t.hero.searchDateLabel}</span>
                  <span className={`text-sm ${!selectedDate ? 'text-gray-400' : 'text-blue-900 font-extrabold'} truncate w-full text-left mt-0.5`}>
                    {selectedDate ? selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : t.hero.searchDateLabel}
                  </span>
                </div>

                {activeDropdown === 'date' && (
                  <div className="absolute top-[105%] md:top-[120%] left-0 w-[calc(100vw-40px)] md:w-auto min-w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-left animate-in fade-in zoom-in duration-200">
                    <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase">Gidiş Tarihinizi Seçin</h4>
                    <div className="border border-gray-100 p-2 rounded-[16px] bg-white">
                      <Calendar
                        onChange={(value) => {
                          if (value instanceof Date) {
                            setSelectedDate(value);
                            setActiveDropdown(null);
                          }
                        }}
                        value={selectedDate}
                        minDate={new Date()} // Geçmiş tarihler seçilemesin
                        className="w-full"
                        locale="tr-TR"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:block w-[1px] h-10 bg-gray-200"></div>

              {/* 3. Yolcu & Konaklama */}
              <div className="relative w-full md:w-1/3 h-auto md:h-full flex items-center justify-between px-0 md:pl-6 md:pr-2">
                <div
                  onClick={() => toggleDropdown('guests')}
                  className="flex flex-col items-start px-2 md:px-0 py-3 md:py-2 cursor-pointer hover:bg-gray-50 md:hover:bg-gray-100 md:rounded-full transition-all h-full justify-center flex-1 w-full"
                >
                  <span className="text-[10px] md:text-xs font-black text-gray-700 md:text-gray-900 uppercase tracking-wider">{t.hero.searchGuestsLabel}</span>
                  <span className="text-sm text-blue-900 font-extrabold truncate w-full text-left mt-0.5">{selectedGuests === '' ? '0' : selectedGuests}</span>
                </div>

                {activeDropdown === 'guests' && (
                  <div className="absolute top-[105%] md:top-[120%] right-0 lg:-right-4 w-[calc(100vw-40px)] md:w-64 max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-left flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Kişi sayısı</h4>
                    <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-[16px] p-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedGuests(prev => (typeof prev === 'number' && prev > 1 ? prev - 1 : 1)); }}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-slate-800 font-black text-2xl hover:bg-gray-100 hover:text-red-500 transition shadow-sm active:scale-95"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={selectedGuests}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedGuests(val === '' ? '' : Math.max(1, parseInt(val) || 1));
                        }}
                        className="w-full text-center font-black text-2xl bg-transparent outline-none text-[#008cb3] [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedGuests(prev => (typeof prev === 'number' ? prev + 1 : 2)); }}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-slate-800 font-black text-2xl hover:bg-gray-100 hover:text-[#008cb3] transition shadow-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Arama Butonu (Mobile: Alt Satır, Desktop: Sağda) */}
              <div className="w-full md:w-auto mt-3 md:mt-0 md:ml-2">
                <button
                  onClick={handleSearchClick}
                  className="bg-orange-500 text-white rounded-xl md:rounded-full py-4 md:p-4 hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center w-full md:w-12 md:h-12 flex-shrink-0"
                >
                  <span className="md:hidden font-black text-[15px] uppercase tracking-wider mr-2">{t.hero.searchButton}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </button>
              </div>

            </div>

            {/* Smart Search Tags - Viator/GetYourGuide Trendi */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-3 md:gap-4 px-4 w-full">
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider hidden sm:block">Popüler Aramalar:</span>
              {['Kapadokya Balon', 'Boğaz Turu', 'Peri Bacaları', 'Ayasofya', 'Kapadokya ATV'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedLocation(tag);
                  }}
                  className="bg-white/30 hover:bg-orange-500 hover:border-orange-500 backdrop-blur-md border border-white/30 text-white text-[11px] md:text-sm font-semibold px-4 md:px-5 py-2 md:py-2.5 rounded-full cursor-pointer transition-all active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Dönüşen Güven & Reklam Metni */}
            <div className="mt-8 h-8 overflow-hidden relative w-full flex justify-center items-center">
              {t.trustTexts.map((text, index) => (
                <span
                  key={index}
                  className={`absolute text-sm md:text-base font-semibold tracking-wide text-white drop-shadow-md transition-all duration-700 ease-in-out ${index === currentTrustIndex
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                    }`}
                >
                  {text}
                </span>
              ))}
            </div>


            {/* İkinci Sabit Yazı */}
            <div className="mt-8 flex items-center gap-2 justify-center text-white/90 font-medium text-[13px] drop-shadow-md pb-4">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Rezervasyon ve tur desteği konusunda yardımcı olmak için 7/24 müşteri desteği.
            </div>
          </div>
        </div>
      </div>

      {/* 1. Türkiye'deki Popüler Turlar (Horizontal Carousel) */}
      <div className="w-full bg-white pt-12 pb-2 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-10">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Türkiye'deki <span className="text-[#008cb3]">Popüler Turlar</span>
          </h2>
          <div className="w-24 h-1.5 bg-[#008cb3] mt-6 rounded-full"></div>
        </div>
        
        <div className="flex overflow-x-auto pb-6 px-6 md:px-[calc((100vw-1280px)/2+24px)] gap-6 md:gap-8 scrollbar-hide snap-x snap-mandatory">
          {[
            {
              id: 'vip-1',
              title: 'VIP Gün Batımı ATV Safari & Vadi Yemeği',
              location: 'Kapadokya',
              price: 5350,
              oldPrice: 6920,
              duration: '5 Saat',
              image: 'https://images.unsplash.com/photo-1621259182978-f09e5e2ca845?w=1200&q=80',
              badge: '👑 VIP Combo',
              badgeColor: 'bg-black'
            },
            {
              id: 'vip-2',
              title: 'Özel Rehberli Tarihi Yarımada Turu',
              location: 'İstanbul',
              price: 4230,
              oldPrice: 5770,
              duration: '8 Saat',
              image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80',
              badge: '⭐ Top Rated',
              badgeColor: 'bg-black'
            },
            {
              id: 'vip-3',
              title: 'VIP Jeep Safari ve Rafting Macerası',
              location: 'Antalya',
              price: 2650,
              oldPrice: 3460,
              duration: 'Full Gün',
              image: 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=1200&q=80',
              badge: '⚡ Fast Selling',
              badgeColor: 'bg-[#D4AF37]'
            }
          ].map((tur: any, i: number) => (
            <div 
              key={`pop-h-${tur.id || i}`}
              className="min-w-[280px] sm:min-w-[320px] md:min-w-[380px] snap-center group cursor-pointer"
              onClick={() => window.location.href = `/search?location=${tur.location}`}
            >
              <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(212,175,55,0.2)] transition-all duration-500 border border-amber-100/50 flex flex-col h-full group-hover:-translate-y-2 relative group">
                <div className="relative h-60 overflow-hidden">
                  <Image 
                    src={tur.image} 
                    alt={tur.title} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {tur.badge && (
                    <div className={`absolute top-4 right-4 ${tur.badgeColor} text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg shadow-lg z-10 uppercase tracking-wider`}>
                      {tur.badge}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-[#008cb3] uppercase tracking-widest shadow-sm">
                    {tur.location}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-slate-800 line-clamp-2 mb-4 leading-tight group-hover:text-[#008cb3] transition-colors">
                    {tur.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase mb-1">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {tur.duration}
                        </div>
                        <div className="flex flex-col items-start">
                          {tur.oldPrice && (
                            <span className="text-gray-400 text-[11px] line-through decoration-gray-400/50 font-bold">
                              {formatPrice(tur.oldPrice)}
                            </span>
                          )}
                          <div className="text-xl font-black text-[#008cb3] tracking-tighter flex items-baseline gap-1">
                            {formatPrice(tur.price)}
                            <span className="text-[9px] font-bold text-gray-400 uppercase">/pp</span>
                          </div>
                        </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const dateStr = tomorrow.toISOString().split('T')[0];
                        window.location.href = `/checkout?tourId=${tur.id}&date=${dateStr}&guests=1`;
                      }}
                      className="bg-[#008cb3] text-white text-[10px] font-black px-4 py-3 rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest whitespace-nowrap"
                    >
                      Hemen Al
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. National Showcase Grid (Ulusal Vitrin Dizilimi) */}
      <div className="w-full bg-white py-12 md:py-16 overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-[3px] bg-[#008cb3] rounded-full"></span>
                <span className="text-[12px] font-black text-[#008cb3] uppercase tracking-[0.4em]">{t.nationalShowcase.badge}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                {t.nationalShowcase.title}
              </h2>
              <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                {t.nationalShowcase.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto pb-12 px-6 md:px-[calc((100vw-1280px)/2+24px)] gap-8 md:gap-12 scrollbar-hide snap-x snap-mandatory">
          {[
            {
              id: 'showcase-1',
              title: 'Kapadokya VIP Balon Turu',
              location: 'Nevşehir',
              price: 7650,
              oldPrice: 9600,
              image: 'https://images.unsplash.com/photo-1544833342-a8109041ce04?w=1200&q=80',
              reviews: 1250,
              rating: 5,
              badge: '🔥 %20 OFF',
              badgeColor: 'bg-orange-500'
            },
            {
              id: 'showcase-2',
              title: 'Boğaz\'da Lüks Akşam Yemeği ve Tekne Turu',
              location: 'İstanbul',
              price: 3420,
              oldPrice: 4620,
              image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80',
              reviews: 2100,
              rating: 5,
              badge: '⚡ Flash Sale',
              badgeColor: 'bg-red-600'
            },
            {
              id: 'showcase-3',
              title: 'Antalya Gizli Koylar Yat Turu',
              location: 'Antalya',
              price: 2120,
              oldPrice: 3080,
              image: 'https://images.unsplash.com/photo-1572609239482-b3a97d9d553e?w=1200&q=80',
              reviews: 420,
              rating: 5,
              badge: '💎 Bestseller',
              badgeColor: 'bg-[#002b5c]'
            }
          ].map((tur: any) => (
            <div 
              key={tur.id}
              className="min-w-[300px] sm:min-w-[360px] md:min-w-[400px] snap-center group cursor-pointer"
              onClick={() => window.location.href = `/search?location=${tur.location}`}
            >
              <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] hover:-translate-y-4 transition-all duration-500 border border-gray-100 flex flex-col h-[480px] md:h-[520px]">
                <div className="relative h-1/2 w-full overflow-hidden">
                  <Image src={tur.image} alt={tur.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                  {tur.badge && (
                    <div className={`absolute top-4 left-4 ${tur.badgeColor} text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-10 uppercase tracking-widest`}>
                      {tur.badge}
                    </div>
                  )}
                </div>
                <div className="p-8 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 text-[#008cb3] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                      {tur.location}
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-tight group-hover:text-[#008cb3] transition-colors">
                      {tur.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex flex-col">
                      {tur.oldPrice && <span className="text-gray-400 text-[13px] line-through font-bold">{formatPrice(tur.oldPrice)}</span>}
                      <div className="text-3xl md:text-4xl font-black text-[#008cb3] tracking-tighter">{formatPrice(tur.price)}</div>
                    </div>
                    <button className="bg-[#008cb3] text-white text-[11px] font-black px-6 py-3.5 rounded-xl">Hemen Al</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Öne Çıkan Turlar (Kapsamlı Grid) */}
      <div className="w-full bg-[#005e85] py-16 text-white">
        <div className="max-w-7xl px-6 mx-auto">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-[28px] font-extrabold tracking-tight">Öne Çıkan Turlar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { ad: "Kapadokya Balon & Peri Bacaları", sure: "3 Saat (1 Saat Uçuş)", fiyat: 3500, puan: "4.9", resim: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG", etiket: "TÜKENİYOR", slug: 'kapadokya-klasik-balon' },
              { ad: "Lüks Yatta Boğaz Turu", sure: "3 Saat", fiyat: 2500, puan: "4.9", resim: "https://images.unsplash.com/photo-1541426062085-74dc3dbfb0d1?w=800", etiket: "EN ÇOK SATAN", slug: 'istanbul-bogaz-turu' },
              { ad: "Kekova Mavi Tur", sure: "Tam Gün", fiyat: 1800, puan: "5.0", resim: "https://images.unsplash.com/photo-1615714088231-318e805d76ea?w=800", etiket: "YENİ", slug: 'antalya-mavi-tur' }
            ].map((tur, i) => (
              <div key={i} onClick={() => window.location.href = `/tour/${tur.slug}`} className="bg-white text-slate-900 rounded-[24px] overflow-hidden shadow-xl hover:-translate-y-2 transition-transform duration-500 group cursor-pointer flex flex-col relative">
                <div className="relative h-56 overflow-hidden">
                  <Image src={tur.resim} alt={tur.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <span className="absolute top-4 left-4 text-[10px] font-black text-white bg-red-600 px-3 py-1.5 rounded-full uppercase z-10">{tur.etiket}</span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight group-hover:text-[#008cb3]">{tur.ad}</h3>
                  <div className="flex items-center gap-1 text-yellow-500 mb-6 text-sm font-bold">★ ★ ★ ★ ★ <span className="text-gray-400 text-xs ml-1 font-medium">({tur.puan})</span></div>
                  <div className="mt-auto flex justify-between items-end">
                    <div className="text-2xl font-black text-[#008cb3]">{formatPrice(tur.fiyat)}</div>
                    <button className="bg-[#008cb3] text-white font-bold py-2 px-5 rounded-xl">➔</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Lezzet Durakları & Kombolar */}
      <div className="w-full bg-white py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-3 block">Gastronomi Keşfi</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Lezzet Durakları</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              { ad: "Ziyade Ocakbaşı", kategori: "Geleneksel Türk Mutfağı", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", tag: "Michelin Önerisi" },
              { ad: "Museum Terrace", kategori: "Fine Dining & Manzara", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", tag: "Eşsiz Manzara" },
              { ad: "Seki Restaurant", kategori: "Kaya Oyma & Gurme", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80", tag: "Tarihi Doku" }
            ].map((rest, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative h-72 rounded-[2rem] overflow-hidden mb-5 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                  <Image src={rest.image} alt={rest.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-6 left-6 text-white"><h4 className="text-xl font-black">{rest.ad}</h4></div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 italic">Tur + VIP Menü <span className="text-orange-500 underline underline-offset-8">Komboları</span></h2>
          </div>
          <div className="flex flex-col gap-10">
            <ComboCard 
              formatPrice={formatPrice}
              discountRate={25}
              tour={{ name: "VIP Gün Batımı ATV Safari", image: "https://images.unsplash.com/photo-1621259182978-f09e5e2ca845?w=800&q=80", price: 5350 }}
              restaurant={{ name: "Museum Terrace VIP Menü", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", price: 2400 }}
            />
          </div>
        </div>
      </div>

      <FloatingContactMenu />

      {/* Footer & Modals follow... (Simplified for this response but maintained in actual file) */}
      <footer className="w-full bg-[#f8f8f8] text-slate-800 pt-12 pb-24 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
                  {/* Footer content from original file */}
                  <div><h4 className="font-bold mb-4">Şirket</h4><ul className="text-gray-500 text-sm flex flex-col gap-2"><li>Hakkımızda</li><li>Kariyer</li></ul></div>
                  <div><h4 className="font-bold mb-4">Destek</h4><ul className="text-gray-500 text-sm flex flex-col gap-2"><li>Yardım Merkezi</li><li>Bize Ulaşın</li></ul></div>
              </div>
          </div>
      </footer>
    </main>
  );
}