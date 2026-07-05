'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const navItems = [
    { name: 'Cüzdanım', path: '/dashboard/customer', icon: '🎫' },
    { name: 'Sepetim', path: '/dashboard/customer/cart', icon: '🛒' },
    { name: 'Favorilerim', path: '/dashboard/customer/favorites', icon: '❤️' },
    { name: 'Profil & Ayarlar', path: '/dashboard/customer/settings', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white">Müşteri Paneli</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Turkia V2</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
          {user?.username?.charAt(0).toUpperCase() || 'M'}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">Panelim</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">Hoş geldin, {user?.username || 'Misafir'}</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-[#008cb3] text-white shadow-md' : 'text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation (Mobile-First approach) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 px-4 py-2 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${isActive ? 'text-[#008cb3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <div className={`text-xl ${isActive ? 'scale-110 drop-shadow-sm mb-0.5' : ''} transition-all duration-200`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  );
}
