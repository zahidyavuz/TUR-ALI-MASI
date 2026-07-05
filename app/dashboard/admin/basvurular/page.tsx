'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/app/lib/api';

interface AgencyApplication {
  id: number;
  name: string;
  business_type: string;
  status: string;
  onboarding_step: number;
  owner_username: string | null;
  email: string;
  phone: string;
  created_at: string;
  logo?: string;
  cover_image?: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  legal_entity_type?: string;
  tax_id?: string;
  tax_office?: string;
  mersis_no?: string;
  trade_registry_document?: string;
  tursab_no?: string;
  tursab_group?: string;
  tursab_document?: string;
  iban?: string;
  bank_account_holder?: string;
  bank_name?: string;
  rejection_reason?: string;
}

const STATUS_LABELS: Record<string, string> = {
  taslak: 'Taslak',
  beklemede: 'Beklemede',
  inceleniyor: 'İnceleniyor',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
  eksik_bilgi: 'Eksik Bilgi',
};

const STATUS_COLORS: Record<string, string> = {
  taslak: 'bg-slate-700 text-slate-300',
  beklemede: 'bg-yellow-900/40 text-yellow-400',
  inceleniyor: 'bg-blue-900/40 text-blue-400',
  onaylandi: 'bg-green-900/40 text-green-400',
  reddedildi: 'bg-red-900/40 text-red-400',
  eksik_bilgi: 'bg-orange-900/40 text-orange-400',
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('beklemede');

  const [selected, setSelected] = useState<AgencyApplication | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [activeAction, setActiveAction] = useState<'reject' | 'info' | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const query = statusFilter ? `?status=${statusFilter}` : '';
    const data = await fetchAPI(`/admin/agencies/${query}`);
    if (!data) {
      setLoadError('Başvurular yüklenemedi.');
      setApplications([]);
    } else {
      setApplications(data.results || data);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const openDetail = async (id: number) => {
    setActionError(null);
    setActiveAction(null);
    const detail = await fetchAPI(`/admin/agencies/${id}/`);
    if (detail) setSelected(detail);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);
    setActionError(null);
    try {
      await fetchAPI(`/admin/agencies/${selected.id}/approve/`, { method: 'POST', throwOnHttpError: true });
      setSelected(null);
      await loadApplications();
    } catch (err: any) {
      setActionError(err?.message || 'Onaylanamadı.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setProcessing(true);
    setActionError(null);
    try {
      await fetchAPI(`/admin/agencies/${selected.id}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
        throwOnHttpError: true,
      });
      setSelected(null);
      setRejectReason('');
      await loadApplications();
    } catch (err: any) {
      setActionError(err?.message || 'Reddedilemedi.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selected || !infoMessage.trim()) return;
    setProcessing(true);
    setActionError(null);
    try {
      await fetchAPI(`/admin/agencies/${selected.id}/request-more-info/`, {
        method: 'POST',
        body: JSON.stringify({ message: infoMessage }),
        throwOnHttpError: true,
      });
      setSelected(null);
      setInfoMessage('');
      await loadApplications();
    } catch (err: any) {
      setActionError(err?.message || 'Gönderilemedi.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <h1 className="text-2xl font-black mb-1">İşletme Başvuruları</h1>
      <p className="text-slate-400 text-sm mb-6">Bekleyen partner başvurularını inceleyin, onaylayın veya reddedin.</p>

      <div className="flex gap-2 mb-6">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${statusFilter === key ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${statusFilter === '' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Tümü
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste */}
        <div className="space-y-2">
          {loading && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
          {loadError && <p className="text-red-400 text-sm font-bold">{loadError}</p>}
          {!loading && !loadError && applications.length === 0 && (
            <p className="text-slate-500 text-sm">Bu durumda başvuru yok.</p>
          )}
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => openDetail(app.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${selected?.id === app.id ? 'border-white bg-slate-800' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">{app.name}</h3>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${STATUS_COLORS[app.status] || 'bg-slate-700'}`}>
                  {STATUS_LABELS[app.status] || app.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{app.business_type} · {app.email}</p>
              <p className="text-[11px] text-slate-500 mt-1">{new Date(app.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
          ))}
        </div>

        {/* Detay */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit sticky top-6">
          {!selected ? (
            <p className="text-slate-500 text-sm">Detay görmek için bir başvuru seçin.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-black">{selected.name}</h2>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>

              {selected.logo && (
                <img src={selected.logo} alt="Logo" className="w-20 h-20 rounded-xl object-cover border border-slate-800" />
              )}

              <DetailRow label="Sahip" value={selected.owner_username} />
              <DetailRow label="İşletme Türü" value={selected.business_type} />
              <DetailRow label="Tüzel Kişilik" value={selected.legal_entity_type} />
              <DetailRow label="Telefon" value={selected.phone} />
              <DetailRow label="E-posta" value={selected.email} />
              <DetailRow label="Vergi No / TCKN" value={selected.tax_id} />
              <DetailRow label="Vergi Dairesi" value={selected.tax_office} />
              <DetailRow label="MERSİS" value={selected.mersis_no} />
              <DetailRow label="Şehir/İlçe" value={[selected.city, selected.district].filter(Boolean).join(' / ')} />
              <DetailRow label="Adres" value={selected.address} />
              <DetailRow label="Açıklama" value={selected.description} />

              {(selected.business_type === 'acenta' || selected.business_type === 'her_ikisi') && (
                <>
                  <DetailRow label="TÜRSAB No" value={selected.tursab_no} />
                  <DetailRow label="Acenta Grubu" value={selected.tursab_group} />
                  {selected.tursab_document && <DocumentLink label="TÜRSAB Belgesi" url={selected.tursab_document} />}
                </>
              )}
              {selected.trade_registry_document && <DocumentLink label="Ticaret Sicil Belgesi" url={selected.trade_registry_document} />}

              <DetailRow label="IBAN" value={selected.iban} />
              <DetailRow label="Hesap Sahibi" value={selected.bank_account_holder} />
              <DetailRow label="Banka" value={selected.bank_name} />

              {selected.rejection_reason && (
                <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 text-xs text-red-300">
                  Önceki not: {selected.rejection_reason}
                </div>
              )}

              {actionError && (
                <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 text-xs text-red-300 font-bold">{actionError}</div>
              )}

              {selected.status === 'beklemede' || selected.status === 'inceleniyor' ? (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Onayla
                  </button>

                  {activeAction === 'reject' ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Red sebebi (partnere gösterilecek)"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                        rows={2}
                      />
                      <button onClick={handleReject} disabled={processing || !rejectReason.trim()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50">
                        Reddi Onayla
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveAction('reject')} className="w-full bg-slate-800 hover:bg-red-900/30 text-red-400 font-bold py-2.5 rounded-xl transition-colors">
                      Reddet
                    </button>
                  )}

                  {activeAction === 'info' ? (
                    <div className="space-y-2">
                      <textarea
                        value={infoMessage}
                        onChange={(e) => setInfoMessage(e.target.value)}
                        placeholder="Eksik bilgi mesajı (partnere gösterilecek)"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                        rows={2}
                      />
                      <button onClick={handleRequestInfo} disabled={processing || !infoMessage.trim()} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50">
                        Eksik Bilgi Talebini Gönder
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveAction('info')} className="w-full bg-slate-800 hover:bg-orange-900/30 text-orange-400 font-bold py-2.5 rounded-xl transition-colors">
                      Eksik Bilgi İste
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block text-xs font-bold text-blue-400 hover:underline">
      📄 {label} — Görüntüle
    </a>
  );
}
