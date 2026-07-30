"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchTour } from "@/app/lib/tours";
import { useLocale } from "../context/LocaleContext";
import { checkRateLimit, recordFailedAttempt } from "@/app/lib/rateLimit";
import StripePaymentSection from "@/app/components/StripePaymentSection";

/**
 * Demo amaçlı rezervasyon kaydı (acente panelinde görünsün diye).
 * F1-04'te gerçek `/bookings/` çağrısıyla birlikte tamamen kaldırılacak.
 */
function persistMockBooking(booking: Record<string, any> & { isVip: boolean }) {
  if (typeof window === "undefined") return;
  try {
    const { isVip, ...rest } = booking;
    const existingStr = localStorage.getItem("demo_new_bookings");
    const existingBookings = existingStr ? JSON.parse(existingStr) : [];

    // VIP-Badge-Logic-Engine: Bundle alımı veya 5000 TL üzeri harcama VIP yapar
    if (isVip) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      localStorage.setItem(
        "vip_membership",
        JSON.stringify({ level: "VIP", expiry: expiry.toISOString() }),
      );
    }

    existingBookings.unshift({
      id: Math.floor(Math.random() * 10000) + 1000,
      ...rest,
    }); // En başa ekle
    localStorage.setItem(
      "demo_new_bookings",
      JSON.stringify(existingBookings),
    );
  } catch (e) {
    console.error("Error saving mock booking", e);
  }
}

function CheckoutLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const tourId = searchParams.get("tourId");
  const guests = parseInt(searchParams.get("guests") || "1");
  const date = searchParams.get("date");
  const menuId = searchParams.get("menuId");
  const itemType = searchParams.get("type"); // 'meal' or 'tour'

  const [tour, setTour] = useState<any>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info, 2: Payment Gateway, 3: Success
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellShown, setUpsellShown] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [appliedPromoData, setAppliedPromoData] = useState<any>(null);

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

  // --- AKILLI KOMBO EŞLEŞTİRME MANTIĞI (Intelligent-Combo-Matching) ---
  const getSuggestedCombo = () => {
    if (!tour) return null;

    const loc = (tour.location || "").toLowerCase();
    const title = (tour.title || "").toLowerCase();

    // 1. Antalya / Deniz Mantığı
    if (
      loc.includes("antalya") ||
      loc.includes("kaş") ||
      title.includes("yat") ||
      title.includes("mavi")
    ) {
      return {
        id: "antalya-fish-combo",
        name: "Akdeniz Balık Menüsü",
        restaurant: "Marina Seafood",
        description:
          "Günlük taze tutulan deniz mahsulleri ve eşsiz Akdeniz mezeleri.",
        image:
          "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
        price: 850,
        originalPrice: 1200,
        tag: "Deniz Esintisi",
      };
    }

    // 2. İstanbul / Tarih Mantığı
    if (
      loc.match(/istanbul|i̇stanbul|tanbul/) ||
      title.includes("tarih") ||
      title.includes("saray")
    ) {
      return {
        id: "istanbul-palace-combo",
        name: "Osmanlı Saray Mutfağı",
        restaurant: "Asitane Restoran",
        description:
          "Padişahların sofrasından günümüze ulaşan asırlık tarifler.",
        image:
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
        price: 1450,
        originalPrice: 1900,
        tag: "Görkemli Lezzet",
      };
    }

    // 3. Kapadokya / Yerel Mantık
    if (
      loc.includes("kapadokya") ||
      title.includes("balon") ||
      title.includes("vadi")
    ) {
      return {
        id: "cappadocia-local-combo",
        name: "Geleneksel Testi Kebabı",
        restaurant: "Mağara Sofrası",
        description:
          "Kapadokya’nın meşhur ateşte pişen testi kebabı ve yerel şarap tadımı.",
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
        price: 950,
        originalPrice: 1300,
        tag: "Yerel Tatlar",
      };
    }

    // Default / Fallback (Linked Restaurant varsa onu kullan)
    if (tour.linked_restaurant) {
      return {
        id: tour.linked_restaurant.id,
        name: tour.linked_restaurant.special_menu_name || "Özel Menü",
        restaurant: tour.linked_restaurant.name,
        description: tour.linked_restaurant.description,
        image: tour.linked_restaurant.image,
        price: tour.linked_restaurant.price || 500,
        originalPrice: (tour.linked_restaurant.price || 500) * 1.2,
        tag: "Özel Fırsat",
      };
    }

    return null;
  };

  const suggestedCombo = getSuggestedCombo();

  // Reklam (Upsell) Tetikleyici: Kart bilgileri girilirken (Step 2) 1.5 sn sonra çıksın
  useEffect(() => {
    if (step === 2 && !menuId && suggestedCombo && !upsellShown) {
      const timer = setTimeout(() => {
        setShowUpsellModal(true);
        setUpsellShown(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, menuId, suggestedCombo, upsellShown]);

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemType === 'meal') {
      if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.reservationTime || !formData.pax) {
        alert("Lütfen tüm alanları doldurun.");
        return;
      }
    } else {
      if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.hotelName) {
        alert("Lütfen tüm alanları doldurun.");
        return;
      }
    }
    setStep(2);
  };

  // NOT: Bu simülasyon F1-04'te gerçek `/bookings/` + Stripe PaymentIntent
  // akışıyla değiştirilecek.
  const handleSimulatePaymentProcess = async () => {
    // ZERO-TRUST: Ödeme ekranı hız sınırı (Spam/Carding Koruması)
    const limit = checkRateLimit("checkout_attempts");
    if (!limit.allowed) {
      throw new Error(
        `Çok fazla ödeme denemesi yaptınız. Güvenlik sebebiyle işleminiz ${limit.remainingMinutes} dakikalığına durdurulmuştur.`,
      );
    }

    setIsSimulatingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsSimulatingPayment(false);

    // Satın alımı test simülasyonu için localStorage'a kaydet (Acente panelinde görünsün)
    persistMockBooking({
      user_full_name: `${formData.firstName} ${formData.lastName}`,
      user_email: formData.email,
      tour_detail: {
        title:
          itemType === "meal"
            ? "Restoran Rezervasyonu"
            : tour?.title || "Bilinmeyen Tur",
      },
      start_date: date,
      status: "confirmed",
      total_price: totalPrice,
      service_type: itemType === "meal" ? "meal" : "tour",
      category: itemType === "meal" ? "Gastronomi/Yemek" : "Turizm/Aktivite",
      reservation_time: formData.reservationTime,
      pax: formData.pax,
      isVip: bundleLogic.isBundle || totalPrice >= 5000,
    });

    setStep(3); // Success Output
  };

  if (!tourId && !menuId)
    return (
      <div className="p-10 text-center">Eksik Rezervasyon Parametreleri</div>
    );
  if (tourId && !tour && step === 1)
    return <div className="p-10 text-center">Detaylar yükleniyor...</div>;

  const tourPrice = tour ? tour.price * guests : 0;
  const mealPrice =
    menuId && tour?.linked_restaurant && tour.linked_restaurant.id === menuId
      ? tour.linked_restaurant.price * guests
      : 0;

  // BACKEND LOGIC: Dynamic_Discount_Engine
  const calculateBundleDiscount = (tPrice: number, mPrice: number) => {
    let bundleDiscount = 0;
    let promoDiscount = 0;
    let isBundle = false;

    if (tPrice > 0 && mPrice > 0) {
      isBundle = true;
      bundleDiscount = (tPrice + mPrice) * 0.1; // %10 Standart Paket İndirimi
    }

    // Promo Code Logic
    if (isPromoApplied && appliedPromoData) {
      // Eğer COMBO15 ise (VIP Upgrade), bundle indirimini %15'e çıkarır (override)
      if (appliedPromoData.code === "COMBO15") {
        const totalBase = tPrice + mPrice;
        promoDiscount = totalBase * 0.15;
        bundleDiscount = 0; // Promo indirimine dahil edildi
      } else {
        promoDiscount =
          (tPrice + mPrice - bundleDiscount) * (appliedPromoData.rate / 100);
      }
    }

    const finalTotal = tPrice + mPrice - bundleDiscount - promoDiscount;

    return {
      isBundle,
      bundleDiscountAmount: bundleDiscount,
      promoDiscountAmount: promoDiscount,
      finalTotal,
    };
  };

  const bundleLogic = calculateBundleDiscount(tourPrice, mealPrice);
  const totalPrice = bundleLogic.finalTotal;

  const handleApplyPromo = (codeToApply?: string) => {
    const code = (codeToApply || promoCode).toUpperCase();
    if (code === "COMBO15") {
      setAppliedPromoData({
        code: "COMBO15",
        rate: 15,
        label: "Kombo İndirimi Uygulandı",
      });
      setIsPromoApplied(true);
      setPromoCode("COMBO15");
    } else if (code === "WELCOME10") {
      setAppliedPromoData({
        code: "WELCOME10",
        rate: 10,
        label: "Hoş Geldin İndirimi",
      });
      setIsPromoApplied(true);
      setPromoCode("WELCOME10");
    } else {
      if (!codeToApply) alert("Geçersiz Promosyon Kodu");
    }
  };

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

              <button
                type="submit"
                className="w-full bg-[#0B132B] hover:bg-[#005e85] text-white font-black text-xl py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
              >
                <span>İlerle ve Ödeme Yap</span>
                <span className="text-2xl">➔</span>
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
            {!isSimulatingPayment ? (
              <>
                <div className="w-full max-w-5xl">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-[#0B132B] tracking-tight">
                        Ödeme Detayları
                      </h2>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Hızlı ve Güvenli
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
                    <StripePaymentSection
                      amount={totalPrice}
                      onConfirmPayment={handleSimulatePaymentProcess}
                    />
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-8 p-10">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-8 border-t-[#0B132B] rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-[#0B132B] mb-2 uppercase tracking-tighter">
                    İşleminiz Onaylanıyor...
                  </h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                    İşleminiz güvenli bir şekilde bankanıza yönlendiriliyor...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="bg-white/10 backdrop-blur-2xl rounded-[40px] p-8 md:p-14 shadow-2xl border border-emerald-500/30 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-700">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500/50"></div>
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
              <svg
                width="48"
                height="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
              {itemType === 'meal' ? 'Lezzet Yolculuğunuz Onaylandı!' : 'Rezervasyon Başarılı!'}
            </h2>
            <p className="text-lg font-bold text-slate-400 mb-12 max-w-md mx-auto">
              {itemType === 'meal' ? 'Ödemeniz onaylandı. Restoranımızda yeriniz ayırtıldı.' : 'Ödemeniz onaylandı. Tatil planınız başarıyla oluşturuldu.'}
            </p>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                <span className="text-2xl">📧</span>
                <h4 className="font-black text-xs text-white uppercase tracking-widest">
                  E-Bilet (Voucher)
                </h4>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  {formData.email} adresine PDF biletiniz ve detaylı rehberiniz
                  gönderildi.
                </p>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                <span className="text-2xl">⚡</span>
                <h4 className="font-black text-xs text-white uppercase tracking-widest">
                  Anında Onay
                </h4>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Rezervasyonunuz acenta sistemine düştü. Operasyon ekibimiz
                  hazırlıklara başladı.
                </p>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                <span className="text-2xl">🔒</span>
                <h4 className="font-black text-xs text-white uppercase tracking-widest">
                  Güvenli İşlem
                </h4>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Ödemeniz güvenli bağlantı üzerinden tamamlanmıştır.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
              <button
                onClick={() => router.push("/")}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl border border-white/10 transition-all text-sm uppercase tracking-widest"
              >
                Ana Sayfaya Dön
              </button>
              <button
                onClick={() => router.push(itemType === 'meal' ? "/dashboard/customer/tickets" : "/agency/dashboard")}
                className="flex-1 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-black py-4 rounded-2xl shadow-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {itemType === 'meal' ? 'Cüzdanıma Git ➔' : 'Panelini Kontrol Et'}
              </button>
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

              {bundleLogic.isBundle && !isPromoApplied && (
                <div className="flex justify-between items-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top-1 duration-300 mb-4">
                  <span className="flex items-center gap-1">
                    ✨ Paket Avantajı (%10):
                  </span>
                  <span>
                    -{" "}
                    {bundleLogic.bundleDiscountAmount.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </span>
                </div>
              )}

              {isPromoApplied && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 animate-in slide-in-from-top-1 duration-300 mb-4">
                  <span className="flex items-center gap-1">
                    ✅ {appliedPromoData.label}:
                  </span>
                  <span>
                    -{" "}
                    {bundleLogic.promoDiscountAmount.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </span>
                </div>
              )}



              {/* Promo Code Input */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Promosyon Kodu
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="KOD GIRIN"
                    className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                  />
                  <button
                    onClick={() => handleApplyPromo()}
                    className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition"
                  >
                    UYGULA
                  </button>
                </div>
                {isPromoApplied && (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></span>
                    "{appliedPromoData.code}" kodu başarıyla uygulandı!
                  </p>
                )}
              </div>
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

      {/* UPSELL MODAL: Glassmorphism Akıllı Kombo Teklifi */}
      {showUpsellModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide shadow-[0_0_60px_rgba(249,115,22,0.2)] relative animate-in zoom-in-95 duration-700 border border-white/40 dark:border-white/10">
            {/* Parlama Efekti (Glow Decor) */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

            <div className="flex flex-col md:flex-row relative z-10">
              {/* Sol: Görsel (Geniş ve Estetik) */}
              <div className="w-full md:w-5/12 h-48 md:h-auto relative">
                <img
                  src={suggestedCombo?.image}
                  className="w-full h-full object-cover"
                  alt={suggestedCombo?.name}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-orange-500/10"></div>

                {/* Discount Badge */}
                <div className="absolute top-4 left-4">
                  <div className="bg-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-xl border border-orange-400/30">
                    -%15 İNDİRİM
                  </div>
                </div>
              </div>

              {/* Sağ: İçerik */}
              <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center text-lg shadow-inner">
                    💎
                  </div>
                  <h4 className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[0.3em]">
                    Özel Paket Teklifi
                  </h4>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-orange-500 dark:text-orange-400 leading-tight mb-4 tracking-tight">
                  WAIT! WANT TO MAKE <br /> IT A{" "}
                  <span className="text-slate-900 dark:text-white underline decoration-orange-500/30 underline-offset-4">
                    VIP COMBO
                  </span>
                  ?
                </h2>

                <div className="space-y-3 mb-6">
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    Seçtiğiniz tura <b>{suggestedCombo?.name}</b> paketi
                    ekleyin.
                  </p>
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    Bu teklif şu anki rezervasyonunuza özel VIP fiyatıdır.
                  </p>

                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 bg-white/30 dark:bg-white/5 border border-white/50 dark:border-white/10 p-2.5 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                        Normal
                      </p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 line-through">
                        ₺{suggestedCombo?.originalPrice}
                      </p>
                    </div>
                    <div className="text-lg font-black text-orange-500">➔</div>
                    <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 p-2.5 rounded-2xl text-center relative overflow-hidden">
                      <p className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-0.5">
                        VIP
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        ₺{suggestedCombo?.price}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl flex items-center gap-2">
                    <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md">
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 leading-tight uppercase tracking-tighter">
                      Upgrade now & get VIP perks!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(
                        window.location.search,
                      );
                      params.set("menuId", suggestedCombo?.id || "demo-menu");
                      router.replace(`/checkout?${params.toString()}`, {
                        scroll: false,
                      });
                      handleApplyPromo("COMBO15"); // Arka planda indirim kodunu enjekte et
                      setShowUpsellModal(false);
                      setIsSimulatingPayment(true);
                      setTimeout(() => {
                        setIsSimulatingPayment(false);
                        setStep(3);
                      }, 2500);
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-[0_15px_35px_rgba(249,115,22,0.4)] transition-all transform active:scale-95 text-lg"
                  >
                    YES, UPGRADE TO VIP COMBO! ➔
                  </button>
                  <button
                    onClick={() => {
                      setShowUpsellModal(false);
                      setIsSimulatingPayment(true);
                      setTimeout(() => {
                        setIsSimulatingPayment(false);
                        setStep(3);
                      }, 2000);
                    }}
                    className="w-full text-slate-400 dark:text-slate-500 font-bold py-2 text-[11px] hover:text-orange-600 transition-colors uppercase tracking-[0.2em]"
                  >
                    No thanks, just the tour
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
