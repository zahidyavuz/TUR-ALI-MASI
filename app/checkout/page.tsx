"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchTour } from "@/app/lib/tours";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { fetchAPI } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import StripePaymentSection from "@/app/components/StripePaymentSection";

function CheckoutLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tourId = searchParams.get("tourId");
  const guests = parseInt(searchParams.get("guests") || "1");
  const date = searchParams.get("date");
  const menuId = searchParams.get("menuId");
  const itemType = searchParams.get("type"); // 'meal' or 'tour'
  const pathWithQuery = `/checkout?${searchParams.toString()}`;

  const [tour, setTour] = useState<any>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Bilgiler, 2: Ödeme

  // Django'nun oluşturduğu rezervasyon + PaymentIntent
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    hotelName: "",
    reservationTime: "",
    pax: guests || 1,
  });

  useEffect(() => {
    if (!tourId) return;
    fetchTour(tourId)
      .then((t) => setTour(t))
      .catch(() => {});
  }, [tourId]);

  /**
   * Step 1 → Step 2: Django'da rezervasyonu ve Stripe PaymentIntent'i oluşturur.
   * Tutar tamamen sunucu tarafında hesaplanır; buradan fiyat gönderilmez.
   */
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      setBookingError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (itemType !== "meal" && !formData.hotelName) {
      setBookingError("Lütfen konakladığınız oteli girin.");
      return;
    }

    if (!auth.isAuthenticated()) {
      router.push(`/login?next=${encodeURIComponent(pathWithQuery)}`);
      return;
    }

    // ZERO-TRUST: Ödeme ekranı hız sınırı (Spam/Carding Koruması)
    const limit = checkRateLimit("checkout_attempts");
    if (!limit.allowed) {
      setBookingError(
        `Çok fazla ödeme denemesi yaptınız. Güvenlik sebebiyle işleminiz ${limit.remainingMinutes} dakikalığına durdurulmuştur.`,
      );
      return;
    }

    setIsCreatingBooking(true);
    try {
      const result = await fetchAPI("/bookings/", {
        method: "POST",
        throwOnHttpError: true,
        body: JSON.stringify({
          service_type: itemType === "meal" ? "meal" : "tour",
          tour_slug: tourId,
          guests,
          start_date: date || undefined,
          date_label: date || "",
          guest_full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          guest_email: formData.email,
          guest_phone: formData.phone,
          guest_hotel: formData.hotelName,
        }),
      });

      if (!result?.clientSecret) {
        setBookingError(
          "Ödeme başlatılamadı. Sunucuya ulaşılamıyor olabilir, lütfen tekrar deneyin.",
        );
        return;
      }

      setBooking(result.booking);
      setClientSecret(result.clientSecret);
      setStep(2);
    } catch (err: any) {
      setBookingError(err?.message || "Rezervasyon oluşturulamadı.");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  if (!tourId)
    return (
      <div className="p-10 text-center text-white font-bold">
        Eksik rezervasyon parametreleri.
        {menuId && (
          <p className="mt-3 text-sm font-medium text-slate-300">
            Restoran menüsü rezervasyonu henüz çevrimiçi ödemeye açık değildir.
          </p>
        )}
      </div>
    );
  if (!tour)
    return <div className="p-10 text-center text-white">Detaylar yükleniyor...</div>;

  // Fiyat yalnızca gösterim amaçlıdır; tahsil edilen tutar Django'nun
  // hesapladığı `booking.total_price`'tır.
  const estimatedPrice = tour.price * guests;
  const totalPrice = booking ? Number(booking.total_price) : estimatedPrice;

  // Stripe onay sonrası dönülecek mutlak URL. `ref` parametresi Booking'in
  // UUID id'sidir (booking_ref değil) — DRF router UUID ile lookup yapıyor.
  const returnUrl =
    typeof window !== "undefined" && booking
      ? `${window.location.origin}/checkout-success?ref=${booking.id}`
      : "";

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 mb-12 flex flex-col lg:flex-row gap-8 relative z-10">
      {/* Sol: Akış Ekranları */}
      <div className="w-full lg:w-2/3">
        {step === 1 && (
          <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-[#0B132B]">
                  1. Müşteri Bilgileri
                </h2>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  Kişisel Bilgiler & Transfer
                </p>
              </div>
              <div className="hidden md:flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>{" "}
                  GÜVENLİ ÖDEME
                </div>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    İsim
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    placeholder="Ahmet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Soyisim
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    placeholder="Yılmaz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Telefon (WhatsApp)
                  </label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    E-posta
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    placeholder="ahmet@example.com"
                  />
                </div>
              </div>

              {itemType !== 'meal' ? (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Konakladığınız Otel (Transfer Bilgisi İçin)
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.hotelName}
                    onChange={(e) =>
                      setFormData({ ...formData, hotelName: e.target.value })
                    }
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    placeholder="Örn: Museum Hotel Kapadokya"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Rezervasyon Saati
                    </label>
                    <input
                      required
                      type="time"
                      value={formData.reservationTime}
                      onChange={(e) =>
                        setFormData({ ...formData, reservationTime: e.target.value })
                      }
                      className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Kişi Sayısı
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.pax}
                      onChange={(e) =>
                        setFormData({ ...formData, pax: parseInt(e.target.value) || 1 })
                      }
                      className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold">
                  {bookingError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingBooking}
                className="w-full bg-[#0B132B] hover:bg-[#005e85] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xl py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
              >
                <span>
                  {isCreatingBooking
                    ? "Rezervasyon oluşturuluyor..."
                    : "İlerle ve Ödeme Yap"}
                </span>
                {!isCreatingBooking && <span className="text-2xl">➔</span>}
              </button>

              <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png"
                  alt="Visa"
                  className="h-4 grayscale opacity-50"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                  alt="Mastercard"
                  className="h-6 grayscale opacity-50"
                />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                  🛡️ GÜVENLİ ÖDEME
                </div>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-[40px] p-8 md:p-14 shadow-[0_30px_70px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
            <div className="w-full max-w-5xl">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-[#0B132B] tracking-tight">
                    Ödeme Detayları
                  </h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Rezervasyon No: {booking?.booking_ref}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                      Güvenli Ödeme
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                {clientSecret && booking ? (
                  <StripePaymentSection
                    clientSecret={clientSecret}
                    amount={totalPrice}
                    returnUrl={returnUrl}
                  />
                ) : (
                  <div className="text-center font-bold text-slate-400 py-10">
                    Ödeme formu hazırlanıyor...
                  </div>
                )}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                    🛡️
                  </div>
                  <div>
                    <div className="text-[9px] font-black tracking-widest uppercase text-slate-400">
                      Security
                    </div>
                    <div className="text-xs font-black text-slate-600">
                      GÜVENLİ ÖDEME
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/3">
        <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/10 sticky top-8">
          <h3 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
            <span className="text-2xl">📋</span> Sipariş Özeti
          </h3>

          {tour ? (
            <>
              <div className="flex gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden relative shrink-0 border border-white/10">
                  <img
                    src={tour.image_main || tour.imageMain}
                    alt={tour.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-white text-base leading-tight">
                    {tour.title}
                  </h4>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full"></span>{" "}
                    {tour.duration}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-300 mb-8 bg-white/5 p-6 rounded-[24px] border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    📅 Tarih
                  </span>
                  <span className="text-white">
                    {new Date(String(date)).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    👥 Misafir
                  </span>
                  <span className="text-white">{guests} Yetişkin</span>
                </div>
                {menuId && tour?.linked_restaurant && (
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                      🍽️ Yemek
                    </span>
                    <span className="text-emerald-400">
                      {tour.linked_restaurant.special_menu_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Tahsil edilecek tutar Django tarafından hesaplanır; rezervasyon
                  oluşana kadar burada tahmini tutar gösterilir. */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                  Toplam
                </span>
                <span className="text-2xl font-black text-white" suppressHydrationWarning>
                  {totalPrice.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </span>
              </div>
              {!booking && (
                <p className="text-[10px] font-bold text-slate-500 mt-2 text-right">
                  * Kesin tutar rezervasyon oluşturulurken sunucuda hesaplanır.
                </p>
              )}
            </>
          ) : (
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Arka Plan Dekorasyonu */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-6xl mx-auto w-full mb-8 relative z-10">
        <Link
          href="/"
          className="text-slate-400 font-bold text-sm tracking-tight hover:text-white flex items-center gap-2 group w-max transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">
            ←
          </span>{" "}
          Geri Dön
        </Link>
        <div className="mt-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Güvenli Rezervasyon
          </h1>
          <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
            Son Adım: Ödeme ve Onay
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-20 font-bold text-slate-400">
            Ödeme Altyapısı Yükleniyor...
          </div>
        }
      >
        <CheckoutLogic />
      </Suspense>
    </div>
  );
}
