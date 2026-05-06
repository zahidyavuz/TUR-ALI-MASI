
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, Locale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import CurrencySelector from './CurrencySelector';
import GeofenceTrigger from './GeofenceTrigger';
import NotificationCenter from './NotificationCenter';
import { useRouter } from 'next/navigation';

export default function Navbar({ setShowAgencyModal, setAgencyTab }: { setShowAgencyModal?: (val: boolean) => void, setAgencyTab?: (val: 'login' | 'register') => void }) {
  const { t, locale, setLocale } = useLocale();
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  
  const role = user?.role?.toLowerCase() || '';
  const isAdmin = user?.username === 'yavuz50' || user?.is_staff || role === 'superadmin' || role === 'admin';
  const isAgency = user?.is_agency || role === 'merchant' || role === 'agency' || role === 'merchant/agency';
  let userRole = 'customer';
  if (isAdmin) userRole = 'admin';
  else if (isAgency) userRole = 'agency';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();

  const toggleDropdown = (dropdownName: string) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  const handleAgencyLogin = () => {
    if (setShowAgencyModal && setAgencyTab) {
      setShowAgencyModal(true);
      setAgencyTab('login');
    } else {
      router.push('/?showAgencyModal=true&tab=login');
    }
    setActiveDropdown(null);
  };

  return (
    <>
      {/* Üst Bar: Trustpilot, Destek vb. */}
      <div className="w-full bg-slate-50 border-b border-gray-200 py-2 px-8 hidden md:flex justify-center gap-12 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> 2.500 işletmeci</span>
        <span className="flex items-center gap-2">4,6 yıldız <span className="text-green-600 font-bold flex items-center gap-1"><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Trustpilot</span> <span className="text-gray-400 font-normal">(9.906 değerlendirme)</span></span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 7/24 müşteri desteği</span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Ücretsiz eSIM</span>
      </div>

      {/* Navbar: Ana Menü */}
      <nav className="w-full bg-white py-3 px-4 md:py-5 md:px-8 flex justify-between items-center sticky top-0 z-[99999] border-b border-gray-100 shadow-sm md:shadow-none">
        <Link href="/" className="text-3xl md:text-[40px] font-extrabold text-[#008cb3] tracking-tighter">
          Tour<span className="text-[#005e85]">kia</span>
        </Link>

        {isLoggedIn && userRole === 'customer' && (
          <div className="hidden lg:flex gap-6 font-semibold text-gray-700 text-[14px] ml-8 flex-1">
            <Link href="/profile/goals" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#008cb3] cursor-pointer transition-colors">{t.nav.destinations}</Link>
            <Link href="/taste" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#008cb3] cursor-pointer transition-colors">{t.nav.taste}</Link>
            <Link href="/profile/styles" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#008cb3] cursor-pointer transition-colors">{t.nav.styles}</Link>
            <Link href="/profile/memories" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#008cb3] cursor-pointer transition-colors">{t.nav.memories}</Link>
          </div>
        )}

        <div className="flex items-center justify-end w-full md:w-auto gap-4 md:gap-5">
          {/* Mobil Hamburger Butonu */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex lg:hidden items-center justify-center text-gray-600 hover:text-[#008cb3] w-10 h-10 rounded-full hover:bg-gray-50 transition cursor-pointer" 
            aria-label="Mobil Menüyü Aç"
          >
            <svg className="pointer-events-none" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Para Birimi Değiştirici */}
          <div className="block">
            <CurrencySelector />
          </div>

          {/* Dil Değiştirici */}
          <select
            value={locale}
            aria-label="Dil / Lokasyon Seçimi"
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="block h-10 bg-white border text-sm font-bold border-gray-200 text-gray-700 px-3 rounded-full outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm cursor-pointer appearance-none pr-8 relative hover:bg-gray-50 transition"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
          >
            <option value="tr-TR">🇹🇷 TR</option>
            <option value="en-US">🇺🇸 EN</option>
            <option value="de-DE">🇩🇪 DE</option>
            <option value="zh-CN">🇨🇳 CN</option>
            <option value="ar-SA">🇸🇦 AR</option>
            <option value="es-ES">🇪🇸 ES</option>
            <option value="fr-FR">🇫🇷 FR</option>
          </select>

          {/* Yakınımdaki turlar (Geofencing) */}
          <GeofenceTrigger compact className="hidden sm:flex" />

          {/* Favoriler Butonu ve Dropdown */}
          <div className="hidden md:flex relative items-center justify-center dropdown-container" data-dropdown="favorites">
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
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG" alt="Kapadokya" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                      </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-[13px] text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight">Kapadokya Balon Turu</h5>
                      <span className="text-[11px] font-semibold text-red-500">₺2.400</span>
                    </div>
                  </div>
                    <div className="flex gap-3 items-center group cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition">
                      <div className="relative w-12 h-12 shrink-0">
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Atv_tour_in_Cappadocia.jpg" alt="ATV" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-[13px] text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight">Kapadokya ATV Turu</h5>
                        <span className="text-[11px] font-semibold text-red-500">₺800</span>
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
          <div className="hidden md:block">
            <NotificationCenter />
          </div>

          <div className="hidden md:flex relative dropdown-container items-center justify-center" data-dropdown="userMenu">
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

                {/* Hesabım Bölümü Sadece Müşteriler İçin (Eski Sekmeler) */}
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

                    <button
                      onClick={() => { window.location.href = '/profile/cards'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        Ödeme Kartlarım
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/profile/reviews'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Yorumlarım
                      </span>
                    </button>

                    <div className="border-t border-gray-100/50 my-1"></div>

                    <div className="px-5 py-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Müşteri Paneli</h4>
                    </div>

                    <button
                      onClick={() => { window.location.href = '/profile/goals'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <span className="text-lg">📍</span>
                        {t.nav.destinations}
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/taste'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <span className="text-lg">🍽️</span>
                        {t.nav.taste}
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/profile/styles'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <span className="text-lg">🎨</span>
                        {t.nav.styles}
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/profile/memories'; setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <span className="text-lg">✨</span>
                        {t.nav.memories}
                      </span>
                    </button>
                  </>
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
                      onClick={() => { handleAgencyLogin(); setActiveDropdown(null); }}
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

      {/* Mobil Menü Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 w-[80%] max-w-[320px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
              <span className="text-2xl font-black text-[#008cb3]">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
                {/* Giriş Yapmış Kullanıcı İçin Özel Menü */}
                {isLoggedIn && userRole === 'customer' && (
                  <>
                    <div className="mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hesabım</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/profile" className="px-4 py-3 rounded-2xl bg-slate-50 text-slate-800 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">👤</span> Profilimi Düzenle
                        </Link>
                        <Link href="/bookings" className="px-4 py-3 rounded-2xl bg-slate-50 text-slate-800 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🎫</span> Biletlerim & Siparişler
                        </Link>
                        <Link href="/profile/cards" className="px-4 py-3 rounded-2xl bg-slate-50 text-slate-800 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">💳</span> Ödeme Kartlarım
                        </Link>
                        <Link href="/profile/reviews" className="px-4 py-3 rounded-2xl bg-slate-50 text-slate-800 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">💬</span> Yorumlarım
                        </Link>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Müşteri Paneli</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/profile/goals" className="px-4 py-3 rounded-2xl bg-blue-50 text-[#008cb3] font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">📍</span> {t.nav.destinations}
                        </Link>
                        <Link href="/taste" className="px-4 py-3 rounded-2xl bg-orange-50 text-orange-600 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🍽️</span> {t.nav.taste}
                        </Link>
                        <Link href="/profile/styles" className="px-4 py-3 rounded-2xl bg-purple-50 text-purple-600 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🎨</span> {t.nav.styles}
                        </Link>
                        <Link href="/profile/memories" className="px-4 py-3 rounded-2xl bg-pink-50 text-pink-600 font-bold flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">✨</span> {t.nav.memories}
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {!isLoggedIn && (
                  <>
                    {/* Normal kullanıcılar için buraya genel linkler gelebilir, şimdilik müşteri panelini kaldırdık */}
                    <Link href="/" className="px-4 py-4 rounded-2xl bg-slate-50 text-slate-800 font-bold hover:bg-blue-50 hover:text-blue-500 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Ana Sayfa</Link>
                  </>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Site Ayarları</p>
                    <div className="flex items-center gap-3">
                        <CurrencySelector />
                        <select
                            value={locale}
                            aria-label="Dil / Lokasyon Seçimi"
                            onChange={(e) => setLocale(e.target.value as Locale)}
                            className="h-10 flex-1 bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 px-3 rounded-full outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm cursor-pointer appearance-none pr-8 relative transition"
                            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                        >
                            <option value="tr-TR">🇹🇷 TR</option>
                            <option value="en-US">🇺🇸 EN</option>
                            <option value="de-DE">🇩🇪 DE</option>
                            <option value="zh-CN">🇨🇳 CN</option>
                            <option value="ar-SA">🇸🇦 AR</option>
                            <option value="es-ES">🇪🇸 ES</option>
                            <option value="fr-FR">🇫🇷 FR</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Uygulamalarımızı İndirin</p>
                <div className="flex gap-3">
                    <div className="flex-1 h-10 bg-black rounded-lg flex items-center justify-center text-white text-[10px] font-bold">App Store</div>
                    <div className="flex-1 h-10 bg-black rounded-lg flex items-center justify-center text-white text-[10px] font-bold">Play Store</div>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
