'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '@/app/lib/api';

interface Card {
  total: number;
  month: number;
}

interface Metrics {
  cards: {
    gmv: Card;
    reservations: Card;
    commission_revenue: Card;
    active_agencies: Card;
  };
  monthly_trend: { month: string; gmv: number; commission: number; count: number }[];
  agency_performance: {
    agency_id: number;
    agency_name: string;
    gross: number;
    commission: number;
    net: number;
    count: number;
  }[];
  recent_bookings: {
    id: string;
    user: string;
    service: string;
    service_type: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
  pending_payouts: { count: number; total: number };
}

interface Payout {
  id: number;
  agency_id: number;
  agency_name: string;
  amount: number;
  iban_masked: string | null;
  status: string;
  status_label: string;
  admin_notes: string | null;
  requested_at: string;
  resolved_at: string | null;
}

const tl = (v: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-900/40 text-green-400',
  pending: 'bg-yellow-900/40 text-yellow-400',
  cancelled: 'bg-slate-700 text-slate-300',
  failed: 'bg-red-900/40 text-red-400',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [m, p] = await Promise.all([
      fetchAPI('/admin/metrics/'),
      fetchAPI('/admin/payouts/?status=pending'),
    ]);
    if (!m) {
      setError('Metrikler yüklenemedi.');
    } else {
      setMetrics(m);
    }
    if (p) setPayouts(p.results || p);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolvePayout = async (id: number, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Red sebebi:') || '';
      if (!reason.trim()) return;
    }
    setProcessingId(id);
    try {
      await fetchAPI(`/admin/payouts/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(action === 'reject' ? { reason } : {}),
        throwOnHttpError: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const maxGmv = metrics ? Math.max(...metrics.monthly_trend.map((t) => t.gmv), 1) : 1;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 shadow-sm border border-slate-700 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-9xl opacity-5">🦅</div>
        <h1 className="text-3xl font-black text-white mb-2 relative z-10">Operasyon Paneli</h1>
        <p className="text-slate-400 font-medium relative z-10">
          Hoş geldiniz, {user?.username || 'Yönetici'}! Platform ciro, komisyon ve hakediş akışı.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-2xl p-4 text-sm">{error}</div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon="💰"
          label="GMV (Toplam Ciro)"
          value={metrics ? tl(metrics.cards.gmv.total) : '—'}
          sub={metrics ? `Bu ay ${tl(metrics.cards.gmv.month)}` : ''}
          loading={loading}
        />
        <MetricCard
          icon="🎟️"
          label="Rezervasyon"
          value={metrics ? metrics.cards.reservations.total.toLocaleString('tr-TR') : '—'}
          sub={metrics ? `Bu ay ${metrics.cards.reservations.month}` : ''}
          loading={loading}
        />
        <MetricCard
          icon="🏦"
          label="Komisyon Geliri"
          value={metrics ? tl(metrics.cards.commission_revenue.total) : '—'}
          sub={metrics ? `Bu ay ${tl(metrics.cards.commission_revenue.month)}` : ''}
          loading={loading}
        />
        <MetricCard
          icon="🏢"
          label="Aktif Acente"
          value={metrics ? metrics.cards.active_agencies.total.toLocaleString('tr-TR') : '—'}
          sub={metrics ? `Bu ay +${metrics.cards.active_agencies.month}` : ''}
          loading={loading}
        />
      </div>

      {/* Monthly trend */}
      <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 border border-slate-700 dark:border-slate-800">
        <h2 className="text-lg font-bold text-white mb-6">Aylık Ciro Trendi (Son 12 Ay)</h2>
        {metrics && metrics.monthly_trend.length > 0 ? (
          <div className="flex items-end gap-2 h-48">
            {metrics.monthly_trend.map((t) => (
              <div key={t.month} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {tl(t.gmv)}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all"
                  style={{ height: `${Math.max((t.gmv / maxGmv) * 100, 2)}%` }}
                />
                <span className="text-[9px] text-slate-500 rotate-45 origin-left whitespace-nowrap">
                  {t.month}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">{loading ? 'Yükleniyor...' : 'Henüz veri yok.'}</p>
        )}
      </div>

      {/* Payout queue + shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 dark:bg-black rounded-3xl p-6 border border-slate-700 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Hakediş Onay Kuyruğu</h2>
            {metrics && metrics.pending_payouts.count > 0 && (
              <span className="bg-yellow-900/40 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
                {metrics.pending_payouts.count} bekliyor · {tl(metrics.pending_payouts.total)}
              </span>
            )}
          </div>
          {payouts.length === 0 ? (
            <p className="text-slate-500 text-sm">{loading ? 'Yükleniyor...' : 'Bekleyen hakediş talebi yok.'}</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800 rounded-2xl p-4 border border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{p.agency_name}</p>
                    <p className="text-xs text-slate-400">
                      {tl(p.amount)} · {p.iban_masked || 'IBAN yok'} ·{' '}
                      {new Date(p.requested_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => resolvePayout(p.id, 'approve')}
                      disabled={processingId === p.id}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => resolvePayout(p.id, 'reject')}
                      disabled={processingId === p.id}
                      className="bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Link
            href="/dashboard/admin/basvurular"
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-orange-500 transition-colors cursor-pointer group block"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏢</div>
            <h3 className="text-lg font-bold text-white mb-1">Acenta & Restoran Onay</h3>
            <p className="text-xs text-slate-400">Bekleyen ticari kayıt başvuruları.</p>
          </Link>
        </div>
      </div>

      {/* Agency performance + recent bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 border border-slate-700 dark:border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4">Acente Performansı</h2>
          {metrics && metrics.agency_performance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-700">
                    <th className="py-2 pr-2">Acente</th>
                    <th className="py-2 px-2 text-right">Ciro</th>
                    <th className="py-2 px-2 text-right">Komisyon</th>
                    <th className="py-2 pl-2 text-right">Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.agency_performance.map((a) => (
                    <tr key={a.agency_id} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-2 pr-2 text-white font-medium truncate max-w-[140px]">{a.agency_name}</td>
                      <td className="py-2 px-2 text-right text-slate-300">{tl(a.gross)}</td>
                      <td className="py-2 px-2 text-right text-cyan-400">{tl(a.commission)}</td>
                      <td className="py-2 pl-2 text-right text-slate-400">{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">{loading ? 'Yükleniyor...' : 'Henüz satış yok.'}</p>
          )}
        </div>

        <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 border border-slate-700 dark:border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4">Son Rezervasyonlar</h2>
          {metrics && metrics.recent_bookings.length > 0 ? (
            <div className="space-y-2">
              {metrics.recent_bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/60 last:border-0">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{b.service}</p>
                    <p className="text-[11px] text-slate-500">
                      {b.user} · {new Date(b.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-300 text-sm">{tl(b.amount)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${STATUS_COLORS[b.status] || 'bg-slate-700 text-slate-300'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">{loading ? 'Yükleniyor...' : 'Henüz rezervasyon yok.'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="bg-slate-900 dark:bg-black p-6 rounded-2xl border border-slate-700 dark:border-slate-800">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-24 bg-slate-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-black text-white">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
