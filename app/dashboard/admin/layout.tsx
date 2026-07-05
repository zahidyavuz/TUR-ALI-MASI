'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Gerçek route guard — bu dashboard'da daha önce hiç yoktu, herhangi bir
  // oturum açmış kullanıcı (müşteri dahil) bu sayfaları görebiliyordu.
  useEffect(() => {
    if (isLoading) return;
    if (!user?.is_staff) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user?.is_staff) return null;

  const navItems = [
    { name: 'Ana Panel', path: '/dashboard/admin', icon: '⚙️' },
    { name: 'Başvurular', path: '/dashboard/admin/basvurular', icon: '🏢' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-black/40 border-b border-slate-800 px-6 py-4 flex gap-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${pathname === item.path ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <span>{item.icon}</span> {item.name}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
