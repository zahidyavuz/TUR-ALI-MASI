'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAPI } from '@/app/lib/api';

/**
 * Acenta değerlendirme paneli.
 *
 * Backend `/reviews/agency/` yalnız istek yapan acentanın turlarına ait
 * yorumları döndürür; yanıt `/reviews/<id>/reply/` ucuna gönderilir.
 */

interface Review {
    id: number;
    tour_title?: string;
    rating: number;
    comment: string;
    created_at: string;
    verified?: boolean;
    agency_reply?: string | null;
    agency_reply_at?: string | null;
    user?: { username?: string; first_name?: string; last_name?: string };
}

function Stars({ count }: { count: number }) {
    return (
        <div className="flex gap-0.5 text-amber-400">
            {[...Array(5)].map((_, i) => (
                <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i < count ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={i >= count ? 'text-slate-300 dark:text-slate-600' : ''}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ))}
        </div>
    );
}

export default function AgencyReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');

    const [replyingId, setReplyingId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [rowError, setRowError] = useState('');

    const load = useCallback(async () => {
        const data = await fetchAPI('/reviews/agency/');
        if (!data) {
            setListError('Değerlendirmeler yüklenemedi. Sunucuya ulaşılamıyor olabilir.');
        } else {
            setListError('');
            setReviews(Array.isArray(data) ? data : (data.results ?? []));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const startReply = (review: Review) => {
        setReplyingId(review.id);
        setReplyText(review.agency_reply ?? '');
        setRowError('');
    };

    const submitReply = async (id: number) => {
        if (!replyText.trim()) {
            setRowError('Yanıt boş olamaz.');
            return;
        }
        setSubmitting(true);
        setRowError('');
        try {
            const updated = await fetchAPI(`/reviews/${id}/reply/`, {
                method: 'POST',
                throwOnHttpError: true,
                body: JSON.stringify({ agency_reply: replyText.trim() }),
            });
            setReviews(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
            setReplyingId(null);
            setReplyText('');
        } catch (err: any) {
            setRowError(err?.data?.error || err?.message || 'Yanıt gönderilemedi.');
        } finally {
            setSubmitting(false);
        }
    };

    const guestName = (r: Review) =>
        r.user?.first_name || r.user?.username || 'Misafir';

    return (
        <div className="animate-in fade-in duration-500 pb-24 font-sans">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Değerlendirmeler</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Misafirlerinizin yorumlarını görün ve yanıtlayın.
                </p>
            </div>

            {listError && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{listError}</div>
            )}

            {loading ? (
                <div className="space-y-3">
                    <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>
                    <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>
                </div>
            ) : reviews.length === 0 && !listError ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Henüz değerlendirme yok</p>
                    <p className="text-xs text-slate-500 mt-1">Turlarınıza yapılan yorumlar burada görünecek.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-start gap-3 mb-2">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{guestName(review)}</span>
                                        {review.verified && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                Doğrulanmış katılımcı
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                        {review.tour_title} · {new Date(review.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>
                                <Stars count={review.rating} />
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{review.comment}</p>

                            {review.agency_reply && replyingId !== review.id && (
                                <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 border-l-4 border-slate-400 dark:border-slate-600 p-3 rounded-r-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Yanıtınız</span>
                                        {review.agency_reply_at && (
                                            <span className="text-[10px] text-slate-400">({new Date(review.agency_reply_at).toLocaleDateString('tr-TR')})</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 italic">{review.agency_reply}</p>
                                </div>
                            )}

                            {replyingId === review.id ? (
                                <div className="mt-3">
                                    <textarea
                                        rows={3}
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Misafire yanıtınızı yazın..."
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white resize-none"
                                    />
                                    {rowError && <p className="text-xs font-medium text-red-600 mt-1">{rowError}</p>}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => { setReplyingId(null); setReplyText(''); setRowError(''); }}
                                            className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium py-1.5 px-4 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            onClick={() => submitReply(review.id)}
                                            disabled={submitting}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-70"
                                        >
                                            {submitting ? 'Gönderiliyor...' : 'Yanıtı Gönder'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startReply(review)}
                                    className="mt-3 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline"
                                >
                                    {review.agency_reply ? 'Yanıtı düzenle' : 'Yanıtla'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
