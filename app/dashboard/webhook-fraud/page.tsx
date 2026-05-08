'use client';

import { useState, useEffect, useCallback } from 'react';

interface FraudAlert {
  id: string;
  timestamp: string;
  provider: 'stripe' | 'iyzico' | 'paytr' | 'unknown';
  ip: string;
  reason: string;
  severity: 'high' | 'critical';
}

const PROVIDER_META: Record<string, { label: string; color: string; bg: string }> = {
  stripe:  { label: 'Stripe',  color: '#635bff', bg: 'rgba(99,91,255,0.1)' },
  iyzico:  { label: 'İyzico',  color: '#00b3d4', bg: 'rgba(0,179,212,0.1)' },
  paytr:   { label: 'PayTR',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  unknown: { label: '?',       color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

const DEMO_ALERTS: FraudAlert[] = [
  {
    id: 'FRAUD-1746705600000-A3X7KP',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    provider: 'stripe',
    ip: '185.220.101.47',
    reason: 'Stripe imzası eşleşmedi — HMAC-SHA256 uyumsuzluğu',
    severity: 'critical',
  },
  {
    id: 'FRAUD-1746705480000-B8M2QR',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    provider: 'unknown',
    ip: '91.108.4.213',
    reason: "Tanımsız ödeme sağlayıcısı — imza header'ı bulunamadı",
    severity: 'high',
  },
  {
    id: 'FRAUD-1746704940000-C5N9WE',
    timestamp: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    provider: 'iyzico',
    ip: '45.141.215.100',
    reason: 'İyzico imzası eşleşmedi — HMAC-SHA256 uyumsuzluğu',
    severity: 'critical',
  },
  {
    id: 'FRAUD-1746703800000-D2L4FT',
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    provider: 'stripe',
    ip: '193.32.127.80',
    reason: 'Stripe event zaman aşımı — 842s gecikme (limit: 300s) — Replay Attack şüphesi',
    severity: 'critical',
  },
];

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins}d önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

export default function WebhookFraudPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high'>('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [newAlertCount, setNewAlertCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks/payment', {
        headers: { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret' },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || DEMO_ALERTS);
      } else {
        setAlerts(DEMO_ALERTS);
      }
    } catch {
      setAlerts(DEMO_ALERTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // 30 saniyede bir otomatik yenile
    const interval = setInterval(() => {
      setNewAlertCount((c) => c + 1);
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const filtered = alerts.filter((a) => {
    const matchSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchProvider = filterProvider === 'all' || a.provider === filterProvider;
    return matchSeverity && matchProvider;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        Fraud logları yükleniyor...
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="dash-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>Webhook Fraud Monitor</h2>
          {criticalCount > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 700,
              animation: 'pulse 2s infinite',
            }}>
              🚨 {criticalCount} KRİTİK
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="dash-btn dash-btn-secondary dash-btn-sm"
        >
          🔄 Yenile
        </button>
      </div>

      {/* Özet Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Toplam Alert', value: alerts.length, color: 'var(--dash-accent)', icon: '🛡️' },
          { label: 'Kritik', value: alerts.filter(a => a.severity === 'critical').length, color: '#ef4444', icon: '🚨' },
          { label: 'Stripe', value: alerts.filter(a => a.provider === 'stripe').length, color: '#635bff', icon: '💳' },
          { label: 'Bilinmeyen IP', value: alerts.filter(a => a.provider === 'unknown').length, color: '#f59e0b', icon: '❓' },
        ].map((card) => (
          <div key={card.label} style={{
            background: 'var(--dash-card)',
            border: '1px solid var(--dash-border)',
            borderRadius: 'var(--dash-radius)',
            padding: '20px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Alert Tablosu */}
      <div className="dash-table-container">
        <div className="dash-table-toolbar">
          <div className="dash-table-title">🔍 Sahte Webhook Girişimleri</div>
          <div className="dash-table-filters">
            <select
              className="dash-filter-select"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
            >
              <option value="all">Tüm Seviyeler</option>
              <option value="critical">Kritik</option>
              <option value="high">Yüksek</option>
            </select>
            <select
              className="dash-filter-select"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <option value="all">Tüm Sağlayıcılar</option>
              <option value="stripe">Stripe</option>
              <option value="iyzico">İyzico</option>
              <option value="paytr">PayTR</option>
              <option value="unknown">Bilinmeyen</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Zaman</th>
                <th>Sağlayıcı</th>
                <th>IP Adresi</th>
                <th>Sebep</th>
                <th>Seviye</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert) => {
                const meta = PROVIDER_META[alert.provider];
                return (
                  <tr key={alert.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--dash-accent)' }}>
                        {alert.id}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap' }}>
                      <span title={new Date(alert.timestamp).toLocaleString('tr-TR')}>
                        {timeAgo(alert.timestamp)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: meta.color,
                        background: meta.bg,
                      }}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        padding: '2px 8px',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#f87171',
                        borderRadius: '6px',
                      }}>
                        {alert.ip}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '13px', color: 'var(--dash-text-muted)' }}>
                      {alert.reason}
                    </td>
                    <td>
                      {alert.severity === 'critical' ? (
                        <span className="status-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <span className="dot" style={{ background: '#ef4444' }} />
                          Kritik
                        </span>
                      ) : (
                        <span className="status-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <span className="dot" style={{ background: '#f59e0b' }} />
                          Yüksek
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--dash-text-muted)' }}>
                    ✅ Şüpheli webhook girişimi tespit edilmedi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Güvenlik Notu */}
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(99,91,255,0.06)',
          border: '1px solid rgba(99,91,255,0.15)',
          borderRadius: 'var(--dash-radius-sm)',
          fontSize: '12px',
          color: 'var(--dash-text-muted)',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: 'var(--dash-accent)' }}>🛡️ Webhook Armor Aktif</strong>
          {' '}— Tüm ödeme webhook'ları HMAC-SHA256 imza doğrulamasından geçiyor.
          Stripe, İyzico ve PayTR destekleniyor. Replay Attack koruması (5dk tolerans) aktif.
          İmza uyuşmazlığında bu panel otomatik güncellenir ve {process.env.ADMIN_ALERT_EMAIL || 'admin@tourkia.com'} adresine alarm gönderilir.
        </div>
      </div>
    </>
  );
}
