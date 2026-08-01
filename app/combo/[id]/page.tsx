'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchCombo, Combo } from '@/app/lib/combos';

// Restoran tarafında zaman-slotu kapasitesi yok (F5-02'de ertelendi); combo
// akşam yemeği saati bu sabit öneri listesinden seçilir.
const DINNER_TIMES = ['18:00', '19:00', '20:00', '21:00'];

export default function ComboDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const id = params?.id as string;

  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(1);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setLoadError(false);
      const data = await fetchCombo(id);
      if (!data) {
        setLoadError(true);
      } else {
        setCombo(data);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Turun bugünden itibaren müsait (kapalı olmayan, yeri kalan) günleri.
  const availableDates = (combo?.tour_availability || [])
    .filter((s) => s.is_available)
    .map((s) => s.date)
    .sort();

  const bundleUnit = combo ? Number(combo.bundle_price) : 0;
  const originalUnit = combo ? Number(combo.original_price) : 0;
  const estimatedTotal = bundleUnit * guests;
  const estimatedOriginal = originalUnit * guests;

  const handleGuestsChange = (value: number) => {
    const bounded = Math.max(value, 1);
    setGuests(bounded);
  };

  const handleBook = () => {
    if (!combo) return;
    setSubmitError(null);

    if (!selectedDate || !selectedTime) {
      setSubmitError('Lütfen bir tarih ve saat seçin.');
      return;
    }

    // Ödeme ortak checkout akışında yapılır. Fiyat ve kontenjan rezervasyon
    // anında sunucuda doğrulanır; burada yalnız seçim taşınır.
    const query = new URLSearchParams({
      type: 'combo',
      comboId: combo.id,
      date: selectedDate,
      time: selectedTime,
      guests: String(guests),
    });
    router.push(`/checkout?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:text-white flex items-center justify-center transition-colors duration-500">
        <Navbar />
        <p className="text-slate-500 dark:text-slate-400 font-semibold mt-20">Paket bilgileri yükleniyor...</p>
      </div>
    );
  }

  if (loadError || !combo) {
    return (
      <div className="min-h-screen bg-background dark:text-white transition-colors duration-500">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-red-600 dark:text-red-400 font-bold mb-2">Bu paket bulunamadı veya yüklenemedi.</p>
          <button onClick={() => router.push('/')} className="text-[#008cb3] font-semibold hover:underline">
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-16 transition-colors duration-500">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Bilgi */}
        <div className="lg:col-span-2">
          <div className="relative w-full h-[320px] rounded-[1.5rem] overflow-hidden mb-6 shadow-lg flex">
            <div className="w-1/2 h-full relative border-r-4 border-white">
              <Image src={combo.tour.image_main} alt={combo.tour.title} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="w-1/2 h-full relative">
              {combo.menu.image ? (
                <Image src={combo.menu.image} alt={combo.menu.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-4xl">🍽️</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="absolute top-4 left-4 bg-[#008cb3]/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
              👑 Kombo Fırsatı
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-3">{combo.title}</h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2">
              <span>🎒</span>
              <span>{combo.tour.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2">
              <span>🍽️</span>
              <span>{combo.menu.name}</span>
            </div>
          </div>

          {combo.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line mb-4">
              {combo.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
              <p className="text-[10px] font-black text-[#008cb3] uppercase tracking-widest mb-1">Tur</p>
              <p className="font-bold text-slate-800 dark:text-white">{combo.tour.title}</p>
              <p className="text-xs text-slate-500 mt-1">{combo.tour.location} · {combo.tour.duration}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Menü</p>
              <p className="font-bold text-slate-800 dark:text-white">{combo.menu.name}</p>
              <p className="text-xs text-slate-500 mt-1">{combo.menu.category_display}</p>
            </div>
          </div>
        </div>

        {/* Sağ: Rezervasyon Kartı */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 sticky top-24">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-base text-gray-400 line-through font-bold">{formatPrice(originalUnit)}</span>
              <span className="text-2xl font-black text-[#008cb3]">{formatPrice(bundleUnit)}</span>
            </div>
            <p className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-6">
              Kişi başı {formatPrice(Number(combo.savings))} indirim
            </p>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tarih</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            >
              <option value="">Tarih seçin</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Akşam Yemeği Saati</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            >
              <option value="">Saat seçin</option>
              {DINNER_TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kişi Sayısı</label>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => handleGuestsChange(guests - 1)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                −
              </button>
              <span className="text-lg font-black w-8 text-center">{guests}</span>
              <button
                onClick={() => handleGuestsChange(guests + 1)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                +
              </button>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Tahmini Toplam</span>
              <div className="text-right">
                <span className="block text-xs text-gray-400 line-through font-bold">{formatPrice(estimatedOriginal)}</span>
                <span className="text-xl font-black text-slate-800 dark:text-white">{formatPrice(estimatedTotal)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Bu tutar tahminidir; nihai tutar rezervasyon anında sunucu tarafında doğrulanır.
            </p>

            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime}
              className="w-full bg-[#008cb3] hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Devam Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
