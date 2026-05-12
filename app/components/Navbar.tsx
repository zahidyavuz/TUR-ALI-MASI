
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
        <span className="flex items-center gap-2">4,6 yıldız <span className="text-green-600 font-bold flex items-center gap-1"><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Trustpilot</span></span>
        <span className="flex items-center gap-2"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 7/24 müşteri desteği</span>
      </div>

      {/* Navbar: Ana Menü */}
      <nav className="w-full bg-white dark:bg-slate-900 py-3 px-4 md:py-5 md:px-8 flex justify-between items-center sticky top-0 z-[99999] border-b border-gray-100 dark:border-slate-800 shadow-sm md:shadow-none transition-colors duration-500">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-3xl md:text-[40px] font-extrabold text-[#008cb3] tracking-tighter transition-colors">
            Tour<span className="text-[#005e85] dark:text-blue-400">kia</span>
          </Link>

          {/* Ana Navigasyon Linkleri - Main Concepts */}
          <div className="hidden lg:flex items-center gap-2 ml-8">
            <Link 
              href="/search" 
              className="group flex items-center gap-3 px-6 py-3 rounded-2xl text-[17px] font-black text-slate-800 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-[#008cb3] dark:hover:text-blue-400 transition-all duration-300 relative overflow-hidden"
            >
              <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🌍</span>
              <span className="tracking-tight uppercase">Turlar</span>
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-[#008cb3] group-hover:with-full group-hover:w-full transition-all duration-500"></div>
            </Link>

            <Link 
              href="/taste" 
              className="group flex items-center gap-3 px-6 py-3 rounded-2xl text-[17px] font-black text-slate-800 dark:text-white hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-300 relative overflow-hidden whitespace-nowrap"
            >
              <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🍽️</span>
              <span className="tracking-tight uppercase">Lezzet Durakları</span>
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-orange-500 group-hover:w-full transition-all duration-500"></div>
            </Link>
          </div>

        </div>


        <div className="flex items-center justify-end w-full md:w-auto gap-4 md:gap-5">
          {/* Mobil Hamburger Butonu */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex lg:hidden items-center justify-center text-gray-600 hover:text-[#008cb3] w-10 h-10 rounded-full hover:bg-gray-50 transition cursor-pointer" 
            aria-label="Mobil Menüyü Aç"
          >
            <svg className="pointer-events-none" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Tema Değiştirici ve Uygulama Butonları Grubu */}
          <div className="flex items-center gap-6">
            {/* App Store & Google Play Badges (Sol Taraf) */}
            <div className="hidden xl:flex items-center gap-3 pr-6 border-r border-gray-100 dark:border-slate-800">
              <a href="#" className="bg-black hover:bg-slate-800 text-white rounded-xl px-4 py-2 flex items-center gap-3 transition-all active:scale-95 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .76-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91 1.65.07 2.93.67 3.73 1.84-3.27 1.93-2.73 6.13.56 7.63-.58 1.45-1.31 2.89-2.2 4.19zM15.17 6.69c-.73.89-1.95 1.51-3.14 1.42-.13-1.18.41-2.42 1.13-3.26.73-.86 2-1.5 3.12-1.42.14 1.23-.39 2.37-1.11 3.26z"/></svg>
                <div className="flex flex-col leading-none text-white">
                  <span className="text-[8px] uppercase font-bold opacity-60">Store</span>
                  <span className="text-[12px] font-black">App</span>
                </div>
              </a>
              <a href="#" className="bg-black hover:bg-slate-800 text-white rounded-xl px-4 py-2 flex items-center gap-3 transition-all active:scale-95 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.61,3,21.09,3,20.5M16.81,15.12L18.81,16.27C19.46,16.64,19.46,17.36,18.81,17.73L4.82,25.74L14.7,15.86L16.81,15.12M14.7,8.14L4.82,18.26L18.81,26.27C19.46,26.64,19.46,27.36,18.81,27.73L16.81,28.88L14.7,8.14M16.81,8.88L14.7,6.14L18.81,4.27C19.46,3.9,19.46,3.18,18.81,2.81L16.81,1.73L14.7,8.88Z" transform="scale(0.8) translate(3,3)"/></svg>
                <div className="flex flex-col leading-none text-white">
                  <span className="text-[8px] uppercase font-bold opacity-60">Play</span>
                  <span className="text-[12px] font-black">Google</span>
                </div>
              </a>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Tema Değiştir"
              className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-500 hover:rotate-12 hover:scale-110 active:scale-95 cursor-pointer bg-black dark:bg-yellow-400 text-white dark:text-black shadow-xl"
            >
              {theme === 'light' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="animate-in fade-in zoom-in duration-300">
                  <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,11.69,1,1,0,0,0,21.64,13Z"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="animate-in fade-in spin-in-180 duration-500">
                  <path d="M12,7a5,5,0,1,0,5,5A5,5,0,0,0,12,7Zm0,8a3,3,0,1,1,3-3A3,3,0,0,1,12,15Zm0-9a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V5A1,1,0,0,0,12,6Zm0,12a1,1,0,0,0-1,1v2a1,1,0,0,0,2,0V19A1,1,0,0,0,12,18ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41L5.64,4.22A1,1,0,0,0,4.22,5.64ZM18.36,17a1,1,0,0,0-.71.29,1,1,0,0,0,0,1.41l1.42,1.42a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM21,11H19a1,1,0,0,0,0,2h2a1,1,0,0,0,0-2ZM5,11H3a1,1,0,0,0,0,2H5a1,1,0,0,0,0-2Zm13.36-5.36a1,1,0,0,0-1.41-1.41L15.54,5.64a1,1,0,0,0,0,1.41,1,1,0,0,0,.71.29,1,1,0,0,0,.7-.29ZM7.05,18.36a1,1,0,0,0-1.41,0L4.22,19.78a1,1,0,0,0,0,1.41,1,1,0,0,0,.71.29,1,1,0,0,0,.7-.29l1.42-1.42A1,1,0,0,0,7.05,18.36Z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Yakınımdaki turlar (Geofencing) */}

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
              <div className="absolute right-0 top-[120%] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-4 z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-slate-800 dark:text-white text-[15px]">Favorilediklerim</h4>
                  <span className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">2 Tur</span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Örnek Favori 1 */}
                  <div className="flex gap-3 items-center group cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                      <div className="relative w-12 h-12 shrink-0">
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG" alt="Kapadokya" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                      </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-[13px] text-slate-800 dark:text-white group-hover:text-[#008cb3] transition-colors leading-tight">Kapadokya Balon Turu</h5>
                      <span className="text-[11px] font-semibold text-red-500">₺2.400</span>
                    </div>
                  </div>
                    <div className="flex gap-3 items-center group cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                      <div className="relative w-12 h-12 shrink-0">
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Atv_tour_in_Cappadocia.jpg" alt="ATV" fill sizes="48px" className="rounded-lg object-cover shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-[13px] text-slate-800 dark:text-white group-hover:text-[#008cb3] transition-colors leading-tight">Kapadokya ATV Turu</h5>
                        <span className="text-[11px] font-semibold text-red-500">₺800</span>
                      </div>
                    </div>
                </div>

                <button className="w-full mt-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer" onClick={() => setActiveDropdown(null)}>
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
            {isLoggedIn ? (
              <button
                onClick={() => toggleDropdown('userMenu')}
                aria-label="Profil Menüsü"
                className={`transition rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-[#008cb3] to-blue-400 text-white font-black text-sm shadow-md cursor-pointer relative z-10 hover:shadow-lg hover:scale-105 ${activeDropdown === 'userMenu' ? 'ring-2 ring-offset-2 ring-[#008cb3]' : ''}`}
              >
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'ME'}
              </button>
            ) : (
              <button
                onClick={() => toggleDropdown('userMenu')}
                aria-label="Kullanıcı Menüsü"
                className={`transition rounded-full border-[1.5px] w-10 h-10 flex items-center justify-center bg-white cursor-pointer relative z-10 ${activeDropdown === 'userMenu' ? 'border-[#008cb3] text-[#008cb3] bg-blue-50' : 'border-gray-300 text-gray-600 hover:text-blue-500 hover:border-[#008cb3] hover:bg-gray-50'}`}
              >
                <svg className="pointer-events-none w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
              </button>
            )}

            {/* Kullanıcı / Acenta Girişi Dropdown */}
            {activeDropdown === 'userMenu' && (
              <div className="absolute right-0 top-[120%] w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 py-3 z-[60] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                
                {isLoggedIn ? (
                  <div className="flex flex-col py-1">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 mb-2">
                      <p className="font-black text-slate-800 dark:text-white text-[15px]">{user?.username || 'Kullanıcı'}</p>
                      <p className="text-xs font-semibold text-gray-500">
                        {userRole === 'admin' ? 'Sistem Yöneticisi' : userRole === 'agency' ? 'İşletme Hesabı' : 'Müşteri Hesabı'}
                      </p>
                    </div>
                    
                    <button onClick={() => { router.push('/profile'); setActiveDropdown(null); }} className="w-full px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-3 transition-colors cursor-pointer group">
                      <span className="text-lg">👤</span> Profilim
                    </button>
                    <button onClick={() => { router.push('/tickets'); setActiveDropdown(null); }} className="w-full px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-3 transition-colors cursor-pointer group">
                      <span className="text-lg">🎟️</span> Biletlerim & QR Cüzdan
                    </button>
                    <button onClick={() => { router.push('/favorites'); setActiveDropdown(null); }} className="w-full px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-3 transition-colors cursor-pointer group">
                      <span className="text-lg">❤️</span> Favorilerim
                    </button>
                    <button onClick={() => { router.push('/profile'); setActiveDropdown(null); }} className="w-full px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-3 transition-colors cursor-pointer group">
                      <span className="text-lg">💳</span> Kayıtlı Kartlarım
                    </button>
                    <button onClick={() => { router.push('/profile'); setActiveDropdown(null); }} className="w-full px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-3 transition-colors cursor-pointer group">
                      <span className="text-lg">⚙️</span> Ayarlar
                    </button>

                    <div className="border-t border-gray-100 dark:border-slate-800 my-1.5"></div>
                    
                    <button
                      onClick={() => { logout(); setActiveDropdown(null); window.location.href = '/'; }}
                      className="w-full px-5 py-2.5 text-[14px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="text-lg">🚪</span> Çıkış Yap
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => { window.location.href = '/login'; setActiveDropdown(null); }}
                      className="w-full px-6 py-4 text-[14px] font-black text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#008cb3] dark:hover:text-blue-400 text-left flex items-center gap-4 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-4 pointer-events-none">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {t.nav.customerLogin}
                      </span>
                    </button>
                    <button
                      onClick={() => { handleAgencyLogin(); setActiveDropdown(null); }}
                      className="w-full px-6 py-4 text-[14px] font-black text-gray-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-500 dark:hover:text-orange-400 text-left flex items-center gap-4 transition-colors cursor-pointer group"
                    >
                      <span className="flex-1 flex items-center gap-4 pointer-events-none">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        {t.nav.agencyLogin}
                      </span>
                    </button>
                  </div>
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
                {/* GLOBAL CLEANUP: Eski paneller silindi. Sadece Ana Sayfa linki bırakıldı. */}
                {isLoggedIn && (
                  <div className="mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col gap-2">
                       <span className="text-xs font-bold text-gray-500 text-center">Hesabınıza giriş yapıldı.</span>
                    </div>
                  </div>
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
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">Uygulamalarımızı İndirin</p>
                <div className="flex gap-3">
                    <div className="flex-1 h-10 bg-black dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-[10px] font-bold border border-slate-700/0 dark:border-slate-700">App Store</div>
                    <div className="flex-1 h-10 bg-black dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-[10px] font-bold border border-slate-700/0 dark:border-slate-700">Play Store</div>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
