/**
 * Offline bilet ve rota için tipler.
 * İnternet olmadan (müze, dağ vb.) QR ve harita görüntülenebilir.
 */

export interface ItineraryStep {
  day: number;
  title: string;
  description: string;
}

export interface OfflineTicket {
  id: string;
  tourId: string;
  tourTitle: string;
  location: string;
  duration: string;
  /** Seçilen tarih (örn. "15 Mart 2026 - 17 Mart 2026") */
  dateLabel?: string;
  guests: number;
  /** QR kodunun data URL'i (Data URL) - çevrimdışı gösterim için */
  qrDataUrl: string;
  /** Bilet doğrulama için benzersiz referans */
  bookingRef: string;
  /** Örnek tur programı (gün 1, 2, 3...) */
  itinerary: ItineraryStep[];
  /** Harita görseli - Cache'den veya statik URL'den; çevrimdışı için base64 veya blob URL */
  mapImageDataUrl?: string;
  /** Dahil / hariç listesi */
  included: string[];
  excluded: string[];
  /** Kaydedilme zamanı (ISO) */
  savedAt: string;
}

export const DEFAULT_ITINERARY: ItineraryStep[] = [
  {
    day: 1,
    title: 'Karşılama ve İlk Gün Macerası',
    description:
      'Havalimanından konforlu araçlarımızla alınıp lokasyona erişim. Günün ilk ışıklarıyla birlikte keşfe başlama ve ilk serbest zaman.',
  },
  {
    day: 2,
    title: 'Detaylı Çevre Gezisi ve Kültürel Etkinlikler',
    description:
      'Yerel lezzetleri tatma, kültürel mekanlara ziyaretler ve opsiyonel aktiviteler ile dolu dolu bir gün. Akşamında serbest dinlenme ve alışveriş.',
  },
  {
    day: 3,
    title: 'Doğa veya Şehir Yürüyüşleri ve Veda',
    description:
      'Son gün yürüyüşleri, hediyelik eşya durakları ve eşsiz anılar biriktirdikten sonra VIP transferle havalimanı\'na uğurlama.',
  },
];
