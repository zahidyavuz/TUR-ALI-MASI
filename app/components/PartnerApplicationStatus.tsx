'use client';

import Link from 'next/link';

interface Props {
  status: string | null | undefined;
  rejectionReason?: string | null;
}

const STATUS_CONFIG: Record<string, { title: string; message: string; icon: string; showResume: boolean }> = {
  taslak: {
    title: 'Başvurunuz Tamamlanmadı',
    message: 'Ürün/tur ekleyebilmeniz için başvurunuzu tamamlamanız gerekiyor.',
    icon: '📝',
    showResume: true,
  },
  beklemede: {
    title: 'Başvurunuz İnceleniyor',
    message: 'Başvurunuz ekibimiz tarafından inceleniyor. Sonuç e-posta ile bildirilecektir.',
    icon: '⏳',
    showResume: false,
  },
  inceleniyor: {
    title: 'Başvurunuz İnceleniyor',
    message: 'Başvurunuz şu anda detaylı incelemede.',
    icon: '🔍',
    showResume: false,
  },
  reddedildi: {
    title: 'Başvurunuz Reddedildi',
    message: 'Başvurunuz aşağıdaki sebeple reddedildi.',
    icon: '❌',
    showResume: false,
  },
  eksik_bilgi: {
    title: 'Başvurunuzda Eksik Bilgi Var',
    message: 'Devam edebilmemiz için aşağıdaki eksikliği tamamlamanız gerekiyor.',
    icon: '⚠️',
    showResume: true,
  },
};

export default function PartnerApplicationStatus({ status, rejectionReason }: Props) {
  const config = STATUS_CONFIG[status || 'taslak'] || STATUS_CONFIG.taslak;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
        <div className="text-5xl mb-4">{config.icon}</div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">{config.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{config.message}</p>

        {rejectionReason && (status === 'reddedildi' || status === 'eksik_bilgi') && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 font-semibold mb-4 text-left">
            {rejectionReason}
          </div>
        )}

        {config.showResume && (
          <Link
            href="/?showAgencyModal=true"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Başvuruya Devam Et
          </Link>
        )}
      </div>
    </div>
  );
}
