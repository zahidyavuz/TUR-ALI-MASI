/**
 * Bildirim tetikleyicileri: tur hatırlatması, hava durumu, indirim.
 * Akıllı kurallar burada uygulanır (throttle, sessiz saat vb. context'te).
 */

import { getAllOfflineTickets } from './offline-db';
import type { OfflineTicket } from './offline-types';
import { getWeatherAndDetectChange } from './notification-weather';
import type { AppNotification } from './notification-types';
import { STORAGE_KEYS } from './notification-types';
import { fetchTours } from './tours';

const TR_MONTHS: Record<string, number> = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
};

const REMINDER_SENT_KEY = 'melih_tours_reminder_sent';
function getReminderSent(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REMINDER_SENT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function setReminderSent(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const data = getReminderSent();
    data[key] = Date.now();
    localStorage.setItem(REMINDER_SENT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
function wasReminderSentRecently(ticketId: string, kind: string, withinMs: number): boolean {
  const data = getReminderSent();
  const ts = data[`${ticketId}-${kind}`];
  return ts != null && Date.now() - ts < withinMs;
}

/** "15 Mart 2026 - 17 Mart 2026" -> 15 Mart 2026 09:00 (tur başlangıç saati varsayım) */
function parseTourStartDate(dateLabel: string): Date | null {
  if (!dateLabel || typeof dateLabel !== 'string') return null;
  const part = dateLabel.split('-')[0]?.trim() || '';
  const match = part.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (!match) return null;
  const [, day, monthStr, year] = match;
  const month = TR_MONTHS[monthStr.toLowerCase().replace(/^./, (c) => c)] ?? parseInt(monthStr, 10) - 1;
  if (month === undefined || isNaN(month)) return null;
  const d = new Date(parseInt(year, 10), month, parseInt(day, 10), 9, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

function generateId(): string {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Offline biletlerden tur başlangıç tarihini al; 24 saat ve 1 saat kala hatırlatma üret. */
export async function checkTourReminders(): Promise<AppNotification[]> {
  const tickets = await getAllOfflineTickets();
  const now = new Date();
  const out: AppNotification[] = [];

  for (const t of tickets) {
    const start = parseTourStartDate(t.dateLabel ?? '');
    if (!start || start.getTime() < now.getTime()) continue;

    const ms24 = 24 * 60 * 60 * 1000;
    const ms1h = 60 * 60 * 1000;
    const diff = start.getTime() - now.getTime();

    if (diff <= ms24 && diff > ms24 - 15 * 60 * 1000) {
      if (!wasReminderSentRecently(t.id, '24h', 10 * 60 * 1000)) {
        out.push({
          id: generateId(),
          type: 'tour_reminder',
          title: 'Turunuza 24 saat kaldı',
          body: `${t.tourTitle} — Yarın bu saatte turunuz başlıyor. Biletinizi hazır edin.`,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/offline-tickets`,
          payload: { tourId: t.tourId, tourTitle: t.tourTitle, reminderKind: '24h' },
        });
        setReminderSent(`${t.id}-24h`);
      }
    } else if (diff <= ms1h && diff > ms1h - 5 * 60 * 1000) {
      if (!wasReminderSentRecently(t.id, '1h', 10 * 60 * 1000)) {
        out.push({
          id: generateId(),
          type: 'tour_reminder',
          title: 'Turunuza 1 saat kaldı',
          body: `${t.tourTitle} — Biletinizi ve QR kodunuzu hazırlayın.`,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/offline-tickets`,
          payload: { tourId: t.tourId, tourTitle: t.tourTitle, reminderKind: '1h' },
        });
        setReminderSent(`${t.id}-1h`);
      }
    }
  }
  return out;
}

/** Hava durumu değişikliği: offline bilet lokasyonları veya popüler turlar. */
export async function checkWeatherAlerts(
  locationsToCheck: string[]
): Promise<AppNotification[]> {
  const out: AppNotification[] = [];
  const seen = new Set<string>();

  for (const loc of locationsToCheck) {
    const key = loc.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await getWeatherAndDetectChange(loc);
    if (!result?.significantChange || !result.snapshot) continue;

    const { snapshot } = result;
    out.push({
      id: generateId(),
      type: 'weather',
      title: 'Hava durumu değişikliği',
      body: `${loc}: ${snapshot.condition}, ${snapshot.temp}°C. Tur planınızı kontrol edin.`,
      read: false,
      createdAt: new Date().toISOString(),
      payload: { location: loc, temp: snapshot.temp, condition: snapshot.condition },
    });
  }
  return out;
}

function getDiscountLastNotified(): Record<string, { discount: string; date: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.discountLastNotified);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setDiscountLastNotified(tourId: string, discount: string): void {
  if (typeof window === 'undefined') return;
  try {
    const data = getDiscountLastNotified();
    data[tourId] = { discount, date: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(STORAGE_KEYS.discountLastNotified, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** Aynı tur için son 7 günde bildirim gönderdik mi? */
function canNotifyDiscount(tourId: string): boolean {
  const data = getDiscountLastNotified();
  const last = data[tourId];
  if (!last) return true;
  const lastDate = new Date(last.date);
  const now = new Date();
  const days = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000);
  return days >= 7;
}

/** İndirimli turları kontrol et; en fazla 1 indirim bildirimi per run (akıllı, darlamaz). */
export async function checkDiscountAlerts(): Promise<AppNotification[]> {
  const lastNotified = getDiscountLastNotified();
  const candidates: AppNotification[] = [];

  const tourData: any = await fetchTours();
  const tourMap = tourData.map || {}; // Using the newly mapped Django format

  for (const [slug, tour] of Object.entries(tourMap)) {
    const t = tour as { id: string; title: string; discount?: string };
    const discount = t.discount ?? '';
    if (!discount) continue;

    const last = lastNotified[t.id];
    const isNewOrBetter = !last || (last.discount !== discount);
    if (!isNewOrBetter || !canNotifyDiscount(t.id)) continue;

    candidates.push({
      id: generateId(),
      type: 'discount',
      title: 'İndirim fırsatı',
      body: `${t.title} — ${discount} indirim. Kaçırmayın!`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/tour/${slug}`,
      payload: { tourId: t.id, tourTitle: t.title, discount },
    });
  }

  if (candidates.length === 0) return [];
  const chosen = candidates[0];
  setDiscountLastNotified(chosen.payload!.tourId!, chosen.payload!.discount!);
  return [chosen];
}
