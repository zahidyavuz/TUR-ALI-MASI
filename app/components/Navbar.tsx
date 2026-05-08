
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
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ setShowAgencyModal, setAgencyTab }: { setShowAgencyModal?: (val: boolean) => void, setAgencyTab?: (val: 'login' | 'register') => void }) {
  const { t, locale, setLocale } = useLocale();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 py-2 px-8 hidden md:flex justify-center gap-12 text-xs font-semibold text-gray-500 dark:text-slate-400 transition-colors duration-500">
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> 2.500 işletmeci</span>
        <span className="flex items-center gap-2">4,6 yıldız <span className="text-green-600 font-bold flex items-center gap-1"><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Trustpilot</span> <span className="text-gray-400 font-normal dark:text-slate-500">(9.906 değerlendirme)</span></span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 7/24 müşteri desteği</span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Ücretsiz eSIM</span>
      </div>

      {/* Navbar: Ana Menü */}
      <nav className="w-full bg-white dark:bg-slate-900 py-3 px-4 md:py-5 md:px-8 flex justify-between items-center sticky top-0 z-[99999] border-b border-gray-100 dark:border-slate-800 shadow-sm md:shadow-none transition-colors duration-500">
        <Link href="/" className="text-3xl md:text-[40px] font-extrabold text-[#008cb3] tracking-tighter">
          Tour<span className="text-[#005e85] dark:text-blue-400">kia</span>
        </Link>

        {isLoggedIn && userRole === 'customer' && (
          <div className="hidden lg:flex gap-6 font-semibold text-gray-700 dark:text-slate-300 text-[14px] ml-8 flex-1 transition-colors duration-500">
            <Link href="/profile/goals" className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 cursor-pointer transition-all">{t.nav.destinations}</Link>
            <Link href="/taste" className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 cursor-pointer transition-all">{t.nav.taste}</Link>
            <Link href="/profile/styles" className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 cursor-pointer transition-all">{t.nav.styles}</Link>
            <Link href="/profile/memories" className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 cursor-pointer transition-all">{t.nav.memories}</Link>
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

          {/* Tema Değiştirici (Theme Toggle) */}
          <button
            onClick={toggleTheme}
            aria-label="Tema Değiştir"
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 hover:rotate-12 hover:scale-110 active:scale-95 cursor-pointer bg-slate-50 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]"
          >
            {theme === 'light' ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-in fade-in zoom-in duration-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            ) : (
              <svg width="22" height="22" fill="currentColor" className="text-yellow-400 animate-in fade-in spin-in-180 duration-500">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.122-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.122 10.607a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" />
              </svg>
            )}
          </button>

          {/* Dil Değiştirici */}
          <select
            value={locale}
            aria-label="Dil / Lokasyon Seçimi"
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="block h-10 bg-white dark:bg-slate-800 border text-sm font-bold border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 px-3 rounded-full outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm cursor-pointer appearance-none pr-8 relative hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-500"
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
              className={`transition-all duration-500 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer relative z-10 ${activeDropdown === 'favorites' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-600 dark:text-slate-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
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

                {/* Müşteri Araçları */}
                {isLoggedIn && userRole === 'customer' && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => { window.location.href = '/profile'; setActiveDropdown(null); }}
                      className="w-full px-5 py-3 text-[14px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a4 4 0 00-8 0v3h8v-3z" /></svg>
                        Profilim ve Ayarlar
                      </span>
                    </button>

                    <button
                      onClick={() => { window.location.href = '/bookings'; setActiveDropdown(null); }}
                      className="w-full px-5 py-3 text-[14px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"></path><path d="M18 12h4"></path></svg>
                        Biletlerim ve QR Cüzdan
                      </span>
                    </button>

                    <button
                      onClick={() => { setActiveDropdown(null); toggleDropdown('favorites'); }}
                      className="w-full px-5 py-3 text-[14px] font-bold text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        Favori Turlarım
                      </span>
                    </button>
                  </div>
                )}

                {/* Sadece Acentalar İçin */}
                {isLoggedIn && userRole === 'agency' && (
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
                      onClick={() => { setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Yüklediğim Turlar
                      </span>
                    </button>
                    <button 
                      onClick={() => { setActiveDropdown(null); }}
                      className="w-full px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-3 pointer-events-none">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Kazançlarım ve Cüzdan
                      </span>
                    </button>
                  </>
                )}

                {/* Giriş Linkleri Sadece Giriş Yapılmamışsa Gözüksün */}
                {!isLoggedIn && (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => { window.location.href = '/login'; setActiveDropdown(null); }}
                      className="w-full px-6 py-4 text-[14px] font-black text-gray-700 hover:bg-slate-50 hover:text-[#008cb3] text-left flex items-center gap-4 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-4 pointer-events-none">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {t.nav.customerLogin}
                      </span>
                    </button>
                    <button
                      onClick={() => { handleAgencyLogin(); setActiveDropdown(null); }}
                      className="w-full px-6 py-4 text-[14px] font-black text-gray-700 hover:bg-orange-50 hover:text-orange-500 text-left flex items-center gap-4 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-4 pointer-events-none">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        {t.nav.agencyLogin}
                      </span>
                    </button>
                  </div>
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
          <div className="absolute top-0 right-0 w-[80%] max-w-[320px] h-full bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col transition-colors duration-500">
            <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-slate-800">
              <span className="text-2xl font-black text-[#008cb3]">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
                {/* Giriş Yapmış Kullanıcı İçin Özel Menü */}
                {isLoggedIn && userRole === 'customer' && (
                  <>
                    <div className="mb-2">
                      <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Hesabım</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/profile" className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">👤</span> Profilimi Düzenle
                        </Link>
                        <Link href="/bookings" className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🎫</span> Biletlerim & Siparişler
                        </Link>
                        <Link href="/profile/cards" className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">💳</span> Ödeme Kartlarım
                        </Link>
                        <Link href="/profile/reviews" className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">💬</span> Yorumlarım
                        </Link>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Müşteri Paneli</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/profile/goals" className="px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-[#008cb3] dark:text-blue-400 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">📍</span> {t.nav.destinations}
                        </Link>
                        <Link href="/taste" className="px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🍽️</span> {t.nav.taste}
                        </Link>
                        <Link href="/profile/styles" className="px-4 py-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">🎨</span> {t.nav.styles}
                        </Link>
                        <Link href="/profile/memories" className="px-4 py-3 rounded-2xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold flex items-center gap-3 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <span className="text-xl">✨</span> {t.nav.memories}
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {!isLoggedIn && (
                  <>
                    <Link href="/" className="px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-500 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Ana Sayfa</Link>
                  </>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Site Ayarları</p>
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
