'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { fetchAPI } from '@/app/lib/api';

interface ShuttleRoute {
  id: string;
  title: string;
  description: string;
  origin: string;
  destination: string;
  vehicle_type: string;
  price_per_person: number | string;
  min_passengers: number;
  max_passengers: number;
  duration_minutes: number;
  image_main: string;
  is_active: boolean;
}

const EMPTY_FORM = {
  id: '',
  title: '',
  origin: '',
  destination: '',
  vehicle_type: 'minivan',
  price_per_person: '',
  min_passengers: '1',
  max_passengers: '8',
  duration_minutes: '60',
  description: '',
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AgencyShuttlesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Gerçek route guard: bu sayfaya sadece giriş yapmış acenta kullanıcıları
  // erişebilir. Mevcut dashboard sayfalarında bu kontrol eksikti — burada
  // eklendi, taklit edilmedi.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !(user.is_agency || user.is_staff)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const [shuttles, setShuttles] = useState<ShuttleRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadShuttles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const data = await fetchAPI('/agency/shuttles/');
    if (!data) {
      setLoadError('Transfer rotaları yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
      setShuttles([]);
    } else {
      const results = data.results || data;
      setShuttles(Array.isArray(results) ? results : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && (user.is_agency || user.is_staff)) {
      loadShuttles();
    }
  }, [user, loadShuttles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setFormError(null);
  };

  const startEditing = (shuttle: ShuttleRoute) => {
    setEditingId(shuttle.id);
    setFormData({
      id: shuttle.id,
      title: shuttle.title,
      origin: shuttle.origin,
      destination: shuttle.destination,
      vehicle_type: shuttle.vehicle_type,
      price_per_person: String(shuttle.price_per_person),
      min_passengers: String(shuttle.min_passengers),
      max_passengers: String(shuttle.max_passengers),
      duration_minutes: String(shuttle.duration_minutes),
      description: shuttle.description || '',
    });
    setImagePreview(shuttle.image_main);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title || !formData.origin || !formData.destination || !formData.price_per_person) {
      setFormError('Lütfen zorunlu alanları doldurun (Başlık, Nereden, Nereye, Fiyat).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // PATCH — yalnızca güvenli alanlar (agency_shuttles_views.py'nin
        // izin verdiği alan listesiyle uyumlu)
        const response = await fetchAPI(`/agency/shuttles/${editingId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            price_per_person: formData.price_per_person,
            description: formData.description,
            min_passengers: Number(formData.min_passengers),
            max_passengers: Number(formData.max_passengers),
            duration_minutes: Number(formData.duration_minutes),
            vehicle_type: formData.vehicle_type,
          }),
        });
        if (!response) {
          setFormError('Güncelleme başarısız oldu.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const slug = slugify(formData.title);
        const fd = new FormData();
        fd.append('id', slug);
        fd.append('title', formData.title);
        fd.append('origin', formData.origin);
        fd.append('destination', formData.destination);
        fd.append('vehicle_type', formData.vehicle_type);
        fd.append('price_per_person', formData.price_per_person);
        fd.append('min_passengers', formData.min_passengers);
        fd.append('max_passengers', formData.max_passengers);
        fd.append('duration_minutes', formData.duration_minutes);
        fd.append('description', formData.description);
        if (imageFile) fd.append('image_main', imageFile);

        // fetchAPI JSON.stringify + Content-Type: application/json varsayar;
        // FormData göndermek için doğrudan fetch kullanmak yerine burada
        // manuel bir istek atıyoruz (auth header'ı korunarak).
        const { auth } = await import('@/app/lib/auth');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_URL}/agency/shuttles/`, {
          method: 'POST',
          headers: { ...auth.getAuthHeaders() },
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setFormError(err.detail || err.error || Object.values(err)[0] as string || 'Rota eklenemedi.');
          setIsSubmitting(false);
          return;
        }
      }

      resetForm();
      await loadShuttles();
    } catch (error: any) {
      setFormError(error?.message || 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user || !(user.is_agency || user.is_staff)) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-semibold">
        {authLoading ? 'Yükleniyor...' : 'Bu sayfaya erişim yetkiniz yok. Yönlendiriliyorsunuz...'}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Transfer Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Transfer rotalarınızı yönetin, fiyat ve yolcu sınırlarını belirleyin.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Yeni Transfer Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 uppercase tracking-wide text-sm">
            {editingId ? 'Transferi Düzenle' : 'Transfer Detayları'}
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!editingId && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Görsel</label>
                <input type="file" id="shuttle-image-input" className="hidden" accept="image/*" onChange={handleFileChange} />
                <div
                  onClick={() => document.getElementById('shuttle-image-input')?.click()}
                  className="w-full min-h-[112px] border border-dashed border-slate-300 dark:border-slate-700 rounded-md flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative p-3"
                >
                  {imagePreview ? (
                    <div className="relative w-full aspect-video rounded overflow-hidden">
                      <Image src={imagePreview} alt="Önizleme" fill className="object-cover" unoptimized />
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Transfer Başlığı</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleInputChange} disabled={!!editingId}
                placeholder="Örn: Kapadokya Havalimanı Transferi"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nereden</label>
                <input
                  type="text" name="origin" value={formData.origin} onChange={handleInputChange} disabled={!!editingId}
                  placeholder="Nevşehir Havalimanı"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nereye</label>
                <input
                  type="text" name="destination" value={formData.destination} onChange={handleInputChange} disabled={!!editingId}
                  placeholder="Ürgüp Otelleri"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kişi Başı Fiyat (₺)</label>
                <input
                  type="number" name="price_per_person" value={formData.price_per_person} onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Araç Tipi</label>
                <select
                  name="vehicle_type" value={formData.vehicle_type} onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                >
                  <option value="sedan">Sedan</option>
                  <option value="minivan">Minivan</option>
                  <option value="minibus">Minibüs</option>
                  <option value="bus">Otobüs</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Min. Yolcu</label>
                <input
                  type="number" name="min_passengers" value={formData.min_passengers} onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Maks. Yolcu</label>
                <input
                  type="number" name="max_passengers" value={formData.max_passengers} onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Süre (dk)</label>
                <input
                  type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Açıklama</label>
              <textarea
                rows={3} name="description" value={formData.description} onChange={handleInputChange}
                placeholder="Transfer detaylarını yazın..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white resize-none"
              ></textarea>
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-3 py-2">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm disabled:opacity-70 text-sm"
            >
              {isSubmitting ? 'İşleniyor...' : (editingId ? 'Güncelle' : 'Kaydet')}
            </button>
          </form>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Aktif Transferler</h2>
            {loading && <span className="text-[10px] font-medium text-slate-500">Yükleniyor...</span>}
          </div>

          {loadError && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && shuttles.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Henüz transfer rotası eklemediniz.</p>
          )}

          {shuttles.map((shuttle) => (
            <div key={shuttle.id} className="p-3 rounded-md border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-24 h-20 relative rounded overflow-hidden shrink-0">
                <Image src={shuttle.image_main} alt={shuttle.title} fill className="object-cover" unoptimized />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{shuttle.title}</h3>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">₺{shuttle.price_per_person}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{shuttle.origin} → {shuttle.destination}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${shuttle.is_active ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    {shuttle.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  <button onClick={() => startEditing(shuttle)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline">Düzenle</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
