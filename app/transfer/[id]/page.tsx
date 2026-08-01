'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchShuttle, ShuttleRoute } from '@/app/lib/shuttles';

const VEHICLE_LABELS: Record<string, string> = {
  sedan: '🚗 Sedan',
  minivan: '🚐 Minivan',
  minibus: '🚌 Minibüs',
  bus: '🚍 Otobüs',
};

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const id = params?.id as string;

  const [shuttle, setShuttle] = useState<ShuttleRoute | null>(null);
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
      const data = await fetchShuttle(id);
      if (!data) {
        setLoadError(true);
      } else {
        setShuttle(data);
        setGuests(data.min_passengers || 1);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Group availability slots by date -> list of available times.
  const slotsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    (shuttle?.availability_slots || [])
      .filter((s) => s.is_available)
      .forEach((s) => {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s.time);
      });
    return map;
  }, [shuttle]);

  const availableDates = Object.keys(slotsByDate).sort();
  const availableTimesForDate = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  const estimatedTotal = shuttle ? Number(shuttle.price_per_person) * guests : 0;

  const handleGuestsChange = (value: number) => {
    if (!shuttle) return;
    const bounded = Math.min(Math.max(value, shuttle.min_passengers), shuttle.max_passengers);
    setGuests(bounded);
  };

  const handleBook = () => {
    if (!shuttle) return;
    setSubmitError(null);

    if (!selectedDate || !selectedTime) {
      setSubmitError('Lütfen bir tarih ve saat seçin.');
      return;
    }

    // Ödeme, ortak checkout akışında yapılır (tur/yemekle aynı). Kontenjan ve
    // fiyat rezervasyon anında sunucuda doğrulanır; burada yalnız seçim taşınır.
    const query = new URLSearchParams({
      type: 'shuttle',
      shuttleId: shuttle.id,
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
        <p className="text-slate-500 dark:text-slate-400 font-semibold mt-20">Transfer bilgileri yükleniyor...</p>
      </div>
    );
  }

  if (loadError || !shuttle) {
    return (
      <div className="min-h-screen bg-background dark:text-white transition-colors duration-500">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-red-600 dark:text-red-400 font-bold mb-2">Bu transfer bulunamadı veya yüklenemedi.</p>
          <button onClick={() => router.push('/transfer')} className="text-[#008cb3] font-semibold hover:underline">
            Tüm transferlere dön
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
          <div className="relative w-full h-[320px] rounded-[1.5rem] overflow-hidden mb-6 shadow-lg">
            <Image src={shuttle.image_main} alt={shuttle.title} fill className="object-cover" unoptimized />
            <div className="absolute top-4 left-4 bg-[#008cb3]/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
              {VEHICLE_LABELS[shuttle.vehicle_type] || shuttle.vehicle_type}
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">{shuttle.title}</h1>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 mb-6">
            <span>{shuttle.origin}</span>
            <span className="text-slate-300">→</span>
            <span>{shuttle.destination}</span>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <span className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">⏱️</span>
              <span>{shuttle.duration_minutes} dakika</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <span className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">👥</span>
              <span>{shuttle.min_passengers}-{shuttle.max_passengers} yolcu</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {shuttle.description}
          </p>
        </div>

        {/* Sağ: Rezervasyon Kartı */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 sticky top-24">
            <>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-black text-[#008cb3]">{formatPrice(Number(shuttle.price_per_person))}</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">/ Kişi Başı</span>
                </div>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tarih</label>
                <select
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                  className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
                >
                  <option value="">Tarih seçin</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {selectedDate && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Saat</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
                    >
                      <option value="">Saat seçin</option>
                      {availableTimesForDate.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </>
                )}

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Yolcu Sayısı ({shuttle.min_passengers}-{shuttle.max_passengers})
                </label>
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
                  <span className="text-xl font-black text-slate-800 dark:text-white">{formatPrice(estimatedTotal)}</span>
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
              </>
          </div>
        </div>
      </div>
    </div>
  );
}
