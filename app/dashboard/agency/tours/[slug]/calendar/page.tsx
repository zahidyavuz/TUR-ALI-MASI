'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/app/lib/api';

/**
 * Kontenjan takvim editörü.
 *
 * Backend: `AgencyTourViewSet.availability`
 *   GET  /agency/tours/<slug>/availability/?month=YYYY-MM
 *   PUT  /agency/tours/<slug>/availability/  { days: [...] }
 *
 * Değişiklikler önce yerelde biriktirilir, "Kaydet" ile tek PUT olarak gider;
 * backend hepsi-ya-da-hiçbiri uygular. Satılan bilet sayısının altına düşürme
 * girişimi 400 döner ve hiçbir gün yazılmaz.
 */

interface DayRow {
    date: string; // YYYY-MM-DD
    max_capacity: number;
    booked_count: number;
    remaining: number;
    price_override: string | null;
    is_closed: boolean;
}

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('tr-TR', {
        month: 'long', year: 'numeric',
    });
};

const shiftMonth = (monthKey: string, delta: number) => {
    const [year, month] = monthKey.split('-').map(Number);
    return toMonthKey(new Date(year, month - 1 + delta, 1));
};

/** Ayın 1'i haftanın kaçıncı günü (Pazartesi = 0) — grid'in baştaki boşluğu. */
const leadingBlanks = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return (new Date(year, month - 1, 1).getDay() + 6) % 7;
};

const isWeekend = (isoDate: string) => {
    const day = new Date(`${isoDate}T00:00:00`).getDay();
    return day === 0 || day === 6;
};

/** Hücre rengi: kapalı / dolu / az kaldı / boş. */
const cellTone = (day: DayRow) => {
    if (day.is_closed) return 'bg-slate-200 border-slate-300 text-slate-500';
    if (day.remaining <= 0) return 'bg-rose-50 border-rose-300 text-rose-800';
    if (day.remaining <= day.max_capacity * 0.25) return 'bg-amber-50 border-amber-300 text-amber-900';
    return 'bg-emerald-50 border-emerald-300 text-emerald-900';
};

export default function TourCalendarPage() {
    const params = useParams();
    const slug = String(params?.slug ?? '');

    const [month, setMonth] = useState(() => toMonthKey(new Date()));
    const [days, setDays] = useState<DayRow[]>([]);
    const [basePrice, setBasePrice] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [saving, setSaving] = useState(false);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    // Toplu uygulama formu — boş bırakılan alan o özelliği değiştirmez.
    const [bulkCapacity, setBulkCapacity] = useState('');
    const [bulkPrice, setBulkPrice] = useState('');

    const loadMonth = useCallback(async (monthKey: string) => {
        setLoading(true);
        const data = await fetchAPI(`/agency/tours/${slug}/availability/?month=${monthKey}`);
        if (!data) {
            setError('Takvim yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
        } else {
            setError('');
            setDays(data.days ?? []);
            setBasePrice(String(data.base_price ?? ''));
        }
        setSelected(new Set());
        setDirty(new Set());
        setLoading(false);
    }, [slug]);

    useEffect(() => {
        if (slug) loadMonth(month);
    }, [slug, month, loadMonth]);

    const daysByDate = useMemo(
        () => new Map(days.map(day => [day.date, day])),
        [days]
    );

    const gridDates = useMemo(() => {
        const [year, monthNo] = month.split('-').map(Number);
        const total = new Date(year, monthNo, 0).getDate();
        return Array.from({ length: total }, (_, i) =>
            `${month}-${String(i + 1).padStart(2, '0')}`
        );
    }, [month]);

    const patchDay = (date: string, changes: Partial<DayRow>) => {
        setDays(prev => prev.map(day => (day.date === date ? { ...day, ...changes } : day)));
        setDirty(prev => new Set(prev).add(date));
        setSuccessMsg('');
    };

    const toggleSelect = (date: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const selectWhere = (predicate: (date: string) => boolean) => {
        setSelected(new Set(days.map(d => d.date).filter(predicate)));
    };

    const applyToSelected = (changes: Partial<DayRow>) => {
        if (selected.size === 0) return;
        setDays(prev => prev.map(day => (selected.has(day.date) ? { ...day, ...changes } : day)));
        setDirty(prev => new Set([...prev, ...selected]));
        setSuccessMsg('');
    };

    const applyBulkForm = () => {
        const changes: Partial<DayRow> = {};
        if (bulkCapacity !== '') {
            const capacity = Number(bulkCapacity);
            if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1000) {
                setError('Kontenjan 0 ile 1000 arasında bir tam sayı olmalıdır.');
                return;
            }
            changes.max_capacity = capacity;
        }
        if (bulkPrice !== '') {
            const price = Number(bulkPrice);
            if (Number.isNaN(price) || price < 0) {
                setError('Fiyat negatif olamaz.');
                return;
            }
            changes.price_override = bulkPrice;
        }
        if (Object.keys(changes).length === 0) {
            setError('Uygulanacak bir kontenjan veya fiyat girin.');
            return;
        }
        setError('');
        applyToSelected(changes);
    };

    const save = async () => {
        if (dirty.size === 0) return;
        setSaving(true);
        setError('');
        setSuccessMsg('');
        const payload = days
            .filter(day => dirty.has(day.date))
            .map(day => ({
                date: day.date,
                max_capacity: day.max_capacity,
                price_override: day.price_override === '' ? null : day.price_override,
                is_closed: day.is_closed,
            }));
        try {
            const data = await fetchAPI(`/agency/tours/${slug}/availability/`, {
                method: 'PUT',
                body: JSON.stringify({ days: payload }),
                throwOnHttpError: true,
            });
            if (!data) {
                setError('Kaydedilemedi. Sunucuya ulaşılamıyor olabilir.');
            } else {
                setDays(data.days ?? []);
                setDirty(new Set());
                setSelected(new Set());
                setSuccessMsg(`${payload.length} gün kaydedildi.`);
            }
        } catch (err: any) {
            setError(err?.data?.error || err?.message || 'Kaydedilemedi.');
        }
        setSaving(false);
    };

    const missingDates = gridDates.filter(date => !daysByDate.has(date));

    /** Takvimde kaydı olmayan günler için varsayılan satır aç. */
    const openMissingDays = () => {
        const created: DayRow[] = missingDates.map(date => ({
            date, max_capacity: 20, booked_count: 0, remaining: 20,
            price_override: null, is_closed: false,
        }));
        setDays(prev => [...prev, ...created].sort((a, b) => a.date.localeCompare(b.date)));
        setDirty(prev => new Set([...prev, ...created.map(d => d.date)]));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <Link href="/dashboard/agency/tours" className="text-sm text-slate-500 hover:text-slate-800">
                ← Turlarım
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Kontenjan Takvimi</h1>
                    <p className="text-sm text-slate-500">
                        {slug}
                        {basePrice && <> · temel fiyat ₺{basePrice}</>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMonth(m => shiftMonth(m, -1))}
                        className="px-3 py-1.5 border rounded hover:bg-slate-50"
                    >
                        ‹
                    </button>
                    <span className="min-w-[9rem] text-center font-semibold capitalize">
                        {monthLabel(month)}
                    </span>
                    <button
                        onClick={() => setMonth(m => shiftMonth(m, 1))}
                        className="px-3 py-1.5 border rounded hover:bg-slate-50"
                    >
                        ›
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                    {successMsg}
                </div>
            )}

            {/* ── Toplu işlem çubuğu ─────────────────────────────────────── */}
            <div className="mb-4 p-4 border rounded-lg bg-white space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">Hızlı seçim:</span>
                    <button onClick={() => selectWhere(() => true)} className="px-2 py-1 border rounded hover:bg-slate-50">Tüm ay</button>
                    <button onClick={() => selectWhere(d => !isWeekend(d))} className="px-2 py-1 border rounded hover:bg-slate-50">Hafta içi</button>
                    <button onClick={() => selectWhere(isWeekend)} className="px-2 py-1 border rounded hover:bg-slate-50">Hafta sonu</button>
                    <button onClick={() => setSelected(new Set())} className="px-2 py-1 border rounded hover:bg-slate-50">Temizle</button>
                    <span className="text-slate-500">{selected.size} gün seçili</span>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm">
                        <span className="block text-slate-600 mb-1">Kontenjan</span>
                        <input
                            type="number" min={0} max={1000} value={bulkCapacity}
                            onChange={e => setBulkCapacity(e.target.value)}
                            placeholder="örn. 25"
                            className="w-28 border rounded px-2 py-1"
                        />
                    </label>
                    <label className="text-sm">
                        <span className="block text-slate-600 mb-1">Fiyat (₺)</span>
                        <input
                            type="number" min={0} step="0.01" value={bulkPrice}
                            onChange={e => setBulkPrice(e.target.value)}
                            placeholder="boş = temel fiyat"
                            className="w-36 border rounded px-2 py-1"
                        />
                    </label>
                    <button
                        onClick={applyBulkForm}
                        disabled={selected.size === 0}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded disabled:opacity-40"
                    >
                        Seçili günlere uygula
                    </button>
                    <button
                        onClick={() => applyToSelected({ is_closed: true })}
                        disabled={selected.size === 0}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 hover:bg-slate-50"
                    >
                        Kapat
                    </button>
                    <button
                        onClick={() => applyToSelected({ is_closed: false })}
                        disabled={selected.size === 0}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 hover:bg-slate-50"
                    >
                        Aç
                    </button>
                    <button
                        onClick={() => applyToSelected({ price_override: null })}
                        disabled={selected.size === 0}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 hover:bg-slate-50"
                    >
                        Fiyatı sıfırla
                    </button>
                </div>
            </div>

            {/* ── Takvim ─────────────────────────────────────────────────── */}
            {loading ? (
                <p className="text-slate-500">Yükleniyor…</p>
            ) : (
                <>
                    {missingDates.length > 0 && (
                        <div className="mb-3 p-3 rounded bg-slate-50 border text-sm flex items-center justify-between gap-3">
                            <span>{missingDates.length} gün için henüz kontenjan tanımlı değil.</span>
                            <button onClick={openMissingDays} className="px-3 py-1 border rounded bg-white hover:bg-slate-100">
                                Bu günleri aç
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-7 gap-2">
                        {WEEKDAY_LABELS.map(label => (
                            <div key={label} className="text-xs font-semibold text-slate-500 text-center pb-1">
                                {label}
                            </div>
                        ))}
                        {Array.from({ length: leadingBlanks(month) }, (_, i) => (
                            <div key={`blank-${i}`} />
                        ))}
                        {gridDates.map(date => {
                            const day = daysByDate.get(date);
                            const dayNo = Number(date.slice(-2));
                            if (!day) {
                                return (
                                    <div key={date} className="border rounded-lg p-2 min-h-[6.5rem] bg-slate-50 border-dashed text-slate-400">
                                        <div className="text-sm font-semibold">{dayNo}</div>
                                        <div className="text-[11px] mt-2">Tanımsız</div>
                                    </div>
                                );
                            }
                            const isSelected = selected.has(date);
                            const isDirty = dirty.has(date);
                            return (
                                <div
                                    key={date}
                                    className={`border rounded-lg p-2 min-h-[6.5rem] cursor-pointer transition ${cellTone(day)} ${
                                        isSelected ? 'ring-2 ring-slate-800' : ''
                                    }`}
                                    onClick={() => toggleSelect(date)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{dayNo}</span>
                                        {isDirty && <span className="text-[10px] font-bold">•</span>}
                                    </div>

                                    <div className="text-[11px] mb-1">
                                        {day.booked_count}/{day.max_capacity} satıldı
                                    </div>

                                    <input
                                        type="number" min={0} max={1000}
                                        value={day.max_capacity}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => patchDay(date, { max_capacity: Number(e.target.value) })}
                                        className="w-full text-xs border rounded px-1 py-0.5 mb-1 bg-white/80"
                                        aria-label={`${date} kontenjan`}
                                    />
                                    <input
                                        type="number" min={0} step="0.01"
                                        value={day.price_override ?? ''}
                                        placeholder={basePrice ? `₺${basePrice}` : 'fiyat'}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e =>
                                            patchDay(date, { price_override: e.target.value === '' ? null : e.target.value })
                                        }
                                        className="w-full text-xs border rounded px-1 py-0.5 bg-white/80"
                                        aria-label={`${date} fiyat`}
                                    />
                                    {day.is_closed && (
                                        <div className="text-[10px] mt-1 font-semibold uppercase">Kapalı</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-emerald-50 border-emerald-300" /> Yer var</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-amber-50 border-amber-300" /> Az kaldı</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-rose-50 border-rose-300" /> Dolu</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-slate-200 border-slate-300" /> Kapalı</span>
                    </div>
                </>
            )}

            <div className="sticky bottom-0 mt-6 py-3 bg-white/90 backdrop-blur border-t flex items-center justify-between">
                <span className="text-sm text-slate-600">
                    {dirty.size > 0 ? `${dirty.size} günde kaydedilmemiş değişiklik var.` : 'Kaydedilmemiş değişiklik yok.'}
                </span>
                <button
                    onClick={save}
                    disabled={dirty.size === 0 || saving}
                    className="px-5 py-2 bg-emerald-600 text-white rounded font-semibold disabled:opacity-40"
                >
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
            </div>
        </div>
    );
}
