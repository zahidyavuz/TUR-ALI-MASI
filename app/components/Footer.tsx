"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Footer() {
  // Canlı Kur Simülasyonu State
  const initialRates = [
    { birim: '1 USD', karsilik: 35.150, ikon: '🇺🇸', isim: 'Amerikan Doları' },
    { birim: '1 EUR', karsilik: 38.650, ikon: '🇪🇺', isim: 'Euro' },
    { birim: '1 GBP', karsilik: 45.120, ikon: '🇬🇧', isim: 'İngiliz Sterlini' },
    { birim: '1 CNY', karsilik: 4.880, ikon: '🇨🇳', isim: 'Çin Yuanı' },
    { birim: '1 AED', karsilik: 9.570, ikon: '🇦🇪', isim: 'BAE Dirhemi' },
    { birim: '1 RUB', karsilik: 0.380, ikon: '🇷🇺', isim: 'Rus Rublesi' },
    { birim: '1 SAR', karsilik: 9.350, ikon: '🇸🇦', isim: 'Suudi Riyali' },
    { birim: '1 INR', karsilik: 0.420, ikon: '🇮🇳', isim: 'Hindistan Rupisi' }
  ];
  const [liveRates, setLiveRates] = useState(initialRates);
  const [rateColors, setRateColors] = useState<{ [key: string]: 'text-green-500' | 'text-red-500' | 'text-[#005e85]' }>({});

  useEffect(() => {
    

    // API'den gerçek kurları çekme fonksiyonu
    const fetchRealRates = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
        const data = await res.json();
        if (data && data.rates) {
          const tryRates = data.rates;
          const updatedRates = [
            { birim: '1 USD', karsilik: 1 / tryRates.USD, ikon: '🇺🇸', isim: 'Amerikan Doları' },
            { birim: '1 EUR', karsilik: 1 / tryRates.EUR, ikon: '🇪🇺', isim: 'Euro' },
            { birim: '1 GBP', karsilik: 1 / tryRates.GBP, ikon: '🇬🇧', isim: 'İngiliz Sterlini' },
            { birim: '1 CNY', karsilik: 1 / tryRates.CNY, ikon: '🇨🇳', isim: 'Çin Yuanı' },
            { birim: '1 AED', karsilik: 1 / tryRates.AED, ikon: '🇦🇪', isim: 'BAE Dirhemi' },
            { birim: '1 RUB', karsilik: 1 / tryRates.RUB, ikon: '🇷🇺', isim: 'Rus Rublesi' },
            { birim: '1 SAR', karsilik: 1 / tryRates.SAR, ikon: '🇸🇦', isim: 'Suudi Riyali' },
            { birim: '1 INR', karsilik: 1 / tryRates.INR, ikon: '🇮🇳', isim: 'Hindistan Rupisi' }
          ];
          setLiveRates(updatedRates);
        }
      } catch (error) {
        console.error("Kur güncellenemedi:", error);
      }
    };

    // İlk yüklemede kurları çek
    fetchRealRates();
    // Saatte bir API'den güncel veriyi al
    const apiInterval = setInterval(fetchRealRates, 1000 * 60 * 60);

    // Borsa efekti simülasyonunu (küçük dalgalanmaları) devam ettir
    const simInterval = setInterval(() => {
      setLiveRates(prevRates => {
        const newColors: { [key: string]: 'text-green-500' | 'text-red-500' | 'text-[#005e85]' } = {};
        const updated = prevRates.map(rate => {
          // Borsa efekti: Kura çok çok ufak bir değişim ekle
          const change = rate.karsilik * (Math.random() * 0.0004 - 0.0002);
          newColors[rate.birim] = change > 0 ? 'text-green-500' : 'text-red-500';
          return { ...rate, karsilik: rate.karsilik + change };
        });
        setRateColors(newColors);
        return updated;
      });
    }, 3000);

    return () => {
      clearInterval(apiInterval);
      clearInterval(simInterval);
    };
  }, []);



  return (
    <>
      {/* Kapsamlı Alt Bilgi (Footer) - Tourradar Tarzı */}
      < footer className="w-full bg-[#f8f8f8] text-slate-800 pt-12 pb-24 border-t border-gray-200 mt-0" >
        <div className="max-w-[1400px] mx-auto px-6">

          {/* Üst Bar: Puan ve Logolar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 border-b border-gray-300 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">Harika</span>
                <span className="bg-[#00b67a] text-white px-1.5 py-0.5 text-xs font-bold tracking-widest flex items-center gap-0.5">
                  ★ ★ ★ ★ ★
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium">9.906 değerlendirme <span className="font-bold text-[#00b67a] ml-1">★ Trustpilot</span></div>
            </div>
          </div>

          {/* Orta Kısım: Sütunlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12 py-10 text-[13px] leading-[22px] border-b border-gray-300">
            {/* Sütun 1: Şirket */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Şirket</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Hakkımızda</a></li>
                <li className="flex items-center gap-2">
                  <a href="#" className="hover:text-blue-500 transition-colors">Kariyerler</a>
                  <span className="border border-blue-200 text-[#008cb3] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Hemen Başvurun!</span>
                </li>
              </ul>
            </div>

            {/* Sütun 2: Organize Macera Platformu */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Organize Macera Platformu</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Organize Macera Açıklaması</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bağlantılı iş çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Adventure Together Etkinlikleri</a></li>
              </ul>
            </div>

            {/* Sütun 3: Operatörler & Rehberler */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Operatörler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium mb-8">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Başarılı bir işletme kurun</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Ödeme çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Görünürlüğü artırın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Doğrudan rezervasyonları en üst düzeye çıkarın</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Operatör girişi</a></li>
              </ul>

              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Rehberler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yılın Rehberi</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Rehber kaydı</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Rehbere giriş yap</a></li>
              </ul>
            </div>

            {/* Sütun 4: Ortaklar */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Ortaklar</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Seyahat acenteleri ve danışmanları</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">RISE: Ortaklar ve İçerik oluşturucular</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">DMO'lar ve pazarlamacılar</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Çevrimiçi seyahat acenteleri, havayolları...</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">İş ortağı girişi</a></li>
              </ul>
            </div>

            {/* Sütun 5: Destek */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Destek</h4>
              <ul className="flex flex-col gap-3 text-gray-600 font-medium text-[13px]">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bize Ulaşın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yardım merkezi</a></li>
                <li className="text-gray-900 mt-2">Türkiye <a href="#" className="hover:text-blue-500 block text-gray-500">+90 850 123 45 67</a></li>
              </ul>
            </div>
          </div>

          {/* Yeni: Güncel Kurlar Barı */}
          <div className="py-6 mt-8 border-t border-b border-gray-100 mb-8">
            <h4 className="font-bold text-[12px] uppercase tracking-widest text-[#008cb3] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Canlı Kur Referansları (₺)
            </h4>
            <div className="flex flex-wrap gap-4 md:gap-8 overflow-x-auto pb-2 scrollbar-hide">
              {liveRates.map((kur) => (
                <div key={kur.birim} className="flex flex-col flex-shrink-0 group cursor-default">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[14px]">
                    <span className="text-sm">{kur.ikon}</span>
                    {kur.birim} <span className="text-gray-400 text-xs font-medium mx-0.5">=</span>
                    <span className={`transition-colors duration-500 ${rateColors[kur.birim] || 'text-[#005e85]'}`}>
                      ₺{kur.karsilik.toFixed(3)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">{kur.isim}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alt Kısım: Dil, Sosyal, Ödeme ve Uygulama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">

            {/* Dil Seçimi (Top 10 Dünya Dili) */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Otomatik Çeviri (Beta)</h4>
              <div className="flex gap-2 text-[10px] font-black text-slate-700 flex-wrap max-w-[280px]">
                {[
                  { code: 'tr', label: 'TR', title: 'Türkçe' },
                  { code: 'en', label: 'EN', title: 'İngilizce' },
                  { code: 'zh-CN', label: 'ZH', title: 'Çince' },
                  { code: 'hi', label: 'HI', title: 'Hintçe' },
                  { code: 'es', label: 'ES', title: 'İspanyolca' },
                  { code: 'fr', label: 'FR', title: 'Fransızca' },
                  { code: 'ar', label: 'AR', title: 'Arapça' },
                  { code: 'bn', label: 'BN', title: 'Bengalce' },
                  { code: 'ru', label: 'RU', title: 'Rusça' },
                  { code: 'pt', label: 'PT', title: 'Portekizce' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    title={lang.title}
                    onClick={() => {
                      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                      if (select) {
                        select.value = lang.code;
                        select.dispatchEvent(new Event('change'));
                      } else {
                        alert('Çeviri sistemi yükleniyor, lütfen birkaç saniye bekleyip tekrar deneyin.');
                      }
                    }}
                    className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:border-[#008cb3] hover:text-[#008cb3] hover:bg-slate-50 transition-all shadow-sm"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bizi Takip Edin (Sosyal Medya) */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Bizi takip edin</h4>
              <div className="flex gap-4 text-gray-600 border-none items-center mt-2">
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="Facebook">f</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="X (Twitter)">𝕏</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="Instagram">ℹ</span>
                <span className="font-black hover:text-[#2787F5] cursor-pointer text-xl" title="VKontakte">K</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="WeChat (Weixin)">💬</span>
                <span className="font-black hover:text-[#e6162d] cursor-pointer text-xl" title="Sina Weibo">Ⓦ</span>
              </div>
            </div>

            {/* Ödeme Yöntemleri */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Ödeme Yöntemleri</h4>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-blue-800 font-black italic text-[10px]">VISA</span>
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-red-500 font-bold text-[10px]">mastercard</span>
                <span className="bg-[#009b4d] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px] italic">MİR</span>
                <span className="bg-white border border-gray-200 rounded px-2 py-0.5 text-[#003C7A] font-bold text-[10px] uppercase">UnionPay</span>
                <span className="bg-[#2DC100] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px]">WeChat Pay</span>
                <span className="bg-[#1677FF] border border-transparent rounded px-2 py-0.5 text-white font-bold text-[10px]">Alipay</span>
              </div>
            </div>

            {/* Uygulamamızı İndirin */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Uygulamamızı İndirin</h4>
              <div className="flex gap-2 flex-col lg:flex-row">
                <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition w-auto">
                  <span className="font-black text-xs text-left leading-tight tracking-wider">Download on the <br /> <span className="text-sm">App Store</span></span>
                </button>
                <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition w-auto">
                  <span className="font-black text-xs text-left leading-tight tracking-wider">GET IT ON <br /> <span className="text-sm">Google Play</span></span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </footer >

    </>
  );
}
