'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Tour {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews_count: number;
  duration: string;
  category: string;
  agency_name: string;
  agency_id: number;
  is_demo: boolean;
}

// Demo data
const DEMO_TOURS: Tour[] = [
  { id: 'kapadokya-balon', title: 'Kapadokya Balon Turu', location: 'Nevşehir', price: 2400, rating: 4.9, reviews_count: 128, duration: '3 Gün, 2 Gece', category: 'adventure', agency_name: 'Kapadokya Turizm A.Ş.', agency_id: 1, is_demo: false },
  { id: 'pamukkale', title: 'Pamukkale & Hierapolis Turu', location: 'Denizli', price: 1800, rating: 4.7, reviews_count: 95, duration: '2 Gün, 1 Gece', category: 'culture', agency_name: 'Ege Travel', agency_id: 2, is_demo: false },
  { id: 'istanbul-bogaz', title: 'İstanbul Boğaz Turu', location: 'İstanbul', price: 950, rating: 4.6, reviews_count: 210, duration: '1 Gün', category: 'romantic', agency_name: 'İstanbul Explorer', agency_id: 5, is_demo: false },
  { id: 'efes-antik', title: 'Efes Antik Kent Turu', location: 'İzmir', price: 1200, rating: 4.8, reviews_count: 76, duration: '1 Gün', category: 'history', agency_name: 'Ege Travel', agency_id: 2, is_demo: false },
  { id: 'demo-tur-1', title: 'Demo — Antalya Tekne Turu', location: 'Antalya', price: 750, rating: 5.0, reviews_count: 15, duration: '1 Gün', category: 'adventure', agency_name: 'Demo Acente 1', agency_id: 4, is_demo: true },
  { id: 'demo-tur-2', title: 'Demo — Fethiye Ölüdeniz', location: 'Muğla', price: 1600, rating: 4.9, reviews_count: 8, duration: '2 Gün, 1 Gece', category: 'adventure', agency_name: 'Demo Acente 2', agency_id: 6, is_demo: true },
];

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || document.cookie.match(/auth-token=([^;]+)/)?.[1] || null;
}

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    async function fetchTours() {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/tours/`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        });

        if (res.ok) {
          const json = await res.json();
          const results = json.results || json;
          // Map API tours to our interface
          const mapped = results.map((t: Record<string, unknown>) => ({
            id: t.id,
            title: t.title,
            location: t.location,
            price: t.price,
            rating: t.rating,
            reviews_count: t.reviews_count,
            duration: t.duration,
            category: t.category,
            agency_name: typeof t.agency === 'object' && t.agency
              ? (t.agency as Record<string, unknown>).name
              : '—',
            agency_id: typeof t.agency === 'object' && t.agency
              ? (t.agency as Record<string, unknown>).id
              : 0,
            is_demo: false, // API tours don't expose this
          }));
          setTours(mapped);
        } else {
          setTours(DEMO_TOURS);
        }
      } catch {
        setTours(DEMO_TOURS);
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
  }, []);

  const filtered = tours.filter((t) => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.agency_name.toLowerCase().includes(search.toLowerCase());

    const matchCategory = filterCategory === 'all' || t.category === filterCategory;

    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const categories = [...new Set(tours.map((t) => t.category))].filter(Boolean);

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
        <h2>Tur Yönetimi</h2>
        <span style={{ color: 'var(--dash-text-muted)', fontSize: '14px' }}>
          Toplam {filtered.length} tur
        </span>
      </div>

      <div className="dash-table-container">
        <div className="dash-table-toolbar">
          <div className="dash-table-title">Tur Listesi</div>
          <div className="dash-table-filters">
            <input
              type="text"
              className="dash-search-input"
              placeholder="🔍 Tur ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
            <select
              className="dash-filter-select"
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Tur</th>
                <th>Konum</th>
                <th>Fiyat</th>
                <th>Puan</th>
                <th>Süre</th>
                <th>Acente</th>
                <th>Kategori</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((tour) => (
                <tr key={tour.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{tour.title}</span>
                      {tour.is_demo && (
                        <span className="status-badge demo" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          <span className="dot" /> DEMO
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{tour.location}</td>
                  <td style={{ fontWeight: 700 }}>₺{tour.price.toLocaleString('tr-TR')}</td>
                  <td>
                    <span style={{ color: '#ffaa00' }}>★</span> {tour.rating}
                    <span style={{ color: 'var(--dash-text-muted)', fontSize: '12px', marginLeft: '4px' }}>
                      ({tour.reviews_count})
                    </span>
                  </td>
                  <td>{tour.duration}</td>
                  <td style={{ fontSize: '13px' }}>{tour.agency_name}</td>
                  <td>
                    <span className="status-badge" style={{
                      background: 'rgba(108, 92, 231, 0.12)',
                      color: '#a78bfa',
                    }}>
                      {tour.category}
                    </span>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--dash-text-muted)' }}>
                    Sonuç bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="dash-pagination">
            <div className="dash-pagination-info">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} / {filtered.length} tur
            </div>
            <div className="dash-pagination-buttons">
              <button className="dash-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} className={`dash-page-btn ${page === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page}
                </button>
              ))}
              <button className="dash-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
