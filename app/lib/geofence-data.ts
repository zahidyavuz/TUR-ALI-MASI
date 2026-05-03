/**
 * Geofencing: Yürüyüş / günübirlik turların buluşma noktaları (lat, lon).
 * Kullanıcı bu noktaya ~500m yakına gelince "Yakınında katılabileceğin tur var!" bildirimi gösterilir.
 */

export interface GeofenceSpot {
  slug: string;
  tourId: string;
  title: string;
  /** Buluşma / tur başlangıç noktası */
  lat: number;
  lon: number;
  /** Metre cinsinden; kullanıcı bu mesafeden yakınsa bildirim */
  radiusMeters: number;
}

/** Yürüyüş / günübirlik / şehir turları için koordinatlar (gerçek tur noktalarına yakın). */
export const GEOFENCE_SPOTS: GeofenceSpot[] = [
  {
    slug: 'kapadokya',
    tourId: 'kapadokya',
    title: 'Kapadokya Balon & Peri Bacaları',
    lat: 38.6431,
    lon: 34.8289,
    radiusMeters: 500,
  },
  {
    slug: 'kapadokya-atv-safari',
    tourId: 'kapadokya-atv-safari',
    title: 'Gün Batımı Kanyon ATV Safari',
    lat: 38.6422,
    lon: 34.8315,
    radiusMeters: 500,
  },
  {
    slug: 'napoli-pizza-atolyesi',
    tourId: 'napoli-pizza-atolyesi',
    title: 'Napoli Pizza ve Tiramisu Atölyesi',
    lat: 40.8382,
    lon: 14.2526,
    radiusMeters: 500,
  },
  {
    slug: 'kyoto-cay',
    tourId: 'kyoto-cay',
    title: 'Kyoto Çay Seremonisi & Zen Sanatı',
    lat: 35.0116,
    lon: 135.7681,
    radiusMeters: 500,
  },
  {
    slug: 'gaziantep-gurme',
    tourId: 'gaziantep-gurme',
    title: 'Gaziantep Gurme ve Lezzet Turu',
    lat: 37.0662,
    lon: 37.3833,
    radiusMeters: 500,
  },
  {
    slug: 'fethiye-yama-parasutu',
    tourId: 'fethiye-yama-parasutu',
    title: 'Ölüdeniz Yamaç Paraşütü',
    lat: 36.5494,
    lon: 29.1128,
    radiusMeters: 500,
  },
  {
    slug: 'buyuk-italya',
    tourId: 'buyuk-italya',
    title: 'Tarihi Yarımada Yürüyüşü',
    lat: 41.9028,
    lon: 12.4964,
    radiusMeters: 600,
  },
];
