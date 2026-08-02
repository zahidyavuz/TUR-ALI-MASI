'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { fetchSpaVenues, SpaVenue } from '@/app/lib/spas';

function SpaListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [venues, setVenues] = useState<SpaVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(false);

      const params: Record<string, string> = {};
      if (location) params.location = location;
      if (search) params.search = search;

      const data = await fetchSpaVenues(params);
      if (!data) {
        setLoadError(true);
        setVenues([]);
      } else {
        setVenues(data.venues);
      }
      setLoading(false);
    }
    loadData();
  }, [location, search]);

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-12 transition-colors duration-500">
      <Navbar />

      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-6 px-4 md:px-8 mb-8 transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">🧖 Spa &amp; Wellness</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nerede (örn. Antalya)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008cb3]"
            />
            <input
              type="text"
              placeholder="Spa adı ya da anahtar kelime"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <div className="text-center py-20 text-slate-500 dark:text-slate-400 font-semibold">Spa mekânları yükleniyor...</div>
        ) : loadError ? (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
            <p className="text-red-600 dark:text-red-400 font-bold mb-2">Spa mekânları yüklenemedi.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sunucuya ulaşılamıyor olabilir. Lütfen daha sonra tekrar deneyin.</p>
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400 font-semibold">
            Bu kriterlere uygun spa mekânı bulunamadı.
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{venues.length} Spa Mekânı Bulundu</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  onClick={() => router.push(`/spa/${venue.id}`)}
                  className="bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 border border-gray-100 dark:border-none group cursor-pointer flex flex-col"
                >
                  <div className="relative w-full h-[180px] overflow-hidden shrink-0">
                    <Image
                      src={venue.image_main}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                      unoptimized
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-[#008cb3] transition-colors leading-tight mb-2 line-clamp-1">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mb-4">
                      <span>📍 {venue.location}</span>
                    </div>

                    <div className="mt-auto flex justify-end items-end pt-4 border-t border-slate-50 dark:border-slate-800">
                      <button className="bg-[#008cb3] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all active:scale-95">
                        Hizmetleri Gör →
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

export default function SpaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] dark:bg-transparent dark:text-white flex items-center justify-center transition-colors duration-500">Yükleniyor...</div>}>
      <SpaListContent />
    </Suspense>
  );
}
