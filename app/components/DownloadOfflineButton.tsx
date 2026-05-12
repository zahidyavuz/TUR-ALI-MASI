'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveOfflineTicket } from '@/app/lib/offline-db';
import { generateTicketQrDataUrl } from '@/app/lib/qr';
import { createPlaceholderMapDataUrl } from '@/app/lib/offline-map';
import type { OfflineTicket, ItineraryStep } from '@/app/lib/offline-types';

interface TourSnapshot {
  id: string;
  title: string;
  location: string;
  duration: string;
  included: string[];
  excluded: string[];
}

interface DownloadOfflineButtonProps {
  tour: TourSnapshot;
  dateLabel?: string;
  guests: number;
  itinerary?: ItineraryStep[];
  locale?: string;
  className?: string;
}

const DEFAULT_ITINERARY: ItineraryStep[] = [
  { day: 1, title: 'Karşılama ve İlk Gün Macerası', description: 'Havalimanından konforlu araçlarımızla alınıp lokasyona erişim. Günün ilk ışıklarıyla keşfe başlama.' },
  { day: 2, title: 'Detaylı Çevre Gezisi ve Kültürel Etkinlikler', description: 'Yerel lezzetler, kültürel mekanlar ve opsiyonel aktiviteler. Akşam serbest dinlenme.' },
  { day: 3, title: 'Doğa veya Şehir Yürüyüşleri ve Veda', description: 'Son gün yürüyüşleri ve VIP transferle havalimanına uğurlama.' },
];

export function DownloadOfflineButton({
  tour,
  dateLabel,
  guests,
  itinerary = DEFAULT_ITINERARY,
  locale = 'tr-TR',
  className = '',
}: DownloadOfflineButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const labels = {
    'tr-TR': { btn: "Offline'e indir", loading: 'İndiriliyor...', success: 'Bilet indirildi. Çevrimdışı kullanabilirsiniz.', error: 'İndirme başarısız.' },
    'en-US': { btn: 'Download for offline', loading: 'Downloading...', success: 'Ticket saved. You can use it offline.', error: 'Download failed.' },
    'de-DE': { btn: 'Offline speichern', loading: 'Wird gespeichert...', success: 'Ticket gespeichert. Offline nutzbar.', error: 'Speichern fehlgeschlagen.' },
    'zh-CN': { btn: '离线下载', loading: '下载中...', success: '已保存，可离线使用。', error: '下载失败。' },
  };
  const t = labels[locale as keyof typeof labels] || labels['tr-TR'];

  const handleDownload = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const id = `ticket-${tour.id}-${Date.now()}`;
      const bookingRef = `MT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;
      const qrDataUrl = await generateTicketQrDataUrl(bookingRef, tour.id);
      const mapImageDataUrl = createPlaceholderMapDataUrl(tour.location, itinerary);

      const ticket: OfflineTicket = {
        id,
        tourId: tour.id,
        tourTitle: tour.title,
        location: tour.location,
        duration: tour.duration,
        dateLabel,
        guests,
        qrDataUrl,
        bookingRef,
        itinerary,
        mapImageDataUrl,
        included: tour.included,
        excluded: tour.excluded,
        savedAt: new Date().toISOString(),
      };

      await saveOfflineTicket(ticket);
      setMessage(t.success);
      setTimeout(() => router.push('/offline-tickets'), 800);
    } catch (e) {
      setMessage(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? (
          t.loading
        ) : (
          <>
            <span aria-hidden>📥</span>
            {t.btn}
          </>
        )}
      </button>
      {message && (
        <p className={`mt-2 text-sm font-medium ${message.includes('başarısız') || message.includes('failed') || message.includes('fehlgeschlagen') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
