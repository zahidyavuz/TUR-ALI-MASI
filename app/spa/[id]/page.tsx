'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchSpaVenue, fetchSpaService, SpaVenue, SpaService } from '@/app/lib/spas';

export default function SpaVenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const id = params?.id as string;

  const [venue, setVenue] = useState<SpaVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Seçilen hizmetin slot'ları yalnız hizmet detayında geldiği için ayrı çekilir.
  const [activeService, setActiveService] = useState<SpaService | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setLoadError(false);
      const data = await fetchSpaVenue(id);
      if (!data) {
        setLoadError(true);
      } else {
        setVenue(data);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSelectService = async (service: SpaService) => {
    setSubmitError(null);
    setSelectedDate('');
    setSelectedTime('');
    setServiceLoading(true);
    const detail = await fetchSpaService(service.id);
    setServiceLoading(false);
    if (!detail) {
      setSubmitError('Hizmet uygunluk bilgisi yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    setActiveService(detail);
    setGuests(detail.min_guests || 1);
  };

  const slotsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    (activeService?.availability_slots || [])
      .filter((s) => s.is_available)
      .forEach((s) => {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s.time);
      });
    return map;
  }, [activeService]);

  const availableDates = Object.keys(slotsByDate).sort();
  const availableTimesForDate = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  const estimatedTotal = activeService ? Number(activeService.price_per_person) * guests : 0;

  const handleGuestsChange = (value: number) => {
    if (!activeService) return;
    const bounded = Math.min(Math.max(value, activeService.min_guests), activeService.max_guests);
    setGuests(bounded);
  };

  const handleBook = () => {
    if (!activeService) return;
    setSubmitError(null);

    if (!selectedDate || !selectedTime) {
      setSubmitError('Lütfen bir tarih ve saat seçin.');
      return;
    }

    // Ödeme ortak checkout akışında yapılır. Kontenjan ve fiyat rezervasyon
    // anında sunucuda doğrulanır; burada yalnız seçim taşınır.
    const query = new URLSearchParams({
      type: 'spa',
      spaServiceId: activeService.id,
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
        <p className="text-slate-500 dark:text-slate-400 font-semibold mt-20">Spa bilgileri yükleniyor...</p>
      </div>
    );
  }

  if (loadError || !venue) {
    return (
      <div className="min-h-screen bg-background dark:text-white transition-colors duration-500">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-red-600 dark:text-red-400 font-bold mb-2">Bu spa mekânı bulunamadı veya yüklenemedi.</p>
          <button onClick={() => router.push('/spa')} className="text-[#008cb3] font-semibold hover:underline">
            Tüm spa mekânlarına dön
          </button>
        </div>
      </div>
    );
  }

  const services = venue.services || [];

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-16 transition-colors duration-500">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Bilgi + Hizmetler */}
        <div className="lg:col-span-2">
          <div className="relative w-full h-[320px] rounded-[1.5rem] overflow-hidden mb-6 shadow-lg">
            <Image src={venue.image_main} alt={venue.name} fill className="object-cover" unoptimized />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">{venue.name}</h1>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 mb-6">
            <span>📍 {venue.location}</span>
          </div>

          {venue.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line mb-8">
              {venue.description}
            </p>
          )}

          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4">Hizmetler</h2>
          {services.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Bu mekân için şu an aktif hizmet yok.</p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const isActive = activeService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 transition-all ${
                      isActive
                        ? 'border-[#008cb3] ring-2 ring-[#008cb3]/30'
                        : 'border-gray-100 dark:border-slate-800 hover:border-[#008cb3]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">{service.title}</h3>
                        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>⏱️ {service.duration_minutes} dk</span>
                          <span>👥 {service.min_guests}-{service.max_guests} kişi</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-lg font-black text-[#008cb3]">{formatPrice(Number(service.price_per_person))}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">/kişi</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ: Rezervasyon Kartı */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 sticky top-24">
            {serviceLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold text-center py-8">Uygunluk yükleniyor...</p>
            ) : !activeService ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                Rezervasyon için soldan bir hizmet seçin.
              </p>
            ) : (
              <>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">{activeService.title}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-black text-[#008cb3]">{formatPrice(Number(activeService.price_per_person))}</span>
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
                  Kişi Sayısı ({activeService.min_guests}-{activeService.max_guests})
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
