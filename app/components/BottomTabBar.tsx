'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide on dashboard pages — they have their own nav
  if (pathname?.startsWith('/dashboard')) return null;

  const tabs = [
    {
      href: '/',
      label: 'Ana Sayfa',
      icon: (active: boolean) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
        </svg>
      ),
    },
    {
      href: '/search',
      label: 'Turlar',
      icon: (active: boolean) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      href: '/taste',
      label: 'Lezzet',
      icon: (active: boolean) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      ),
    },
    ...(user
      ? [
          {
            href: '/tickets',
            label: 'Biletlerim',
            icon: (active: boolean) => (
              <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            ),
          },
          {
            href: '/profile',
            label: 'Profil',
            icon: (active: boolean) => (
              <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
          },
        ]
      : [
          {
            href: '/login',
            label: 'Giriş Yap',
            icon: (active: boolean) => (
              <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            ),
          },
        ]),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] flex lg:hidden items-stretch justify-around
                 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                 border-t border-gray-200 dark:border-slate-800
                 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]
                 pb-[env(safe-area-inset-bottom)]"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 py-2 transition-all duration-200
              ${active
                ? 'text-[#008cb3] dark:text-blue-400'
                : 'text-gray-400 dark:text-slate-500 hover:text-[#008cb3] dark:hover:text-blue-400'
              }`}
          >
            <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
              {tab.icon(active)}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-full ${active ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#008cb3] dark:bg-blue-400 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
