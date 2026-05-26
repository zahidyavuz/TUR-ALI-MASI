'use client';
import { useState, useEffect } from 'react';
import { fetchTours } from '@/app/lib/tours';
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
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

// --- YENİ BİLEŞEN: ComboCard (Geniş / Wide Format) ---
const ComboCard = ({ id, tour, restaurant, discountRate, formatPrice, router }: { id: string, tour: any, restaurant: any, discountRate: number, formatPrice: (p: number) => string, router: any }) => {

  // Bundle_Pricing Logic
  const originalTotal = tour.price + restaurant.price;
  const discountAmount = originalTotal * (discountRate / 100);
  const bundlePrice = originalTotal - discountAmount;
  const savings = Math.round(discountAmount);

  const handleCheckout = () => {
    router.push(`/tour/${id}`);
  };

  return (
    <div 
      onClick={handleCheckout}
      className="relative bg-white rounded-[20px] overflow-hidden shadow-xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-700 group cursor-pointer border border-gray-100 dark:border-none flex flex-col md:flex-row w-full mb-4"> 
      {/* Görsel Alanı (Geniş Split) */}
      <div className="relative h-44 md:h-auto md:w-[35%] overflow-hidden flex">
        <div className="w-1/2 h-full relative border-r-2 border-white z-10 shrink-0">
          <Image src={tour.image} alt={tour.name} fill priority={true} className="object-cover group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        </div>
        <div className="w-1/2 h-full relative shrink-0">
          <Image src={restaurant.image} alt={restaurant.name} fill priority={true} className="object-cover group-hover:scale-110 transition-transform duration-1000" />
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
      <div className="p-4 md:p-6 flex flex-col flex-1 justify-center bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-sm shadow-md z-10">🎒</div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-sm shadow-md z-0">🍽️</div>
          </div>
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Avantaj: {formatPrice(savings)} İndirim</span>
        </div>
        
        <h3 
          className="text-lg md:text-xl font-black text-slate-900 leading-tight mb-2 group-hover:text-[#008cb3] transition-colors cursor-pointer"
        >
          {tour.name} <span className="text-gray-300 font-light mx-1">&</span> {restaurant.name}
        </h3>

        
        <p className="text-xs md:text-sm text-gray-500 font-medium mb-6 leading-relaxed max-w-xl">
          Eşsiz bir gezi ve gurme akşam yemeği tek pakette! Birlikte alın, <b>{formatPrice(savings)}</b> kazançlı çıkın.
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">Paket Fiyatı</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base text-gray-400 line-through font-bold">{formatPrice(originalTotal)}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatPrice(bundlePrice)}</span>
            </div>
          </div>
          <button className="bg-[#008cb3] text-white font-black px-4 md:px-6 py-2.5 rounded-xl hover:bg-slate-900 transition-all shadow-[0_10px_25px_rgba(0,140,179,0.2)] hover:shadow-lg active:scale-95 text-[14px]">
            İncele ve Al ➔
          </button>
        </div>
      </div>
    </div>
  );
};

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1604156789095-3348604c0f43?auto=format&fit=crop&w=1920&q=80', // Kapadokya - Balonlar
  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1920&q=80', // İstanbul - Boğaz ve Galata
  'https://images.unsplash.com/photo-1648325129746-abcc1b872380?auto=format&fit=crop&w=1920&q=80', // Antalya - Yat Limanı
  'https://images.unsplash.com/photo-1510253687831-0f982d7862fc?auto=format&fit=crop&w=1920&q=80', // Kapadokya - Peribacaları
  'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1920&q=80', // İstanbul - Ayasofya
  'https://images.unsplash.com/photo-1582030826675-8b596001240a?auto=format&fit=crop&w=1920&q=80', // Antalya - Konyaaltı
  'https://images.unsplash.com/photo-1631152282084-b8f1b380ccab?auto=format&fit=crop&w=1920&q=80', // Kapadokya - Vadi
  'https://images.unsplash.com/photo-1512918766665-cb2225564a9a?auto=format&fit=crop&w=1920&q=80', // İstanbul - Kız Kulesi
  'https://images.unsplash.com/photo-1711712667984-5b9b291272c0?auto=format&fit=crop&w=1920&q=80', // Antalya - Şehir Manzarası
];

export default function Home() {
  const { t, locale, setLocale, formatPrice } = useLocale();
  const [tours, setTours] = useState<any[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [agencyTab, setAgencyTab] = useState<'login' | 'register' | 'pricing'>('login');
  const [agencyBusinessType, setAgencyBusinessType] = useState('acenta');
  
  // Agency Form States
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyPassword, setAgencyPassword] = useState('');
  const [agencyBusinessName, setAgencyBusinessName] = useState('');
  const [agencyTursabNo, setAgencyTursabNo] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');

  // Sourced from Auth context
  const { user, login, logout } = useAuth();
  const isLoggedIn = !!user;
  
  const role = user?.role?.toLowerCase() || '';
  const isAdmin = user?.username === 'yavuz50' || user?.is_staff || role === 'superadmin' || role === 'admin';
  const isAgency = user?.is_agency || role === 'merchant' || role === 'agency' || role === 'merchant/agency';
  let userRoleType = 'customer';
  if (isAdmin) userRoleType = 'admin';
  else if (isAgency) userRoleType = 'agency';

  // Checkout / Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Filtre State'leri
  const [selectedLocation, setSelectedLocation] = useState('Nereye gitmek istersin?');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPrice, setSelectedPrice] = useState('Bütçeniz');
  const [selectedGuests, setSelectedGuests] = useState<number | ''>(1);

  const POPULAR_LOCATIONS = ['İstanbul', 'Antalya', 'Kapadokya', 'Muğla', 'İzmir'];
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
    <main className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] overflow-x-hidden transition-colors duration-500" suppressHydrationWarning>
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
                dangerouslySetInnerHTML={{ __html: mounted ? t.hero.title : '' }} suppressHydrationWarning>
            </h1>
            <p className="text-xs md:text-sm text-white/90 font-medium max-w-3xl mx-auto mb-6 drop-shadow-md px-4 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150" suppressHydrationWarning>
              {mounted ? t.hero.subtitle : ''}
            </p>

            {/* Gelişmiş Filtre Çubuğu */}
            <div className="dropdown-container bg-white backdrop-blur-xl p-4 md:p-2 rounded-2xl md:rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col md:flex-row w-full max-w-4xl items-stretch md:items-center justify-between relative z-50 gap-0 border border-transparent" data-dropdown="searchBar">

              {/* 1. Yer Seçimi */}
              <div className="relative w-full md:w-1/3 h-auto md:h-full border-b border-gray-100 md:border-none">
                <div
                  onClick={() => { if (activeDropdown !== 'location') toggleDropdown('location'); }}
                  className="flex flex-col items-start px-2 md:px-4 md:px-6 py-3 md:py-2 cursor-text hover:bg-gray-50 md:hover:bg-gray-100 md:rounded-full transition-all h-full justify-center w-full"
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
                  className="flex flex-col items-start px-2 md:px-4 md:px-6 py-3 md:py-2 cursor-pointer hover:bg-gray-50 md:hover:bg-gray-100 md:rounded-full transition-all h-full justify-center w-full"
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
      


      {/* Neden Tourkia? (Compact Middle Bar) */}
      <div className="w-full bg-slate-50/50 dark:bg-[#060c1d]/60 py-8 border-y border-gray-100 dark:border-white/5 transition-colors duration-500 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12">
            {t.whyUs.items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-white dark:bg-white/10 text-[#008cb3] dark:text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm dark:shadow-none group-hover:bg-[#008cb3] dark:group-hover:bg-white/20 group-hover:text-white transition-all duration-300">
                  {idx === 0 && <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>}
                  {idx === 1 && <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {idx === 2 && <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {idx === 3 && <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[13px] font-black text-slate-800 dark:text-white leading-none mb-1 group-hover:text-[#008cb3] dark:group-hover:text-blue-300 transition-colors">{item.title}</h3>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-white/70 leading-tight line-clamp-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Türkiye'deki Popüler Turlar (Horizontal Carousel) */}
      <div className="w-full bg-white dark:bg-transparent pt-12 pb-2 overflow-hidden transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-10">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none transition-colors duration-500">
            Türkiye'deki <span className="text-[#008cb3]">Popüler Turlar</span>
          </h2>
          <div className="w-24 h-1.5 bg-[#008cb3] mt-6 rounded-full"></div>
        </div>
        
        <div className="flex overflow-x-auto pb-6 px-4 md:px-6 md:px-[calc((100vw-1280px)/2+24px)] gap-6 md:gap-8 scrollbar-hide snap-x snap-mandatory">
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
              className="min-w-[240px] sm:min-w-[280px] md:min-w-[340px] snap-center group cursor-pointer"
              onClick={() => {
                router.push(`/tour/${tur.id}`);
              }}

            >
              <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_60px_rgba(212,175,55,0.2)] transition-all duration-500 border border-amber-100/50 dark:border-none flex flex-col h-full group-hover:-translate-y-2 relative group">
                {/* Premium Glow Effect */}
                <div className="absolute inset-0 rounded-[24px] ring-1 ring-amber-400/10 group-hover:ring-amber-400/30 transition-all duration-500 pointer-events-none"></div>
                <div className="relative h-48 overflow-hidden">
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
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-slate-800 line-clamp-2 mb-4 leading-tight group-hover:text-[#008cb3] transition-colors">
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
                          <div className="text-lg font-black text-[#008cb3] tracking-tighter flex items-baseline gap-1">
                            {formatPrice(tur.price)}
                            <span className="text-[9px] font-bold text-gray-400 uppercase">/pp</span>
                          </div>
                        </div>
                    </div>
                    <button 
                      className="bg-[#008cb3] text-white text-[10px] font-black px-4 py-3 rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest whitespace-nowrap"
                    >
                      İncele ve Al
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* --- National Showcase Grid (Ulusal Vitrin Dizilimi) --- */}
      <div className="w-full bg-white dark:bg-transparent py-12 md:py-16 overflow-hidden border-b border-gray-100 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-left-4 duration-700">
                <span className="w-10 h-[3px] bg-[#008cb3] rounded-full"></span>
                <span className="text-[12px] font-black text-[#008cb3] uppercase tracking-[0.4em]">{t.nationalShowcase.badge}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight transition-colors duration-500">
                {t.nationalShowcase.title}
              </h2>
              <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                {t.nationalShowcase.subtitle}
              </p>
            </div>
            <div className="hidden md:flex gap-3">
               {/* Kaydırma Butonları (Opsiyonel Geliştirme İçin Hazırlık) */}
               <button className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:border-[#008cb3] hover:text-[#008cb3] transition-all active:scale-90">
                 <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
               </button>
               <button className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:border-[#008cb3] hover:text-[#008cb3] transition-all active:scale-90">
                 <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
               </button>
            </div>
          </div>
        </div>

        {/* Yatay Kaydırma Alanı */}
        <div className="flex overflow-x-auto pb-12 px-4 md:px-6 md:px-[calc((100vw-1280px)/2+24px)] gap-8 md:gap-12 scrollbar-hide snap-x snap-mandatory">
          {[
            {
              id: 'kirmizi-tur-kuzey',
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
              id: 'istanbul-bogaz-turu',
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
              id: 'antalya-kekova-tekne',
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
          ].map((tur: any, i: number) => (
            <div 
              key={tur.id}
              className="min-w-[260px] sm:min-w-[320px] md:min-w-[360px] snap-center group cursor-pointer"
              onClick={() => {
                router.push(`/tour/${tur.id}`);
              }}

            >
              <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] hover:-translate-y-4 transition-all duration-500 border border-gray-100 dark:border-none flex flex-col h-[400px] md:h-[440px]">
                {/* Üst Yarı: Görsel */}
                <div className="relative h-1/2 w-full overflow-hidden">
                  <Image 
                    src={tur.image} 
                    alt={tur.title} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  {tur.badge && (
                    <div className={`absolute top-4 left-4 ${tur.badgeColor} text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-10 uppercase tracking-widest`}>
                      {tur.badge}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>
                </div>

                {/* Alt Yarı: İçerik */}
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 text-[#008cb3] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {tur.location}
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight group-hover:text-[#008cb3] transition-colors duration-300">
                      {tur.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex flex-col">
                      {tur.oldPrice && (
                        <span className="text-gray-400 text-[13px] line-through decoration-gray-400/50 mb-0.5 font-bold">
                          {formatPrice(tur.oldPrice)}
                        </span>
                      )}
                      <div className="text-2xl md:text-3xl font-black text-[#008cb3] tracking-tighter flex items-baseline gap-1">
                        {formatPrice(tur.price)}
                        <span className="text-[10px] font-bold text-gray-400 uppercase">/pp</span>
                      </div>
                    </div>
                    <button 
                      className="bg-[#008cb3] text-white text-[11px] font-black px-4 md:px-6 py-3.5 rounded-xl hover:bg-slate-900 transition-all duration-300 active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest whitespace-nowrap"
                    >
                      İncele ve Al
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Keşfet Kartı (Dizilimin sonunda) */}
          <div className="min-w-[300px] sm:min-w-[360px] md:min-w-[400px] snap-center group cursor-pointer h-full">
            <div className="h-[480px] md:h-[520px] rounded-[16px] bg-slate-900 flex flex-col items-center justify-center p-12 text-center border-4 border-dashed border-slate-800 hover:border-[#008cb3] hover:-translate-y-4 transition-all duration-500">
              <div className="w-20 h-20 bg-[#008cb3]/10 rounded-full flex items-center justify-center mb-8">
                <svg className="text-[#008cb3]" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">Daha Fazlasını Keşfet</h3>
              <p className="text-slate-500 font-medium mb-8">Türkiye'nin her köşesinden 500'den fazla özel tur seni bekliyor.</p>
              <button onClick={() => window.location.href = '/search'} className="bg-[#008cb3] text-white font-black px-4 md:px-8 py-4 rounded-xl hover:bg-white hover:text-[#008cb3] transition-all active:scale-95">
                TÜM TURLARI GÖR
              </button>
            </div>
          </div>
        </div>
      </div>





      {/* 4. Lezzet Durakları (Taste Hub - Yeni) */}
      <div className="w-full bg-white dark:bg-transparent py-24 border-t border-gray-100 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-3 block">Gastronomi Keşfi</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4 transition-colors duration-500">Lezzet Durakları</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Sadece gezmek yetmez; Kapadokya'nın ve Türkiye'nin en seçkin restoranlarında gerçek bir lezzet şölenine davetlisiniz. Şeflerin elinden çıkan gurme deneyimleri keşfedin.
              </p>
            </div>
            <Link href="/taste" className="text-sm font-black text-[#008cb3] hover:text-[#005e85] flex items-center gap-2 group transition-colors">
              TÜM LEZZETLERİ GÖR
              <span className="group-hover:translate-x-1 transition-transform">➔</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { ad: "Ziyade Ocakbaşı", kategori: "Geleneksel Türk Mutfağı", puan: "4.9", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", tag: "Michelin Önerisi" },
              { ad: "Museum Terrace", kategori: "Fine Dining & Manzara", puan: "4.8", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", tag: "Eşsiz Manzara" },
              { ad: "Seki Restaurant", kategori: "Kaya Oyma & Gurme", puan: "4.7", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80", tag: "Tarihi Doku" }
            ].map((rest, i) => (
              <div 
                key={i} 
                onClick={() => router.push('/taste')}
                className="group cursor-pointer bg-white p-2 rounded-[2rem] shadow-sm hover:shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-50 dark:border-none transition-all duration-500">
                <div className="relative h-48 rounded-[1.5rem] overflow-hidden mb-4 shadow-md group-hover:shadow-xl transition-all duration-500">
                  <Image src={rest.image} alt={rest.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full text-slate-800 shadow-sm uppercase tracking-wider">{rest.tag}</span>
                  </div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                      {'★'.repeat(5)} <span className="text-white ml-1 font-bold">{rest.puan}</span>
                    </div>
                    <h4 className="text-lg font-black">{rest.ad}</h4>
                  </div>
                </div>
                <div className="px-3 pb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{rest.kategori}</p>
                  <p className="text-sm font-black text-slate-800 group-hover:text-[#008cb3] transition-colors mt-2">Menüyü İncele ve Rezervasyon Yap ➔</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    
      {/* 4.5. Tur + VIP Menü Komboları (Combo Showcase - Yeni) */}
      <div className="w-full bg-[#f9f8f4] dark:bg-transparent py-16 border-t border-gray-200/50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <span className="text-[10px] font-black text-[#008cb3] uppercase tracking-[0.4em] mb-3 block">Ayrıcalıklı Paketler</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4 italic italic-font-fix transition-colors duration-500">Tur + VIP Menü <span className="text-orange-500 underline decoration-indigo-200 underline-offset-8 italic">Komboları</span></h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
              Zamanınızı ve bütçenizi en verimli şekilde kullanın. Popüler turlarımız ve seçkin restoran menüleri tek pakette.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            <ComboCard 
              id="vip-1"
              formatPrice={formatPrice}
              discountRate={25}
              router={router}

              tour={{
                name: "VIP Gün Batımı ATV Safari",
                image: "https://images.unsplash.com/photo-1621259182978-f09e5e2ca845?w=800&q=80",
                price: 5350
              }}
              restaurant={{
                name: "Museum Terrace VIP Menü",
                image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
                price: 2400
              }}
            />

            <ComboCard 
              id="vip-2"
              formatPrice={formatPrice}
              discountRate={20}
              router={router}

              tour={{
                name: "Özel Rehberli Tarihi Yarımada Turu",
                image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
                price: 4230
              }}
              restaurant={{
                name: "Ziyade Ocakbaşı Gurme Menü",
                image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
                price: 1850
              }}
            />
          </div>

          <div className="mt-12 flex justify-center">
            <button className="text-sm font-black text-slate-800 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-2 group transition-all">
              TÜM KOMBO PAKETLERİ LİSTELE
              <span className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">➔</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Anılar (Memories / Social Wall - Yeni) */}
      <div className="w-full bg-slate-900 py-10 relative overflow-hidden">
        {/* Dekoratif Arka Plan */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#008cb3] blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500 blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-6">
            <span className="text-[10px] font-black text-[#008cb3] uppercase tracking-[0.4em] mb-2 block">Gezginlerin Gözünden</span>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight mb-2">Ölümsüz Anılar</h2>
            <p className="text-gray-400 text-xs font-medium max-w-xl mx-auto leading-relaxed">
              Her seyahat yeni bir hikaye, her hikaye ise bir ömür boyu hatırlanacak bir anıdır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80", user: "@sarah_travels", text: "Balonların şafağı karşıladığı o an... 🎈" },
              { img: "https://images.unsplash.com/photo-1544833342-a8109041ce04?w=800&q=80", user: "@mehmet.can", text: "Kapadokya vadilerinde ATV turu hayatımın en adrenalin dolu günüydü." },
              { img: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&q=80", user: "@elena_explorer", text: "İstanbul'un ışıkları altında Boğaz turu... Büyüleyici!" },
            ].map((an, i) => (
              <div key={i} className="relative group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-48 md:h-64">
                <Image src={an.img} alt={an.user} fill className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                  <p className="text-white font-bold text-[11px] mb-1">{an.text}</p>
                  <span className="text-[#008cb3] font-black text-[10px]">{an.user}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-black px-4 md:px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 mx-auto text-xs">
              <span className="text-lg">📸</span>
              KENDİ ANINI PAYLAŞ
            </button>
          </div>
        </div>
      </div>

      {/* 9. Bülten / İletişim */}
      <div className="w-full bg-slate-100 py-16 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-[28px] font-black text-slate-800 mb-4">Macerayı E-Posta Kutunuza Taşıyın</h2>
          <p className="text-gray-600 mb-8 font-medium">Bültenimize kaydolun, en yeni tur fırsatlarından ve promosyonlardan ilk siz haberdar olun!</p>
          <div className="flex flex-col md:flex-row gap-3 justify-center max-w-2xl mx-auto">
            <input type="email" placeholder="E-posta adresinizi girin" className="flex-1 px-4 md:px-6 py-4 rounded-full border border-gray-300 outline-none focus:border-[#008cb3] shadow-sm" />
            <button className="bg-orange-500 text-white font-bold px-10 py-4 rounded-full hover:bg-orange-600 transition-colors shadow-md">Abone Ol</button>
          </div>
        </div>
      </div>


      {/* Yüzen Çoklu Mesajlaşma (Contact) Menüsü */}
      <FloatingContactMenu />

      {/* Müşteri Giriş Yap / Üye Ol Modalı */}
      {
        showLoginModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 z-[100] flex items-start justify-center backdrop-blur-sm px-4 overflow-y-auto pt-20 md:pt-32 pb-10"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLoginModal(false);
                setIsVerifyingEmail(false);
              }
            }}
          >
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[420px] overflow-hidden relative animate-in zoom-in-95 duration-200 border border-gray-100">
              {/* Kapat Butonu */}
              <button
                onClick={() => { setShowLoginModal(false); setIsVerifyingEmail(false); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-all bg-gray-100/50 hover:bg-red-50 p-3.5 rounded-full z-20 shadow-sm active:scale-90"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Sekmeler (Tabs) Sadece Doğrulama Aşamasında Değilse Göster */}
              {!isVerifyingEmail && (
                <div className="flex w-full bg-slate-50 pt-2 px-4 md:px-6">
                  <button
                    onClick={() => setLoginTab('login')}
                    className={`flex-1 py-5 text-[15px] font-black cursor-pointer transition-colors border-b-[3px] ${loginTab === 'login' ? 'text-[#008cb3] border-[#008cb3]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => setLoginTab('register')}
                    className={`flex-1 py-5 text-[15px] font-black cursor-pointer transition-colors border-b-[3px] ${loginTab === 'register' ? 'text-[#008cb3] border-[#008cb3]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                  >
                    Üye Ol
                  </button>
                </div>
              )}

              {/* Form İçeriği */}
              <div className="p-8">
                {!isVerifyingEmail ? (
                  <>
                    <h2 className="text-[22px] font-black text-slate-800 mb-6 text-center tracking-tight">
                      {loginTab === 'login' ? 'Tekrar Hoş Geldiniz! 👋' : 'Aramıza Katılın! 🚀'}
                    </h2>

                    <form className="flex flex-col gap-5" onSubmit={async (e) => {
                      e.preventDefault();
                      if (loginTab === 'register') {
                        if (!registerEmail) {
                          alert('Lütfen e-posta adresinizi girin.');
                          return;
                        }

                        setIsLoading(true);
                        // --- EMAIL VERIFICATION ARCHIVED (TEMPORARILY DISABLED) ---
                        /*
                        try {
                          const response = await fetch('/api/verify-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: registerEmail })
                          });

                          const data = await response.json();

                          if (data.success) {
                            setDemoUrl(data.previewUrl || '');
                            setIsVerifyingEmail(true);
                          } else {
                            alert('Hata: ' + data.error);
                          }
                        } catch (err) {
                          alert('Mail sunucusuna bağlanılamadı.');
                        } finally {
                          setIsLoading(false);
                        }
                        */
                        
                        // Direct Success Simulation
                        setTimeout(() => {
                          setIsLoading(false);
                          alert('Üyeliğiniz başarıyla tamamlandı! Hoş geldiniz.');
                          setShowLoginModal(false);
                          router.push('/'); // Kayıt sonrası ana sayfada bırak
                        }, 1000);

                      } else {
                        setShowLoginModal(false);
                        router.push('/login'); // Giriş için login sayfasına yönlendir
                      }
                    }}>
                      {loginTab === 'register' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ad Soyad</label>
                          <input type="text" placeholder="Örn: Ahmet Yılmaz" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" />
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-Posta</label>
                        <input
                          type="email"
                          value={loginTab === 'register' ? registerEmail : undefined}
                          onChange={(e) => loginTab === 'register' && setRegisterEmail(e.target.value)}
                          placeholder="ornek@mail.com"
                          className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şifre</label>
                          {loginTab === 'login' && <a href="#" className="text-xs text-[#008cb3] hover:underline font-bold mr-1">Şifremi Unuttum?</a>}
                        </div>
                        <input type="password" placeholder="••••••••" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" />
                      </div>

                      <button
                        disabled={isLoading}
                        className="w-full bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-2xl mt-3 hover:bg-[#005e85] transition-colors shadow-lg hover:shadow-xl active:scale-[0.98] duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loginTab === 'login' ? 'Giriş Yap' : (isLoading ? 'Kayıt Yapılıyor...' : <>Üye Ol <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>)}
                      </button>

                      <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Veya şununla devam et</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      <button type="button" className="w-full border-2 border-slate-100 text-slate-700 cursor-pointer font-bold text-[14px] py-3.5 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-colors flex items-center justify-center gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Google ile Giriş Yap
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
                    <div className="w-16 h-16 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-5 shrink-0">
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">E-Posta Doğrulama</h3>
                    <p className="text-[13px] text-gray-500 font-medium mb-8 leading-relaxed max-w-[260px]">
                      Güvenliğiniz için e-posta adresinize 6 haneli bir doğrulama kodu gönderdik.
                    </p>

                    <div className="flex gap-2 justify-center mb-8">
                      {[1, 2, 3, 4, 5, 6].map((_, i) => (
                        <input key={i} type="text" maxLength={1} className="w-10 h-12 text-center text-xl font-black text-slate-800 rounded-xl border-2 border-gray-200 focus:border-[#008cb3] focus:bg-blue-50 outline-none transition-colors" />
                      ))}
                    </div>

                    {demoUrl && (
                      <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="mb-6 flex items-center justify-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl text-xs font-bold w-full uppercase border border-yellow-200 hover:bg-yellow-200 transition">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                        Gelen Kutusu (Test Mailini Gör)
                      </a>
                    )}

                    <button
                      onClick={() => { alert('E-posta başarıyla doğrulandı! Üyeliğiniz tamamlandı.'); setShowLoginModal(false); setIsVerifyingEmail(false); }}
                      className="w-full bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-2xl hover:bg-[#005e85] transition-colors shadow-lg hover:shadow-xl active:scale-[0.98] duration-200 flex items-center justify-center gap-2"
                    >
                      Kodu Doğrula ve Tamamla <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </button>

                    <button type="button" onClick={() => setIsVerifyingEmail(false)} className="mt-6 text-[13px] font-bold text-gray-400 hover:text-gray-600">
                      Kodu alamadınız mı? Geri dönün yada tekrar isteyin.
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Acenta Giriş / Üye Ol Modalı (Partner Paneli) */}
      {
        showAgencyModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 z-[100] flex items-start justify-center backdrop-blur-sm px-4 overflow-y-auto pt-20 md:pt-32 pb-10"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAgencyModal(false);
              }
            }}
          >
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[420px] overflow-hidden relative animate-in zoom-in-95 duration-200 border border-orange-100">
              {/* Kapat Butonu */}
              <button
                onClick={() => setShowAgencyModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-all bg-black/30 hover:bg-black/50 p-3.5 rounded-full z-20 backdrop-blur-md shadow-lg active:scale-90"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Şık Acenta Banner */}
              <div className="bg-gradient-to-r from-orange-400 to-orange-500 pt-8 pb-6 px-4 md:px-8 text-white relative overflow-hidden">
                <svg className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4" width="120" height="120" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <h2 className="text-2xl font-black relative z-10 leading-tight">
                  İşletmenizi Dünyayla <br /> Buluşturun!
                </h2>
                <p className="text-orange-50 text-xs font-medium mt-2 relative z-10">Tourkia İş Ortaklığı & İşletme Paneli</p>
              </div>

              {/* Sekmeler (Tabs) */}
              <div className="flex w-full bg-slate-50 border-b border-gray-100 px-1 pt-1 justify-between">
                <button
                  onClick={() => setAgencyTab('login')}
                  className={`flex-1 py-3 text-[13px] font-black transition-colors border-b-[3px] rounded-t-lg ${agencyTab === 'login' ? 'text-orange-500 border-orange-500 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => setAgencyTab('register')}
                  className={`flex-1 py-3 text-[13px] font-black transition-colors border-b-[3px] rounded-t-lg mx-1 ${agencyTab === 'register' ? 'text-orange-500 border-orange-500 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  Kayıt Ol
                </button>
                <button
                  onClick={() => setAgencyTab('pricing')}
                  className={`flex-1 py-3 text-[13px] font-black transition-colors border-b-[3px] rounded-t-lg flex items-center justify-center gap-1 ${agencyTab === 'pricing' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-indigo-400/80 border-transparent hover:text-indigo-500'}`}
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                  Premium
                </button>
              </div>

              {/* Form İçeriği */}
              <div className="p-7">

                {/* Login & Register Sekmeleri */}
                {(agencyTab === 'login' || agencyTab === 'register') && (
                  <form className="flex flex-col gap-4" onSubmit={(e) => {
                    e.preventDefault();
                    if (agencyTab === 'register') {
                      alert('Acentelik başvurunuz alınmıştır.');
                      setShowAgencyModal(false);
                    }
                  }}>
                    {agencyTab === 'register' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">İşletme / Firma Adı</label>
                          <input 
                            type="text" 
                            value={agencyBusinessName}
                            onChange={(e) => setAgencyBusinessName(e.target.value)}
                            placeholder="Örn: Gurme Restoran veya X Turizm" 
                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400" 
                          />
                        </div>
                        {agencyBusinessType === 'acenta' && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">TURSAB Belge No</label>
                            <input 
                                type="text" 
                                value={agencyTursabNo}
                                onChange={(e) => setAgencyTursabNo(e.target.value)}
                                placeholder="Örn: 12345" 
                                className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400" 
                            />
                          </div>
                        )}
                        {(agencyBusinessType === 'restoran' || agencyBusinessType === 'kafe') && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">İşletme Adresi / Şehir</label>
                            <input 
                                type="text" 
                                value={agencyAddress}
                                onChange={(e) => setAgencyAddress(e.target.value)}
                                placeholder="Örn: Kapadokya, Nevşehir" 
                                className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400" 
                            />
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">İşletme Türü</label>
                      <select 
                        value={agencyBusinessType}
                        onChange={(e) => setAgencyBusinessType(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-bold text-slate-700"
                      >
                        <option value="acenta">Tur Acentası</option>
                        <option value="restoran">Restoran / Kafe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kurumsal E-Posta</label>
                      <input 
                        type="email" 
                        value={agencyEmail}
                        onChange={(e) => setAgencyEmail(e.target.value)}
                        placeholder="iletisim@firmaniz.com" 
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şifre</label>
                        {agencyTab === 'login' && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="text-xs text-orange-500 hover:underline font-bold mr-1">Şifremi Unuttum?</button>}
                      </div>
                      <input 
                        type="password" 
                        value={agencyPassword}
                        onChange={(e) => setAgencyPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" 
                      />
                    </div>

                    <button 
                      type={agencyTab === 'login' ? 'button' : 'submit'}
                      onClick={async () => {
                        if (agencyTab === 'login') {
                          // Login İşlemi: Mock Token oluşturup AuthContext'e veriyoruz
                          const tokenStr = agencyBusinessType === 'restoran' ? 'mock_restaurant_token' : 'mock_agency_token';
                          const mockTokens = { access: tokenStr, refresh: tokenStr };
                          
                          if (typeof window !== 'undefined') {
                              localStorage.setItem('access_token', tokenStr);
                          }
                          
                          setShowAgencyModal(false);
                          
                          // Doğrudan login foksiyonunu çağırıp başarılı olursa Business Hub'a gönder
                          if (login) {
                              await login(mockTokens);
                              window.location.href = '/dashboard/business'; // Kesin ve net yönlendirme (hard redirect)
                          }
                        }
                      }}
                      className="w-full bg-orange-500 text-white font-black text-[15px] py-4 rounded-2xl mt-4 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30 hover:shadow-xl active:scale-[0.98] duration-200"
                    >
                      {agencyTab === 'login' ? 'Yönetim Paneline Gir' : 'Hemen Başvuru Yap'}
                    </button>
                  </form>
                )}

                {/* Premium Tarife / Sponsorluk Sekmesi */}
                {agencyTab === 'pricing' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <div className="text-center mb-2">
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-black px-3 py-1 rounded-full mb-3 inline-block tracking-widest">Özel Acenta Fırsatı</span>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">Müşterilerinize Üst Sıralardan Ulaşın</h3>
                      <p className="text-xs font-medium text-gray-500 mt-2">VIP Partner Aboneliği ile turlarınızı aramalarda en öne çıkararak satışlarınızı %300'e kadar artırın.</p>
                    </div>

                    {/* Aylık Paket */}
                    <div className="relative border-2 border-slate-100 hover:border-indigo-300 rounded-2xl p-4 transition-all bg-white cursor-pointer group">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-extrabold text-slate-800 text-[15px] flex items-center gap-1.5"><svg width="16" height="16" fill="currentColor" className="text-slate-400 group-hover:text-indigo-500" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>Aylık Abonelik</h4>
                        <p className="font-black text-xl text-indigo-600">₺1.490<span className="text-xs text-gray-400 font-bold">/ay</span></p>
                      </div>
                      <ul className="text-[12px] font-medium text-slate-600 flex flex-col gap-2 mb-4">
                        <li className="flex items-center gap-2"><svg className="text-green-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Sınırsız Tur Ekleme</li>
                        <li className="flex items-center gap-2"><svg className="text-green-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> <b>"Sponsorlu VIP"</b> Etiketi <span className="text-[10px] bg-yellow-100 text-yellow-700 font-black px-1.5 rounded uppercase">Etkili</span></li>
                        <li className="flex items-center gap-2"><svg className="text-green-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Aramalarda Üst Sıraya Çıkma</li>
                      </ul>
                      <button className="w-full bg-slate-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white font-bold py-2.5 rounded-xl transition-all text-[13px]">Aylık Başla</button>
                    </div>

                    {/* Yıllık Paket (Önerilen) */}
                    <div className="relative border-2 border-indigo-500 rounded-2xl p-4 transition-all bg-indigo-50/30 cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-10">🌍 EN POPÜLER SEÇİM</div>
                      <div className="flex justify-between items-center mb-3 mt-2">
                        <h4 className="font-extrabold text-slate-900 text-[15px] flex items-center gap-1.5"><svg width="18" height="18" fill="currentColor" className="text-orange-500" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a2 2 0 012-2h4.51c.362 0 .71.144.965.4l5.122 5.121A1.364 1.364 0 0118 6.51V18a2 2 0 01-2 2H7a2 2 0 01-2-2V2zm2 0v16h9V7h-4V2H7z" clipRule="evenodd" /></svg>Yıllık Abonelik</h4>
                        <div className="text-right">
                          <p className="font-black text-2xl text-indigo-700">₺11.900<span className="text-xs text-gray-500 font-bold block -mt-1 line-through">Normalde ₺17.880</span></p>
                        </div>
                      </div>
                      <ul className="text-[12px] font-medium text-slate-700 flex flex-col gap-2 mb-4">
                        <li className="flex items-center gap-2 font-bold"><svg className="text-indigo-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Aylık Paketteki Tüm Özellikler</li>
                        <li className="flex items-center gap-2"><svg className="text-indigo-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> <b>Anasayfada Öne Çıkarılan Acenta</b> Olma <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-1.5 rounded uppercase">KRİTİK</span></li>
                        <li className="flex items-center gap-2"><svg className="text-indigo-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> 4 Ay Bedava (Yaklaşık ₺6.000 İndirim)</li>
                      </ul>
                      <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition-all text-[14px] shadow-md flex justify-center items-center gap-2">
                        Acentamı VIP Yap <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Güvenli Ödeme Alt Yapısı (Checkout) Modalı */}
      {
        showPaymentModal && (
          <div
            className="fixed inset-0 bg-slate-900/70 z-[120] flex items-start justify-center backdrop-blur-md px-4 overflow-y-auto pt-20 md:pt-32 pb-10"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPaymentModal(false);
              }
            }}
          >
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[460px] overflow-hidden relative animate-in zoom-in-95 duration-200 border border-gray-100">

              {/* Kapat Butonu */}
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-all bg-slate-100/50 hover:bg-red-50 p-3.5 rounded-full z-20 shadow-sm active:scale-90"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Fiş/Özet Header */}
              <div className="bg-slate-50 pt-8 pb-6 px-4 md:px-8 relative border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                  </div>
                  <h2 className="text-xl font-black text-slate-800">Güvenli Ödeme</h2>
                </div>
                <p className="text-gray-500 text-[13px] font-medium">Tur kaydınızın tamamlanması için son adım.</p>

                <div className="mt-5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam Tutar</p>
                    <p className="text-2xl font-black text-[#008cb3]">₺14.500<span className="text-sm text-gray-400 font-medium">,00</span></p>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-100 text-green-700 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg">256 Bit SSL Korumalı</span>
                  </div>
                </div>
              </div>

              {/* Kart Formu */}
              <div className="p-8">
                <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); alert('Ödeme simülasyonu başarıyla tamamlandı!'); setShowPaymentModal(false); }}>

                  {/* Kart Görseli Simülasyonu */}
                  <div className="w-full h-14 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl mb-2 flex items-center justify-between px-5">
                    <div className="flex gap-1.5">
                      <div className="w-8 h-5 bg-yellow-400/80 rounded rounded-sm"></div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-white/80 font-bold text-xs">VISA</span>
                      <span className="text-white/80 font-bold text-xs">M/C</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kart Numarası</label>
                    <input type="text" inputMode="numeric" maxLength={19} placeholder="0000 0000 0000 0000" autoComplete="cc-number" onFocus={e => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 tracking-wider" />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Son KULL. TA.</label>
                      <input type="text" inputMode="numeric" maxLength={5} placeholder="AA/YY" autoComplete="cc-exp" onFocus={e => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 text-center" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">CVV/CVC</label>
                      <input type="password" inputMode="numeric" maxLength={3} placeholder="•••" autoComplete="cc-csc" onFocus={e => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 text-center tracking-widest" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kart Üzerindeki İsim</label>
                    <input type="text" placeholder="Örn: Ahmet Yılmaz" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400 uppercase" />
                  </div>

                  <button type="submit" className="w-full bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-2xl mt-2 hover:bg-[#005e85] transition-colors shadow-lg shadow-blue-500/20 hover:shadow-xl active:scale-[0.98] duration-200 flex items-center justify-center gap-2">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Ödemeyi Tamamla
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </main>
  );
}
