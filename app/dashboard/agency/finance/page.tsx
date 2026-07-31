'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI, downloadFile } from '@/app/lib/api';

/**
 * Acenta finansal raporlama ekranı.
 *
 * Backend: `agencies/finance_views.py`. Tüm tutarlar sunucuda hesaplanır —
 * bu sayfa komisyon/bakiye aritmetiği yapmaz, yalnız gösterir. (Eski sürüm
 * sabit %15 ile tarayıcıda hesaplıyordu; gerçek oran acentaya göre değişir.)
 *   • Özet   : GET  /agency/finance/summary/
 *   • Döküm  : GET  /agency/finance/ledger/?month=&type=&page=
 *   • Ekstre : GET  /agency/finance/export/?month=&type=
 *   • Talep  : GET/POST /agency/finance/payout-request/
 */

interface Summary {
    agency_name: string;
    commission_rate: number;
    summary: {
        total_gross: number;
        total_commission: number;
        total_net: number;
        total_transactions: number;
    };
    balance: {
        available: number;
        paid_out: number;
        pending_payout: number;
    };
    bank_account: {
        iban_masked: string | null;
        bank_name: string | null;
        holder: string | null;
        is_complete: boolean;
    };
    pending_request: { id: number; amount: number; requested_at: string } | null;
}

interface LedgerEntry {
    booking_ref: string;
    tour_title: string;
    tour_date: string | null;
    gross_amount: number;
    commission_rate: number;
    commission_amount: number;
    net_amount: number;
    entry_type: string;
    entry_type_label: string;
    notes: string | null;
    created_at: string;
}

interface PayoutRequest {
    id: number;
    amount: number;
    iban_masked: string | null;
    status: string;
    status_label: string;
    admin_notes: string | null;
    requested_at: string;
    resolved_at: string | null;
}

const TYPE_FILTERS = [
    { value: '', label: 'Tümü' },
    { value: 'sale', label: 'Satış' },
    { value: 'refund', label: 'İade' },
    { value: 'adjustment', label: 'Düzeltme' },
] as const;

const PAYOUT_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    paid: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
};

const money = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AgencyFinancePage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [entryCount, setEntryCount] = useState(0);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

    const [month, setMonth] = useState('');
    const [entryType, setEntryType] = useState('');
    const [page, setPage] = useState(1);

    const [loadError, setLoadError] = useState('');
    const [ledgerLoading, setLedgerLoading] = useState(true);

    const [amountInput, setAmountInput] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    const [payoutError, setPayoutError] = useState('');
    const [payoutSuccess, setPayoutSuccess] = useState('');
    const [exportError, setExportError] = useState('');

    const loadSummary = useCallback(async () => {
        const [summaryData, payoutData] = await Promise.all([
            fetchAPI('/agency/finance/summary/'),
            fetchAPI('/agency/finance/payout-request/'),
        ]);
        if (!summaryData) {
            setLoadError('Finansal veriler yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
            return;
        }
        setLoadError('');
        setSummary(summaryData);
        setPayouts(Array.isArray(payoutData) ? payoutData : []);
    }, []);

    const loadLedger = useCallback(async () => {
        setLedgerLoading(true);
        const query = new URLSearchParams({ page: String(page) });
        if (month) query.set('month', month);
        if (entryType) query.set('type', entryType);

        const data = await fetchAPI(`/agency/finance/ledger/?${query.toString()}`);
        if (data) {
            setEntries(data.results ?? []);
            setEntryCount(data.count ?? 0);
        } else {
            setEntries([]);
            setEntryCount(0);
        }
        setLedgerLoading(false);
    }, [month, entryType, page]);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadLedger(); }, [loadLedger]);

    // Filtre değişince ilk sayfaya dön: 3. sayfadayken filtre daraltılırsa
    // boş bir sayfa görünürdü.
    useEffect(() => { setPage(1); }, [month, entryType]);

    const available = summary?.balance.available ?? 0;
    const hasPending = Boolean(summary?.pending_request);
    const bankReady = summary?.bank_account.is_complete ?? false;
    const canRequest = available > 0 && !hasPending && bankReady;

    const handlePayoutRequest = async () => {
        setPayoutError('');
        setPayoutSuccess('');

        // Sunucu da aynı kontrolü yapıyor; buradaki amaç boşuna istek atmamak.
        const amount = amountInput.trim() ? Number(amountInput.replace(',', '.')) : null;
        if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
            setPayoutError('Geçerli bir tutar girin.');
            return;
        }
        if (amount !== null && amount > available) {
            setPayoutError(`Tutar çekilebilir bakiyeyi aşamaz (₺${money(available)}).`);
            return;
        }

        setIsRequesting(true);
        try {
            const data = await fetchAPI('/agency/finance/payout-request/', {
                method: 'POST',
                body: JSON.stringify(amount !== null ? { amount } : {}),
                throwOnHttpError: true,
            });
            if (!data) {
                setPayoutError('Talep gönderilemedi. Sunucuya ulaşılamıyor olabilir.');
            } else {
                setPayoutSuccess(data.detail);
                setAmountInput('');
                await loadSummary();
            }
        } catch (err: unknown) {
            const e = err as { data?: { error?: string }; message?: string };
            setPayoutError(e?.data?.error || e?.message || 'Talep gönderilemedi.');
        }
        setIsRequesting(false);
    };

    const handleExport = async () => {
        setExportError('');
        const query = new URLSearchParams();
        if (month) query.set('month', month);
        if (entryType) query.set('type', entryType);
        const ok = await downloadFile(
            `/agency/finance/export/?${query.toString()}`,
            `tourkia-ekstre-${month || 'tum-zamanlar'}.csv`,
        );
        if (!ok) setExportError('Ekstre indirilemedi.');
    };

    const totalPages = Math.max(1, Math.ceil(entryCount / 20));

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 font-sans">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Finansal Raporlar</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Satışlarınızı, komisyon kesintilerinizi ve kullanılabilir bakiyenizi takip edin.
                    </p>
                </div>

                {summary && (
                    <div className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Platform Komisyonu: %{summary.commission_rate}
                    </div>
                )}
            </div>

            {loadError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── Sol: Bakiye + hakediş talebi ─────────────────────────── */}
                <div className="xl:col-span-1 space-y-4">
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-6 shadow-sm border border-slate-800 text-white font-sans">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Çekilebilir Net Bakiye</h2>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold tracking-tight">{money(available)}</span>
                            <span className="text-xl text-slate-400">₺</span>
                        </div>

                        <div className="space-y-2 mb-5">
                            <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50 flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-medium">Bekleyen Talep</span>
                                <span className="text-sm font-semibold text-slate-300">
                                    {money(summary?.balance.pending_payout ?? 0)} ₺
                                </span>
                            </div>
                            <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50 flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-medium">Bugüne Kadar Ödenen</span>
                                <span className="text-sm font-semibold text-slate-300">
                                    {money(summary?.balance.paid_out ?? 0)} ₺
                                </span>
                            </div>
                        </div>

                        {/* Kısmi çekim: boş bırakılırsa tüm bakiye talep edilir. */}
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Talep Tutarı (boş = tümü)
                        </label>
                        <div className="relative mb-3">
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                max={available}
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                                disabled={!canRequest}
                                placeholder={money(available)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                        </div>

                        <button
                            onClick={handlePayoutRequest}
                            disabled={!canRequest || isRequesting}
                            className={`w-full py-2.5 rounded-md font-semibold text-sm transition-all shadow-sm flex justify-center items-center gap-2 ${
                                !canRequest
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-white text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            {isRequesting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> İşleniyor...
                                </span>
                            ) : hasPending ? 'Bekleyen Talebiniz Var'
                                : !bankReady ? 'Banka Bilgisi Eksik'
                                : available <= 0 ? 'Bakiye Yetersiz'
                                : 'Hakedişi Talep Et'}
                        </button>

                        {hasPending && summary?.pending_request && (
                            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                                {formatDate(summary.pending_request.requested_at)} tarihli
                                ₺{money(summary.pending_request.amount)} tutarındaki talebiniz inceleniyor.
                            </p>
                        )}
                        {!bankReady && (
                            <p className="text-[10px] text-center text-amber-400 mt-2 font-medium">
                                Hakediş ödemesi için IBAN ve hesap sahibi bilgisi gereklidir.
                            </p>
                        )}
                        {payoutError && (
                            <p className="text-[11px] text-center text-red-400 mt-2 font-medium">{payoutError}</p>
                        )}
                        {payoutSuccess && (
                            <p className="text-[11px] text-center text-green-400 mt-2 font-medium">{payoutSuccess}</p>
                        )}
                    </div>

                    {/* Kayıtlı hesap — IBAN maskeli: doğrulamaya yetecek kadar. */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 font-sans">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Kayıtlı Banka Hesabı
                        </h3>
                        {summary?.bank_account.iban_masked ? (
                            <>
                                <p className="text-sm text-slate-800 dark:text-slate-200 font-mono font-medium mb-1">
                                    {summary.bank_account.iban_masked}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {[summary.bank_account.bank_name, summary.bank_account.holder]
                                        .filter(Boolean).join(' — ') || 'Hesap sahibi bilgisi eksik'}
                                </p>
                            </>
                        ) : (
                            /* Onay sonrası banka bilgisi düzenleme ekranı henüz yok
                               (onboarding onaydan sonra kapanıyor), bu yüzden var
                               olmayan bir sayfaya yönlendirmek yerine destek deniyor. */
                            <p className="text-xs text-slate-500">
                                Kayıtlı banka hesabı yok. Hakediş ödemesi alabilmek için
                                IBAN bilgilerinizin eklenmesi gerekiyor; lütfen destek ekibiyle
                                iletişime geçin.
                            </p>
                        )}
                    </div>

                    {/* Talep geçmişi */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 font-sans">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            Hakediş Talepleri
                        </h3>
                        {payouts.length === 0 ? (
                            <p className="text-xs text-slate-500">Henüz hakediş talebiniz yok.</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {payouts.map(p => (
                                    <li key={p.id} className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-2.5 last:pb-0">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">₺{money(p.amount)}</p>
                                            <p className="text-[10px] text-slate-500">{formatDate(p.requested_at)}</p>
                                            {p.admin_notes && (
                                                <p className="text-[10px] text-slate-500 mt-0.5 italic">{p.admin_notes}</p>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border shrink-0 ${PAYOUT_BADGE[p.status] ?? PAYOUT_BADGE.pending}`}>
                                            {p.status_label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ── Sağ: İşlem dökümü ────────────────────────────────────── */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 font-sans">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            İşlem Dökümü {entryCount > 0 && <span className="text-slate-400 font-medium">({entryCount})</span>}
                        </h2>
                        <button
                            onClick={handleExport}
                            className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Ekstre İndir (CSV)
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5"
                        />
                        {month && (
                            <button
                                onClick={() => setMonth('')}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                            >
                                Ayı temizle
                            </button>
                        )}
                        <div className="flex gap-1.5 ml-auto">
                            {TYPE_FILTERS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setEntryType(f.value)}
                                    className={`text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
                                        entryType === f.value
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {exportError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-3">{exportError}</p>
                    )}

                    {ledgerLoading ? (
                        <p className="text-sm text-slate-500 py-8 text-center">Yükleniyor...</p>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">
                            {month || entryType ? 'Bu filtreye uyan işlem yok.' : 'Henüz finansal işlem kaydınız yok.'}
                        </p>
                    ) : (
                        <>
                            {/* Mobil kart görünümü */}
                            <div className="md:hidden space-y-4">
                                {entries.map(e => (
                                    <div key={e.booking_ref} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                                            <div>
                                                <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{e.booking_ref}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(e.created_at)}</p>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                {e.entry_type_label}
                                            </span>
                                        </div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{e.tour_title}</p>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tahsilat</p>
                                                <p className="font-bold text-slate-700 dark:text-slate-300">{money(e.gross_amount)} ₺</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Komisyon (%{e.commission_rate})</p>
                                                <p className="font-bold text-red-500">{money(e.commission_amount)} ₺</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-gray-50 dark:border-white/5 pt-3">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Hakediş</p>
                                            <p className={`font-black text-lg ${e.net_amount < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {money(e.net_amount)} ₺
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Masaüstü tablo */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b-2 border-gray-100 dark:border-slate-800 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                                            <th className="p-3 pl-0">İşlem / Tarih</th>
                                            <th className="p-3 text-right">Müşteri Ödedi</th>
                                            <th className="p-3 text-right text-red-500">Kesinti</th>
                                            <th className="p-3 text-right text-green-500">Size Kalan (Net)</th>
                                            <th className="p-3 pr-0 text-right">Tip</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                        {entries.map(e => (
                                            <tr key={e.booking_ref} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                                                <td className="p-4 pl-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white mb-0.5">{e.tour_title}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <span className="font-mono">{e.booking_ref}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(e.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-600 dark:text-slate-400">
                                                    ₺{money(e.gross_amount)}
                                                </td>
                                                <td className="p-4 text-right font-bold text-red-500 bg-red-50/50 dark:bg-red-900/10">
                                                    ₺{money(-e.commission_amount)}
                                                </td>
                                                <td className={`p-4 text-right font-black ${
                                                    e.net_amount < 0
                                                        ? 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                                                        : 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10'
                                                }`}>
                                                    {e.net_amount < 0 ? '' : '+'}₺{money(e.net_amount)}
                                                </td>
                                                <td className="p-4 pr-0 text-right">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                                        {e.entry_type_label}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Önceki
                                    </button>
                                    <span className="text-xs text-slate-500">{page} / {totalPages}</span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Sonraki
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
