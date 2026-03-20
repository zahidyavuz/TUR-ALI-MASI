'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { AppNotification, NotificationPrefs } from '../lib/notification-types';
import { DEFAULT_PREFS, STORAGE_KEYS } from '../lib/notification-types';
import {
  shouldShowNotification,
  markNotificationShown,
  isOverDailyLimit,
} from '../lib/notification-smart';
import { checkTourReminders, checkWeatherAlerts, checkDiscountAlerts } from '../lib/notification-checks';
import { getAllOfflineTickets } from '../lib/offline-db';
import { fetchTours } from '../lib/tours';

function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notifications);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveNotifications(list: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    const toStore = list.slice(-100);
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(toStore));
  } catch {
    // ignore
  }
}

function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prefs);
    const p = raw ? JSON.parse(raw) : null;
    return p ? { ...DEFAULT_PREFS, ...p } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: NotificationPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(p));
  } catch {
    // ignore
  }
}

type NotificationContextValue = {
  notifications: AppNotification[];
  prefs: NotificationPrefs;
  unreadCount: number;
  setPrefs: (p: Partial<NotificationPrefs> | ((prev: NotificationPrefs) => NotificationPrefs)) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  runChecks: () => Promise<void>;
  requestBrowserPermission: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika
const WEATHER_THROTTLE_MS = 30 * 60 * 1000; // hava durumu en fazla 30 dk'da bir

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [prefs, setPrefsState] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const lastWeatherCheck = useRef(0);
  const lastRun = useRef(0);

  const setPrefs = useCallback((p: Partial<NotificationPrefs> | ((prev: NotificationPrefs) => NotificationPrefs)) => {
    setPrefsState((prev) => {
      const next = typeof p === 'function' ? p(prev) : { ...prev, ...p };
      savePrefs(next);
      return next;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev;
      const next = [n, ...prev];
      saveNotifications(next);
      return next;
    });
  }, []);

  const runChecks = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (now - lastRun.current < 60 * 1000) return;
    lastRun.current = now;

    const currentPrefs = loadPrefs();
    const existing = loadNotifications();
    const existingIds = new Set(existing.map((x) => x.id));

    try {
      const tourReminders = await checkTourReminders();
      for (const n of tourReminders) {
        if (existingIds.has(n.id)) continue;
        if (!shouldShowNotification(n, currentPrefs)) continue;
        addNotification(n);
        markNotificationShown();
        existingIds.add(n.id);
      }

      if (currentPrefs.enabled.weather && now - lastWeatherCheck.current > WEATHER_THROTTLE_MS) {
        lastWeatherCheck.current = now;
        const tickets = await getAllOfflineTickets();
        const locations = [...new Set(tickets.map((t) => t.location).filter(Boolean))];
        if (locations.length === 0) {
          const tourData: any = await fetchTours();
          const fallbackLocations = Object.values(tourData).slice(0, 3).map((t: any) => t.location).filter(Boolean) as string[];
          locations.push(...fallbackLocations);
        }
        const weatherAlerts = await checkWeatherAlerts(locations);
        for (const n of weatherAlerts) {
          if (existingIds.has(n.id)) continue;
          if (!shouldShowNotification(n, currentPrefs)) continue;
          addNotification(n);
          markNotificationShown();
          existingIds.add(n.id);
        }
      }

      const discountAlerts = await checkDiscountAlerts();
      for (const n of discountAlerts) {
        if (existingIds.has(n.id)) continue;
        if (!shouldShowNotification(n, currentPrefs)) continue;
        if (isOverDailyLimit(currentPrefs)) continue;
        addNotification(n);
        markNotificationShown();
        existingIds.add(n.id);
      }
    } catch (e) {
      console.warn('Notification checks failed', e);
    }
  }, [addNotification]);

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    setPrefs({ browserPermissionAsked: true });
    return perm === 'granted';
  }, [setPrefs]);

  useEffect(() => {
    setNotifications(loadNotifications());
    setPrefsState(loadPrefs());
  }, []);

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runChecks]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    prefs,
    unreadCount,
    setPrefs,
    markAsRead,
    markAllRead,
    runChecks,
    requestBrowserPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
