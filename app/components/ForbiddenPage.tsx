'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ForbiddenPageProps {
  /** Otomatik yönlendirme süresi (ms). Default: 4000ms */
  redirectDelay?: number;
  /** Açıklama mesajı */
  message?: string;
}

/**
 * 403 Forbidden Ekranı
 * IDOR koruma katmanı erişimi reddettiğinde gösterilir.
 * Kullanıcıya açıklama verir ve otomatik ana sayfaya yönlendirir.
 */
export default function ForbiddenPage({
  redirectDelay = 4000,
  message = 'Bu kaynağa erişim yetkiniz bulunmuyor.',
}: ForbiddenPageProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, redirectDelay);
    return () => clearTimeout(timer);
  }, [router, redirectDelay]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B132B] flex items-center justify-center p-6 transition-colors duration-500">
      <div className="bg-white dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-[32px] shadow-xl p-10 max-w-md w-full text-center relative overflow-hidden">
        {/* Arka plan dekor */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-red-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        {/* İkon */}
        <div className="relative z-10 w-20 h-20 mx-auto mb-6 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center">
          <svg width="36" height="36" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>

        {/* 403 Kodu */}
        <p className="relative z-10 text-[11px] font-black tracking-[0.4em] text-red-500 uppercase mb-2">
          403 Erişim Engellendi
        </p>

        <h1 className="relative z-10 text-2xl font-black text-slate-800 mb-3 leading-tight">
          Bu Sayfaya Erişim<br />Yetkiniz Yok
        </h1>

        <p className="relative z-10 text-sm font-medium text-gray-500 mb-8 leading-relaxed">
          {message}
          <br />
          Başkalarına ait bilet veya verilere erişim kesinlikle engellendi.
        </p>

        {/* Geri sayım çubuğu */}
        <div className="relative z-10 mb-6">
          <p className="text-xs font-bold text-gray-400 mb-2">
            Ana sayfaya yönlendiriliyorsunuz...
          </p>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{
                animation: `shrink ${redirectDelay}ms linear forwards`,
              }}
            />
          </div>
        </div>

        <button
          onClick={() => router.replace('/')}
          className="relative z-10 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ana Sayfaya Dön
        </button>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
