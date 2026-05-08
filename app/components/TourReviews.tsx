'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth as authHelper } from '../lib/auth';
import { fetchAPI } from '../lib/api';

interface TourReviewsProps {
    tourId: string;
}

export default function TourReviews({ tourId }: TourReviewsProps) {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    useEffect(() => {
        if (tourId) {
            fetchReviews();
        }
    }, [tourId]);

    const fetchReviews = async () => {
        try {
            const data = await fetchAPI(`/reviews/?tour=${tourId}`);
            if (data) {
                setReviews(data.results || data);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitMessage(null);

        if (!user) {
            setSubmitMessage({ type: 'error', text: 'Yorum yapabilmek için giriş yapmalısınız.' });
            return;
        }

        if (comment.trim().length < 10) {
            setSubmitMessage({ type: 'error', text: 'Lütfen en az 10 karakterlik bir yorum giriniz.' });
            return;
        }

        setSubmitting(true);
        try {
            const token = authHelper.getAccessToken();
            const data = await fetchAPI('/reviews/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    tour: tourId,
                    rating,
                    comment
                })
            });

            if (data) {
                setSubmitMessage({ type: 'success', text: 'Yorumunuz başarıyla gönderildi!' });
                setComment('');
                setRating(5);
                fetchReviews(); // Refresh list
            } else {
                setSubmitMessage({ type: 'error', text: 'Yorum gönderilirken bir hata oluştu.' });
            }
        } catch (error: any) {
            setSubmitMessage({ type: 'error', text: 'Bir ağ hatası oluştu.' });
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (count: number) => {
        return (
            <div className="flex gap-1 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} width="16" height="16" fill={i < count ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={i >= count ? "text-gray-300" : ""}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="mt-12 pt-10 border-t border-gray-100">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Misafir Değerlendirmeleri</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left: Leave a review form */}
                <div className="lg:col-span-1 bg-slate-50 rounded-3xl p-6 border border-gray-200 h-fit">
                    <h4 className="font-bold text-lg text-slate-800 mb-4">Deneyiminizi Paylaşın</h4>
                    
                    {submitMessage && (
                        <div className={`p-4 rounded-xl mb-4 text-sm font-bold ${submitMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {submitMessage.text}
                        </div>
                    )}

                    {!user ? (
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                            <p className="text-sm text-gray-500 font-medium mb-3">Yorum yapabilmek için giriş yapmalısınız.</p>
                            <button onClick={() => window.location.href = '/login'} className="bg-[#008cb3] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#005e85] transition-colors w-full">Giriş Yap</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Puanınız</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none"
                                        >
                                            <svg width="24" height="24" fill={star <= rating ? "#FBBF24" : "none"} viewBox="0 0 24 24" stroke={star <= rating ? "#FBBF24" : "#D1D5DB"} strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Yorumunuz</label>
                                <textarea
                                    rows={4}
                                    placeholder="Tur hakkında ne düşünüyorsunuz?"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3] focus:ring-opacity-20 outline-none transition-all resize-none text-sm font-medium"
                                    required
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full font-bold text-white py-3 rounded-xl transition-all shadow-md ${
                                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#008cb3] hover:bg-[#005e85] hover:shadow-lg active:scale-95'
                                }`}
                            >
                                {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">Sadece bu tura katılmış olan üyeler yorum yapabilir.</p>
                        </form>
                    )}
                </div>

                {/* Right: Reviews List */}
                <div className="lg:col-span-2 space-y-6">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-32 bg-gray-100 rounded-3xl w-full"></div>
                            <div className="h-32 bg-gray-100 rounded-3xl w-full"></div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="bg-white border border-gray-100 p-10 rounded-3xl text-center shadow-sm">
                            <div className="text-4xl mb-3">💬</div>
                            <h4 className="text-lg font-bold text-slate-800 mb-1">Henüz yorum yok</h4>
                            <p className="text-gray-500 text-sm">Bu tur için ilk değerlendirmeyi siz yapın.</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.id} className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#008cb3] to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                            {review.user_detail?.first_name ? review.user_detail.first_name[0] : review.user_detail?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">{review.user_detail?.first_name || review.user_detail?.username || 'Kullanıcı'}</h5>
                                            <p className="text-[11px] text-gray-400 font-medium">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {renderStars(review.rating)}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                
                                {review.agency_reply && (
                                    <div className="mt-4 bg-slate-50 border-l-4 border-[#008cb3] p-4 rounded-r-2xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-black text-[#008cb3] uppercase tracking-wider">Acente Yanıtı</span>
                                            {review.agency_reply_at && (
                                                <span className="text-[10px] text-gray-400 font-medium">({new Date(review.agency_reply_at).toLocaleDateString()})</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 italic">{review.agency_reply}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
