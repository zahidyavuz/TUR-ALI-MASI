'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTours } from '../lib/tours';
import CurrencySelector from '../components/CurrencySelector';
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

  const mockNotes = [
    "Cappo'nun Notu: Muhteşem fotoğraflar çekeceğinizin garantisini veriyorum! 🎈",
    "Cappo'nun Notu: Bu turda harcayacağınız her kuruşa değecek, enerjiniz tavan yapacak! ⚡",
    "Cappo'nun Notu: Romantik bir kaçamak için bundan daha iyisi olamaz. 🍷",
    "Cappo'nun Notu: Bol yürüyüşlü ama sonunda 'İyi ki gelmişim' dedirtecek bir macera. 🥾"
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans text-slate-900 pb-12">
      {/* Üst Bar: Puan ve Destek */}
      <div className="w-full bg-[#f8f9fa] py-2 px-4 md:px-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] font-bold text-gray-500 overflow-hidden">
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
      <nav className="w-full bg-white py-3 px-4 md:py-5 md:px-8 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-3xl font-extrabold text-[#008cb3] tracking-tighter hover:opacity-90 transition-opacity">
            Tour<span className="text-[#005e85]">kia</span>
          </Link>
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200 shadow-sm">
            <span className="flex items-center justify-center w-4 h-4 bg-white rounded-full shadow-sm text-[10px]">🌍</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Global Platform</span>
          </div>
        </div>

        {/* Navigasyon Linkleri (Yeni Eklendi) */}
        <div className="hidden lg:flex gap-6 font-semibold text-gray-700 text-[14px]">
          <Link href="/profile/goals" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.destinations}</Link>
          <Link href="/taste" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.taste}</Link>
          <Link href="/profile/styles" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.styles}</Link>
          <Link href="/profile/memories" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-500 cursor-pointer transition-colors">{t.nav.memories}</Link>
        </div>

        <div className="flex gap-4 items-center">
          <CurrencySelector />
          <select 
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="hidden md:block bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors"
          >
            <option value="tr-TR">TR TR</option>
            <option value="en-US">EN US</option>
            <option value="de-DE">DE DE</option>
            <option value="zh-CN">ZH CN</option>
          </select>
          <div className="hidden md:flex items-center gap-4 text-gray-500 ml-2">
             <span className="cursor-pointer hover:text-[#008cb3] transition-colors"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></span>
             <span className="cursor-pointer hover:text-[#008cb3] transition-colors relative">
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
               <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">9+</span>
             </span>
             <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></span>
          </div>
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
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center overflow-hidden">
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
                
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-10"></div>
                
                <h3 className="text-xl font-black text-slate-800 mb-8">Bunun yerine {location || 'Bölge'}'nin En Popüler Deneyimlerine Göz Atın</h3>
                
                {/* Popular Carousel/Grid */}
                <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                  <div className="flex md:grid md:grid-cols-3 gap-6 min-w-max md:min-w-0">
                    {(popularTours.length > 0 ? popularTours : tours.slice(0, 3)).map((tour) => (
                      <Link href={`/tour/${tour.id}`} key={tour.id} className="group flex flex-col bg-[#FAF9F6] rounded-2xl overflow-hidden border border-gray-50 hover:shadow-md transition-all w-72 md:w-auto">
                        <div className="relative h-44 w-full overflow-hidden">
                          <Image src={tour.image_main || tour.imageMain} alt={tour.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-xs font-black text-[#008cb3] shadow-sm">
                            {tour.rating} ⭐
                          </div>
                        </div>
                        <div className="p-5 text-left">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tour.location.split(',')[0]}</p>
                          <h4 className="text-sm font-black text-slate-800 mb-2 line-clamp-1 group-hover:text-[#008cb3] transition-colors">{tour.title}</h4>
                          <p className="text-base font-black text-[#008cb3]">{formatPrice(tour.price)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
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
                  <div key={tour.id} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 border border-gray-100 flex flex-col md:flex-row group mb-2">
                    {/* Resim Bölümü */}
                    <div className="relative w-full md:w-[360px] h-[240px] md:h-auto overflow-hidden shrink-0">
                      <Image 
                        src={tour.image_main || tour.imageMain} 
                        alt={tour.title} 
                        fill 
                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                      />
                      
                      {/* Dinamik Badge'ler */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {tour.discount && (
                          <div className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-left-4 duration-500">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            %{tour.discount} İNDİRİM
                          </div>
                        )}
                        {tour.reviews_count > 500 && (
                          <div className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-left-4 duration-700">
                            🔥 EN ÇOK SATAN
                          </div>
                        )}
                        {tour.price > 5000 && (
                          <div className="bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-left-4 duration-1000">
                            👑 VIP DENEYİM
                          </div>
                        )}
                      </div>

                      {/* Şehir İmzası (Yeni Eklendi) */}
                      {citySign && (
                        <div className="absolute top-4 right-16 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 border border-white/50 animate-in fade-in zoom-in duration-500">
                          <span className="text-sm">{citySign.icon}</span>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{citySign.name}</span>
                        </div>
                      )}

                      {/* Favori Butonu */}
                      <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center transition-all group/fav active:scale-90 shadow-lg border border-white/50">
                        <span className="text-slate-400 group-hover/fav:text-red-500 transition-colors">❤</span>
                      </button>
                    </div>

                    {/* İçerik Bölümü */}
                    <div className="p-6 md:p-8 flex flex-col flex-1 bg-white relative">
                      <div className="flex flex-col mb-4">
                        {/* Kategori */}
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">
                          {tour.category || '✨ Genel Deneyim'}
                        </span>
                        
                        {/* Başlık */}
                        <h3 className="text-2xl font-black text-slate-800 group-hover:text-[#008cb3] transition-colors leading-tight mb-2 line-clamp-1">
                          {tour.title}
                        </h3>

                        {/* Güven Unsuru (Yıldızlar ve Yorumlar) */}
                        <div className="flex items-center gap-2 mb-6">
                          <div className="flex text-yellow-400 text-sm">
                            {'★'.repeat(Math.floor(tour.rating))}{'☆'.repeat(5 - Math.floor(tour.rating))}
                          </div>
                          <span className="text-xs font-black text-slate-700">{tour.rating}</span>
                          <span className="text-[10px] font-bold text-gray-400">— {tour.reviews_count} Yorum</span>
                        </div>
                        
                        {/* Kısa Özet (İkonlar) */}
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


                      {/* Cappo'nun Notu */}
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
                            <span className="text-3xl font-black text-[#008cb3]">{formatPrice(tour.price)}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ Kişi Başı</span>
                          </div>
                        </div>
                        <Link href={`/tour/${tour.id}`} className="w-full md:w-auto">
                          <button className="w-full md:w-auto bg-[#008cb3] text-white font-bold px-8 py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-[0_10px_20px_rgba(0,140,179,0.2)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] active:scale-95 flex items-center justify-center gap-2">
                            <span>Hemen İncele</span>
                            <span className="text-lg">→</span>
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

      {/* Lezzet Durakları (Taste Hub) - Konsistans İçin Buraya da Eklendi */}
      <div className="w-full bg-white py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-3 block">Gastronomi Keşfi</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Lezzet Durakları</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Aramanızı gurme bir akşam yemeği ile taçlandırın. Bölgenin en iyi restoranlarında sizin için yer ayırttık.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { ad: "Ziyade Ocakbaşı", kategori: "Geleneksel Türk Mutfağı", puan: "4.9", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", tag: "Michelin Önerisi" },
              { ad: "Museum Terrace", kategori: "Fine Dining & Manzara", puan: "4.8", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", tag: "Eşsiz Manzara" },
              { ad: "Seki Restaurant", kategori: "Kaya Oyma & Gurme", puan: "4.7", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80", tag: "Tarihi Doku" }
            ].map((rest, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative h-64 rounded-[2rem] overflow-hidden mb-5 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                  <Image src={rest.image} alt={rest.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full text-slate-800 shadow-sm uppercase tracking-wider">{rest.tag}</span>
                  </div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                      {'★'.repeat(5)} <span className="text-white ml-1 font-bold">{rest.puan}</span>
                    </div>
                    <h4 className="text-xl font-black">{rest.ad}</h4>
                  </div>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{rest.kategori}</p>
                <p className="text-sm font-bold text-gray-500 group-hover:text-[#008cb3] transition-colors">Menüyü İncele ➔</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anılar (Memories / Social Wall) - Konsistans İçin Buraya da Eklendi */}
      <div className="w-full bg-slate-900 py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black text-[#008cb3] uppercase tracking-[0.4em] mb-4 block">Gezginlerin Gözünden</span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">Ölümsüz Anılar</h2>
            <p className="text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Bu turları daha önce deneyimleyen gezginlerin karelerine göz atın.
            </p>
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {[
              { img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80", user: "@sarah_travels", text: "Balonların şafağı karşıladığı o an... Anlatılmaz, yaşanır! 🎈" },
              { img: "https://images.unsplash.com/photo-1544833342-a8109041ce04?w=800&q=80", user: "@mehmet.can", text: "Kapadokya vadilerinde ATV turu hayatımın en adrenalin dolu günüydü." },
              { img: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&q=80", user: "@elena_explorer", text: "İstanbul'un ışıkları altında Boğaz turu... Büyüleyici!" }
            ].map((an, i) => (
              <div key={i} className="relative group rounded-3xl overflow-hidden break-inside-avoid shadow-xl hover:shadow-2xl transition-all duration-500">
                <Image src={an.img} alt={an.user} width={400} height={500} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                  <p className="text-white font-bold text-sm mb-2">{an.text}</p>
                  <span className="text-[#008cb3] font-black text-xs">{an.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
