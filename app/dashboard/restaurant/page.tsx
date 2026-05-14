'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { fetchAPI } from '@/app/lib/api';

// Status labels
const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  seated: 'Masaya Alındı',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi'
};

// Premium şef bordo tonu
const CHEF_RED = {
  active:  'bg-[#8B1A2B] hover:bg-[#7a1625] text-white shadow-sm shadow-[#8B1A2B]/30',
  tab:     'bg-white dark:bg-slate-900 text-[#8B1A2B] dark:text-[#e8a0aa] shadow-sm',
  badge:   'bg-[#8B1A2B]/10 text-[#8B1A2B] dark:bg-[#8B1A2B]/20 dark:text-[#e8a0aa] border border-[#8B1A2B]/20',
  menu:    'border border-[#8B1A2B]/20 dark:border-[#8B1A2B]/30',
  label:   'text-[#8B1A2B] dark:text-[#e8a0aa]',
};

interface Reservation {
  id: string | number;
  time: string;
  name: string;
  pax: number;
  menu: string;
  note: string;
  status: string;
}

interface Stats {
  total_revenue: number;
  total_guests: number;
  current_seated: number;
  available_tables: number;
}

export default function RestaurantOverviewPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'seated'>('upcoming');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_revenue: 0,
    total_guests: 0,
    current_seated: 0,
    available_tables: 10
  });
  const [latestBookingAlert, setLatestBookingAlert] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<Set<string | number>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial Data Load
  const loadData = async () => {
    if (!user?.agency_id) return;
    
    // Fetch stats
    const statsData = await fetchAPI('/restaurant/daily-stats/');
    if (statsData) setStats(statsData);

    // Fetch reservations
    const resData = await fetchAPI('/restaurant/reservations/');
    if (resData) setReservations(resData);
  };

  useEffect(() => {
    loadData();
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, [user?.agency_id]);

  // WebSocket Connection
  useEffect(() => {
    if (!user?.agency_id) return;

    const connectWS = () => {
      const wsUrl = `ws://localhost:8000/ws/restaurant/${user.agency_id}/`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Restaurant connected');
        setWsConnected(true);
      };

      ws.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        console.log('[WS] Message received:', payload);

        if (payload.action === 'new_reservation') {
          setReservations(prev => [payload.data, ...prev]);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          setLatestBookingAlert(`YENİ REZERVASYON: ${payload.data.name} — ${payload.data.pax} Kişi`);
          setTimeout(() => setLatestBookingAlert(null), 5000);
        } else if (payload.action === 'kpi_update') {
          setStats(prev => ({ ...prev, ...payload.data }));
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected. Reconnecting...');
        setWsConnected(false);
        setTimeout(connectWS, 3000);
      };

      wsRef.current = ws;
    };

    connectWS();
    return () => wsRef.current?.close();
  }, [user?.agency_id]);

  const handleCheckIn = async (id: string | number) => {
    setCheckingIn(prev => new Set(prev).add(id));
    
    try {
      await fetchAPI(`/restaurant/reservations/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'seated' })
      });
      
      // Update local state for immediate feedback
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'seated' } : r));
      // Refresh stats
      loadData();
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setTimeout(() => {
        setCheckingIn(prev => { const n = new Set(prev); n.delete(id); return n; });
      }, 700);
    }
  };

  const handleLeave = async (id: string | number) => {
    try {
      await fetchAPI(`/restaurant/reservations/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' })
      });
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r));
      loadData();
    } catch (error) {
      console.error('Check-out failed:', error);
    }
  };

  const pendingCount = reservations.filter(r => r.status === 'pending' || r.status === 'confirmed').length;
  const filteredReservations = reservations.filter(r => 
    activeTab === 'upcoming' ? (r.status === 'pending' || r.status === 'confirmed') : (r.status === 'seated')
  );

  const occupancyPct = stats.available_tables > 0 ? Math.round((stats.current_seated / (stats.current_seated + stats.available_tables)) * 100) : 100;

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">

      {/* ── TOAST NOTIFICATION ──────────────────────────────────────── */}
      {latestBookingAlert && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-5 py-4 rounded-lg shadow-2xl flex items-center gap-4 border border-slate-700">
            <span className="text-2xl animate-bounce">🔔</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Canlı Sistem Uyarısı</p>
              <p className="font-medium text-sm">{latestBookingAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Hostes Kokpiti</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${wsConnected ? 'animate-ping bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            {wsConnected ? 'Bağlantı Aktif — Canlı Dinleniyor' : 'Bağlantı Kesildi — Tekrar Bağlanılıyor...'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            🔄 Yenile
          </button>
          <div className="px-3 py-1.5 bg-slate-900 dark:bg-slate-950 text-white rounded-md shadow-sm text-sm font-semibold tabular-nums">
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bugünkü Rezervasyon</h3>
            <span className="text-slate-400">📅</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{reservations.length}</span>
            <span className="text-sm text-slate-400 mb-0.5">toplam</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500">Günün rezervasyon trafiği</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bekleyen Masa</h3>
            <span className="text-slate-400">⏳</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{pendingCount}</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-500">Gelmeyen misafirler</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Anlık Doluluk</h3>
            <span className="text-slate-400">📊</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">%{occupancyPct}</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${occupancyPct > 80 ? 'bg-red-500' : occupancyPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-5 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Günün Cirosu</h3>
            <span className="text-slate-500">💰</span>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.total_revenue.toLocaleString('tr-TR')} ₺</span>
          </div>
          <p className="mt-3 text-[10px] text-slate-400 font-medium relative z-10">
            {stats.total_guests} ağırlanan misafir bazlı.
          </p>
        </div>
      </div>

      {/* ── STATUS TABS ────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-5 py-2 rounded-md font-semibold text-sm transition-all ${
            activeTab === 'upcoming' ? CHEF_RED.tab : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Beklenenler
          {pendingCount > 0 && (
            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${CHEF_RED.badge}`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('seated')}
          className={`px-5 py-2 rounded-md font-semibold text-sm transition-all ${
            activeTab === 'seated' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Masaya Alınanlar
          {stats.current_seated > 0 && (
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {stats.current_seated}
            </span>
          )}
        </button>
      </div>

      {/* ── RESERVATION CARDS ───────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-5xl mb-4 block opacity-30">🍽️</span>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Bu listede şu an misafir bulunmuyor.</p>
            <p className="text-sm text-slate-400 mt-1">Yeni siparişler anlık olarak buraya düşecektir.</p>
          </div>
        ) : (
          filteredReservations.map((res) => (
            <div
              key={res.id}
              className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md"
            >
              <div className="bg-slate-50 dark:bg-slate-950 px-5 py-4 md:w-36 flex md:flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 shrink-0 gap-3 md:gap-0">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rezervasyon</span>
                <span className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight tabular-nums">{res.time}</span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white">{res.name}</h2>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    👥 {res.pax} Kişi
                  </span>
                  {res.note && (
                    <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded text-xs border border-amber-200 dark:border-amber-900">
                      ⭐ {res.note}
                    </span>
                  )}
                  {res.status !== 'pending' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-0.5 border border-slate-200 dark:border-slate-800 rounded">
                      {STATUS_LABELS[res.status] || res.status}
                    </span>
                  )}
                </div>
                <div className={`mt-1 p-3 rounded-md ${CHEF_RED.menu} bg-[#8B1A2B]/5 dark:bg-[#8B1A2B]/10`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${CHEF_RED.label}`}>Müşteri Seçimi</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{res.menu || 'Standart Rezervasyon'}</p>
                </div>
              </div>

              <div className="px-5 py-4 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
                {activeTab === 'upcoming' ? (
                  <button
                    onClick={() => handleCheckIn(res.id)}
                    disabled={checkingIn.has(res.id)}
                    className={`w-full md:w-32 py-2.5 rounded-md font-semibold text-sm transition-all duration-700 flex items-center justify-center gap-2 ${
                      checkingIn.has(res.id)
                        ? 'bg-emerald-500 text-white scale-95'
                        : CHEF_RED.active
                    }`}
                  >
                    {checkingIn.has(res.id) ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Masaya Alındı
                      </>
                    ) : (
                      <>🛎️ Geldi</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleLeave(res.id)}
                    className="w-full md:w-32 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-semibold text-sm transition-all hover:bg-emerald-500 hover:text-white flex items-center justify-center gap-2"
                  >
                    ✅ Ayrıldı
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
