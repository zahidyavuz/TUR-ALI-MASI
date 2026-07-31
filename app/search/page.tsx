'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTours, fetchAvailableDates } from '@/app/lib/tours';
import { fetchAPI } from '@/app/lib/api';
import CurrencySelector from '../components/CurrencySelector';
import Navbar from '../components/Navbar';
import { useLocale } from '../context/LocaleContext';
import { useCurrency } from '../context/CurrencyContext';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const { currency, rates, formatPrice } = useCurrency();

  const [tours, setTours] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [altDates, setAltDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Tüm filtreler TEK kaynaktan (URL query) okunur ──────────────────────
  // Böylece arama paylaşılabilir/derin-bağlanabilir ve geri/ileri tuşları
  // çalışır. Eskiden fiyat/kategori/süre/dil ön yüzde, üstelik yalnız 12
  // kayıtlık geçerli sayfa üzerinde filtreleniyordu → yanlış sonuç veriyordu.
  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';
  const guests = searchParams.get('guests') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const minRating = searchParams.get('min_rating') || '';
  const duration = searchParams.get('duration') || '';
  const selectedCategories = (searchParams.get('category_obj') || '').split(',').filter(Boolean);
  const selectedLanguages = (searchParams.get('guide') || '').split(',').filter(Boolean);

  const languages = ['Türkçe', 'İngilizce', 'Rusça', 'Çince'];

  // Filtreyi URL'e yazar; searchParams değişimi aşağıdaki useEffect'i tetikler.
  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const toggleMulti = (key: string, current: string[], val: string) => {
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    setFilter(key, next.join(','));
  };

  // Fiyat kaydırıcısı sürüklenirken her piksel için URL yazmamak adına yerel
  // durumda tutulur; bırakılınca (onPointerUp) URL'e işlenir.
  const [priceValue, setPriceValue] = useState<number>(maxPrice ? parseInt(maxPrice) : 10000);
  useEffect(() => {
    setPriceValue(maxPrice ? parseInt(maxPrice) : 10000);
  }, [maxPrice]);

  // Gerçek kategoriler backend'den (eski şehir bazlı uydurma etiketler yerine).
  useEffect(() => {
    fetchAPI('/categories/')
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.map((c: any) => ({ slug: c.slug, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  const mockNotes = [
    "Cappo'nun Notu: Kapadokya'nın ayazına dikkat! Sabahları kalın giyinmek şart ama manzaraya kesinlikle değecek. 🎈",
    "Cappo'nun Notu: İstanbul Boğazı'nın eşsiz esintisine karşı çay içmeyi unutmayın, bu turun en keyifli anı! ☕",
    "Cappo'nun Notu: Antalya sıcağında güneş kreminizi eksik etmeyin, mükemmel koyların tadını çıkarın! 🏖️",
    "Cappo'nun Notu: Muhteşem fotoğraflar çekeceğinizin garantisini veriyorum! 📸",
    "Cappo'nun Notu: Bu turda harcayacağınız her kuruşa değecek, enerjiniz tavan yapacak! ⚡",
    "Cappo'nun Notu: Unutulmaz bir Türkiye deneyimi için mükemmel bir seçim. 🇹🇷",
    "Cappo'nun Notu: Bol keşifli ama sonunda 'İyi ki gelmişim' dedirtecek bir macera. 🥾"
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setAltDates([]);

      // Tüm filtreler sunucuya iletilir; ön yüzde ayrıca filtreleme YOK.
      const params: Record<string, string> = {};
      ['location', 'date', 'guests', 'max_price', 'min_rating', 'duration', 'category_obj', 'guide']
        .forEach((k) => {
          const v = searchParams.get(k);
          if (v) params[k] = v;
        });

      const data = await fetchTours(params);
      setTours(data.tours);
      setCount(data.count);

      // Boş sonuç + tarih seçili → aynı kriterlerde yeri olan alternatif günler.
      if (data.tours.length === 0 && params.date) {
        const altParams = { ...params };
        delete altParams.date;
        const dates = await fetchAvailableDates(altParams);
        setAltDates(dates.filter((d) => d !== params.date).slice(0, 6));
      }
      setLoading(false);
    }
    loadData();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-12 transition-colors duration-500">


      {/* Ana Header */}
      <Navbar />

      {/* Arama Özeti Çubuğu */}
      <div className="bg-white border-b border-gray-200 py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center shadow-sm mb-8 transition-colors duration-500">
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-none dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] sticky top-24 transition-all duration-500">
            <h3 className="text-lg font-black text-slate-800 mb-6 border-b border-gray-100 pb-2">Sonuçları Filtrele</h3>
            
            {/* Fiyat Filtresi */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Maksimum Fiyat</label>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={priceValue}
                onChange={(e) => setPriceValue(parseInt(e.target.value))}
                onPointerUp={() => setFilter('max_price', priceValue >= 10000 ? '' : String(priceValue))}
                onKeyUp={() => setFilter('max_price', priceValue >= 10000 ? '' : String(priceValue))}
                className="w-full accent-[#008cb3]"
              />
              <div className="flex justify-between text-xs font-semibold text-gray-500 mt-2">
                <span>{formatPrice(500)}</span>
                <span>{priceValue >= 10000 ? 'Limitsiz' : formatPrice(priceValue)}</span>
              </div>
            </div>

            {/* Kategoriler (backend'deki gerçek kategoriler) */}
            {categories.length > 0 && (
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-700 block mb-3">Kategoriler</label>
                <div className="flex flex-col gap-2">
                  {categories.map(cat => (
                    <label key={cat.slug} className="flex items-center gap-2 text-sm cursor-pointer group">
                      <input
                        type="checkbox"
                        className="accent-[#008cb3] rounded"
                        checked={selectedCategories.includes(cat.slug)}
                        onChange={() => toggleMulti('category_obj', selectedCategories, cat.slug)}
                      />
                      <span className="group-hover:text-[#008cb3] transition-colors">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Puan */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Minimum Puan</label>
              <div className="flex flex-col gap-2">
                {[['', 'Tümü'], ['4', '4+ ★'], ['4.5', '4.5+ ★']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input
                      type="radio"
                      name="min_rating"
                      checked={minRating === val}
                      onChange={() => setFilter('min_rating', val)}
                      className="accent-[#008cb3]"
                    />
                    <span className="group-hover:text-[#008cb3] transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tur Süresi */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Tur Süresi</label>
              <div className="flex flex-col gap-2">
                {[['', 'Tümü'], ['Saat', 'Saatlik (Yarım Gün)'], ['Gün', 'Günlük']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input
                      type="radio"
                      name="duration"
                      checked={duration === val}
                      onChange={() => setFilter('duration', val)}
                      className="accent-[#008cb3]"
                    />
                    <span className="group-hover:text-[#008cb3] transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rehber Dili */}
            <div className="mb-2">
              <label className="text-sm font-bold text-gray-700 block mb-3">Rehber Dili</label>
              <div className="flex flex-col gap-2">
                {languages.map(lang => (
                  <label key={lang} className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      className="accent-[#008cb3] rounded"
                      checked={selectedLanguages.includes(lang)}
                      onChange={() => toggleMulti('guide', selectedLanguages, lang)}
                    />
                    <span className="group-hover:text-[#008cb3] transition-colors">{lang}</span>
                  </label>
                ))}
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
            <div className="flex flex-col gap-8">
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-none dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center flex flex-col items-center overflow-hidden transition-all duration-500">
                <div className="relative w-64 h-64 mb-6 animate-float">
                  <Image 
                    src="/lonely_balloon.png" 
                    alt="Yalnız Balon" 
                    fill 
                    className="object-contain"
                  />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2 italic">Aramanıza Uygun Tur Bulunmamaktadır</h2>
                <p className="text-gray-500 font-medium mb-8 max-w-md">
                  {altDates.length > 0
                    ? 'Seçtiğiniz tarihte yer yok, ancak aşağıdaki tarihlerde aynı kriterlere uygun turlar mevcut.'
                    : 'Şu an seçtiğiniz kriterlerde bir turumuz bulunmuyor, ancak aşağıdaki popüler seçeneklere göz atabilirsiniz.'}
                </p>

                {/* Alternatif tarih önerileri (boş sonuç + tarih seçili) */}
                {altDates.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {altDates.map((d) => {
                      const label = new Date(d).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'long', weekday: 'short',
                      });
                      return (
                        <button
                          key={d}
                          onClick={() => setFilter('date', d)}
                          className="bg-blue-50 border border-blue-200 text-[#005e85] px-5 py-3 rounded-2xl font-bold text-sm hover:bg-[#008cb3] hover:text-white transition-all active:scale-95"
                        >
                          📅 {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button onClick={() => router.push('/')} className="bg-[#008cb3] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#005e85] transition-all hover:shadow-lg active:scale-95">
                  Tüm Turları Keşfet
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-800 dark:text-white transition-colors duration-500">
                  {count} Tur Bulundu
                </h2>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Önerilen Sıralama</span>
              </div>
              
              {/* Tour Cards */}
              {tours.map((tour, index) => {
                const randomNote = mockNotes[index % mockNotes.length];
                const getCitySignature = (loc: string) => {
                  const l = (loc || '').toLowerCase().replace(/\u0131/g, 'i').replace(/\u0069\u0307/g, 'i');
                  if (l.includes('istanbul')) return { icon: '🗼', name: 'İstanbul' };
                  if (l.includes('antalya')) return { icon: '☀️', name: 'Antalya' };
                  if (l.includes('kapadokya')) return { icon: '🎈', name: 'Kapadokya' };
                  return null;
                };
                const citySign = getCitySignature(tour.location);
                
                return (
                  <div 
                    key={tour.id} 
                    onClick={() => {
                      router.push(`/tour/${tour.id}`);
                    }}
                    className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 border border-gray-100 dark:border-none flex flex-col md:flex-row group mb-2 cursor-pointer">
                    {/* Resim Bölümü */}
                    <div className="relative w-full md:w-[300px] h-[200px] md:h-auto overflow-hidden shrink-0">
                      <Image 
                        src={tour.image_main || tour.imageMain} 
                        alt={tour.title} 
                        fill 
                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                      />
                      
                      {/* Dinamik Badge'ler */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {tour.discount && (
                          <div className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            %{tour.discount} İNDİRİM
                          </div>
                        )}
                        {tour.reviews_count > 500 && (
                          <div className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                            🔥 EN ÇOK SATAN
                          </div>
                        )}
                      </div>

                      {citySign && (
                        <div className="absolute top-4 right-16 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 border border-white/50">
                          <span className="text-sm">{citySign.icon}</span>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{citySign.name}</span>
                        </div>
                      )}

                      <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center transition-all group/fav active:scale-90 shadow-lg border border-white/50">
                        <span className="text-slate-400 group-hover/fav:text-red-500 transition-colors">❤</span>
                      </button>
                    </div>

                    {/* İçerik Bölümü */}
                    <div className="p-4 md:p-6 flex flex-col flex-1 bg-white relative">
                      <div className="flex flex-col mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">
                          {tour.category || '✨ Genel Deneyim'}
                        </span>
                        
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight mb-2 line-clamp-1">
                          {tour.title}
                        </h3>

                        <div className="flex items-center gap-2 mb-6">
                          <div className="flex text-yellow-400 text-sm">
                            {'★'.repeat(Math.floor(tour.rating))}{'☆'.repeat(5 - Math.floor(tour.rating))}
                          </div>
                          <span className="text-xs font-black text-slate-700">{tour.rating}</span>
                          <span className="text-[10px] font-bold text-gray-400">— {tour.reviews_count} Yorum</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span className="w-7 h-7 bg-slate-50 rounded-full flex items-center justify-center text-blue-500">⏱️</span>
                            <span>{tour.duration}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span className="w-7 h-7 bg-slate-50 rounded-full flex items-center justify-center text-blue-500">🗣️</span>
                            <span>{tour.guide || 'İngilizce/Rusça'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                            <span className="w-7 h-7 bg-green-50 rounded-full flex items-center justify-center text-green-500">✓</span>
                            <span>Ücretsiz İptal</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2 leading-relaxed">
                        {tour.description}
                      </p>

                      <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl mb-4">
                        <p className="text-xs font-semibold text-[#005e85] italic">
                          {randomNote}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-4 pt-6 border-t border-slate-50">
                        <div className="flex flex-col">
                          {tour.discount && tour.original_price && (
                            <span className="text-sm font-bold text-gray-300 line-through mb-[-4px]">
                              {formatPrice(tour.original_price)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-[#008cb3]">{formatPrice(tour.price)}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ Kişi Başı</span>
                          </div>
                        </div>
                        <div className="w-full md:w-auto">
                          <button className="w-full md:w-auto bg-[#008cb3] text-white font-bold px-8 py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                            <span>Detayları Gör</span>
                            <span className="text-lg">→</span>
                          </button>
                        </div>
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
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] dark:bg-transparent dark:text-white flex items-center justify-center transition-colors duration-500">Yükleniyor...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
