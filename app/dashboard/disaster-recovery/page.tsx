'use client';

import { useState, useEffect, useCallback } from 'react';

interface BackupRecord {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  sizeBytes: number;
  destination: string;
  checksum: string;
  durationSeconds: number;
  retentionExpiry: string;
}

interface BackupStats {
  totalBackups: number;
  successCount: number;
  failureCount: number;
  totalStoredBytes: number;
  nextScheduled: string;
  retentionDays: number;
}

interface BackupAlert {
  level: 'warning' | 'critical';
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
}

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return `${Math.floor(diffMs / 60000)}dk önce`;
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function timeUntil(isoStr: string): string {
  const diffMs = new Date(isoStr).getTime() - Date.now();
  if (diffMs < 0) return 'Süresi dolmuş';
  const days = Math.floor(diffMs / 86400000);
  const hrs = Math.floor((diffMs % 86400000) / 3600000);
  return `${days}g ${hrs}sa`;
}

export default function DisasterRecoveryPage() {
  const [history, setHistory] = useState<BackupRecord[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [alert, setAlert] = useState<BackupAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BackupRecord | null>(null);

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backup/status', {
        headers: { 'x-admin-token': adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setStats(data.stats || null);
        setAlert(data.alert || null);
      }
    } catch {
      // Demo data
      setHistory([
        { id: 'BKP-20260508-040001', timestamp: new Date(Date.now() - 14 * 3600000).toISOString(), status: 'success', sizeBytes: 4718592, destination: 's3://tourkia-backups-dr/backups/tourkia_20260508_040001.sql.gz.enc', checksum: 'a3f92c1b...e7f8', durationSeconds: 47, retentionExpiry: new Date(Date.now() + 6 * 86400000).toISOString() },
        { id: 'BKP-20260507-040002', timestamp: new Date(Date.now() - 38 * 3600000).toISOString(), status: 'success', sizeBytes: 4620288, destination: 's3://tourkia-backups-dr/backups/tourkia_20260507_040002.sql.gz.enc', checksum: 'b5d7e1f3...a4c6', durationSeconds: 43, retentionExpiry: new Date(Date.now() + 5 * 86400000).toISOString() },
        { id: 'BKP-20260506-040003', timestamp: new Date(Date.now() - 62 * 3600000).toISOString(), status: 'failed', sizeBytes: 0, destination: 'n/a', checksum: 'n/a', durationSeconds: 12, retentionExpiry: new Date(Date.now() + 4 * 86400000).toISOString() },
        { id: 'BKP-20260505-040001', timestamp: new Date(Date.now() - 86 * 3600000).toISOString(), status: 'success', sizeBytes: 4456448, destination: 's3://tourkia-backups-dr/backups/tourkia_20260505_040001.sql.gz.enc', checksum: 'c7d9f1a3...e7d9', durationSeconds: 51, retentionExpiry: new Date(Date.now() + 3 * 86400000).toISOString() },
      ]);
      setStats({ totalBackups: 4, successCount: 3, failureCount: 1, totalStoredBytes: 13795328, nextScheduled: '04:00 UTC (her gece)', retentionDays: 7 });
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    setTriggerResult('');
    try {
      const res = await fetch('/api/backup/status', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: 's3' }),
      });
      const data = await res.json();
      setTriggerResult(data.message || 'Kuyruğa alındı');
      setTimeout(fetchStatus, 2000);
    } catch {
      setTriggerResult('Manuel yedek komutu kuyruğa alındı (simülasyon)');
    } finally {
      setTriggering(false);
    }
  };

  const latestSuccess = history.find((b) => b.status === 'success');
  const hoursAgo = latestSuccess
    ? Math.floor((Date.now() - new Date(latestSuccess.timestamp).getTime()) / 3600000)
    : 999;

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        Disaster Recovery durumu yükleniyor...
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="dash-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>🛸 Disaster Recovery Protokolü</h2>
          <span style={{
            padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
            background: hoursAgo < 25 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: hoursAgo < 25 ? '#10b981' : '#ef4444',
            border: `1px solid ${hoursAgo < 25 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {hoursAgo < 25 ? `✅ Son yedek: ${hoursAgo}sa önce` : `🚨 ${hoursAgo}sa önce`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchStatus} className="dash-btn dash-btn-secondary dash-btn-sm">🔄 Yenile</button>
          <button
            onClick={handleTriggerBackup}
            disabled={triggering}
            className="dash-btn dash-btn-primary dash-btn-sm"
          >
            {triggering ? '⏳ Yedekleniyor...' : '💾 Şimdi Yedekle'}
          </button>
        </div>
      </div>

      {/* Manuel Tetikleme Bildirimi */}
      {triggerResult && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
          ✅ {triggerResult}
        </div>
      )}

      {/* Kıyamet Uyarısı */}
      {alert && (
        <div style={{
          marginBottom: '16px', padding: '14px 16px',
          background: alert.level === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${alert.level === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: '10px', fontSize: '13px', fontWeight: 700,
          color: alert.level === 'critical' ? '#ef4444' : '#f59e0b',
        }}>
          {alert.level === 'critical' ? '🚨' : '⚠️'} {alert.message}
        </div>
      )}

      {/* Özet Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          {
            label: 'RTO Hedefi',
            value: '10 dk',
            sub: 'Kurtarma süresi',
            icon: '⚡',
            color: '#10b981',
          },
          {
            label: 'RPO Hedefi',
            value: '24 sa',
            sub: 'Maks. veri kaybı',
            icon: '🕐',
            color: '#3b82f6',
          },
          {
            label: 'Başarılı Yedek',
            value: `${stats?.successCount || 0}/${stats?.totalBackups || 0}`,
            sub: `${stats?.retentionDays || 7} günlük arşiv`,
            icon: '✅',
            color: '#10b981',
          },
          {
            label: 'Toplam Depolama',
            value: formatBytes(stats?.totalStoredBytes || 0),
            sub: 'AES-256 şifreli',
            icon: '🔐',
            color: '#8b5cf6',
          },
        ].map((card) => (
          <div key={card.label} style={{ background: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: 'var(--dash-radius)', padding: '20px' }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: card.color, letterSpacing: '-0.03em' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text)', fontWeight: 700, marginTop: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Yedek Geçmişi Tablosu */}
      <div className="dash-table-container">
        <div className="dash-table-toolbar">
          <div className="dash-table-title">📋 Yedek Geçmişi</div>
          <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>
            Sonraki otomatik yedek: <strong style={{ color: 'var(--dash-accent)' }}>{stats?.nextScheduled}</strong>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Yedek ID</th>
                <th>Zaman</th>
                <th>Durum</th>
                <th>Boyut</th>
                <th>Süre</th>
                <th>Saklama Sona</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--dash-accent)' }}>
                      {record.id}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap' }}>
                    <span title={new Date(record.timestamp).toLocaleString('tr-TR')}>
                      {timeAgo(record.timestamp)}
                    </span>
                  </td>
                  <td>
                    {record.status === 'success' && (
                      <span className="status-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <span className="dot" style={{ background: '#10b981' }} /> Başarılı
                      </span>
                    )}
                    {record.status === 'failed' && (
                      <span className="status-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <span className="dot" style={{ background: '#ef4444' }} /> Başarısız
                      </span>
                    )}
                    {record.status === 'running' && (
                      <span className="status-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <span className="dot" style={{ background: '#f59e0b', animation: 'pulse 1s infinite' }} /> Çalışıyor
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                    {record.sizeBytes > 0 ? formatBytes(record.sizeBytes) : '—'}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>
                    {record.durationSeconds}sn
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    <span style={{ color: record.status === 'success' ? '#10b981' : 'var(--dash-text-muted)' }}>
                      {record.status === 'success' ? timeUntil(record.retentionExpiry) : '—'}
                    </span>
                  </td>
                  <td>
                    <button className="dash-btn dash-btn-secondary dash-btn-sm" style={{ fontSize: '11px' }}>
                      {selectedRecord?.id === record.id ? '▲ Gizle' : '▼ Detay'}
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--dash-text-muted)' }}>
                    Henüz yedek alınmamış
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seçili Kayıt Detayı */}
        {selectedRecord && selectedRecord.status === 'success' && (
          <div style={{ margin: '16px 0', padding: '20px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dash-accent)', marginBottom: '14px' }}>
              🔍 Yedek Detayları — {selectedRecord.id}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '4px' }}>Hedef Lokasyon</div>
                <code style={{ fontSize: '11px', color: '#60a5fa', wordBreak: 'break-all' }}>{selectedRecord.destination}</code>
              </div>
              <div>
                <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '4px' }}>SHA-256 Bütünlük Hash'i</div>
                <code style={{ fontSize: '11px', color: '#34d399' }}>{selectedRecord.checksum}</code>
              </div>
              <div>
                <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '4px' }}>Şifreleme</div>
                <span style={{ color: 'var(--dash-text)' }}>AES-256 (Fernet) + S3 SSE-AES256</span>
              </div>
              <div>
                <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '4px' }}>Saklama Bitiş Tarihi</div>
                <span style={{ color: 'var(--dash-text)' }}>{new Date(selectedRecord.retentionExpiry).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

            {/* Kurtarma Komutları */}
            <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(99,91,255,0.06)', border: '1px solid rgba(99,91,255,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚡ 10 Dakika İçinde Kurtarma Komutları
              </div>
              <pre style={{ fontSize: '11px', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.8' }}>{`# 1. Şifreli yedeği S3'ten indir
aws s3 cp ${selectedRecord.destination} ./recovery.sql.gz.enc

# 2. Şifreyi çöz (AES-256 Fernet)
python manage.py restore_backup --file recovery.sql.gz.enc

# 3. PostgreSQL'e yükle
gunzip -c recovery.sql.gz | psql -U tourkia -d tourkia_db

# 4. Django migration'larını uygula
python manage.py migrate --run-syncdb

# 5. Sistemi başlat
docker-compose up -d`}
              </pre>
            </div>
          </div>
        )}

        {/* Altyapı Bilgisi */}
        <div style={{
          marginTop: '16px', padding: '16px',
          background: 'rgba(99,91,255,0.05)', border: '1px solid rgba(99,91,255,0.12)',
          borderRadius: 'var(--dash-radius-sm)', fontSize: '12px', lineHeight: '1.7', color: 'var(--dash-text-muted)',
        }}>
          <strong style={{ color: 'var(--dash-accent)' }}>🛸 DR Protokolü Aktif</strong>
          {' '}— Her gece 04:00 UTC'de otomatik yedek alınır.
          {' '}Yedekler AES-256 ile şifrelenir, SHA-256 checksum ile imzalanır ve ana sunucudan izole S3'e yüklenir.
          {' '}7 günlük arşiv tutulur.
          {' '}<strong style={{ color: '#10b981' }}>RTO: 10 dakika</strong> | <strong style={{ color: '#3b82f6' }}>RPO: 24 saat</strong>
        </div>
      </div>
    </>
  );
}
