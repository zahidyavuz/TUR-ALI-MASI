'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuditEntry, AuditAction, AuditResource } from '../../lib/auditLog';

// ─── Sabit Haritalama ─────────────────────────────────────────────────────────
const ACTION_META: Record<AuditAction, { label: string; icon: string; color: string }> = {
  AGENCY_COMMISSION_CHANGED: { label: 'Komisyon Değişimi',    icon: '💰', color: '#f59e0b' },
  AGENCY_STATUS_CHANGED:     { label: 'Acenta Durum',         icon: '🔄', color: '#8b5cf6' },
  AGENCY_APPROVED:           { label: 'Acenta Onaylandı',     icon: '✅', color: '#10b981' },
  TOUR_PRICE_CHANGED:        { label: 'Fiyat Değişimi',       icon: '🏷️', color: '#f97316' },
  TOUR_CANCELLED:            { label: 'Tur İptali',           icon: '🚫', color: '#ef4444' },
  TOUR_CREATED:              { label: 'Yeni Tur',             icon: '✨', color: '#06b6d4' },
  BOOKING_CANCELLED:         { label: 'Rezervasyon İptali',   icon: '❌', color: '#ef4444' },
  BOOKING_CONFIRMED:         { label: 'Rezervasyon Onayı',    icon: '✓',  color: '#10b981' },
  PAYOUT_PROCESSED:          { label: 'Hakediş Ödendi',       icon: '💸', color: '#10b981' },
  PAYOUT_WITHHELD:           { label: 'Hakediş Durduruldu',   icon: '🛑', color: '#ef4444' },
  USER_ROLE_CHANGED:         { label: 'Rol Değişimi',         icon: '👤', color: '#8b5cf6' },
  USER_BANNED:               { label: 'Kullanıcı Engellendi', icon: '🔒', color: '#ef4444' },
  ADMIN_LOGIN:               { label: 'Admin Girişi',          icon: '🔑', color: '#3b82f6' },
  SETTINGS_CHANGED:          { label: 'Ayar Değişimi',        icon: '⚙️', color: '#6b7280' },
  FRAUD_DETECTED:            { label: 'Dolandırıcılık',       icon: '🚨', color: '#ef4444' },
  WEBHOOK_SIGNATURE_FAILED:  { label: 'Sahte Webhook',        icon: '🛡️', color: '#ef4444' },
  SCRAPER_DETECTED:          { label: 'Bot Engellendi',      icon: '🤖', color: '#f97316' },
  SESSION_HIJACK_DETECTED:   { label: 'Oturum Çalma',        icon: '🚨', color: '#7f1d1d' },
  BOLA_VIOLATION:            { label: 'Yetkisiz Erişim',     icon: '🚫', color: '#991b1b' },
  SSRF_ATTEMPT:              { label: 'Sunucu Sızıntısı',    icon: '🔥', color: '#b91c1c' },
};

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  admin:    { label: 'Admin',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  agency:   { label: 'Acenta',  color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  customer: { label: 'Müşteri', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  system:   { label: 'Sistem',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}sn önce`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return new Date(isoStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Değer Karşılaştırma Bileşeni ─────────────────────────────────────────────
function DiffView({ prev, next }: { prev?: Record<string, unknown>; next?: Record<string, unknown> }) {
  if (!prev && !next) return null;

  const keys = [...new Set([...Object.keys(prev || {}), ...Object.keys(next || {})])];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
          ← Önceki Değer
        </div>
        {keys.map((k) => (
          <div key={k} style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '3px' }}>
            <span style={{ fontWeight: 700, color: 'var(--dash-text)' }}>{k}:</span>{' '}
            <code style={{ color: '#fca5a5' }}>{String(prev?.[k] ?? '—')}</code>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
          → Yeni Değer
        </div>
        {keys.map((k) => (
          <div key={k} style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '3px' }}>
            <span style={{ fontWeight: 700, color: 'var(--dash-text)' }}>{k}:</span>{' '}
            <code style={{ color: '#6ee7b7' }}>{String(next?.[k] ?? '—')}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [integrity, setIntegrity] = useState<{ valid: boolean; tampered?: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtreler
  const [filterActor, setFilterActor]    = useState('');
  const [filterAction, setFilterAction]  = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterActor)    params.set('actor', filterActor);
      if (filterAction)   params.set('action', filterAction);
      if (filterResource) params.set('resource', filterResource);
      params.set('limit', String(LIMIT));
      params.set('offset', String(page * LIMIT));

      const res = await fetch(`/api/audit?${params}`, {
        headers: { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret' },
      });

      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
        setIntegrity(data.integrity || null);
      }
    } catch {
      // Demo data fallback — API route bağımsız
    } finally {
      setLoading(false);
    }
  }, [filterActor, filterAction, filterResource, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      {/* Header */}
      <div className="dash-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>⬛ Sistem Kara Kutusu</h2>
          {integrity && (
            <span style={{
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: integrity.valid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: integrity.valid ? '#10b981' : '#ef4444',
              border: `1px solid ${integrity.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {integrity.valid ? '🔒 Zincir Bütünlüğü: Sağlam' : `🚨 Zincir İhlali: ${integrity.tampered}`}
            </span>
          )}
        </div>
        <button onClick={fetchLogs} className="dash-btn dash-btn-secondary dash-btn-sm">
          🔄 Yenile
        </button>
      </div>

      {/* Özet Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Toplam Kayıt',      value: total,                                        icon: '📋', color: 'var(--dash-accent)' },
          { label: 'Fiyat Değişimi',    value: entries.filter(e => e.action === 'TOUR_PRICE_CHANGED').length,    icon: '🏷️', color: '#f59e0b' },
          { label: 'İptal İşlemleri',   value: entries.filter(e => e.action.includes('CANCELLED')).length,      icon: '❌', color: '#ef4444' },
          { label: 'Güvenlik Olayı',    value: entries.filter(e => ['FRAUD_DETECTED','WEBHOOK_SIGNATURE_FAILED'].includes(e.action)).length, icon: '🛡️', color: '#ef4444' },
        ].map((card) => (
          <div key={card.label} style={{ background: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: 'var(--dash-radius)', padding: '20px' }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="dash-table-container">
        <div className="dash-table-toolbar">
          <div className="dash-table-title">İz Kayıtları</div>
          <div className="dash-table-filters">
            <input
              type="text"
              className="dash-search-input"
              placeholder="🔍 Kullanıcı ara..."
              value={filterActor}
              onChange={(e) => { setFilterActor(e.target.value); setPage(0); }}
            />
            <select className="dash-filter-select" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}>
              <option value="">Tüm İşlemler</option>
              <option value="AGENCY_COMMISSION_CHANGED">Komisyon Değişimi</option>
              <option value="TOUR_PRICE_CHANGED">Fiyat Değişimi</option>
              <option value="TOUR_CANCELLED">Tur İptali</option>
              <option value="BOOKING_CANCELLED">Rezervasyon İptali</option>
              <option value="PAYOUT_PROCESSED">Hakediş Ödendi</option>
              <option value="AGENCY_APPROVED">Acenta Onayı</option>
              <option value="WEBHOOK_SIGNATURE_FAILED">Sahte Webhook</option>
              <option value="FRAUD_DETECTED">Dolandırıcılık</option>
            </select>
            <select className="dash-filter-select" value={filterResource} onChange={(e) => { setFilterResource(e.target.value); setPage(0); }}>
              <option value="">Tüm Kaynaklar</option>
              <option value="agency">Acenta</option>
              <option value="tour">Tur</option>
              <option value="booking">Rezervasyon</option>
              <option value="payout">Hakediş</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dash-loading">
            <div className="dash-spinner" />
            Audit logları yükleniyor...
          </div>
        ) : (
          <>
            {/* Timeline Log Listesi */}
            <div style={{ padding: '8px 0' }}>
              {entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dash-text-muted)' }}>
                  Kayıt bulunamadı
                </div>
              ) : entries.map((entry, idx) => {
                const meta = ACTION_META[entry.action];
                const role = ROLE_BADGE[entry.actorRole];
                const isExpanded = expandedId === entry.id;

                return (
                  <div
                    key={entry.id}
                    style={{
                      borderBottom: idx < entries.length - 1 ? '1px solid var(--dash-border)' : 'none',
                      padding: '16px 0',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {/* Ana Satır */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* İkon */}
                      <div style={{
                        width: '38px', height: '38px', flexShrink: 0,
                        borderRadius: '10px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '18px',
                        background: `${meta?.color}18`,
                        border: `1px solid ${meta?.color}30`,
                      }}>
                        {meta?.icon || '📝'}
                      </div>

                      {/* İçerik */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: meta?.color || 'var(--dash-text)' }}>
                            {meta?.label || entry.action}
                          </span>
                          <span style={{
                            padding: '1px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                            color: role?.color, background: role?.bg,
                          }}>
                            {role?.label || entry.actorRole}
                          </span>
                          {entry.actorRole === 'system' && (
                            <span style={{ fontSize: '11px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>Otomatik</span>
                          )}
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--dash-text)', marginBottom: '6px', lineHeight: '1.4' }}>
                          {entry.description}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--dash-text-muted)' }}>
                          <span>👤 <strong style={{ color: 'var(--dash-text)' }}>{entry.actorUsername}</strong></span>
                          <span>🌐 <code style={{ color: '#60a5fa' }}>{entry.ip}</code></span>
                          <span>🕐 {timeAgo(entry.timestamp)}</span>
                          <span style={{ color: 'var(--dash-text-muted)' }}>📁 {entry.resourceLabel}</span>
                        </div>
                      </div>

                      {/* Sağ: Log ID + Expand */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--dash-text-muted)', marginBottom: '4px' }}>
                          {entry.id}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--dash-accent)', fontWeight: 600 }}>
                          {isExpanded ? '▲ Gizle' : '▼ Detay'}
                        </div>
                      </div>
                    </div>

                    {/* Genişletilmiş Detay */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '16px', marginLeft: '52px',
                        background: 'var(--dash-bg)', borderRadius: '10px', padding: '16px',
                        border: '1px solid var(--dash-border)',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
                          <div>
                            <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '2px' }}>Zaman (UTC)</div>
                            <div style={{ fontFamily: 'monospace', color: 'var(--dash-text)' }}>{entry.timestamp}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '2px' }}>Kaynak ID</div>
                            <div style={{ fontFamily: 'monospace', color: 'var(--dash-accent)' }}>{entry.resourceId}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '2px' }}>Zincir Hash</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#10b981' }}>{entry.chainHash}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ color: 'var(--dash-text-muted)', fontWeight: 700, marginBottom: '2px' }}>User-Agent</div>
                            <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', wordBreak: 'break-all' }}>{entry.userAgent}</div>
                          </div>
                        </div>

                        {/* Önceki / Sonraki Değer Karşılaştırması */}
                        {(entry.previousValue || entry.newValue) && (
                          <DiffView prev={entry.previousValue} next={entry.newValue} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="dash-pagination">
                <div className="dash-pagination-info">
                  {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} / {total} kayıt
                </div>
                <div className="dash-pagination-buttons">
                  <button className="dash-page-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map((i) => (
                    <button key={i} className={`dash-page-btn ${i === page ? 'active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
                  ))}
                  <button className="dash-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
                </div>
              </div>
            )}

            {/* Bütünlük Notu */}
            <div style={{
              marginTop: '16px', padding: '14px 16px',
              background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 'var(--dash-radius-sm)', fontSize: '12px', color: 'var(--dash-text-muted)',
            }}>
              <strong style={{ color: '#10b981' }}>⬛ Kara Kutu Aktif</strong>
              {' '}— Tüm kayıtlar SHA-256 hash zincirleme ile imzalanmış ve değiştirilemez.
              Her işlem; kim, ne zaman, hangi IP'den, önceki/sonraki değerlerle birlikte saklanır.
            </div>
          </>
        )}
      </div>
    </>
  );
}
