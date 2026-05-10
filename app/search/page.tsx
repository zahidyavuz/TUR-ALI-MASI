'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTours } from '../lib/tours';
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
  const [popularTours, setPopularTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // URL Params
  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';
  const guests = searchParams.get('guests') || '';

  // Filtreler
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [duration, setDuration] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const getCityCategories = () => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('istanbul')) {
      return ['Boğaz Turları', 'Tarihi Yarımada Gezileri', 'Gece Hayatı & Roof-top Restoranlar'];
    }
    if (loc.includes('antalya')) {
      return ['Yat Turları', 'Antik Kent Gezileri', 'Beach Club & Deniz Ürünleri'];
    }
    // Varsayılan: Kapadokya
    return ['Sıcak Hava Balonu', 'ATV Safari', 'Tarihi Turlar', 'VIP Gurme Deneyimler'];
  };

  const categories = getCityCategories();
  const languages = ['Türkçe', 'İngilizce', 'Rusça', 'Çince'];

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
      const params: any = {};
      if (location) params.location = location;
      if (date) params.date = date;
      if (guests) params.guests = guests;
      if (maxPrice < 10000) params.max_price = maxPrice;

      const data = await fetchTours(params);
      
      // Eğer hiç tur bulunamazsa alternatifleri/popülerleri getir
      if (data.tours.length === 0) {
        const popParams: any = { is_popular: true };
        if (location) popParams.location = location;
        const popData = await fetchTours(popParams);
        setPopularTours(popData.tours.slice(0, 3));
        setTours([]);
      } else {
        setTours(data.tours || []);
        setPopularTours([]);
      }
      setLoading(false);
    }
    loadData();
  }, [location, date, guests, maxPrice, duration, selectedCategories, selectedLanguages]);

  return (
    <div className="min-h-screen bg-background font-sans text-slate-900 dark:text-white pb-12 transition-colors duration-500">
      {/* Üst Bar: Puan ve Destek */}
      <div className="w-full bg-white dark:bg-slate-950/50 py-2 px-4 md:px-8 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-white/60 overflow-hidden transition-colors duration-500">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> 2.500 İşletmeci</span>
          <span className="flex items-center gap-1.5">4,6 Yıldız <span className="text-[#00b67a] font-black">★ Trustpilot</span> <span className="text-gray-400 font-medium">(9.906 Değerlendirme)</span></span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 7/24 Müşteri Desteği</span>
          <span className="flex items-center gap-1.5"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> Ücretsiz eSIM</span>
        </div>
      </div>

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
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-[#008cb3]"
              />
              <div className="flex justify-between text-xs font-semibold text-gray-500 mt-2">
                <span>{formatPrice(500)}</span>
                <span>{maxPrice >= 10000 ? 'Limitsiz' : formatPrice(maxPrice)}</span>
              </div>
            </div>

            {/* Kategoriler */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-3">Kategoriler</label>
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="accent-[#008cb3] rounded" 
                      checked={selectedCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCategories([...selectedCategories, cat]);
                        else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      }}
                    />
                    <span className="group-hover:text-[#008cb3] transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tur Süresi */}
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
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLanguages([...selectedLanguages, lang]);
                        else setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                      }}
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
                <p className="text-gray-500 font-medium mb-8 max-w-md">Şu an seçtiğiniz kriterlerde bir turumuz bulunmuyor, ancak aşağıdaki popüler seçeneklere göz atabilirsiniz.</p>
                <button onClick={() => router.push('/')} className="bg-[#008cb3] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#005e85] transition-all hover:shadow-lg active:scale-95">
                  Tüm Turları Keşfet
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-800 dark:text-white transition-colors duration-500">
                  {tours.length} Tur Bulundu
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
