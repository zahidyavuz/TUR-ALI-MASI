'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Sadece /dashboard uzantılı özel yönetim rotalarını koruyoruz.
    if (pathname?.startsWith('/dashboard')) {
        if (!user) {
            router.replace('/login');
            return;
        }

        const role = user.role?.toLowerCase() || '';
        const isAdmin = user.username === 'yavuz50' || user.is_staff || role === 'superadmin' || role === 'admin';
        const isAgency = role === 'agency' || role === 'merchant/agency' || user.is_agency;
        const isRestaurant = role === 'restaurant' || role === 'kafe' || role === 'cafe';
        const isCustomer = !isAdmin && !isAgency && !isRestaurant;

        // TAM İZOLASYON: Müşteriler (Customer) hiçbir şekilde /dashboard altına giremez.
        // Yeni tasarımda müşteri sayfaları sitenin doğal yapısına (/tickets, /profile) entegre edilmiştir.
        if (isCustomer && pathname.startsWith('/dashboard')) {
            router.replace('/');
            return;
        }

        // 1. Admin Paneli Demir Kubbesi
        if (pathname.startsWith('/dashboard/admin') && !isAdmin) {
            router.replace('/');
            return;
        }

        // 2. Acente Paneli Demir Kubbesi
        if (pathname.startsWith('/dashboard/agency') && !isAdmin && !isAgency) {
            router.replace('/');
            return;
        }

        // 3. Restoran Paneli Demir Kubbesi
        if (pathname.startsWith('/dashboard/restaurant') && !isAdmin && !isRestaurant) {
            router.replace('/');
            return;
        }

        // 4. Genel İşletme Paneli Demir Kubbesi
        if (pathname.startsWith('/dashboard/business') && !isAdmin && !isAgency && !isRestaurant) {
            router.replace('/');
            return;
        }
    }

    setAuthorized(true);
  }, [user, isLoading, pathname, router]);

  // Ekrana 1 saliseliğine bile o panelleri GÖSTERMEMEK için tam blokaj
  if (isLoading || !authorized) {
    if (pathname?.startsWith('/dashboard')) {
        return null; // Hiçbir şey render edilmez, siyah bir boşluk (veya arkaplan) kalır ve anında yönlendirilir.
    }
  }

  return <>{children}</>;
}
