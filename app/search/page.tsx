'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTours } from '../lib/tours';
import CurrencySelector from '../components/CurrencySelector';
import { useLocale } from '../context/LocaleContext';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formatPrice, locale } = useLocale();

  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencyRate, setCurrencyRate] = useState<number>(35); // Varsayılan kur
  
  // URL Params
  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';
  const guests = searchParams.get('guests') || '';

  // Filtreler
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    // Kur bilgisini API'den çek
    fetch('https://api.exchangerate-api.com/v4/latest/TRY')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.USD) {
          setCurrencyRate(1 / data.rates.USD); // TRY -> USD
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const params: any = {};
      if (location) params.location = location;
      if (date) params.date = date;
      if (guests) params.guests = guests;
      if (maxPrice < 10000) params.max_price = maxPrice;

      const data = await fetchTours(params);
      
      // Eğer hiç tur bulunamazsa alternatifleri getir (tarih ve misafir filtresi olmadan)
      if (data.tours.length === 0 && (date || guests)) {
        const altParams: any = {};
        if (location) altParams.location = location;
        const altData = await fetchTours(altParams);
        setTours(altData.tours || []);
      } else {
        setTours(data.tours || []);
      }
      setLoading(false);
    }
    loadData();
  }, [location, date, guests, maxPrice, duration]);

  const mockNotes = [
    "Cappo'nun Notu: Muhteşem fotoğraflar çekeceğinizin garantisini veriyorum! 🎈",
    "Cappo'nun Notu: Bu turda harcayacağınız her kuruşa değecek, enerjiniz tavan yapacak! ⚡",
    "Cappo'nun Notu: Romantik bir kaçamak için bundan daha iyisi olamaz. 🍷",
    "Cappo'nun Notu: Bol yürüyüşlü ama sonunda 'İyi ki gelmişim' dedirtecek bir macera. 🥾"
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans text-slate-900 pb-12">
      {/* Basit Header */}
      <nav className="w-full bg-white py-4 px-4 md:px-8 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <Link href="/" className="text-3xl font-extrabold text-[#008cb3] tracking-tighter">
          Tour<span className="text-[#005e85]">kia</span>
        </Link>
        <div className="flex gap-4 items-center">
          <CurrencySelector />
        </div>
      </nav>

      {/* Arama Özeti Çubuğu */}
      <div className="bg-white border-b border-gray-200 py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center shadow-sm mb-8">
        <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <span>📍 {location || 'Tüm Lokasyonlar'}</span>
          <span className="text-gray-300">|</span>
          <span>📅 {date || 'Belirtilmedi'}</span>
          <span className="text-gray-300">|</span>
          <span>👥 {guests || '1'} Kişi</span>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="text-sm font-bold text-[#008cb3] hover:underline mt-2 md:mt-0"
        >
          Aramayı Değiştir
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-8">
        {/* Sol Panel: Filtreler */}
        <aside className="w-full md:w-1/4 shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-lg font-black text-slate-800 mb-6 border-b border-gray-100 pb-2">Sonuçları Filtrele</h3>
            
            {/* Fiyat Filtresi */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Maksimum Fiyat</label>
              <input 
                type="range" 
                min="500" 
                max="10000" 
                step="500" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-[#008cb3]"
              />
              <div className="flex justify-between text-xs font-semibold text-gray-500 mt-2">
                <span>₺500</span>
                <span>{maxPrice >= 10000 ? 'Limitsiz' : `₺${maxPrice}`}</span>
              </div>
            </div>

            {/* Tur Süresi (Örnek UI) */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Tur Süresi</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="duration" value="" onChange={() => setDuration('')} defaultChecked className="accent-[#008cb3]" />
                  <span className="group-hover:text-[#008cb3] transition-colors">Tümü</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="duration" value="short" onChange={() => setDuration('short')} className="accent-[#008cb3]" />
                  <span className="group-hover:text-[#008cb3] transition-colors">Yarım Gün (1-4 Saat)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="duration" value="full" onChange={() => setDuration('full')} className="accent-[#008cb3]" />
                  <span className="group-hover:text-[#008cb3] transition-colors">Tam Gün</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Sağ Panel: Sonuçlar */}
        <main className="w-full md:w-3/4 flex flex-col gap-6">
          {loading ? (
            <div className="w-full flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#008cb3] rounded-full animate-spin"></div>
            </div>
          ) : tours.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-red-100 text-center flex flex-col items-center">
              <span className="text-6xl mb-4">🔍</span>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Maalesef tur bulamadık</h2>
              <p className="text-gray-500 font-medium mb-6">Arama kriterlerinizi esneterek tekrar deneyebilirsiniz.</p>
              <button onClick={() => router.push('/')} className="bg-[#008cb3] text-white px-6 py-3 rounded-full font-bold hover:bg-[#005e85] transition-colors">
                Farklı Bir Arama Yap
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-800">
                  {tours.length} Tur Bulundu
                </h2>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Önerilen Sıralama</span>
              </div>
              
              {/* Tour Cards */}
              {tours.map((tour, index) => {
                const usdPrice = (tour.price / currencyRate).toFixed(0);
                const randomNote = mockNotes[index % mockNotes.length];
                
                return (
                  <div key={tour.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col md:flex-row group">
                    {/* Resim */}
                    <div className="relative w-full md:w-[300px] h-[200px] md:h-auto overflow-hidden shrink-0">
                      <Image 
                        src={tour.image_main || tour.imageMain} 
                        alt={tour.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {tour.discount && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg">
                          %{tour.discount} İndirim
                        </div>
                      )}
                    </div>

                    {/* İçerik */}
                    <div className="p-5 md:p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tour.location}</p>
                          <h3 className="text-xl font-black text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight">
                            {tour.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md">
                          <span className="text-sm font-black">{tour.rating}</span>
                          <span className="text-[10px]">({tour.reviews_count} Yorum)</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 font-medium mb-4 line-clamp-2">
                        {tour.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-4">
                        <span className="flex items-center gap-1">⏱️ {tour.duration}</span>
                        <span className="flex items-center gap-1">🗣️ {tour.guide || 'Türkçe/İngilizce'}</span>
                      </div>

                      {/* Cappo'nun Notu */}
                      <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl mb-4">
                        <p className="text-xs font-semibold text-[#005e85] italic">
                          {randomNote}
                        </p>
                      </div>

                      <div className="mt-auto flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Toplam Fiyat</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">₺{formatPrice(tour.price).replace('₺', '').trim()}</span>
                            <span className="text-xs font-bold text-gray-400">≈ ${usdPrice}</span>
                          </div>
                        </div>
                        <Link href={`/tour/${tour.id}`}>
                          <button className="bg-[#008cb3] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-md hover:shadow-lg active:scale-95">
                            Hemen Rezerve Et
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">Yükleniyor...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
