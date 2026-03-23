'use client';
import { useState, useEffect } from 'react';
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

const BACKGROUND_IMAGES = [
  'https://picsum.photos/seed/cappadocia1/1200/600',
  'https://picsum.photos/seed/istanbul1/1200/600',
  'https://picsum.photos/seed/cappadocia2/1200/600',
  'https://picsum.photos/seed/istanbul2/1200/600',
  'https://picsum.photos/seed/istanbul3/1200/600',
];

// TRUST_TEXTS are now handled by LocaleContext

export default function Home() {
  const { t, locale, setLocale, formatPrice } = useLocale();
  const [tours, setTours] = useState<any[]>([]);
  const [toursLoaded, setToursLoaded] = useState(false);

  useEffect(() => {
    async function loadTours() {
      const data = await fetchTours();
      setTours(data.tours || []);
      setToursLoaded(true);
    }
    loadTours();
  }, []);

  const [currentImage, setCurrentImage] = useState(0);
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

  // Filtre State'leri
  const [selectedLocation, setSelectedLocation] = useState('Nereye gitmek istersin?');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPrice, setSelectedPrice] = useState('Bütçeniz');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [selectedGuests, setSelectedGuests] = useState<number | ''>(1);

  const POPULAR_LOCATIONS = ['Kapadokya, Türkiye', 'Ege Kıyıları, Türkiye', 'Roma, İtalya', 'Paris, Fransa', 'Bali, Endonezya', 'Moskova, Rusya', 'Pekin, Çin', 'Maldivler', 'Dubai, BAE'];

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
    // Sadece tarayıcı (client) tarafında çalışması için useEffect içi kullanıyoruz, Hydration hatasını önler.
    const interval = setInterval(() => {
      setLiveRates(prevRates => {
        const newColors: { [key: string]: 'text-green-500' | 'text-red-500' | 'text-[#005e85]' } = {};
        const updated = prevRates.map(rate => {
          // Borsa efekti: Kura %0.01 ile %0.1 arası rastgele ufak bir değişim ekle (+ veya -)
          const change = rate.karsilik * (Math.random() * 0.002 - 0.001);
          newColors[rate.birim] = change > 0 ? 'text-green-500' : 'text-red-500';
          return { ...rate, karsilik: rate.karsilik + change };
        });
        setRateColors(newColors);
        return updated;
      });
    }, 3000); // 3 saniyede bir oranları güncelle
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 3000); // 3 saniyede 1 görsel geçişi
    return () => clearInterval(timer);
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
    <main className="min-h-screen bg-white font-sans text-slate-900" suppressHydrationWarning>
      {/* Üst Bar: Trustpilot, Destek vb. */}
      <div className="w-full bg-slate-50 border-b border-gray-200 py-2 px-8 hidden md:flex justify-center gap-12 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> 2.500 işletmeci</span>
        <span className="flex items-center gap-2">4,6 yıldız <span className="text-green-600 font-bold flex items-center gap-1"><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Trustpilot</span> <span className="text-gray-400 font-normal">(9.906 değerlendirme)</span></span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 7/24 müşteri desteği</span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Ücretsiz eSIM</span>
      </div>

      {/* Navbar: Ana Menü */}
      <nav className="w-full bg-white py-4 px-4 md:py-5 md:px-8 flex justify-between items-center sticky top-0 z-[99999] shadow-sm md:shadow-none">
        <div className="text-2xl md:text-[28px] font-extrabold text-[#008cb3] tracking-tighter">
          Tour<span className="text-[#005e85]">Scanner™</span>
        </div>
        <div className="hidden lg:flex gap-6 font-semibold text-gray-700 text-[14px]">
          <Link href="/profile/goals" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.destinations}</Link>
          <Link href="/profile/styles" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.styles}</Link>
          <Link href="/profile/memories" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.memories}</Link>
          <Link href="/profile/deals" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.deals}</Link>
          <button className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors" onClick={() => alert('Çok Yakında!')}>{t.nav.contact}</button>

        </div>
        <div className="flex items-center gap-3 md:gap-5">
          {/* Mobil Hamburger Butonu */}
          <button className="flex lg:hidden items-center justify-center text-gray-600 hover:text-[#008cb3] w-10 h-10 rounded-full hover:bg-gray-50 transition cursor-pointer" aria-label="Mobil Menüyü Aç">
            <svg className="pointer-events-none" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Para Birimi Değiştirici */}
          <CurrencySelector />

          {/* Dil Değiştirici */}
          <select
            value={locale}
            aria-label="Dil / Lokasyon Seçimi"
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-10 bg-white border text-sm font-bold border-gray-200 text-gray-700 px-3 rounded-full outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm cursor-pointer appearance-none pr-8 relative hover:bg-gray-50 transition"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
          >
            <option value="tr-TR">🇹🇷 TR</option>
            <option value="en-US">🇺🇸 EN</option>
            <option value="de-DE">🇩🇪 DE</option>
            <option value="zh-CN">🇨🇳 CN</option>
          </select>

          {/* Yakınımdaki turlar (Geofencing) */}
          <GeofenceTrigger compact className="hidden sm:flex" />

          {/* Favoriler Butonu ve Dropdown */}
          <div className="relative flex items-center justify-center dropdown-container" data-dropdown="favorites">
            <button
              onClick={() => toggleDropdown('favorites')}
              aria-label="Favoriler"
              className={`transition flex items-center justify-center w-10 h-10 rounded-full cursor-pointer relative z-10 ${activeDropdown === 'favorites' ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}
            >
              <svg className="pointer-events-none w-5 h-5" viewBox="0 0 24 24" fill={activeDropdown === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>

            {activeDropdown === 'favorites' && (
              <div className="absolute right-0 top-[120%] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-slate-800 text-[15px]">Favorilediklerim</h4>
                  <span className="bg-red-50 text-red-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">2 Tur</span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Örnek Favori 1 */}
                  <div className="flex gap-3 items-center group cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="relative w-12 h-12 shrink-0">
                      <Image src="https://images.unsplash.com/photo-1596395819057-afbf19aff3fb?fit=crop&w=100&q=80" alt="Kapadokya" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-[13px] text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight">Kapadokya Balon Turu</h5>
                      <span className="text-[11px] font-semibold text-red-500">₺2.400</span>
                    </div>
                  </div>
                  {/* Örnek Favori 2 */}
                  <div className="flex gap-3 items-center group cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="relative w-12 h-12 shrink-0">
                      <Image src="https://images.unsplash.com/photo-1541432901042-2b8cbc77d2a8?fit=crop&w=100&q=80" alt="Roma" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-[13px] text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight">Büyük İtalya Turu</h5>
                      <span className="text-[11px] font-semibold text-red-500">₺18.150</span>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer" onClick={() => setActiveDropdown(null)}>
                  Tümünü Gör
                </button>
              </div>
            )}
          </div>

          {/* Bildirim Merkezi (Çakışmaları önlemek için buraya alındı) */}
          <NotificationCenter />

          <div className="relative dropdown-container flex items-center justify-center" data-dropdown="userMenu">
            <button
              onClick={() => toggleDropdown('userMenu')}
              aria-label="Kullanıcı Menüsü"
              className={`transition rounded-full border-[1.5px] w-10 h-10 flex items-center justify-center bg-white cursor-pointer relative z-10 ${activeDropdown === 'userMenu' ? 'border-[#008cb3] text-[#008cb3] bg-blue-50' : 'border-gray-300 text-gray-600 hover:text-blue-500 hover:border-[#008cb3] hover:bg-gray-50'}`}
            >
              <svg className="pointer-events-none w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
            </button>

            {/* Kullanıcı / Acenta Girişi Dropdown */}
            {activeDropdown === 'userMenu' && (
              <div className="absolute right-0 top-[120%] w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[60] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">

                {/* Sadakat Programı (TourPuan) - (Acentalar için gizlenebilir veya gösterilebilir, genelde müşteriler içindir) */}
                {userRole === 'customer' && (
                  <div className="px-5 py-3 mb-1 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col items-start border-b border-gray-100/50">
                    <span className="text-[10px] font-black text-[#008cb3] uppercase tracking-widest mb-1.5 flex items-center gap-1"><svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Sadakat Programı</span>
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-sm text-slate-800 tracking-tight">TourPuan™</span>
                      <span className="bg-[#008cb3] text-white font-black text-[11px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">1.450 Puan</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-1.5">Mevcut Bakiyeniz: <span className="text-green-600">₺145 İndirim!</span></p>
                  </div>
                )}

                {/* Hesabım Bölümü Sadece Müşteriler İçin */}
                {userRole === 'customer' && (
                  <>
                    <div className="px-5 py-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hesabım</h4>
                    </div>

                    <button
                      onClick={() => { window.location.href = '/profile'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a4 4 0 00-8 0v3h8v-3z" /></svg>
                        Profilimi Düzenle
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/bookings'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                        Biletlerim & Siparişler
                      </span>
                    </button>
                  </>
                )}

                {/* Sadece Müşteriler İçin */}
                {userRole === 'customer' && (
                  <button
                    onClick={() => { window.location.href = '/profile/cards'; setActiveDropdown(null); }}
                    className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                  >
                    <span className="flex-1 flex items-center gap-3 pointer-events-none">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      Ödeme Kartlarım
                    </span>
                  </button>
                )}

                {/* Sadece Müşteriler İçin */}
                {userRole === 'customer' && (
                  <button
                    onClick={() => { window.location.href = '/profile/reviews'; setActiveDropdown(null); }}
                    className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                  >
                    <span className="flex-1 flex items-center gap-3 pointer-events-none">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      Yorumlarım
                    </span>
                  </button>
                )}

                {/* Sadece Acentalar İçin */}
                {userRole === 'agency' && (
                  <>
                    <div className="px-5 py-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Acenta İşlemleri</h4>
                    </div>
                    <button
                      onClick={() => { window.location.href = '/agency/dashboard'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Panelim
                      </span>
                    </button>
                    <button
                      onClick={() => { alert('Yüklediğim Turlar Sayfası Çok Yakında!'); setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Yeni Tur Ekle
                      </span>
                    </button>
                    <button
                      onClick={() => { alert('Kazançlarım Sayfası Çok Yakında!'); setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Kazançlarım
                      </span>
                    </button>
                  </>
                )}

                {/* Giriş Linkleri Sadece Giriş Yapılmamışsa Gözüksün */}
                {!isLoggedIn && (
                  <>
                    <div className="border-t border-gray-100/50 my-1.5"></div>
                    <div className="px-5 py-1">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hesap Değiştir / Gir</h4>
                    </div>
                    <button
                      onClick={() => { window.location.href = '/login'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {t.nav.customerLogin}
                      </span>
                    </button>
                    <button
                      onClick={() => { setShowAgencyModal(true); setAgencyTab('login'); setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {t.nav.agencyLogin}
                      </span>
                    </button>
                  </>
                )}

                {/* Çıkış Yap Butonu (Sadece Giriş Yapılıysa) */}
                {isLoggedIn && (
                  <>
                    <div className="border-t border-gray-100/50 my-1.5"></div>
                    <button
                      onClick={() => {
                        logout();
                        setActiveDropdown(null);
                      }}
                      className="w-full px-5 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 text-left flex items-center gap-3 transition-colors cursor-pointer group mb-1"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Güvenli Çıkış
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero: Pazarlama Tasarımı */}
      {/* Hero: Pazarlama Tasarımı */}
      <div className="w-full relative z-0">
        <div className="w-full py-8 px-4 text-center text-white relative flex flex-col items-center justify-center min-h-[28vh]">
          {/* Arka Plan Resimleri kapsayıcısı (Taşmaları ve oval köşeleri sınırlandırmak için) */}
          <div className="absolute inset-0 overflow-hidden z-0 bg-slate-900">
            {BACKGROUND_IMAGES.map((img, index) => (
              <Image
                key={img}
                src={img}
                alt={`Hero Visual ${index}`}
                fill
                priority={index === 0}
                className={`object-cover transition-opacity duration-1000 ease-in-out ${index === currentImage ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
            {/* Karanlık Overlay (Yazıların okunabilmesi için) */}
            <div className="absolute inset-0 bg-blue-900/40" />
          </div>

          {/* İçerik */}
          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-2">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-lg leading-tight w-full max-w-4xl" dangerouslySetInnerHTML={{ __html: t.hero.title }}></h1>
            <p className="text-xs md:text-sm text-white/90 font-medium max-w-3xl mx-auto mb-4 drop-shadow-md px-4 leading-relaxed">
              {t.hero.subtitle}
            </p>

            {/* Gelişmiş Filtre Çubuğu */}
            <div className="dropdown-container bg-white p-2 md:p-2 rounded-[16px] md:rounded-[20px] shadow-2xl flex flex-col md:flex-row w-full items-center justify-between border-2 border-white/20 relative z-50 gap-2 md:gap-0" data-dropdown="searchBar">

              {/* 1. Yer Seçimi */}
              <div className="relative w-full md:w-1/4 h-full">
                <div
                  onClick={() => { if (activeDropdown !== 'location') toggleDropdown('location'); }}
                  className="flex flex-col items-start px-6 py-2 cursor-text hover:bg-gray-100 rounded-full transition-all h-full justify-center w-full"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t.hero.searchLocationLabel}</span>
                  <input
                    type="text"
                    value={selectedLocation === 'Nereye gitmek istersin?' ? '' : selectedLocation}
                    onChange={(e) => {
                      setSelectedLocation(e.target.value);
                      if (activeDropdown !== 'location') setActiveDropdown('location');
                    }}
                    onFocus={() => setActiveDropdown('location')}
                    placeholder={t.hero.searchLocationPlaceholder}
                    className="w-full bg-transparent outline-none text-sm text-blue-900 font-bold placeholder-gray-400 truncate mt-0.5"
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
              <div className="relative w-full md:w-1/4 h-full">
                <div
                  onClick={() => toggleDropdown('date')}
                  className="flex flex-col items-start px-6 py-2 cursor-pointer hover:bg-gray-100 rounded-full transition-all h-full justify-center w-full"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t.hero.searchDateLabel}</span>
                  <span className={`text-sm ${!selectedDate ? 'text-gray-400' : 'text-blue-900 font-bold'} truncate w-full text-left`}>
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

              {/* 3. Fiyat & Bütçe */}
              <div className="relative w-full md:w-1/4 h-full">
                <div
                  onClick={() => toggleDropdown('price')}
                  className="flex flex-col items-start px-6 py-2 cursor-pointer hover:bg-gray-100 rounded-full transition-all h-full justify-center w-full"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t.hero.searchPriceLabel}</span>
                  <span className={`text-sm ${selectedPrice === 'Bütçeniz' ? 'text-gray-400' : 'text-blue-900 font-bold'} truncate w-full text-left`}>{selectedPrice === 'Bütçeniz' ? t.hero.searchPriceLabel : selectedPrice}</span>
                </div>

                {activeDropdown === 'price' && (
                  <div className="absolute top-[105%] md:top-[120%] left-0 w-[calc(100vw-40px)] md:w-64 max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-left">
                    <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase">Bütçenizi Belirleyin</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-gray-400 ml-1">MİN (₺)</span>
                        <input
                          type="number"
                          min="0"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          placeholder="0"
                          className="w-full mt-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[15px] font-black text-[#008cb3] outline-none focus:border-[#008cb3] focus:bg-white transition-colors [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-gray-300 font-bold mt-5">-</span>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-gray-400 ml-1">MAX (₺)</span>
                        <input
                          type="number"
                          min="0"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="Limit Yok"
                          className="w-full mt-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[15px] font-black text-[#008cb3] outline-none focus:border-[#008cb3] focus:bg-white transition-colors [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const min = priceMin ? `₺${priceMin}` : '₺0';
                        const max = priceMax ? `₺${priceMax}` : 'Limitsiz';
                        setSelectedPrice(`${min} - ${max}`);
                        setActiveDropdown(null);
                      }}
                      className="w-full mt-2 bg-orange-100 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-500 hover:text-white transition-colors text-[14px] shadow-sm active:scale-95"
                    >
                      Bütçeyi Onayla
                    </button>

                    {/* Hızlı Seçenekler */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Popüler Aralıklar</h4>
                      {[
                        { label: '0₺ - 5.000₺', min: '0', max: '5000' },
                        { label: '5.000₺ - 15.000₺', min: '5000', max: '15000' },
                        { label: '15.000₺ - 30.000₺', min: '15000', max: '30000' },
                        { label: '30.000₺ Üzeri', min: '30000', max: '' },
                      ].map((range) => (
                        <button
                          key={range.label}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPriceMin(range.min);
                            setPriceMax(range.max);
                            // Otomatik onayla
                            setSelectedPrice(range.label);
                            setActiveDropdown(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-[#008cb3] hover:text-white transition-colors"
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:block w-[1px] h-10 bg-gray-200"></div>

              {/* 4. Yolcu & Konaklama */}
              <div className="relative w-full md:w-1/4 h-full flex items-center justify-between pl-6 pr-2">
                <div
                  onClick={() => toggleDropdown('guests')}
                  className="flex flex-col items-start py-2 cursor-pointer hover:bg-gray-100 rounded-full transition-all h-full justify-center flex-1"
                >
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t.hero.searchGuestsLabel}</span>
                  <span className="text-sm text-blue-900 font-bold truncate w-full text-left">{selectedGuests === '' ? '0' : selectedGuests}</span>
                </div>

                {activeDropdown === 'guests' && (
                  <div className="absolute top-[105%] md:top-[120%] right-0 lg:-right-4 w-[calc(100vw-40px)] md:w-64 max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-left flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Konaklayacak Kişiler</h4>
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

                <button
                  onClick={() => alert(`Arama Filtreleri:\nYer: ${selectedLocation}\nTarih: ${selectedDate ? selectedDate.toLocaleDateString(locale) : 'Belirtilmedi'}\nFiyat: ${selectedPrice}\nKişi: ${selectedGuests} Kişi`)}
                  className="mt-2 md:mt-0 md:ml-2 bg-orange-500 text-white rounded-[16px] md:rounded-full p-4 hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center h-14 md:h-12 w-full md:w-12 flex-shrink-0"
                >
                  <span className="md:hidden font-black text-[15px] uppercase tracking-wider mr-2">{t.hero.searchButton}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Smart Search Tags - Viator/GetYourGuide Trendi */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2 md:gap-3 px-4 w-full">
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider hidden sm:block">Popüler Aramalar:</span>
              {['Kapadokya Balon', 'Boğaz Turu', 'Peri Bacaları', 'Ayasofya', 'Kapadokya ATV'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedLocation(tag);
                    // alert(`${tag} aranıyor...`);
                  }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-[11px] md:text-sm font-semibold px-3 md:px-4 py-1.5 md:py-2 rounded-full cursor-pointer transition-all active:scale-95"
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
      </div >

      {/* Kategoriler Eki */}
      <div className="flex justify-center gap-3 mt-4 px-4 overflow-x-auto pb-6 no-scrollbar max-w-7xl mx-auto">
        {
          t.categories.map(cat => (
            <button key={cat} onClick={() => alert(`${cat} kategorisi turları yakında! `)} className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-6 py-2.5 text-[15px] font-semibold text-gray-700 hover:border-gray-800 transition shadow-sm hover:shadow-md cursor-pointer">
              {cat}
            </button>
          ))
        }
      </div>

      {/* 1. Neden TourScanner? (Why Book With Us) - Translated */}
      <div className="bg-white w-full py-16 border-t border-gray-100 mt-4">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 text-center">
          <div className="flex flex-col items-center group cursor-default">
            <div className="w-16 h-16 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#008cb3] group-hover:text-white transition-colors duration-300 shadow-sm"><svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg></div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2">{t.whyUs.items[0].title}</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed px-2">{t.whyUs.items[0].desc}</p>
          </div>
          <div className="flex flex-col items-center group cursor-default">
            <div className="w-16 h-16 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#008cb3] group-hover:text-white transition-colors duration-300 shadow-sm"><svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2">{t.whyUs.items[1].title}</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed px-2">{t.whyUs.items[1].desc}</p>
          </div>
          <div className="flex flex-col items-center group cursor-default">
            <div className="w-16 h-16 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#008cb3] group-hover:text-white transition-colors duration-300 shadow-sm"><svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2">{t.whyUs.items[2].title}</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed px-2">{t.whyUs.items[2].desc}</p>
          </div>
          <div className="flex flex-col items-center group cursor-default">
            <div className="w-16 h-16 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#008cb3] group-hover:text-white transition-colors duration-300 shadow-sm"><svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2">{t.whyUs.items[3].title}</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed px-2">{t.whyUs.items[3].desc}</p>
          </div>
        </div>
      </div>

      {/* 2. Popüler Destinasyonlar */}
      <div className="w-full bg-slate-50 py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-[28px] font-extrabold text-[#005e85] tracking-tight mb-8">{t.popularDestinations}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 pb-6 px-2">
            {[
              { adi: "Balon Turu", img: "https://placehold.co/600x400?text=Balon+Turu" },
              { adi: "ATV Safari", img: "https://placehold.co/600x400?text=ATV+Safari" },
              { adi: "Vadi Gezisi", img: "https://placehold.co/600x400?text=Vadi+Gezisi" },
              { adi: "Yeraltı Şehirleri", img: "https://placehold.co/600x400?text=Yeralti+Sehirleri" },
              { adi: "Çömlek Yapımı", img: "https://placehold.co/600x400?text=Comlek+Yapimi" },
              { adi: "Atlı Safari", img: "https://placehold.co/600x400?text=Atli+Safari" },
              { adi: "Klasik Araç Gezisi", img: "https://placehold.co/600x400?text=Klasik+Arac+Gezisi" },
              { adi: "Jeep Safari", img: "https://placehold.co/600x400?text=Jeep+Safari" },
              { adi: "Açık Hava Müzesi", img: "https://placehold.co/600x400?text=Acik+Hava+Muzesi" },
              { adi: "Türk Gecesi", img: "https://placehold.co/600x400?text=Turk+Gecesi" },
              { adi: "Yamaç Paraşütü", img: "https://placehold.co/600x400?text=Yamac+Parasutu" },
              { adi: "Gün Batımı Seyri", img: "https://placehold.co/600x400?text=Gun+Batimi+Seyri" }
            ].map(dest => (
              <div key={dest.adi} onClick={() => window.location.href = '/tour/kapadokya'} className="group cursor-pointer flex flex-col items-center w-full transition-transform hover:-translate-y-2 active:scale-95">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-md border-4 border-white group-hover:border-[#008cb3] transition-all">
                  <Image src={dest.img} alt={dest.adi} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <span className="mt-4 font-bold text-slate-800 text-base md:text-lg group-hover:text-[#008cb3] transition-colors text-center px-2">{dest.adi}</span>
              </div>
            ))}
          </div>
        </div>
      </div >



      {/* 4. En Çok Satan Turlar */}
      < div className="w-full bg-[#005e85] py-16 text-white" >
        <div className="max-w-7xl px-6 mx-auto">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-[28px] font-extrabold tracking-tight">{t.bestSellersTitle}</h2>
            <button className="hidden md:block font-bold text-blue-200 hover:text-white transition">&rarr;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tours.map((tur: any, i: number) => (
              <div
                key={tur.id || i}
                onClick={() => window.location.href = `/tour/${tur.id}`}
                className="bg-white text-slate-900 rounded-[24px] overflow-hidden shadow-xl hover:-translate-y-2 transition-transform duration-500 border border-gray-100 group cursor-pointer flex flex-col relative"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image src={tur.image_main || tur.imageMain} alt={tur.title || tur.ad} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <span className="absolute top-4 left-4 text-[10px] font-black text-white bg-red-600 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md animate-pulse z-10">{tur.discount ? `%${tur.discount} İNDİRİM` : 'POPÜLER'}</span>
                  <div className="absolute top-4 right-4 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <FavoriteButton tourId={tur.id} className="p-2 rounded-full !bg-white/90 hover:!bg-red-50 hover:!text-red-500 shadow-sm" />
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col relative">

                  {/* FOMO Etiketi */}
                  <div className="absolute -top-4 right-6 bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 z-10">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                    Şu an {tur.fomoCount || 12} kişi inceliyor
                  </div>

                  <span className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {tur.duration || tur.sure}
                  </span>
                  <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight group-hover:text-[#008cb3] transition-colors">{tur.title || tur.ad}</h3>
                  {tur.filmedIn && (
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 shadow-md w-max">
                      🎬 Filmed in {tur.filmedIn}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">TourScanner İşletmesi</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"><svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> +{tur.price / 10 || 240} Puan</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 mb-6 text-sm font-bold">
                    ★ ★ ★ ★ ★ <span className="text-gray-400 text-xs ml-1 font-medium">({tur.rating || tur.puan} - {tur.reviews || tur.reviews_count || 120} İnceleme)</span>
                  </div>

                  <div className="mt-auto flex justify-between items-end pt-4 border-t border-gray-100/20">
                    <div>
                      <span className="text-xs text-blue-200 font-bold uppercase block mb-1">MİN</span>
                      <div className="text-2xl font-black text-white">{formatPrice(tur.price)}</div>
                    </div>
                    <button aria-label="Tura Git" onClick={(e) => { e.stopPropagation(); window.location.href = `/tour/${tur.id}`; }} className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005e85] font-bold py-2 px-5 rounded-xl transition-colors shadow-sm">
                      ➔
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div >



      {/* 6. İstatistik Barı */}
      < div className="w-full bg-[#008cb3] py-12 text-white border-b-4 border-[#005e85]" >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/20">
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 drop-shadow-sm">1M+</div>
            <div className="text-sm md:text-base font-bold text-blue-100 uppercase tracking-widest">{t.stats.travelers}</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 drop-shadow-sm">2.5K</div>
            <div className="text-sm md:text-base font-bold text-blue-100 uppercase tracking-widest">{t.stats.guides}</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 drop-shadow-sm">150+</div>
            <div className="text-sm md:text-base font-bold text-blue-100 uppercase tracking-widest">{t.stats.destinations}</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 drop-shadow-sm">24/7</div>
            <div className="text-sm md:text-base font-bold text-blue-100 uppercase tracking-widest">{t.stats.support}</div>
          </div>
        </div>
      </div >

      {/* 7. Gerçek Müşteri Deneyimleri (Testimonials - Booking.com Tarzı Sosyal Kanıt) */}
      < div className="w-full bg-slate-50 py-20" >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[28px] font-extrabold text-[#005e85] tracking-tight mb-3">Bizimle Seyahat Edenler Ne Diyor?</h2>
            <p className="text-gray-500 font-medium">TripAdvisor ve Google'da 15.000+ mükemmel yorumla lideriz.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { isim: "Ahmet Y.", tur: "Kapadokya Turu", tarih: "2 Hafta Önce", yorum: "Balayımız için tercih etmiştik. Rehberin ilgisi, otelin kalitesi ve VIP transfer hizmeti kusursuzdu. Kesinlikle tavsiye ediyorum!", yildiz: 5 },
              { isim: "Céline D.", tur: "Mavi Yolculuk", tarih: "1 Ay Önce", yorum: "Fransa'dan geldik, rezervasyon aşamasından turun sonuna kadar TourScanner ekibi inanılmaz profesyoneldi. Yemekler harikaydı.", yildiz: 5 },
              { isim: "Burak & Ece", tur: "Klasik İtalya", tarih: "3 Ay Önce", yorum: "Uçak biletlerinden müze girişlerine kadar her şey önceden hazırdı. Sıra beklemeden Roma'yı gezmek paha biçilemezdi. Teşekkürler!", yildiz: 4 }
            ].map((yorum, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 relative">
                <div className="absolute top-6 right-6 text-[#008cb3] opacity-20">
                  <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                </div>
                <div className="flex text-yellow-500 text-sm mb-4">{'★'.repeat(yorum.yildiz)}{'☆'.repeat(5 - yorum.yildiz)}</div>
                <p className="text-slate-600 font-medium text-[14px] leading-relaxed mb-6 italic">"{yorum.yorum}"</p>
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 font-black rounded-full flex items-center justify-center text-sm">{yorum.isim.charAt(0)}</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{yorum.isim}</h4>
                    <p className="text-[11px] text-gray-500 font-semibold">{yorum.tur} <span className="mx-1">•</span> {yorum.tarih}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div >

      {/* 8. Küresel Partnerlerimiz (Güven Veren Logolar) */}
      < div className="w-full bg-white py-12 border-t border-b border-gray-100" >
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Dünyanın Öncü Markalarıyla Birlikte Uçuyoruz & Konaklıyoruz</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Sadece sembolik logolar tekst ile verildi, normalde SVG/PNG konur */}
            <span className="text-xl font-black text-slate-800 flex items-center gap-2"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2.5 19h19v2h-19v-2zm16.84-3.15c.52.26.74.89.47 1.41-.26.52-.89.74-1.41.47L2.4 9.77c-.52-.26-.74-.89-.47-1.41.26-.52.89-.74 1.41-.47l16.01 7.96zM15 11l-3-6-2 1 1 5-4.5 2L5 9l-1 .5 2 5.5-3 1.5v2l18-9-3 2z" /></svg> Turkish Airlines</span>
            <span className="text-xl font-black text-slate-800 tracking-[-1px]">HILTON</span>
            <span className="text-xl font-bold text-slate-800 tracking-wider">Qatar Airways</span>
            <span className="text-xl font-black text-slate-800 uppercase text-blue-900 border-2 border-slate-800 px-2 leading-none py-1">Booking.com</span>
            <span className="text-xl font-black text-[#FFCC00] flex items-center gap-1.5"><span className="text-red-500 text-2xl">Я</span>Yandex</span>
            <span className="text-xl font-black text-[#2932E1] tracking-wider flex items-center gap-1">Baidu<span className="text-[#E10602] font-serif text-2xl"> 百度</span></span>
          </div>
        </div>
      </div >

      {/* 9. Bülten / İletişim */}
      < div className="w-full bg-slate-100 py-16 border-t border-gray-200" >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-[28px] font-black text-slate-800 mb-4">Macerayı E-Posta Kutunuza Taşıyın</h2>
          <p className="text-gray-600 mb-8 font-medium">Bültenimize kaydolun, en yeni tur fırsatlarından ve promosyonlardan ilk siz haberdar olun!</p>
          <div className="flex flex-col md:flex-row gap-3 justify-center max-w-2xl mx-auto">
            <input type="email" placeholder="E-posta adresinizi girin" className="flex-1 px-6 py-4 rounded-full border border-gray-300 outline-none focus:border-[#008cb3] shadow-sm" />
            <button className="bg-orange-500 text-white font-bold px-10 py-4 rounded-full hover:bg-orange-600 transition-colors shadow-md">Abone Ol</button>
          </div>
        </div>
      </div >

      {/* Kapsamlı Alt Bilgi (Footer) - Tourradar Tarzı */}
      < footer className="w-full bg-[#f8f8f8] text-slate-800 pt-12 pb-24 border-t border-gray-200 mt-0" >
        <div className="max-w-[1400px] mx-auto px-6">

          {/* Üst Bar: Puan ve Logolar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 border-b border-gray-300 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">Harika</span>
                <span className="bg-[#00b67a] text-white px-1.5 py-0.5 text-xs font-bold tracking-widest flex items-center gap-0.5">
                  ★ ★ ★ ★ ★
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium">9.906 değerlendirme <span className="font-bold text-[#00b67a] ml-1">★ Trustpilot</span></div>
            </div>
          </div>

          {/* Orta Kısım: Sütunlar */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12 py-10 text-[13px] leading-[22px] border-b border-gray-300">
            {/* Sütun 1: Şirket */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Şirket</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Hakkımızda</a></li>
                <li className="flex items-center gap-2">
                  <a href="#" className="hover:text-blue-500 transition-colors">Kariyerler</a>
                  <span className="border border-blue-200 text-[#008cb3] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Hemen Başvurun!</span>
                </li>
              </ul>
            </div>

            {/* Sütun 2: Organize Macera Platformu */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Organize Macera Platformu</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Organize Macera Açıklaması</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bağlantılı iş çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Adventure Together Etkinlikleri</a></li>
              </ul>
            </div>

            {/* Sütun 3: Operatörler & Rehberler */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Operatörler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium mb-8">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Başarılı bir işletme kurun</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Ödeme çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Görünürlüğü artırın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Doğrudan rezervasyonları en üst düzeye çıkarın</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Operatör girişi</a></li>
              </ul>

              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Rehberler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yılın Rehberi</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Rehber kaydı</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Rehbere giriş yap</a></li>
              </ul>
            </div>

            {/* Sütun 4: Ortaklar */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Ortaklar</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Seyahat acenteleri ve danışmanları</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">RISE: Ortaklar ve İçerik oluşturucular</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">DMO'lar ve pazarlamacılar</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Çevrimiçi seyahat acenteleri, havayolları...</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">İş ortağı girişi</a></li>
              </ul>
            </div>

            {/* Sütun 5: Destek */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Destek</h4>
              <ul className="flex flex-col gap-3 text-gray-600 font-medium text-[13px]">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bize Ulaşın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yardım merkezi</a></li>
                <li className="text-gray-900 mt-2">Türkiye <a href="#" className="hover:text-blue-500 block text-gray-500">+90 850 123 45 67</a></li>
              </ul>
            </div>
          </div>

          {/* Yeni: Güncel Kurlar Barı */}
          <div className="py-6 mt-8 border-t border-b border-gray-100 mb-8">
            <h4 className="font-bold text-[12px] uppercase tracking-widest text-[#008cb3] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Canlı Kur Referansları (₺)
            </h4>
            <div className="flex flex-wrap gap-4 md:gap-8 overflow-x-auto pb-2 scrollbar-hide">
              {liveRates.map((kur) => (
                <div key={kur.birim} className="flex flex-col flex-shrink-0 group cursor-default">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[14px]">
                    <span className="text-sm">{kur.ikon}</span>
                    {kur.birim} <span className="text-gray-400 text-xs font-medium mx-0.5">=</span>
                    <span className={`transition-colors duration-500 ${rateColors[kur.birim] || 'text-[#005e85]'}`}>
                      ₺{kur.karsilik.toFixed(3)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">{kur.isim}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alt Kısım: Dil, Sosyal, Ödeme ve Uygulama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">

            {/* Dil Seçimi (Top 10 Dünya Dili) */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Otomatik Çeviri (Beta)</h4>
              <div className="flex gap-2 text-[10px] font-black text-slate-700 flex-wrap max-w-[280px]">
                {[
                  { code: 'tr', label: 'TR', title: 'Türkçe' },
                  { code: 'en', label: 'EN', title: 'İngilizce' },
                  { code: 'zh-CN', label: 'ZH', title: 'Çince' },
                  { code: 'hi', label: 'HI', title: 'Hintçe' },
                  { code: 'es', label: 'ES', title: 'İspanyolca' },
                  { code: 'fr', label: 'FR', title: 'Fransızca' },
                  { code: 'ar', label: 'AR', title: 'Arapça' },
                  { code: 'bn', label: 'BN', title: 'Bengalce' },
                  { code: 'ru', label: 'RU', title: 'Rusça' },
                  { code: 'pt', label: 'PT', title: 'Portekizce' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    title={lang.title}
                    onClick={() => {
                      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                      if (select) {
                        select.value = lang.code;
                        select.dispatchEvent(new Event('change'));
                      } else {
                        alert('Çeviri sistemi yükleniyor, lütfen birkaç saniye bekleyip tekrar deneyin.');
                      }
                    }}
                    className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:border-[#008cb3] hover:text-[#008cb3] hover:bg-slate-50 transition-all shadow-sm"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bizi Takip Edin (Sosyal Medya) */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Bizi takip edin</h4>
              <div className="flex gap-4 text-gray-600 border-none items-center mt-2">
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="Facebook">f</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="X (Twitter)">𝕏</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="Instagram">ℹ</span>
                <span className="font-black hover:text-[#2787F5] cursor-pointer text-xl" title="VKontakte">K</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="WeChat (Weixin)">💬</span>
                <span className="font-black hover:text-[#e6162d] cursor-pointer text-xl" title="Sina Weibo">Ⓦ</span>
              </div>
            </div>

            {/* Ödeme Yöntemleri */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Ödeme Yöntemleri</h4>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-blue-800 font-black italic text-[10px]">VISA</span>
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-red-500 font-bold text-[10px]">mastercard</span>
                <span className="bg-[#009b4d] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px] italic">MİR</span>
                <span className="bg-white border border-gray-200 rounded px-2 py-0.5 text-[#003C7A] font-bold text-[10px] uppercase">UnionPay</span>
                <span className="bg-[#2DC100] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px]">WeChat Pay</span>
                <span className="bg-[#1677FF] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px]">Alipay</span>
              </div>
            </div>

            {/* Uygulamamızı İndirin */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Uygulamamızı İndirin</h4>
              <div className="flex gap-2 flex-col lg:flex-row">
                <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition w-auto">
                  <span className="font-black text-xs text-left leading-tight tracking-wider">Download on the <br /> <span className="text-sm">App Store</span></span>
                </button>
                <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition w-auto">
                  <span className="font-black text-xs text-left leading-tight tracking-wider">GET IT ON <br /> <span className="text-sm">Google Play</span></span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </footer >

      {/* Yüzen Çoklu Mesajlaşma (Contact) Menüsü */}
      < FloatingContactMenu />

      {/* Müşteri Giriş Yap / Üye Ol Modalı */}
      {
        showLoginModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm px-4"
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
                className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 p-2.5 rounded-full z-10"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Sekmeler (Tabs) Sadece Doğrulama Aşamasında Değilse Göster */}
              {!isVerifyingEmail && (
                <div className="flex w-full bg-slate-50 pt-2 px-6">
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

                      } else {
                        alert('Giriş yapmak için üst menüdeki Giriş Yap butonuna basınız.');
                        setShowLoginModal(false);
                        setShowLoginModal(false);
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
                        {loginTab === 'login' ? 'Giriş Yap' : (isLoading ? 'Kod Gönderiliyor...' : <>Üye Ol ve Doğrula <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>)}
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
            className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm px-4"
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
                className="absolute top-5 right-5 text-gray-300 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-2.5 rounded-full z-10 backdrop-blur-sm"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Şık Acenta Banner */}
              <div className="bg-gradient-to-r from-orange-400 to-orange-500 pt-8 pb-6 px-8 text-white relative overflow-hidden">
                <svg className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4" width="120" height="120" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <h2 className="text-2xl font-black relative z-10 leading-tight">
                  Turlarınızı Dünyayla <br /> Buluşturun!
                </h2>
                <p className="text-orange-50 text-xs font-medium mt-2 relative z-10">TourScanner İş Ortaklığı Yönetim Paneli</p>
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
              <div className="p-7 max-h-[60vh] overflow-y-auto no-scrollbar">

                {/* Login & Register Sekmeleri */}
                {(agencyTab === 'login' || agencyTab === 'register') && (
                  <form className="flex flex-col gap-4" onSubmit={(e) => {
                    e.preventDefault();
                    if (agencyTab === 'login') {
                      setShowAgencyModal(false);
                      window.location.href = '/login'; // Forward to the real login page
                      window.location.href = '/agency/dashboard'; // Acenta Dashboard Yönlendirmesi
                    } else {
                      alert('Acentelik başvurunuz alınmıştır.');
                      setShowAgencyModal(false);
                    }
                  }}>
                    {agencyTab === 'register' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Firma Adı (Unvan)</label>
                          <input type="text" placeholder="Örn: X Turizm LTD. ŞTİ." className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">TURSAB Belge No</label>
                          <input type="text" placeholder="Örn: 12345" className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kurumsal E-Posta</label>
                      <input type="email" placeholder="iletisim@firmaniz.com" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şifre</label>
                        {agencyTab === 'login' && <a href="#" className="text-xs text-orange-500 hover:underline font-bold mr-1">Şifremi Unuttum?</a>}
                      </div>
                      <input type="password" placeholder="••••••••" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[15px] font-medium placeholder-gray-400" />
                    </div>

                    <button className="w-full bg-orange-500 text-white font-black text-[15px] py-4 rounded-2xl mt-4 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30 hover:shadow-xl active:scale-[0.98] duration-200">
                      {agencyTab === 'login' ? 'Yönetim Paneline Gir' : 'Acentelik Başvurusu Yap'}
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
            className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center backdrop-blur-md px-4"
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
                className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 p-2.5 rounded-full z-20 shadow-sm"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Fiş/Özet Header */}
              <div className="bg-slate-50 pt-8 pb-6 px-8 relative border-b border-gray-100">
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
                    <input type="text" maxLength={19} placeholder="0000 0000 0000 0000" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 tracking-wider" />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Son KULL. TA.</label>
                      <input type="text" maxLength={5} placeholder="AA/YY" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 text-center" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">CVV/CVC</label>
                      <input type="password" maxLength={3} placeholder="•••" className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-[#008cb3] outline-none transition bg-slate-50 focus:bg-white text-[15px] font-mono font-medium placeholder-gray-400 text-center tracking-widest" />
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
    </main >
  );
}