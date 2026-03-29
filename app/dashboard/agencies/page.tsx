'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Agency {
  id: number;
  name: string;
  logo: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_demo: boolean;
  tursab_no: string | null;
  commission_rate: string;
  sub_merchant_id: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
  trust_score: string;
  tour_count: number;
  total_bookings?: number;
  total_revenue?: number;
  owner_username: string | null;
  created_at: string;
}

interface FormErrors {
  [key: string]: string;
}

// Demo data
const DEMO_AGENCIES: Agency[] = [
  { id: 1, name: 'Kapadokya Turizm A.Ş.', logo: null, is_verified: true, is_active: true, is_demo: false, tursab_no: 'A-7842', commission_rate: '12.00', sub_merchant_id: 'SM-KPD-001', phone: '+90 384 271 00 00', email: 'info@kapadokyaturizm.com', trust_score: '4.8', tour_count: 8, total_bookings: 156, total_revenue: 124500, owner_username: 'kapadokya_admin', created_at: '2025-11-15T10:00:00Z' },
  { id: 2, name: 'Ege Travel', logo: null, is_verified: true, is_active: true, is_demo: false, tursab_no: 'A-5231', commission_rate: '10.00', sub_merchant_id: 'SM-EGE-002', phone: '+90 232 464 00 00', email: 'info@egetravel.com', trust_score: '4.5', tour_count: 12, total_bookings: 89, total_revenue: 78200, owner_username: 'ege_admin', created_at: '2025-12-01T10:00:00Z' },
  { id: 3, name: 'Antalya Sun Tours', logo: null, is_verified: false, is_active: true, is_demo: false, tursab_no: null, commission_rate: '10.00', sub_merchant_id: null, phone: '+90 242 311 00 00', email: 'hello@antalyasun.com', trust_score: '3.0', tour_count: 0, total_bookings: 0, total_revenue: 0, owner_username: 'antalya_user', created_at: '2026-03-25T10:00:00Z' },
  { id: 4, name: 'Demo Acente 1', logo: null, is_verified: true, is_active: true, is_demo: true, tursab_no: 'DEMO-001', commission_rate: '10.00', sub_merchant_id: null, phone: '+90 000 000 00 00', email: 'demo1@test.com', trust_score: '5.0', tour_count: 5, total_bookings: 20, total_revenue: 15000, owner_username: 'demo1', created_at: '2026-01-10T10:00:00Z' },
  { id: 5, name: 'İstanbul Explorer', logo: null, is_verified: true, is_active: false, is_demo: false, tursab_no: 'A-9102', commission_rate: '15.00', sub_merchant_id: 'SM-IST-005', phone: '+90 212 555 00 00', email: 'info@istanbulexplorer.com', trust_score: '4.2', tour_count: 6, total_bookings: 67, total_revenue: 54300, owner_username: 'ist_admin', created_at: '2025-10-20T10:00:00Z' },
  { id: 6, name: 'Demo Acente 2', logo: null, is_verified: true, is_active: true, is_demo: true, tursab_no: 'DEMO-002', commission_rate: '8.00', sub_merchant_id: null, phone: '+90 000 000 00 01', email: 'demo2@test.com', trust_score: '4.9', tour_count: 3, total_bookings: 10, total_revenue: 8500, owner_username: 'demo2', created_at: '2026-02-01T10:00:00Z' },
];

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || document.cookie.match(/auth-token=([^;]+)/)?.[1] || null;
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalAgency, setModalAgency] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState<Partial<Agency>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const ITEMS_PER_PAGE = 10;

  const fetchAgencies = useCallback(async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterVerified !== 'all') params.set('is_verified', filterVerified);
      if (filterActive !== 'all') params.set('is_active', filterActive);

      const res = await fetch(`${API_BASE}/admin/agencies/?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        setAgencies(json.results || json);
      } else {
        setAgencies(DEMO_AGENCIES);
      }
    } catch {
      setAgencies(DEMO_AGENCIES);
    } finally {
      setLoading(false);
    }
  }, [search, filterVerified, filterActive]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  // Client-side filtering for demo data
  const filteredAgencies = agencies.filter((a) => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.tursab_no?.toLowerCase().includes(search.toLowerCase());

    const matchVerified = filterVerified === 'all' ||
      (filterVerified === 'true' ? a.is_verified : !a.is_verified);

    const matchActive = filterActive === 'all' ||
      (filterActive === 'true' ? a.is_active : !a.is_active);

    return matchSearch && matchVerified && matchActive;
  });

  const totalPages = Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE);
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Validation
  function validateForm(form: Partial<Agency>): FormErrors {
    const errors: FormErrors = {};

    if (form.name !== undefined && !form.name?.trim()) {
      errors.name = 'Acente adı zorunludur';
    }

    if (form.email !== undefined && form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        errors.email = 'Geçerli bir e-posta adresi girin';
      }
    }

    if (form.phone !== undefined && form.phone) {
      const phoneClean = form.phone.replace(/[\s\-()]/g, '');
      if (phoneClean.length < 10) {
        errors.phone = 'Geçerli bir telefon numarası girin';
      }
    }

    if (form.commission_rate !== undefined) {
      const rate = parseFloat(form.commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errors.commission_rate = 'Komisyon oranı 0-100 arasında olmalıdır';
      }
    }

    if (form.tursab_no !== undefined && form.tursab_no) {
      if (form.tursab_no.length < 3) {
        errors.tursab_no = 'Geçerli bir TURSAB numarası girin';
      }
    }

    return errors;
  }

  function openModal(agency: Agency) {
    setModalAgency(agency);
    setEditForm({
      name: agency.name,
      email: agency.email,
      phone: agency.phone,
      address: agency.address,
      website: agency.website,
      tursab_no: agency.tursab_no,
      commission_rate: agency.commission_rate,
      sub_merchant_id: agency.sub_merchant_id,
      description: agency.description,
    });
    setFormErrors({});
  }

  function closeModal() {
    setModalAgency(null);
    setEditForm({});
    setFormErrors({});
  }

  async function handleSave() {
    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/agencies/${modalAgency?.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updated = await res.json();
        setAgencies((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
        closeModal();
      } else {
        // If API fails, update locally for demo
        setAgencies((prev) =>
          prev.map((a) => (a.id === modalAgency?.id ? { ...a, ...editForm } as Agency : a))
        );
        closeModal();
      }
    } catch {
      setAgencies((prev) =>
        prev.map((a) => (a.id === modalAgency?.id ? { ...a, ...editForm } as Agency : a))
      );
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agency: Agency) {
    setActionLoading(agency.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/agencies/${agency.id}/toggle-active/`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, is_active: data.is_active } : a))
        );
      } else {
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, is_active: !a.is_active } : a))
        );
      }
    } catch {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agency.id ? { ...a, is_active: !a.is_active } : a))
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function approveAgency(agency: Agency) {
    setActionLoading(agency.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/agencies/${agency.id}/approve/`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });

      if (res.ok) {
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, is_verified: true } : a))
        );
      } else {
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, is_verified: true } : a))
        );
      }
    } catch {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agency.id ? { ...a, is_verified: true } : a))
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <>
      <div className="dash-section-header">
        <h2>Acente Yönetimi</h2>
        <span style={{ color: 'var(--dash-text-muted)', fontSize: '14px' }}>
          Toplam {filteredAgencies.length} acente
        </span>
      </div>

      {/* Data Table */}
      <div className="dash-table-container">
        {/* Toolbar */}
        <div className="dash-table-toolbar">
          <div className="dash-table-title">Acente Listesi</div>
          <div className="dash-table-filters">
            <input
              type="text"
              className="dash-search-input"
              placeholder="🔍 Acente ara (isim, email, TURSAB)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
            <select
              className="dash-filter-select"
              value={filterVerified}
              onChange={(e) => { setFilterVerified(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Tüm Onay</option>
              <option value="true">Onaylı</option>
              <option value="false">Onaysız</option>
            </select>
            <select
              className="dash-filter-select"
              value={filterActive}
              onChange={(e) => { setFilterActive(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Tüm Durum</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Acente</th>
                <th>Onay</th>
                <th>TURSAB No</th>
                <th>Tur Sayısı</th>
                <th>Komisyon</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAgencies.map((agency) => (
                <tr key={agency.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--dash-accent), #a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {agency.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {agency.name}
                          {agency.is_demo && (
                            <span className="status-badge demo" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              <span className="dot" /> DEMO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>
                          {agency.email || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {agency.is_verified ? (
                      <span className="status-badge verified"><span className="dot" /> Onaylı</span>
                    ) : (
                      <span className="status-badge pending"><span className="dot" /> Bekliyor</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{agency.tursab_no || '—'}</td>
                  <td>{agency.tour_count}</td>
                  <td>%{agency.commission_rate}</td>
                  <td>
                    {agency.is_active ? (
                      <span className="status-badge active"><span className="dot" /> Aktif</span>
                    ) : (
                      <span className="status-badge passive"><span className="dot" /> Pasif</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="dash-btn dash-btn-primary dash-btn-sm"
                        onClick={() => openModal(agency)}
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        className={`dash-btn dash-btn-sm ${agency.is_active ? 'dash-btn-danger' : 'dash-btn-success'}`}
                        onClick={() => toggleActive(agency)}
                        disabled={actionLoading === agency.id}
                      >
                        {actionLoading === agency.id ? '...' : (agency.is_active ? '⏸ Pasif' : '▶ Aktif')}
                      </button>
                      {!agency.is_verified && (
                        <button
                          className="dash-btn dash-btn-success dash-btn-sm"
                          onClick={() => approveAgency(agency)}
                          disabled={actionLoading === agency.id}
                        >
                          ✓ Onayla
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedAgencies.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--dash-text-muted)' }}>
                    Sonuç bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="dash-pagination">
            <div className="dash-pagination-info">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAgencies.length)} / {filteredAgencies.length} acente
            </div>
            <div className="dash-pagination-buttons">
              <button
                className="dash-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`dash-page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="dash-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAgency && (
        <div className="dash-modal-overlay" onClick={closeModal}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h2>🏢 Acente Düzenle — {modalAgency.name}</h2>
              <button className="dash-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="dash-modal-body">
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button
                  className={`dash-btn dash-btn-sm ${modalAgency.is_active ? 'dash-btn-danger' : 'dash-btn-success'}`}
                  onClick={() => {
                    toggleActive(modalAgency);
                    setModalAgency({ ...modalAgency, is_active: !modalAgency.is_active });
                  }}
                >
                  {modalAgency.is_active ? '⏸ Pasife Al' : '▶ Aktife Al'}
                </button>
                {!modalAgency.is_verified && (
                  <button
                    className="dash-btn dash-btn-success dash-btn-sm"
                    onClick={() => {
                      approveAgency(modalAgency);
                      setModalAgency({ ...modalAgency, is_verified: true });
                    }}
                  >
                    ✓ Onayla
                  </button>
                )}
                {modalAgency.is_demo && (
                  <span className="status-badge demo" style={{ marginLeft: 'auto' }}>
                    <span className="dot" /> Demo Acente
                  </span>
                )}
              </div>

              {/* Form */}
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Acente Adı *</label>
                  <input
                    className={`dash-form-input ${formErrors.name ? 'error' : ''}`}
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  {formErrors.name && <div className="dash-form-error">{formErrors.name}</div>}
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">E-posta</label>
                  <input
                    className={`dash-form-input ${formErrors.email ? 'error' : ''}`}
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  {formErrors.email && <div className="dash-form-error">{formErrors.email}</div>}
                </div>
              </div>

              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Telefon</label>
                  <input
                    className={`dash-form-input ${formErrors.phone ? 'error' : ''}`}
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  {formErrors.phone && <div className="dash-form-error">{formErrors.phone}</div>}
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Website</label>
                  <input
                    className="dash-form-input"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label">Adres</label>
                <input
                  className="dash-form-input"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: '20px', marginTop: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--dash-accent)' }}>
                  💼 İş Bilgileri
                </div>

                <div className="dash-form-row">
                  <div className="dash-form-group">
                    <label className="dash-form-label">TURSAB No</label>
                    <input
                      className={`dash-form-input ${formErrors.tursab_no ? 'error' : ''}`}
                      value={editForm.tursab_no || ''}
                      placeholder="Örn: A-7842"
                      onChange={(e) => setEditForm({ ...editForm, tursab_no: e.target.value })}
                    />
                    {formErrors.tursab_no && <div className="dash-form-error">{formErrors.tursab_no}</div>}
                  </div>
                  <div className="dash-form-group">
                    <label className="dash-form-label">Komisyon Oranı (%)</label>
                    <input
                      className={`dash-form-input ${formErrors.commission_rate ? 'error' : ''}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editForm.commission_rate || ''}
                      onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })}
                    />
                    {formErrors.commission_rate && <div className="dash-form-error">{formErrors.commission_rate}</div>}
                  </div>
                </div>

                <div className="dash-form-group">
                  <label className="dash-form-label">Iyzico Sub-Merchant ID</label>
                  <input
                    className="dash-form-input"
                    value={editForm.sub_merchant_id || ''}
                    placeholder="Örn: SM-KPD-001"
                    onChange={(e) => setEditForm({ ...editForm, sub_merchant_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="dash-form-group" style={{ marginTop: '4px' }}>
                <label className="dash-form-label">Açıklama</label>
                <textarea
                  className="dash-form-input"
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Read-only info */}
              <div style={{
                marginTop: '16px', padding: '16px', background: 'var(--dash-bg)',
                borderRadius: 'var(--dash-radius-sm)', fontSize: '13px', color: 'var(--dash-text-muted)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>📌 Sahip: <strong style={{ color: 'var(--dash-text)' }}>{modalAgency.owner_username || '—'}</strong></div>
                  <div>⭐ Güven Puanı: <strong style={{ color: 'var(--dash-text)' }}>{modalAgency.trust_score}</strong></div>
                  <div>🗺️ Tur Sayısı: <strong style={{ color: 'var(--dash-text)' }}>{modalAgency.tour_count}</strong></div>
                  <div>📋 Toplam Rezervasyon: <strong style={{ color: 'var(--dash-text)' }}>{modalAgency.total_bookings ?? '—'}</strong></div>
                </div>
              </div>
            </div>

            <div className="dash-modal-footer">
              <button className="dash-btn dash-btn-secondary" onClick={closeModal}>
                İptal
              </button>
              <button
                className="dash-btn dash-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
