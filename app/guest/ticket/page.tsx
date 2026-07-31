"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/app/lib/api";

/**
 * Misafir (üyeliksiz) bilet görüntüleme sayfası.
 *
 * Misafir hesabı parolasız olduğundan panele giremez; biletine e-postasındaki
 * imzalı sihirli bağlantıyla (`?token=`) ulaşır. Token backend'de çözülür
 * (bkz. bookings/tokens.py, BookingViewSet.guest_ticket) ve rezervasyon
 * bilgileri döner. Token geçersiz/süresi dolmuşsa 400 döner.
 */
function GuestTicketLogic() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Bağlantı eksik. Lütfen e-postanızdaki bağlantıyı kullanın.");
      setLoading(false);
      return;
    }
    fetchAPI(`/bookings/guest-ticket/?token=${encodeURIComponent(token)}`, {
      throwOnHttpError: true,
    })
      .then((data) => {
        if (data) setBooking(data);
        else setError("Bilet yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      })
      .catch((err) => setError(err?.message || "Bağlantı geçersiz veya süresi dolmuş."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="text-center py-20 font-bold text-slate-400">
        Biletiniz yükleniyor...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-[32px] p-10 text-center shadow-2xl">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-black text-[#0B132B] mb-2">Bilete ulaşılamadı</h2>
        <p className="text-slate-500 font-medium">{error}</p>
        <Link
          href="/"
          className="inline-block mt-8 bg-[#0B132B] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#005e85] transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  const serviceTitle =
    booking.tour_detail?.title ||
    booking.shuttle_detail?.title ||
    "Rezervasyon";
  const statusLabel: Record<string, string> = {
    pending: "Ödeme bekleniyor",
    confirmed: "Onaylandı",
    cancelled: "İptal edildi",
    failed: "Ödeme başarısız",
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-[32px] p-8 md:p-10 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-[#0B132B]">Biletiniz</h2>
        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
          {statusLabel[booking.status] || booking.status}
        </span>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-6">{serviceTitle}</h3>

      <div className="space-y-4 text-sm font-bold text-slate-600 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
        <div className="flex justify-between">
          <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
            Referans No
          </span>
          <span className="text-slate-900">{booking.booking_ref}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
            Tarih
          </span>
          <span className="text-slate-900">
            {booking.date_label || booking.start_date || "-"}
            {booking.start_time ? ` ${booking.start_time}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
            Kişi
          </span>
          <span className="text-slate-900">{booking.guests}</span>
        </div>
        {booking.guest_hotel && (
          <div className="flex justify-between">
            <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
              Otel
            </span>
            <span className="text-slate-900">{booking.guest_hotel}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-4">
          <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
            Toplam
          </span>
          <span className="text-lg font-black text-slate-900">
            {Number(booking.total_price).toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </span>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-400 mt-6 text-center">
        Bu bağlantıyı saklayın; biletinize istediğiniz zaman buradan ulaşabilirsiniz.
      </p>
    </div>
  );
}

export default function GuestTicketPage() {
  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center py-12 px-4">
      <Suspense
        fallback={
          <div className="text-center py-20 font-bold text-slate-400">
            Yükleniyor...
          </div>
        }
      >
        <GuestTicketLogic />
      </Suspense>
    </div>
  );
}
