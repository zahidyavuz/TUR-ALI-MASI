'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function BusinessDashboardHub() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const role = user.role?.toLowerCase() || '';
    const isAgency = role === 'agency' || role === 'merchant/agency' || user.is_agency;
    const isRestaurant = role === 'restaurant' || role === 'kafe' || role === 'cafe';

    // Bu bir Hub (Köprü) rotasıdır. Giriş yapan işletmeyi kendi özel UI paneline yönlendirir.
    // Acımasız Yönlendirme Metodu (Sledgehammer)
    if (isAgency) {
      window.location.href = '/dashboard/agency';
    } else if (isRestaurant) {
      window.location.href = '/dashboard/restaurant';
    } else {
      window.location.href = '/'; // Yetkisizse at
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white">İşletme Merkezine Bağlanılıyor...</h2>
      </div>
    </div>
  );
}
