'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { useCurrency } from '../context/CurrencyContext';
import { fetchShuttles, ShuttleRoute } from '@/app/lib/shuttles';

const VEHICLE_LABELS: Record<string, string> = {
  sedan: '🚗 Sedan',
  minivan: '🚐 Minivan',
  minibus: '🚌 Minibüs',
  bus: '🚍 Otobüs',
};

function TransferListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();

  const [shuttles, setShuttles] = useState<ShuttleRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicle_type') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(false);

      const params: Record<string, string> = {};
      if (origin) params.origin = origin;
      if (destination) params.destination = destination;
      if (vehicleType) params.vehicle_type = vehicleType;
      if (date) params.date = date;

      const data = await fetchShuttles(params);
      if (!data) {
        setLoadError(true);
        setShuttles([]);
      } else {
        setShuttles(data.shuttles);
      }
      setLoading(false);
    }
    loadData();
  }, [origin, destination, vehicleType, date]);

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-12 transition-colors duration-500">
      <Navbar />

      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-6 px-4 md:px-8 mb-8 transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">🚐 Transfer Rezervasyonu</h1>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Nereden (örn. Havalimanı)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            />
            <input
              type="text"
              placeholder="Nereye (örn. Otel Bölgesi)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            >
              <option value="">Tüm Araç Tipleri</option>
              <option value="sedan">Sedan</option>
              <option value="minivan">Minivan</option>
              <option value="minibus">Minibüs</option>
              <option value="bus">Otobüs</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            />
            <button
              onClick={() => { /* filters apply live via useEffect above */ }}
              className="bg-[#008cb3] hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
            >
              Ara
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8">
        {loading ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400 font-semibold">Transferler yükleniyor...</div>
        ) : loadError ? (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
            <p className="text-red-600 dark:text-red-400 font-bold mb-2">Transferler yüklenemedi.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sunucuya ulaşılamıyor olabilir. Lütfen daha sonra tekrar deneyin.</p>
          </div>
        ) : shuttles.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400 font-semibold">
            Bu kriterlere uygun transfer bulunamadı.
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{shuttles.length} Transfer Bulundu</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shuttles.map((shuttle) => (
                <div
                  key={shuttle.id}
                  onClick={() => router.push(`/transfer/${shuttle.id}`)}
                  className="bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 border border-gray-100 dark:border-none group cursor-pointer flex flex-col"
                >
                  <div className="relative w-full h-[180px] overflow-hidden shrink-0">
                    <Image
                      src={shuttle.image_main}
                      alt={shuttle.title}
                      fill
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#008cb3]/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                        {VEHICLE_LABELS[shuttle.vehicle_type] || shuttle.vehicle_type}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-[#008cb3] transition-colors leading-tight mb-2 line-clamp-1">
                      {shuttle.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mb-4">
                      <span>{shuttle.origin}</span>
                      <span className="text-slate-300">→</span>
                      <span>{shuttle.destination}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-4">
                      <span className="flex items-center gap-1">⏱️ {shuttle.duration_minutes} dk</span>
                      <span className="flex items-center gap-1">👥 {shuttle.min_passengers}-{shuttle.max_passengers} kişi</span>
                    </div>

                    <div className="mt-auto flex justify-between items-end pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#008cb3]">{formatPrice(Number(shuttle.price_per_person))}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ Kişi Başı</span>
                      </div>
                      <button className="bg-[#008cb3] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all active:scale-95">
                        Detaylar →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] dark:bg-transparent dark:text-white flex items-center justify-center transition-colors duration-500">Yükleniyor...</div>}>
      <TransferListContent />
    </Suspense>
  );
}
