'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { fetchAPI } from '@/app/lib/api';

/**
 * Partner onboarding durum kapısı.
 *
 * `onaylandi` → children render edilir. Diğer tüm durumlarda panel yerine
 * duruma özel bir ekran gösterilir. Bu yalnızca kullanıcı deneyimidir;
 * asıl yetkilendirme backend'de `IsVerifiedAgent` ile yapılır.
 */

type Status = 'taslak' | 'beklemede' | 'inceleniyor' | 'onaylandi' | 'reddedildi' | 'eksik_bilgi';

interface Props {
  status: string | null | undefined;
  rejectionReason?: string | null;
  children: React.ReactNode;
}

const STATUS_CONFIG: Record<
  Exclude<Status, 'onaylandi'>,
  { title: string; message: string; icon: string; tone: string; showResume: boolean; showMissing: boolean }
> = {
  taslak: {
    title: 'Başvurunuz Tamamlanmadı',
    message: 'Panele erişebilmeniz için başvuru adımlarını tamamlayıp göndermeniz gerekiyor.',
    icon: '📝',
    tone: 'text-slate-600 dark:text-slate-400',
    showResume: true,
    showMissing: true,
  },
  beklemede: {
    title: 'Başvurunuz İnceleme Sırasında',
    message: 'Başvurunuz ekibimize ulaştı. Sonuç e-posta ile bildirilecektir.',
    icon: '⏳',
    tone: 'text-amber-600 dark:text-amber-400',
    showResume: false,
    showMissing: false,
  },
  inceleniyor: {
    title: 'Başvurunuz İnceleniyor',
    message: 'Başvurunuz şu anda detaylı incelemede. Bu aşamada düzenleme yapamazsınız.',
    icon: '🔍',
    tone: 'text-amber-600 dark:text-amber-400',
    showResume: false,
    showMissing: false,
  },
  reddedildi: {
    title: 'Başvurunuz Reddedildi',
    message: 'Başvurunuz aşağıdaki gerekçeyle reddedildi.',
    icon: '❌',
    tone: 'text-red-600 dark:text-red-400',
    showResume: false,
    showMissing: false,
  },
  eksik_bilgi: {
    title: 'Başvurunuzda Eksik Bilgi Var',
    message: 'Değerlendirmeye devam edebilmemiz için aşağıdaki eksikleri tamamlayıp tekrar gönderin.',
    icon: '⚠️',
    tone: 'text-amber-600 dark:text-amber-400',
    showResume: true,
    showMissing: true,
  },
};

export default function OnboardingGate({ status, rejectionReason, children }: Props) {
  const config = status && status !== 'onaylandi' ? STATUS_CONFIG[status as Exclude<Status, 'onaylandi'>] : null;
  const needsMissing = Boolean(config?.showMissing);

  const [missing, setMissing] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!needsMissing) return;
    let cancelled = false;
    (async () => {
      const data = await fetchAPI('/agencies/onboarding/');
      if (!cancelled) setMissing(data?.missing_fields ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, [needsMissing]);

  // Durum bilinmiyorsa (ör. eski hesap) engelleme — backend zaten korunuyor.
  if (!status || status === 'onaylandi' || !config) return <>{children}</>;

  const missingList = missing ? Object.entries(missing) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">{config.title}</h2>
          <p className={`text-sm mb-5 ${config.tone}`}>{config.message}</p>
        </div>

        {rejectionReason && (status === 'reddedildi' || status === 'eksik_bilgi') && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-4 text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-red-500 mb-1">Yönetici Notu</p>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium whitespace-pre-line">{rejectionReason}</p>
          </div>
        )}

        {config.showMissing && missingList.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 mb-4 text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-600 mb-2">
              Tamamlanması Gereken Alanlar ({missingList.length})
            </p>
            <ul className="space-y-1.5">
              {missingList.map(([field, label]) => (
                <li key={field} className="text-sm text-amber-700 dark:text-amber-300 flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {config.showResume && (
          <div className="text-center">
            <Link
              href="/?showAgencyModal=true"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Başvuruya Devam Et
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
