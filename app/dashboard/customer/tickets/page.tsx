'use client';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/app/lib/api';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Beklemede',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Onaylı',     color: 'bg-green-50 text-green-700 border-green-200'   },
  cancelled: { label: 'İptal',      color: 'bg-red-50 text-red-600 border-red-200'         },
  failed:    { label: 'Başarısız',  color: 'bg-slate-100 text-slate-500 border-slate-200'  },
};

export default function TicketsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string>('');

  useEffect(() => {
    fetchAPI('/bookings/')
      .then((data) => {
        if (!data) {
          setError('Rezervasyonlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        } else {
          setBookings(Array.isArray(data) ? data : data.results ?? []);
        }
      })
      .catch(() => setError('Bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (bookingId: string, bookingRef: string) => {
    if (!window.confirm(`${bookingRef} numaralı rezervasyonu iptal etmek istediğinizden emin misiniz?\nOnaylı rezervasyonlarda Stripe üzerinden iade başlatılır.`)) return;

    setCancellingId(bookingId);
    setCancelError('');

    try {
      const result = await fetchAPI(`/bookings/${bookingId}/cancel/`, { method: 'POST' });
      if (!result) {
        setCancelError('İptal işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.');
        return;
      }
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', cancelled_at: new Date().toISOString() } : b)
      );
    } catch (err: any) {
      setCancelError(err?.message || 'İptal işlemi sırasında bir hata oluştu.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#008cb3] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Biletlerim</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">Satın aldığınız tüm turlar ve rezervasyonlarınız.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-2xl p-4 mb-6 text-sm font-bold">{error}</div>
      )}

      {cancelError && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-2xl p-4 mb-6 text-sm font-bold">{cancelError}</div>
      )}

      {bookings.length === 0 && !error ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-gray-100 dark:border-slate-700">
          <div className="text-4xl mb-4">🎫</div>
          <h3 className="text-lg font-black text-slate-700 dark:text-white mb-2">Henüz Rezervasyonunuz Yok</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Turlarımıza göz atarak ilk rezervasyonunuzu oluşturabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            const statusInfo = STATUS_MAP[booking.status] ?? { label: booking.status, color: 'bg-slate-100 text-slate-500 border-slate-200' };
            const tourTitle = booking.tour_detail?.title || 'Rezervasyon';
            const isCancellable = booking.status === 'pending' || booking.status === 'confirmed';
            const isCancelling = cancellingId === booking.id;

            return (
              <div
                key={booking.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex gap-4"
              >
                {/* Sol: ikon */}
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 border bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl opacity-80">📱</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">QR KOD</span>
                  </div>
                </div>

                {/* Sağ: detaylar */}
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div>
                    <h3 className="font-black text-[15px] leading-tight text-slate-800 dark:text-white">{tourTitle}</h3>
                    <p className="text-[12px] font-bold text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {booking.start_date && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(booking.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {booking.guests && <span className="flex items-center gap-1">👥 {booking.guests} Kişi</span>}
                      {booking.total_price && (
                        <span className="flex items-center gap-1">
                          💰 ₺{Number(booking.total_price).toLocaleString('tr-TR')}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 gap-2 flex-wrap">
                    <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{booking.booking_ref}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {isCancellable && (
                        <button
                          onClick={() => handleCancel(booking.id, booking.booking_ref)}
                          disabled={isCancelling}
                          className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {isCancelling ? 'İptal Ediliyor...' : 'İptal Et'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
