/**
 * Bildirim sistemi tipleri.
 * Tur hatırlatması, hava durumu, indirim — kullanıcıyı darlamayan akıllı kurallar.
 */

export type NotificationType = 'tour_reminder' | 'weather' | 'discount';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO
  /** Tur sayfasına link, vb. */
  actionUrl?: string;
  payload?: {
    tourId?: string;
    tourTitle?: string;
    location?: string;
    discount?: string;
    [key: string]: unknown;
  };
}

export interface NotificationPrefs {
  /** Günlük maksimum bildirim (toplam) */
  maxPerDay: number;
  /** Sessiz saat başlangıç (0-23) */
  quietHoursStart: number;
  /** Sessiz saat bitiş (0-23) */
  quietHoursEnd: number;
  /** Tür bazlı açık/kapalı */
  enabled: {
    tour_reminder: boolean;
    weather: boolean;
    discount: boolean;
  };
  /** Tarayıcı push izni istenmiş mi */
  browserPermissionAsked: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  maxPerDay: 5,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  enabled: { tour_reminder: true, weather: true, discount: true },
  browserPermissionAsked: false,
};

export const STORAGE_KEYS = {
  prefs: 'melih_tours_notification_prefs',
  notifications: 'melih_tours_notifications',
  /** Günlük gönderim sayacı: { date: "YYYY-MM-DD", count: number } */
  dailyCount: 'melih_tours_notification_daily_count',
  /** Hava durumu önbelleği: locationKey -> { temp, condition, date } */
  weatherCache: 'melih_tours_weather_cache',
  /** İndirim son bildirim: tourId -> { discount, date } */
  discountLastNotified: 'melih_tours_discount_last',
} as const;
