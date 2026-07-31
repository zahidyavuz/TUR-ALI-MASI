'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { fetchAPI } from '@/app/lib/api';
import { CANCELLATION_POLICY_OPTIONS, policyInfo } from '@/app/lib/cancellationPolicy';

/**
 * Acenta envanteri — gerçek CRUD.
 *
 * Backend: `AgencyTourViewSet` (`/api/v1/agency/tours/`). Queryset acentaya
 * göre filtreli olduğu için başka bir acentanın turu bu sayfada asla görünmez.
 * Slug (`id`) sunucuda başlıktan üretilir, istemci göndermez.
 */

// Backend `upload-image` ucunun kabul ettiği alanlar (bkz. allowed_fields).
const IMAGE_SLOTS = [
    { field: 'image_main', label: 'Ana Görsel' },
    { field: 'image_sub1', label: 'Ek Görsel 1' },
    { field: 'image_sub2', label: 'Ek Görsel 2' },
] as const;

// PATCH beyaz listesindeki alanlar (AgencyTourViewSet.ALLOWED_PATCH_FIELDS).
// Düzenlemede yalnız bunlar gönderilir; fazlası backend'den 400 döner.
const EDITABLE_FIELDS = [
    'title', 'location', 'price', 'duration', 'guide', 'category', 'description',
    'cancellation_policy',
] as const;

interface AgencyTour {
    id: string; // SlugField PK
    title: string;
    location?: string;
    price: string | number;
    duration?: string;
    guide?: string;
    category?: string;
    description?: string;
    cancellation_policy?: string;
    image_main: string | null;
    capacity_total: number;
    booked_total: number;
    is_published: boolean;
}

const EMPTY_FORM = {
    title: '', location: '', price: '', duration: '', guide: '',
    category: '', description: '', default_capacity: '20',
    cancellation_policy: 'flexible',
};

export default function AgencyToursPage() {
    const [tours, setTours] = useState<AgencyTour[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');

    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [editingTour, setEditingTour] = useState<AgencyTour | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Yeni tur oluşturulurken görseller henüz yüklenemez (upload ucu slug ister),
    // bu yüzden dosyalar burada tutulup kayıttan hemen sonra gönderilir.
    const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const previewsRef = useRef(previews);
    previewsRef.current = previews;

    const [pendingDelete, setPendingDelete] = useState<AgencyTour | null>(null);

    const loadTours = useCallback(async () => {
        const data = await fetchAPI('/agency/tours/');
        if (!data) {
            setListError('Turlar yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
        } else {
            setListError('');
            setTours(Array.isArray(data) ? data : (data.results ?? []));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadTours();
    }, [loadTours]);

    // Bileşen sökülürken objectURL'leri serbest bırak.
    useEffect(() => () => {
        Object.values(previewsRef.current).forEach(URL.revokeObjectURL);
    }, []);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (field: string, file: File | undefined) => {
        if (!file) return;
        setPendingFiles(prev => ({ ...prev, [field]: file }));
        setPreviews(prev => {
            if (prev[field]) URL.revokeObjectURL(prev[field]);
            return { ...prev, [field]: URL.createObjectURL(file) };
        });
    };

    /** Seçili görselleri sırayla yükler; hata olursa mesajı döndürür. */
    const uploadImages = async (slug: string): Promise<string | null> => {
        for (const [field, file] of Object.entries(pendingFiles)) {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('field', field);
            try {
                await fetchAPI(`/agency/tours/${slug}/upload-image/`, {
                    method: 'POST',
                    body: fd,
                    throwOnHttpError: true,
                });
            } catch (err: any) {
                return err?.data?.error || err?.message || 'Görsel yüklenemedi.';
            }
        }
        return null;
    };

    const resetForm = () => {
        setEditingTour(null);
        setFormData({ ...EMPTY_FORM });
        setPendingFiles({});
        setPreviews(prev => {
            Object.values(prev).forEach(URL.revokeObjectURL);
            return {};
        });
        setFormError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setSuccessMsg('');

        if (!formData.title.trim() || !formData.price) {
            setFormError('Tur başlığı ve fiyat zorunludur.');
            return;
        }

        setIsSubmitting(true);
        try {
            let slug: string;

            if (editingTour) {
                // PATCH: yalnız beyaz listedeki alanlar.
                const payload = Object.fromEntries(
                    EDITABLE_FIELDS.map(f => [f, formData[f]])
                );
                await fetchAPI(`/agency/tours/${editingTour.id}/`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                    throwOnHttpError: true,
                });
                slug = editingTour.id;
            } else {
                // Slug backend'de başlıktan üretilir; istemci göndermez.
                const created = await fetchAPI('/agency/tours/', {
                    method: 'POST',
                    body: JSON.stringify(formData),
                    throwOnHttpError: true,
                });
                if (!created?.id) {
                    setFormError('Tur oluşturulamadı. Sunucuya ulaşılamıyor olabilir.');
                    return;
                }
                slug = created.id;
            }

            const uploadError = await uploadImages(slug);
            await loadTours();
            resetForm();
            setSuccessMsg(
                uploadError
                    ? `Tur kaydedildi ancak görsel yüklenemedi: ${uploadError}`
                    : editingTour
                      ? 'Tur güncellendi.'
                      : 'Tur oluşturuldu. Görseli yüklenene kadar katalogda görünmez.'
            );
        } catch (err: any) {
            setFormError(err?.message || 'İşlem sırasında bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEditing = (tour: AgencyTour) => {
        setEditingTour(tour);
        setFormData({
            title: tour.title ?? '',
            location: tour.location ?? '',
            price: String(tour.price ?? ''),
            duration: tour.duration ?? '',
            guide: tour.guide ?? '',
            category: tour.category ?? '',
            description: tour.description ?? '',
            default_capacity: '20', // yalnız oluştururken kullanılır
            cancellation_policy: tour.cancellation_policy ?? 'flexible',
        });
        setPendingFiles({});
        setPreviews(prev => {
            Object.values(prev).forEach(URL.revokeObjectURL);
            return {};
        });
        setFormError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        const tour = pendingDelete;
        if (!tour) return;
        setPendingDelete(null);
        setSuccessMsg('');
        try {
            await fetchAPI(`/agency/tours/${tour.id}/`, {
                method: 'DELETE',
                throwOnHttpError: true,
            });
            if (editingTour?.id === tour.id) resetForm();
            await loadTours();
            setSuccessMsg(`"${tour.title}" panelden kaldırıldı.`);
        } catch (err: any) {
            setListError(err?.message || 'Tur kaldırılamadı.');
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-24 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tur Yönetimi (Envanter)</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Turlarınızı yönetin ve operasyonel kapasiteleri belirleyin.
                    </p>
                </div>
                <button
                    onClick={resetForm}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Yeni Tur Ekle
                </button>
            </div>

            {successMsg && (
                <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMsg}</div>
            )}
            {listError && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{listError}</div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Turu panelden kaldır</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                            <strong>{pendingDelete.title}</strong> envanterinizden kaldırılacak ve satışa kapanacak.
                            Mevcut rezervasyonlar silinmez, geçmiş kayıtlar korunur.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Vazgeç</button>
                            <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-md text-sm transition-colors">Kaldır</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Tur Ekleme / Düzenleme Formu */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5 uppercase tracking-wide">
                        {editingTour ? `Turu Düzenle — ${editingTour.id}` : 'Yeni Tur'}
                    </h2>

                    {formError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tur Görselleri</label>
                            <div className="grid grid-cols-3 gap-2">
                                {IMAGE_SLOTS.map(slot => {
                                    const preview = previews[slot.field];
                                    const existing = slot.field === 'image_main' ? editingTour?.image_main : null;
                                    const src = preview || existing;
                                    return (
                                        <label key={slot.field} className="cursor-pointer group">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={e => handleFileChange(slot.field, e.target.files?.[0])}
                                            />
                                            <div className="aspect-video relative rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                                {src ? (
                                                    <Image src={src} alt={slot.label} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-400 text-center px-1">{slot.label}</span>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">PNG/JPG, maks. 10MB. Sunucuda WEBP&apos;ye dönüştürülür.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tur Başlığı</label>
                            <input
                                type="text" name="title" value={formData.title} onChange={handleInputChange}
                                placeholder="Örn: Pamukkale Günübirlik Tur"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                            />
                            {!editingTour && (
                                <p className="text-[10px] text-slate-400 mt-1">Tur adresi (slug) başlıktan otomatik üretilir.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Birim Fiyat (₺)</label>
                                <input
                                    type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleInputChange}
                                    placeholder="0.00"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bölge / Şehir</label>
                                <input
                                    type="text" name="location" value={formData.location} onChange={handleInputChange}
                                    placeholder="Örn: Denizli"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Süre</label>
                                <input
                                    type="text" name="duration" value={formData.duration} onChange={handleInputChange}
                                    placeholder="Örn: 1 Gün"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Rehber Dili</label>
                                <input
                                    type="text" name="guide" value={formData.guide} onChange={handleInputChange}
                                    placeholder="Örn: Türkçe, İngilizce"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                                <input
                                    type="text" name="category" list="tour-categories" value={formData.category} onChange={handleInputChange}
                                    placeholder="Örn: Doğa"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                />
                                <datalist id="tour-categories">
                                    {Array.from(new Set(tours.map(t => t.category).filter(Boolean))).map(c => (
                                        <option key={c} value={c!} />
                                    ))}
                                </datalist>
                            </div>
                            {!editingTour && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Günlük Kontenjan</label>
                                    <input
                                        type="number" name="default_capacity" min="1" max="1000"
                                        value={formData.default_capacity} onChange={handleInputChange}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">90 günlük takvim bu kontenjanla açılır.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Açıklama</label>
                            <textarea
                                rows={3} name="description" value={formData.description} onChange={handleInputChange}
                                placeholder="Tur detaylarını ve programa dahil olan hizmetleri yazın..."
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white resize-none"
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">İptal / İade Politikası</label>
                            <select
                                name="cancellation_policy" value={formData.cancellation_policy} onChange={handleInputChange}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                            >
                                {CANCELLATION_POLICY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label} — {opt.summary}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1.5">{policyInfo(formData.cancellation_policy).detail}</p>
                        </div>

                        <div className="flex gap-3">
                            {editingTour && (
                                <button type="button" onClick={resetForm} className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Vazgeç
                                </button>
                            )}
                            <button
                                type="submit" disabled={isSubmitting}
                                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm disabled:opacity-70 text-sm"
                            >
                                {isSubmitting ? 'İşleniyor...' : (editingTour ? 'Güncelle' : 'Kaydet')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Aktif Envanter */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Aktif Envanter</h2>
                        {loading && <span className="text-[10px] font-medium text-slate-500">Yükleniyor...</span>}
                    </div>

                    {!loading && tours.length === 0 && !listError && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Henüz turunuz yok</p>
                            <p className="text-xs text-slate-500 mt-1">Soldaki formu doldurarak ilk turunuzu ekleyin.</p>
                        </div>
                    )}

                    {tours.map(tour => {
                        const capacity = tour.capacity_total ?? 0;
                        const booked = tour.booked_total ?? 0;
                        const isSoldOut = capacity > 0 && booked >= capacity;
                        const progress = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0;

                        return (
                            <div key={tour.id} className={`p-3 rounded-md border ${isSoldOut ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col sm:flex-row gap-4`}>
                                <div className="w-full sm:w-24 h-20 relative rounded overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                                    {tour.image_main ? (
                                        <Image src={tour.image_main} alt={tour.title} fill className={`object-cover ${isSoldOut ? 'grayscale' : ''}`} unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-slate-400 text-center px-1">Görsel yok</div>
                                    )}
                                    {isSoldOut && (
                                        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="text-white font-black text-xs uppercase tracking-widest border-2 border-white px-2 py-1 rounded rotate-[-15deg]">Tükendi</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{tour.title}</h3>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                ₺{Number(tour.price).toLocaleString('tr-TR')}
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="font-medium text-slate-500">
                                                    Satış: <span className={isSoldOut ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>{booked}</span>
                                                </span>
                                                <span className="font-medium text-slate-500">
                                                    90 günlük kontenjan: <span className="text-slate-700 dark:text-slate-300">{capacity}</span>
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isSoldOut ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-slate-800 dark:bg-slate-400'}`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 flex justify-between items-center gap-2">
                                        {tour.is_published ? (
                                            <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
                                                Yayında
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Görsel yüklenene kadar tur katalogda listelenmez.">
                                                Taslak — görsel bekliyor
                                            </span>
                                        )}
                                        <div className="flex gap-3">
                                            <Link href={`/dashboard/agency/tours/${tour.id}/calendar`} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline">Takvim</Link>
                                            <button onClick={() => startEditing(tour)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline">Düzenle</button>
                                            <button onClick={() => setPendingDelete(tour)} className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors underline">Kaldır</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
