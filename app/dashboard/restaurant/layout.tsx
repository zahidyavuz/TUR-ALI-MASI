'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const role = user?.role?.toLowerCase() || '';
    const allowed = role === 'restaurant' || role === 'kafe' || role === 'cafe';
    if (!allowed) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Genel Bakış',    path: '/dashboard/restaurant',              icon: '📈' },
    { name: 'Menü Yönetimi',  path: '/dashboard/restaurant/products',     icon: '🍽️' },
    { name: 'Kota Yönetimi',  path: '/dashboard/restaurant/availability', icon: '🕒' },
    { name: 'Sipariş Tarama', path: '/dashboard/restaurant/scanner',      icon: '📷' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-md bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Restoran Paneli</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Onaylı Partner
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
          {user?.username?.charAt(0).toUpperCase() || 'R'}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar — CSS classes identical to agency layout */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 md:flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">İşletme Merkezi</h2>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {user?.username?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{user?.username || 'Restoran'}</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Onaylı Partner
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`text-lg opacity-80 transition-transform ${isActive ? 'scale-105 opacity-100' : ''}`}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => { logout(); router.replace('/login'); }} className="flex items-center justify-center w-full gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>

      {/* Mobile Bottom Nav — identical to agency */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-between items-center z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)] overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 p-2 min-w-[72px] transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              <div className={`text-xl opacity-80 transition-all duration-200 ${isActive ? 'scale-110 mb-0.5' : ''}`}>{item.icon}</div>
              <span className="text-[10px] font-medium tracking-tight text-center">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
