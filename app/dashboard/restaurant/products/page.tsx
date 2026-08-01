'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { fetchAPI } from '@/app/lib/api';

interface MenuItem {
  id: number;
  restaurant: number;
  name: string;
  description: string | null;
  category: string;
  category_display: string;
  price: string;
  daily_price: string | null;
  effective_price: string;
  is_available: boolean;
  is_daily_special: boolean;
  image: string | null;
}

const CATEGORY_OPTIONS = [
  { value: 'starter', label: 'Başlangıç' },
  { value: 'main', label: 'Ana Yemek' },
  { value: 'dessert', label: 'Tatlı' },
  { value: 'drink', label: 'İçecek' },
  { value: 'special', label: 'Günün Özel Menüsü' },
];

const EMPTY_FORM = {
  name: '',
  category: 'special',
  price: '',
  description: '',
};

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=800&auto=format&fit=crop';

export default function RestaurantMenuBuilderPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const data = await fetchAPI('/menus/');
    if (!data) {
      setLoadError('Menüler yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
      setMenus([]);
    } else {
      const results = data.results || data;
      setMenus(Array.isArray(results) ? results : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setEditingId(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (menu: MenuItem) => {
    setEditingId(menu.id);
    setFormData({
      name: menu.name,
      category: menu.category,
      price: String(menu.price),
      description: menu.description || '',
    });
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Lütfen paket adını girin.');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setFormError('Lütfen geçerli bir fiyat girin.');
      return;
    }

    // Görsel ile birlikte multipart FormData gönderilir; `restaurant` alanı
    // sunucuda perform_create ile isteği yapanın işletmesine bağlanır, burada
    // gönderilmez.
    const body = new FormData();
    body.append('name', formData.name.trim());
    body.append('category', formData.category);
    body.append('price', formData.price);
    body.append('description', formData.description.trim());
    if (imageFile) body.append('image', imageFile);

    setIsSubmitting(true);
    try {
      const endpoint = editingId ? `/menus/${editingId}/` : '/menus/';
      const method = editingId ? 'PATCH' : 'POST';
      const result = await fetchAPI(endpoint, { method, body, throwOnHttpError: true });
      if (!result) {
        setFormError('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
        return;
      }
      resetForm();
      await loadMenus();
    } catch (err) {
      setFormError((err as Error).message || 'Menü kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (menu: MenuItem) => {
    setBusyId(menu.id);
    try {
      await fetchAPI(`/menus/${menu.id}/toggle-availability/`, { method: 'POST', throwOnHttpError: true });
      await loadMenus();
    } catch {
      // sessizce yut — liste yeniden yüklenmezse eski durum korunur
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (menu: MenuItem) => {
    if (!window.confirm(`"${menu.name}" paketini kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    setBusyId(menu.id);
    try {
      await fetchAPI(`/menus/${menu.id}/`, { method: 'DELETE', throwOnHttpError: true });
      if (editingId === menu.id) resetForm();
      await loadMenus();
    } catch {
      // sessizce yut
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">VIP Menü Oluşturucu</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Klasik menüleri unutun. Ön ödemeli, yüksek kârlı ve opsiyonlu özel paketler tasarlayın.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* VIP Menü Oluşturma / Düzenleme Formu */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                {editingId ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                İptal
              </button>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Görsel Yükleme (Ana görsel) */}
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Sunum Görseli</label>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-40 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50 hover:bg-[#8B1A2B]/5 dark:hover:bg-slate-800 transition-colors cursor-pointer group p-6 overflow-hidden relative"
              >
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden">
                    <Image src={imagePreview} alt="Önizleme" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <>
                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform text-[#8B1A2B]">📸</span>
                    <span className="text-sm font-bold text-gray-500">Görsel Yüklemek İçin Tıklayın</span>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest text-center">
                      Menü kartında gösterilecek ana görsel.
                    </p>
                  </>
                )}
              </div>
              {editingId && !imageFile && (
                <p className="text-[10px] text-gray-400 mt-2">Yeni görsel seçilmezse mevcut görsel korunur.</p>
              )}
            </div>

            {/* Temel Bilgiler */}
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Özel Paket Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Kapadokya Romantik Akşam Yemeği"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] focus:ring-2 focus:ring-[#8B1A2B]/20 font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] focus:ring-2 focus:ring-[#8B1A2B]/20 font-bold text-slate-800 dark:text-white"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Pakete dahil olanlar, menü içeriği, notlar..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] focus:ring-2 focus:ring-[#8B1A2B]/20 font-medium text-slate-800 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Fix Fiyat (₺) - Kişi Başı</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Örn: 1500"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] focus:ring-2 focus:ring-[#8B1A2B]/20 font-black text-slate-800 dark:text-white text-lg"
              />
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8B1A2B] hover:bg-[#7a1625] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-[#8B1A2B]/30 active:scale-95 text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Değişiklikleri Kaydet' : 'VIP Menüyü Yayına Al'}
            </button>
          </form>
        </div>

        {/* Aktif Paketler */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Yayındaki Paketleriniz</h2>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Menüler yükleniyor...</p>
          ) : loadError ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-5">
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2">{loadError}</p>
              <button onClick={loadMenus} className="text-sm font-bold text-[#8B1A2B] hover:underline">
                Tekrar dene
              </button>
            </div>
          ) : menus.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Henüz menü paketi oluşturmadınız. Soldaki formu kullanarak ilk paketinizi ekleyin.
            </p>
          ) : (
            menus.map((menu) => (
              <div key={menu.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 group hover:shadow-md transition-shadow">
                <div className="w-full sm:w-32 h-24 relative rounded-2xl overflow-hidden shrink-0">
                  <Image src={menu.image || PLACEHOLDER_IMG} alt={menu.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" unoptimized />
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 dark:text-white leading-tight pr-2">{menu.name}</h3>
                      <span className="font-black text-slate-800 dark:text-white whitespace-nowrap">₺{Number(menu.effective_price).toLocaleString('tr-TR')}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                      {menu.category_display}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-800 pt-3">
                    <button
                      onClick={() => handleToggleAvailability(menu)}
                      disabled={busyId === menu.id}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 ${
                        menu.is_available
                          ? 'text-green-600 bg-green-50 dark:bg-green-900/30 hover:bg-green-100'
                          : 'text-gray-500 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200'
                      }`}
                    >
                      {menu.is_available ? 'AKTİF' : 'TÜKENDİ'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(menu)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      >
                        Düzenle
                      </button>
                      <span className="text-gray-300 dark:text-slate-700">|</span>
                      <button
                        onClick={() => handleDelete(menu)}
                        disabled={busyId === menu.id}
                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
