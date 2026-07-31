'use client';

import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { fetchAPI } from '@/app/lib/api';

/**
 * Acenta rezervasyon yönetimi + günlük manifest.
 *
 * Backend: `AgencyBookingViewSet` (`/api/v1/agency/bookings/`). Queryset
 * `tour__agency` / `shuttle_route__agency` ile filtreli olduğu için başka bir
 * acentanın rezervasyonu bu sayfada asla görünmez.
 *   • Liste  : GET /agency/bookings/?date=&status=&tour=&q=  (sayfalanmış)
 *   • Manifest: GET /agency/bookings/manifest/?date=         (sayfalanmamış)
 *   • No-show: PATCH /agency/bookings/<id>/ { no_show }      (tek yazılabilir alan)
 */

interface Tour {
    id: string; // SlugField PK
    title: string;
    duration: string;
}

interface AgencyBooking {
    id: string;
    booking_ref: string;
    service_type: string;
    service_title: string;
    start_date: string | null;
    start_time: string | null;
    guests: number;
    total_price: string;
    status: string;
    no_show: boolean;
    passenger: string;
    phone: string;
    email: string;
    hotel: string;
}

interface ManifestGroup {
    service_id: string | null;
    service_title: string;
    duration: string;
    pax: number;
    passengers: AgencyBooking[];
}

interface Manifest {
    date: string;
    agency: string;
    total_pax: number;
    total_bookings: number;
    groups: ManifestGroup[];
}

const STATUS_FILTERS = [
    { value: '', label: 'Tümü' },
    { value: 'confirmed', label: 'Onaylı' },
    { value: 'pending', label: 'Ödeme bekliyor' },
    { value: 'cancelled', label: 'İptal' },
    { value: 'failed', label: 'Başarısız' },
] as const;

const STATUS_BADGE: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:border-slate-700',
    failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
};

const STATUS_LABEL: Record<string, string> = {
    confirmed: 'Onaylı', pending: 'Ödeme bekliyor', cancelled: 'İptal', failed: 'Başarısız',
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AgencyBookingsPage() {
    const [tab, setTab] = useState<'list' | 'manifest'>('list');

    const [tours, setTours] = useState<Tour[]>([]);
    const [selectedDate, setSelectedDate] = useState(today);

    // ── Liste durumu ─────────────────────────────────────────────────────────
    const [bookings, setBookings] = useState<AgencyBooking[]>([]);
    const [listCount, setListCount] = useState(0);
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTour, setFilterTour] = useState('');
    const [search, setSearch] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState('');

    // ── Manifest durumu ──────────────────────────────────────────────────────
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [manifestLoading, setManifestLoading] = useState(false);
    const [manifestError, setManifestError] = useState('');

    const [pendingNoShow, setPendingNoShow] = useState<AgencyBooking | null>(null);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        (async () => {
            const data = await fetchAPI('/agency/tours/');
            setTours(Array.isArray(data) ? data : (data?.results ?? []));
        })();
    }, []);

    const loadBookings = useCallback(async () => {
        setListLoading(true);
        const query = new URLSearchParams();
        if (filterDate) query.set('date', filterDate);
        if (filterStatus) query.set('status', filterStatus);
        if (filterTour) query.set('tour', filterTour);
        if (search.trim()) query.set('q', search.trim());

        const data = await fetchAPI(`/agency/bookings/?${query.toString()}`);
        if (!data) {
            setListError('Rezervasyonlar yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
            setBookings([]);
        } else {
            setListError('');
            const results = Array.isArray(data) ? data : (data.results ?? []);
            setBookings(results);
            setListCount(Array.isArray(data) ? data.length : (data.count ?? results.length));
        }
        setListLoading(false);
    }, [filterDate, filterStatus, filterTour, search]);

    useEffect(() => {
        if (tab !== 'list') return;
        // Arama kutusunda her tuşta istek atmamak için kısa gecikme.
        const timer = setTimeout(loadBookings, 300);
        return () => clearTimeout(timer);
    }, [tab, loadBookings]);

    const loadManifest = useCallback(async () => {
        setManifestLoading(true);
        try {
            const data = await fetchAPI(
                `/agency/bookings/manifest/?date=${selectedDate}`,
                { throwOnHttpError: true }
            );
            if (!data) {
                setManifestError('Manifest yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
                setManifest(null);
            } else {
                setManifestError('');
                setManifest(data);
            }
        } catch (err: any) {
            setManifest(null);
            setManifestError(err?.data?.error || err?.message || 'Manifest yüklenemedi.');
        }
        setManifestLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        if (tab === 'manifest') loadManifest();
    }, [tab, loadManifest]);

    const confirmNoShow = async () => {
        if (!pendingNoShow) return;
        const target = pendingNoShow;
        setPendingNoShow(null);
        try {
            await fetchAPI(`/agency/bookings/${target.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ no_show: !target.no_show }),
                throwOnHttpError: true,
            });
            setActionError('');
            setBookings(prev => prev.map(b =>
                b.id === target.id ? { ...b, no_show: !target.no_show } : b
            ));
            if (tab === 'manifest') loadManifest();
        } catch (err: any) {
            setActionError(err?.data?.error || err?.message || 'İşaretleme başarısız.');
        }
    };

    const handleExportPDF = () => {
        if (!manifest || manifest.groups.length === 0) {
            setManifestError('Yazdırılacak yolcu bulunamadı.');
            return;
        }
        const doc = new jsPDF('p', 'pt', 'a4');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('Tourkia - Yolcu Manifestosu', 40, 40);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Tarih: ${manifest.date}`, 40, 65);
        doc.text(`Toplam Yolcu: ${manifest.total_pax}`, 250, 65);

        let cursorY = 95;
        manifest.groups.forEach(group => {
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text(`${group.service_title} — ${group.pax} kisi`, 40, cursorY);
            (doc as any).autoTable({
                head: [['Bin.', 'Bilet No', 'Yolcu Adi', 'Telefon', 'Otel', 'Kisi']],
                body: group.passengers.map(p => [
                    '[   ]', p.booking_ref, p.passenger, p.phone, p.hotel, String(p.guests),
                ]),
                startY: cursorY + 12,
                styles: { fontSize: 10, cellPadding: 6, font: 'helvetica' },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
            });
            cursorY = (doc as any).lastAutoTable.finalY + 30;
        });

        doc.save(`Manifesto_${manifest.date}.pdf`);
    };

    return (
        <div className="animate-in fade-in duration-500 pb-24 font-sans">
            {/* Yazdırma: panel kromu gizlenir, manifest tam genişlikte siyah-beyaz çıkar. */}
            <style jsx global>{`
                @media print {
                    body { background: #fff; }
                    .no-print, nav, aside, header, footer { display: none !important; }
                    .print-area { position: absolute; inset: 0; margin: 0; padding: 0; width: 100%; }
                    .print-group { break-inside: avoid; page-break-inside: avoid; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #000; color: #000; padding: 6px 8px; }
                }
            `}</style>

            <div className="no-print">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Rezervasyon Yönetimi
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Kendi turlarınızın rezervasyonlarını filtreleyin, günlük biniş listesi çıkarın.
                </p>

                <div className="flex gap-1 mt-5 border-b border-slate-200 dark:border-slate-800">
                    {([['list', 'Rezervasyonlar'], ['manifest', 'Günlük Manifest']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                tab === key
                                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {actionError && (
                <div className="no-print mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {actionError}
                </div>
            )}

            {/* ── SEKME: REZERVASYON LİSTESİ ─────────────────────────────── */}
            {tab === 'list' && (
                <div className="no-print mt-6">
                    <div className="flex flex-wrap gap-3 items-end mb-5">
                        <label className="text-sm">
                            <span className="block text-slate-600 dark:text-slate-400 mb-1 text-xs font-semibold">Tarih</span>
                            <input
                                type="date" value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-900 text-sm"
                            />
                        </label>
                        <label className="text-sm">
                            <span className="block text-slate-600 dark:text-slate-400 mb-1 text-xs font-semibold">Durum</span>
                            <select
                                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-900 text-sm"
                            >
                                {STATUS_FILTERS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm">
                            <span className="block text-slate-600 dark:text-slate-400 mb-1 text-xs font-semibold">Tur</span>
                            <select
                                value={filterTour} onChange={e => setFilterTour(e.target.value)}
                                className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-900 text-sm max-w-[16rem]"
                            >
                                <option value="">Tümü</option>
                                {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </label>
                        <label className="text-sm flex-1 min-w-[12rem]">
                            <span className="block text-slate-600 dark:text-slate-400 mb-1 text-xs font-semibold">Ara</span>
                            <input
                                type="search" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Bilet no, misafir adı veya telefon"
                                className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-900 text-sm"
                            />
                        </label>
                        {(filterDate || filterStatus || filterTour || search) && (
                            <button
                                onClick={() => { setFilterDate(''); setFilterStatus(''); setFilterTour(''); setSearch(''); }}
                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Filtreleri temizle
                            </button>
                        )}
                    </div>

                    {listError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 mb-4">
                            {listError}
                        </div>
                    )}

                    <p className="text-xs font-semibold text-slate-500 mb-2">
                        {listLoading ? 'Yükleniyor…' : `${listCount} rezervasyon`}
                    </p>

                    {!listLoading && bookings.length === 0 && !listError && (
                        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
                            Bu filtrelere uyan rezervasyon yok.
                        </div>
                    )}

                    <div className="space-y-2">
                        {bookings.map(b => (
                            <div
                                key={b.id}
                                className={`p-4 rounded-lg border bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center gap-4 ${
                                    b.no_show
                                        ? 'border-red-200 dark:border-red-900/50'
                                        : 'border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900 dark:text-white">{b.passenger}</span>
                                        <span className="font-mono text-[11px] text-slate-500">{b.booking_ref}</span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[b.status] ?? ''}`}>
                                            {STATUS_LABEL[b.status] ?? b.status}
                                        </span>
                                        {b.no_show && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                                                Gelmedi
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">
                                        {b.service_title}
                                        {b.start_date && <> · {b.start_date}</>}
                                        {b.start_time && <> {b.start_time.slice(0, 5)}</>}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {b.phone} · {b.email} · Otel: {b.hotel}
                                    </p>
                                </div>

                                <div className="flex items-center gap-5 shrink-0">
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Kişi</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white">{b.guests}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Tutar</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">₺{b.total_price}</p>
                                    </div>
                                    {b.status === 'confirmed' && (
                                        <button
                                            onClick={() => setPendingNoShow(b)}
                                            className="text-[11px] font-medium underline text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                        >
                                            {b.no_show ? 'Geri al' : 'Gelmedi işaretle'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── SEKME: GÜNLÜK MANİFEST ────────────────────────────────── */}
            {tab === 'manifest' && (
                <div className="mt-6">
                    <div className="no-print flex flex-wrap items-center gap-3 mb-5">
                        <input
                            type="date" value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-900 text-sm"
                        />
                        <button
                            onClick={() => window.print()}
                            disabled={!manifest || manifest.groups.length === 0}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-40"
                        >
                            Yazdır
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={!manifest || manifest.groups.length === 0}
                            className="border border-slate-300 dark:border-slate-700 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            PDF Çıktı Al
                        </button>
                        {manifestLoading && <span className="text-xs text-slate-500">Yükleniyor…</span>}
                    </div>

                    {manifestError && (
                        <div className="no-print rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 mb-4">
                            {manifestError}
                        </div>
                    )}

                    <div className="print-area">
                        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5 flex justify-between items-end">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white print:text-black">
                                    Yolcu Manifestosu — {manifest?.agency ?? ''}
                                </h2>
                                <p className="text-xs font-medium text-slate-500 mt-1">Tarih: {selectedDate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Yolcu</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white print:text-black">
                                    {manifest?.total_pax ?? 0}
                                </p>
                            </div>
                        </div>

                        {!manifestLoading && (manifest?.groups.length ?? 0) === 0 && (
                            <p className="text-center text-slate-500 py-8 text-sm">
                                Bu tarihte onaylanmış rezervasyon yok.
                            </p>
                        )}

                        {manifest?.groups.map(group => (
                            <div key={group.service_id ?? group.service_title} className="print-group mb-8">
                                <div className="flex justify-between items-baseline mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white print:text-black">
                                        {group.service_title}
                                        {group.duration && <span className="font-normal text-xs text-slate-500"> · {group.duration}</span>}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-600">{group.pax} kişi</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                                <th className="p-3 w-12 text-center">Bin.</th>
                                                <th className="p-3">Bilet No</th>
                                                <th className="p-3">Yolcu</th>
                                                <th className="p-3">İletişim & Otel</th>
                                                <th className="p-3 text-center">Kişi</th>
                                                <th className="p-3 text-right no-print">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.passengers.map(p => (
                                                <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-800 ${p.no_show ? 'opacity-60 line-through' : ''}`}>
                                                    <td className="p-3 text-center">
                                                        <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded mx-auto print:border-black" />
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-slate-500 print:text-black">{p.booking_ref}</td>
                                                    <td className="p-3 font-bold text-slate-800 dark:text-white print:text-black">{p.passenger}</td>
                                                    <td className="p-3">
                                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 print:text-black">{p.phone}</p>
                                                        <p className="text-[10px] text-slate-400 print:text-black">{p.hotel}</p>
                                                    </td>
                                                    <td className="p-3 text-center font-black text-slate-800 dark:text-white print:text-black">{p.guests}</td>
                                                    <td className="p-3 text-right no-print">
                                                        <button
                                                            onClick={() => setPendingNoShow(p)}
                                                            className="text-[11px] font-medium underline text-slate-600 hover:text-slate-900 dark:text-slate-400"
                                                        >
                                                            {p.no_show ? 'Geri al' : 'Gelmedi'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

                        <p className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] font-semibold text-slate-400 print:text-black">
                            Bu belge Tourkia platformu tarafından oluşturulmuştur · {new Date().toLocaleDateString('tr-TR')}
                        </p>
                    </div>
                </div>
            )}

            {pendingNoShow && (
                <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm w-full shadow-xl">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                            {pendingNoShow.no_show ? 'İşareti geri al' : 'Gelmedi olarak işaretle'}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                            <span className="font-semibold">{pendingNoShow.passenger}</span> ({pendingNoShow.booking_ref})
                            {pendingNoShow.no_show
                                ? ' kaydındaki "gelmedi" işareti kaldırılacak.'
                                : ' hizmete katılmadı olarak kaydedilecek. Ücret iadesi yapılmaz, kontenjan geri verilmez.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingNoShow(null)}
                                className="flex-1 border border-slate-300 dark:border-slate-600 font-medium py-2 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmNoShow}
                                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2 rounded-md text-sm"
                            >
                                Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
