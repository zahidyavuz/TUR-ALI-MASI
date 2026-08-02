'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { fetchAPI } from '@/app/lib/api';

interface SpaVenueRow {
  id: string;
  name: string;
  description: string;
  location: string;
  image_main: string | null;
  is_active: boolean;
}

interface SpaServiceRow {
  id: string;
  venue: string;
  title: string;
  description: string;
  price_per_person: number | string;
  duration_minutes: number;
  min_guests: number;
  max_guests: number;
  image: string | null;
  is_active: boolean;
}

const EMPTY_VENUE = { name: '', location: '', description: '' };
const EMPTY_SERVICE = {
  title: '',
  price_per_person: '',
  duration_minutes: '60',
  min_guests: '1',
  max_guests: '8',
  description: '',
};

export default function AgencySpasPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Route guard: yalnız giriş yapmış acenta/staff kullanıcıları.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !(user.is_agency || user.is_staff)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const [venues, setVenues] = useState<SpaVenueRow[]>([]);
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // ── Mekân formu ─────────────────────────────────────────────────────────
  const [venueForm, setVenueForm] = useState(EMPTY_VENUE);
  const [venueImage, setVenueImage] = useState<File | null>(null);
  const [venueImagePreview, setVenueImagePreview] = useState('');
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);

  // ── Hizmet formu ────────────────────────────────────────────────────────
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [venueData, serviceData] = await Promise.all([
      fetchAPI('/agency/spas/venues/'),
      fetchAPI('/agency/spas/services/'),
    ]);
    if (!venueData) {
      setLoadError('Spa verileri yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
      setVenues([]);
    } else {
      const vr = venueData.results || venueData;
      setVenues(Array.isArray(vr) ? vr : []);
    }
    const sr = serviceData?.results || serviceData;
    setServices(Array.isArray(sr) ? sr : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && (user.is_agency || user.is_staff)) {
      loadData();
    }
  }, [user, loadData]);

  // ── Mekân işlemleri ───────────────────────────────────────────────────────
  const resetVenueForm = () => {
    setEditingVenueId(null);
    setVenueForm(EMPTY_VENUE);
    setVenueImage(null);
    setVenueImagePreview('');
    setVenueError(null);
  };

  const startEditingVenue = (venue: SpaVenueRow) => {
    setEditingVenueId(venue.id);
    setVenueForm({ name: venue.name, location: venue.location, description: venue.description || '' });
    setVenueImagePreview(venue.image_main || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVenueError(null);
    if (!venueForm.name || !venueForm.location) {
      setVenueError('Lütfen mekân adı ve konumu girin.');
      return;
    }
    setVenueSubmitting(true);
    try {
      if (editingVenueId) {
        const response = await fetchAPI(`/agency/spas/venues/${editingVenueId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: venueForm.name,
            location: venueForm.location,
            description: venueForm.description,
          }),
        });
        if (!response) {
          setVenueError('Güncelleme başarısız oldu.');
          setVenueSubmitting(false);
          return;
        }
      } else {
        const fd = new FormData();
        fd.append('name', venueForm.name);
        fd.append('location', venueForm.location);
        fd.append('description', venueForm.description);
        if (venueImage) fd.append('image_main', venueImage);
        const created = await fetchAPI('/agency/spas/venues/', { method: 'POST', body: fd });
        if (!created) {
          setVenueError('Mekân eklenemedi.');
          setVenueSubmitting(false);
          return;
        }
      }
      resetVenueForm();
      await loadData();
    } catch (error: any) {
      setVenueError(error?.message || 'Bir hata oluştu.');
    } finally {
      setVenueSubmitting(false);
    }
  };

  const handleVenueDelete = async (venue: SpaVenueRow) => {
    if (!window.confirm(`"${venue.name}" mekânını kaldırmak istediğinize emin misiniz?`)) return;
    setLoadError(null);
    try {
      await fetchAPI(`/agency/spas/venues/${venue.id}/`, { method: 'DELETE', throwOnHttpError: true });
      if (editingVenueId === venue.id) resetVenueForm();
      if (selectedVenueId === venue.id) setSelectedVenueId(null);
      await loadData();
    } catch (error: any) {
      setLoadError(error?.message || 'Mekân kaldırılamadı.');
    }
  };

  // ── Hizmet işlemleri ──────────────────────────────────────────────────────
  const resetServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm(EMPTY_SERVICE);
    setServiceImage(null);
    setServiceImagePreview('');
    setServiceError(null);
  };

  const startEditingService = (service: SpaServiceRow) => {
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      price_per_person: String(service.price_per_person),
      duration_minutes: String(service.duration_minutes),
      min_guests: String(service.min_guests),
      max_guests: String(service.max_guests),
      description: service.description || '',
    });
    setServiceImagePreview(service.image || '');
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError(null);
    if (!selectedVenueId) {
      setServiceError('Önce bir mekân seçin.');
      return;
    }
    if (!serviceForm.title || !serviceForm.price_per_person) {
      setServiceError('Lütfen hizmet adı ve fiyatını girin.');
      return;
    }
    setServiceSubmitting(true);
    try {
      if (editingServiceId) {
        const response = await fetchAPI(`/agency/spas/services/${editingServiceId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: serviceForm.title,
            description: serviceForm.description,
            price_per_person: serviceForm.price_per_person,
            duration_minutes: Number(serviceForm.duration_minutes),
            min_guests: Number(serviceForm.min_guests),
            max_guests: Number(serviceForm.max_guests),
          }),
        });
        if (!response) {
          setServiceError('Güncelleme başarısız oldu.');
          setServiceSubmitting(false);
          return;
        }
      } else {
        const fd = new FormData();
        fd.append('venue', selectedVenueId);
        fd.append('title', serviceForm.title);
        fd.append('description', serviceForm.description);
        fd.append('price_per_person', serviceForm.price_per_person);
        fd.append('duration_minutes', serviceForm.duration_minutes);
        fd.append('min_guests', serviceForm.min_guests);
        fd.append('max_guests', serviceForm.max_guests);
        if (serviceImage) fd.append('image', serviceImage);
        const created = await fetchAPI('/agency/spas/services/', { method: 'POST', body: fd });
        if (!created) {
          setServiceError('Hizmet eklenemedi.');
          setServiceSubmitting(false);
          return;
        }
      }
      resetServiceForm();
      await loadData();
    } catch (error: any) {
      setServiceError(error?.message || 'Bir hata oluştu.');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleServiceDelete = async (service: SpaServiceRow) => {
    if (!window.confirm(`"${service.title}" hizmetini kaldırmak istediğinize emin misiniz?`)) return;
    setLoadError(null);
    try {
      await fetchAPI(`/agency/spas/services/${service.id}/`, { method: 'DELETE', throwOnHttpError: true });
      if (editingServiceId === service.id) resetServiceForm();
      await loadData();
    } catch (error: any) {
      setLoadError(error?.message || 'Hizmet kaldırılamadı.');
    }
  };

  if (authLoading || !user || !(user.is_agency || user.is_staff)) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-semibold">
        {authLoading ? 'Yükleniyor...' : 'Bu sayfaya erişim yetkiniz yok. Yönlendiriliyorsunuz...'}
      </div>
    );
  }

  const selectedVenue = venues.find((v) => v.id === selectedVenueId) || null;
  const venueServices = services.filter((s) => s.venue === selectedVenueId);

  const inputCls =
    'w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white disabled:bg-slate-50 disabled:text-slate-500';
  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Spa &amp; Wellness Yönetimi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Spa mekânlarınızı ve sundukları hizmetleri yönetin. Bir mekân seçtiğinizde hizmetlerini düzenleyebilirsiniz.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Mekânlar ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {editingVenueId ? 'Mekânı Düzenle' : 'Yeni Mekân'}
              </h2>
              {editingVenueId && (
                <button onClick={resetVenueForm} className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white underline">
                  İptal
                </button>
              )}
            </div>

            <form className="space-y-4" onSubmit={handleVenueSubmit}>
              {!editingVenueId && (
                <div>
                  <label className={labelCls}>Görsel</label>
                  <input
                    type="file" id="venue-image-input" className="hidden" accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setVenueImage(file); setVenueImagePreview(URL.createObjectURL(file)); }
                    }}
                  />
                  <div
                    onClick={() => document.getElementById('venue-image-input')?.click()}
                    className="w-full min-h-[112px] border border-dashed border-slate-300 dark:border-slate-700 rounded-md flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer p-3"
                  >
                    {venueImagePreview ? (
                      <div className="relative w-full aspect-video rounded overflow-hidden">
                        <Image src={venueImagePreview} alt="Önizleme" fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Görsel Seç</span>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG (Maks. 10MB)</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Mekân Adı</label>
                <input
                  type="text" value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="Örn: Bodrum Termal Spa" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Konum</label>
                <input
                  type="text" value={venueForm.location}
                  onChange={(e) => setVenueForm({ ...venueForm, location: e.target.value })}
                  placeholder="Örn: Bodrum, Muğla" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Açıklama</label>
                <textarea
                  rows={3} value={venueForm.description}
                  onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })}
                  placeholder="Mekân detaylarını yazın..." className={`${inputCls} resize-none`}
                />
              </div>

              {venueError && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-3 py-2">
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{venueError}</p>
                </div>
              )}

              <button
                type="submit" disabled={venueSubmitting}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm disabled:opacity-70 text-sm"
              >
                {venueSubmitting ? 'İşleniyor...' : (editingVenueId ? 'Güncelle' : 'Kaydet')}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mekânlarım</h2>
              {loading && <span className="text-[10px] font-medium text-slate-500">Yükleniyor...</span>}
            </div>

            {!loading && venues.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Henüz spa mekânı eklemediniz.</p>
            )}

            {venues.map((venue) => (
              <div
                key={venue.id}
                onClick={() => setSelectedVenueId(venue.id)}
                className={`p-3 rounded-md border shadow-sm flex gap-4 cursor-pointer transition-colors ${
                  selectedVenueId === venue.id
                    ? 'border-[#008cb3] ring-1 ring-[#008cb3]/30 bg-[#008cb3]/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="w-20 h-16 relative rounded overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                  {venue.image_main ? (
                    <Image src={venue.image_main} alt={venue.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🧖</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{venue.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">📍 {venue.location}</p>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${venue.is_active ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      {venue.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); startEditingVenue(venue); }} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline">Düzenle</button>
                      <button onClick={(e) => { e.stopPropagation(); handleVenueDelete(venue); }} className="text-[11px] font-medium text-red-500 hover:text-red-700 dark:text-red-400 underline">Sil</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hizmetler ── */}
        <div className="space-y-6">
          {!selectedVenue ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg p-10 shadow-sm border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hizmetleri yönetmek için soldan bir mekân seçin.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    {editingServiceId ? 'Hizmeti Düzenle' : 'Yeni Hizmet'} · {selectedVenue.name}
                  </h2>
                  {editingServiceId && (
                    <button onClick={resetServiceForm} className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white underline">
                      İptal
                    </button>
                  )}
                </div>

                <form className="space-y-4" onSubmit={handleServiceSubmit}>
                  {!editingServiceId && (
                    <div>
                      <label className={labelCls}>Görsel</label>
                      <input
                        type="file" id="service-image-input" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setServiceImage(file); setServiceImagePreview(URL.createObjectURL(file)); }
                        }}
                      />
                      <div
                        onClick={() => document.getElementById('service-image-input')?.click()}
                        className="w-full min-h-[96px] border border-dashed border-slate-300 dark:border-slate-700 rounded-md flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer p-3"
                      >
                        {serviceImagePreview ? (
                          <div className="relative w-full aspect-video rounded overflow-hidden">
                            <Image src={serviceImagePreview} alt="Önizleme" fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Görsel Seç (opsiyonel)</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Hizmet Adı</label>
                    <input
                      type="text" value={serviceForm.title}
                      onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                      placeholder="Örn: Klasik İsveç Masajı" className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Kişi Başı Fiyat (₺)</label>
                      <input
                        type="number" value={serviceForm.price_per_person}
                        onChange={(e) => setServiceForm({ ...serviceForm, price_per_person: e.target.value })}
                        placeholder="0.00" className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Süre (dk)</label>
                      <input
                        type="number" value={serviceForm.duration_minutes}
                        onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Min. Kişi</label>
                      <input
                        type="number" value={serviceForm.min_guests}
                        onChange={(e) => setServiceForm({ ...serviceForm, min_guests: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Maks. Kişi</label>
                      <input
                        type="number" value={serviceForm.max_guests}
                        onChange={(e) => setServiceForm({ ...serviceForm, max_guests: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Açıklama</label>
                    <textarea
                      rows={3} value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                      placeholder="Hizmet detaylarını yazın..." className={`${inputCls} resize-none`}
                    />
                  </div>

                  {serviceError && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-3 py-2">
                      <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{serviceError}</p>
                    </div>
                  )}

                  <button
                    type="submit" disabled={serviceSubmitting}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm disabled:opacity-70 text-sm"
                  >
                    {serviceSubmitting ? 'İşleniyor...' : (editingServiceId ? 'Güncelle' : 'Kaydet')}
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
                  {selectedVenue.name} — Hizmetler
                </h2>

                {venueServices.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Bu mekânda henüz hizmet yok.</p>
                )}

                {venueServices.map((service) => (
                  <div key={service.id} className="p-3 rounded-md border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex gap-4">
                    <div className="w-20 h-16 relative rounded overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                      {service.image ? (
                        <Image src={service.image} alt={service.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">💆</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{service.title}</h3>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">₺{service.price_per_person}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ⏱️ {service.duration_minutes} dk · 👥 {service.min_guests}-{service.max_guests} kişi
                      </p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${service.is_active ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                          {service.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => startEditingService(service)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline">Düzenle</button>
                          <button onClick={() => handleServiceDelete(service)} className="text-[11px] font-medium text-red-500 hover:text-red-700 dark:text-red-400 underline">Sil</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
