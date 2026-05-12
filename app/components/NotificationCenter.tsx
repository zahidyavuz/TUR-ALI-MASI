'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '../context/NotificationContext';
import type { AppNotification, NotificationType } from '@/app/lib/notification-types';

const TYPE_LABELS: Record<NotificationType, string> = {
  tour_reminder: 'Tur hatırlatması',
  weather: 'Hava durumu',
  discount: 'İndirim',
};

const TYPE_ICONS: Record<NotificationType, string> = {
  tour_reminder: '⏰',
  weather: '🌤️',
  discount: '🏷️',
};

export default function NotificationCenter() {
  const { notifications, prefs, unreadCount, markAsRead, markAllRead, setPrefs, requestBrowserPermission } = useNotifications();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.actionUrl) setOpen(false);
  };

  return (
    <div className="relative z-[9999]" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirimler"
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:text-[#008cb3] hover:bg-slate-50 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Bildirimler</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-[#008cb3] hover:underline"
                >
                  Tümünü okundu işaretle
                </button>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen((s) => !s)}
                aria-label="Ayarlar"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {settingsOpen && (
            <div className="p-4 bg-slate-50 border-b border-gray-100 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Günlük en fazla bildirim</label>
                <select
                  value={prefs.maxPerDay}
                  onChange={(e) => setPrefs({ maxPerDay: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {[3, 5, 8, 12].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessiz saatler (örn. 22:00 - 08:00)</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={prefs.quietHoursStart}
                    onChange={(e) => setPrefs({ quietHoursStart: Number(e.target.value) })}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="self-center text-gray-400">-</span>
                  <select
                    value={prefs.quietHoursEnd}
                    onChange={(e) => setPrefs({ quietHoursEnd: Number(e.target.value) })}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bildirim türleri</span>
                {(Object.keys(prefs.enabled) as NotificationType[]).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.enabled[type]}
                      onChange={(e) => setPrefs({ enabled: { ...prefs.enabled, [type]: e.target.checked } })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{TYPE_ICONS[type]} {TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => requestBrowserPermission()}
                className="text-xs text-[#008cb3] font-medium hover:underline"
              >
                Tarayıcı bildirimlerini aç
              </button>
            </div>
          )}

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Henüz bildirim yok. Tur hatırlatmaları, hava durumu ve indirimler burada görünecek.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    {n.actionUrl ? (
                      <Link
                        href={n.actionUrl}
                        onClick={() => handleNotificationClick(n)}
                        className={`block p-4 hover:bg-slate-50 transition ${!n.read ? 'bg-blue-50/50' : ''}`}
                      >
                        <NotificationRow n={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left block p-4 hover:bg-slate-50 transition ${!n.read ? 'bg-blue-50/50' : ''}`}
                      >
                        <NotificationRow n={n} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  return (
    <div className="flex gap-3">
      <span className="text-lg shrink-0">{TYPE_ICONS[n.type]}</span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
        <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-gray-400 text-[10px] mt-1">
          {TYPE_LABELS[n.type]} · {new Date(n.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!n.read && <span className="w-2 h-2 rounded-full bg-[#008cb3] shrink-0 mt-2" />}
    </div>
  );
}
