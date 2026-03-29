'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface DashboardData {
  widgets: {
    active_agencies: { value: number; total: number };
    pending_approvals: { value: number };
    todays_bookings: { value: number; yesterday: number };
    payment_stats: {
      all_time: { confirmed: number; pending: number; failed: number; cancelled: number };
      today: { confirmed: number; pending: number; failed: number; cancelled: number };
    };
  };
  total_revenue: number;
  todays_revenue: number;
  total_tours: number;
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    status: string;
    amount: number;
    time: string;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

// Demo data for when API is not available
const DEMO_DATA: DashboardData = {
  widgets: {
    active_agencies: { value: 12, total: 18 },
    pending_approvals: { value: 3 },
    todays_bookings: { value: 24, yesterday: 19 },
    payment_stats: {
      all_time: { confirmed: 156, pending: 12, failed: 3, cancelled: 8 },
      today: { confirmed: 18, pending: 4, failed: 1, cancelled: 1 },
    },
  },
  total_revenue: 285400,
  todays_revenue: 18750,
  total_tours: 47,
  recent_activities: [
    { id: '1', type: 'booking', description: 'Ali K. - Kapadokya Balon Turu', status: 'confirmed', amount: 2400, time: new Date(Date.now() - 300000).toISOString() },
    { id: '2', type: 'booking', description: 'Mehmet Y. - Pamukkale Turu', status: 'pending', amount: 1800, time: new Date(Date.now() - 1800000).toISOString() },
    { id: '3', type: 'booking', description: 'Ayşe D. - İstanbul Boğaz Turu', status: 'confirmed', amount: 950, time: new Date(Date.now() - 3600000).toISOString() },
    { id: '4', type: 'booking', description: 'Fatma S. - Efes Antik Kent', status: 'failed', amount: 1200, time: new Date(Date.now() - 7200000).toISOString() },
    { id: '5', type: 'booking', description: 'Emre T. - Antalya Tekne Turu', status: 'confirmed', amount: 750, time: new Date(Date.now() - 14400000).toISOString() },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const token = typeof window !== 'undefined'
          ? (localStorage.getItem('access_token') || document.cookie.match(/auth-token=([^;]+)/)?.[1])
          : null;

        const res = await fetch(`${API_BASE}/admin/dashboard/`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          // Use demo data if API fails
          setData(DEMO_DATA);
        }
      } catch {
        setData(DEMO_DATA);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        Yükleniyor...
      </div>
    );
  }

  if (!data) return null;

  const { widgets } = data;
  const bookingChange = widgets.todays_bookings.yesterday > 0
    ? Math.round(((widgets.todays_bookings.value - widgets.todays_bookings.yesterday) / widgets.todays_bookings.yesterday) * 100)
    : 0;

  return (
    <>
      {/* Widget Cards */}
      <div className="dash-widgets">
        {/* Active Agencies */}
        <div className="stat-card accent-green">
          <div className="stat-card-header">
            <div className="stat-card-icon">🏢</div>
            <span className="stat-card-badge neutral">
              / {widgets.active_agencies.total}
            </span>
          </div>
          <div className="stat-card-value">{widgets.active_agencies.value}</div>
          <div className="stat-card-label">Aktif Acente</div>
          <div className="stat-card-sub">Onaylı ve aktif acenteler</div>
        </div>

        {/* Pending Approvals */}
        <div className="stat-card accent-orange">
          <div className="stat-card-header">
            <div className="stat-card-icon">⏳</div>
            {widgets.pending_approvals.value > 0 && (
              <span className="stat-card-badge down">
                Aksiyon Bekliyor
              </span>
            )}
          </div>
          <div className="stat-card-value">{widgets.pending_approvals.value}</div>
          <div className="stat-card-label">Bekleyen Onaylar</div>
          <div className="stat-card-sub">Onay bekleyen acente başvuruları</div>
        </div>

        {/* Today's Bookings */}
        <div className="stat-card accent-blue">
          <div className="stat-card-header">
            <div className="stat-card-icon">📋</div>
            <span className={`stat-card-badge ${bookingChange >= 0 ? 'up' : 'down'}`}>
              {bookingChange >= 0 ? '↑' : '↓'} {Math.abs(bookingChange)}%
            </span>
          </div>
          <div className="stat-card-value">{widgets.todays_bookings.value}</div>
          <div className="stat-card-label">Bugünkü Rezervasyonlar</div>
          <div className="stat-card-sub">Dün: {widgets.todays_bookings.yesterday}</div>
        </div>

        {/* Payment Stats */}
        <div className="stat-card accent-purple">
          <div className="stat-card-header">
            <div className="stat-card-icon">💳</div>
            <span className="stat-card-badge neutral">Bugün</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '22px' }}>
            {formatCurrency(data.todays_revenue)}
          </div>
          <div className="stat-card-label">Iyzico Ödeme Statüleri</div>
          <div className="payment-breakdown">
            <div className="payment-item confirmed">
              <div className="payment-item-value">{widgets.payment_stats.today.confirmed}</div>
              <div className="payment-item-label">Onaylı</div>
            </div>
            <div className="payment-item pending">
              <div className="payment-item-value">{widgets.payment_stats.today.pending}</div>
              <div className="payment-item-label">Bekleyen</div>
            </div>
            <div className="payment-item failed">
              <div className="payment-item-value">{widgets.payment_stats.today.failed}</div>
              <div className="payment-item-label">Başarısız</div>
            </div>
            <div className="payment-item cancelled">
              <div className="payment-item-value">{widgets.payment_stats.today.cancelled}</div>
              <div className="payment-item-label">İptal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Stats Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card accent-green">
          <div className="stat-card-label" style={{ marginBottom: '8px' }}>Toplam Gelir</div>
          <div className="stat-card-value" style={{ fontSize: '28px' }}>
            {formatCurrency(data.total_revenue)}
          </div>
          <div className="stat-card-sub">Tüm zamanlar — Onaylı ödemeler</div>
        </div>
        <div className="stat-card accent-blue">
          <div className="stat-card-label" style={{ marginBottom: '8px' }}>Toplam Tur</div>
          <div className="stat-card-value" style={{ fontSize: '28px' }}>
            {data.total_tours}
          </div>
          <div className="stat-card-sub">Sistemde kayıtlı aktif turlar</div>
        </div>
      </div>

      {/* All-time payment overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Payment Overview */}
        <div className="dash-activity">
          <div className="dash-activity-title">📊 Tüm Zamanlar — Ödeme Özeti</div>
          <div className="payment-breakdown" style={{ marginTop: '0' }}>
            <div className="payment-item confirmed">
              <div className="payment-item-value">{widgets.payment_stats.all_time.confirmed}</div>
              <div className="payment-item-label">Onaylı</div>
            </div>
            <div className="payment-item pending">
              <div className="payment-item-value">{widgets.payment_stats.all_time.pending}</div>
              <div className="payment-item-label">Bekleyen</div>
            </div>
            <div className="payment-item failed">
              <div className="payment-item-value">{widgets.payment_stats.all_time.failed}</div>
              <div className="payment-item-label">Başarısız</div>
            </div>
            <div className="payment-item cancelled">
              <div className="payment-item-value">{widgets.payment_stats.all_time.cancelled}</div>
              <div className="payment-item-label">İptal</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dash-activity">
          <div className="dash-activity-title">🕐 Son Aktiviteler</div>
          {data.recent_activities.map((activity) => (
            <div key={activity.id} className="dash-activity-item">
              <div className={`dash-activity-dot ${activity.status}`} />
              <div className="dash-activity-text">
                {activity.description}
                <span style={{ color: 'var(--dash-text-muted)', marginLeft: '8px' }}>
                  {formatCurrency(activity.amount)}
                </span>
              </div>
              <div className="dash-activity-time">{timeAgo(activity.time)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
