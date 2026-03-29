/**
 * Akıllı bildirim algoritması: kullanıcıyı darlamadan,
 * sadece önemli ve zamanında bildirim gönderir.
 */

import type { AppNotification, NotificationPrefs } from './notification-types';
import { STORAGE_KEYS } from './notification-types';

function getStoredPrefs(): NotificationPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prefs);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dailyCount);
    const data = raw ? JSON.parse(raw) : null;
    const today = getTodayKey();
    if (data && data.date === today) return data.count ?? 0;
    return 0;
  } catch {
    return 0;
  }
}

function incrementDailyCount(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = getTodayKey();
    const count = getDailyCount() + 1;
    localStorage.setItem(STORAGE_KEYS.dailyCount, JSON.stringify({ date: today, count }));
  } catch {
    // ignore
  }
}

/** Şu an sessiz saatte mi? */
export function isQuietHours(prefs: NotificationPrefs | null): boolean {
  const p = prefs ?? getStoredPrefs();
  if (!p) return false;
  const hour = new Date().getHours();
  if (p.quietHoursStart > p.quietHoursEnd) {
    // örn. 22 - 08: gece yarısını aşan
    return hour >= p.quietHoursStart || hour < p.quietHoursEnd;
  }
  return hour >= p.quietHoursStart && hour < p.quietHoursEnd;
}

/** Bu bildirim türü açık mı? */
export function isTypeEnabled(type: AppNotification['type'], prefs: NotificationPrefs | null): boolean {
  const p = prefs ?? getStoredPrefs();
  if (!p) return true;
  return p.enabled[type] !== false;
}

/** Günlük limit aşıldı mı? */
export function isOverDailyLimit(prefs: NotificationPrefs | null): boolean {
  const p = prefs ?? getStoredPrefs();
  const max = p?.maxPerDay ?? 5;
  return getDailyCount() >= max;
}

/**
 * Bu bildirimi göstermeli miyiz? (Sessiz saat, limit, tür açık mı)
 * Tur hatırlatması (1 saat kala) sessiz saatte bile gösterilebilir — urgent.
 */
export function shouldShowNotification(
  notification: AppNotification,
  prefs: NotificationPrefs | null
): boolean {
  if (!isTypeEnabled(notification.type, prefs)) return false;
  if (isOverDailyLimit(prefs)) {
    // Acil: tur 1 saat kala sessiz saatte bile sayılsın ama yine limit var
    const isUrgentReminder =
      notification.type === 'tour_reminder' &&
      (notification.payload?.reminderKind === '1h');
    if (!isUrgentReminder) return false;
  }
  if (isQuietHours(prefs)) {
    const isUrgent =
      notification.type === 'tour_reminder' &&
      (notification.payload?.reminderKind === '1h');
    if (!isUrgent) return false;
  }
  return true;
}

/** Bildirimi "gösterildi" say; günlük sayacı artır. */
export function markNotificationShown(): void {
  incrementDailyCount();
}
