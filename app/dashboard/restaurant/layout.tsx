'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Genel Bakış', path: '/dashboard/restaurant', icon: '📈' },
    { name: 'Menülerim', path: '/dashboard/restaurant/products', icon: '🍽️' },
    { name: 'Kota Yönetimi', path: '/dashboard/restaurant/availability', icon: '🕒' },
    { name: 'QR Sipariş Tarama', path: '/dashboard/restaurant/scanner', icon: '📷' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-red-100 dark:border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white">Restoran Paneli</h1>
            <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Turkia Business</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
          {user?.username?.charAt(0).toUpperCase() || 'R'}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar & Mobile Hamburger Content */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-red-100 dark:border-slate-800 flex-col overflow-y-auto shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 md:flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">İşletme Merkezi</h2>
          <p className="text-xs text-red-500 font-bold mt-1 uppercase tracking-wider">{user?.username || 'Restoran'}</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${isActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-white'}`}
              >
                <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
                <span className="text-[14px]">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation with Massive Scanner Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 px-6 py-2 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)] h-16">
        <Link href="/dashboard/restaurant" className={`flex flex-col items-center gap-1 p-2 transition-colors ${pathname === '/dashboard/restaurant' ? 'text-red-500' : 'text-gray-400'}`}>
          <div className="text-xl">📈</div>
          <span className="text-[10px] font-bold tracking-tight">Ana Ekran</span>
        </Link>

        {/* Devasa Tarayıcı Butonu (Floating Action Button) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <Link href="/dashboard/restaurant/scanner">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-500/40 border-4 border-slate-50 dark:border-slate-950 transition-transform active:scale-95 ${pathname === '/dashboard/restaurant/scanner' ? 'bg-red-600 scale-110' : 'bg-red-500 hover:bg-red-600'}`}>
              <span className="text-2xl animate-pulse">📷</span>
            </div>
          </Link>
        </div>

        <Link href="/dashboard/restaurant/products" className={`flex flex-col items-center gap-1 p-2 transition-colors ${pathname === '/dashboard/restaurant/products' ? 'text-red-500' : 'text-gray-400'}`}>
          <div className="text-xl">🍽️</div>
          <span className="text-[10px] font-bold tracking-tight">Menüler</span>
        </Link>
      </div>
    </div>
  );
}
