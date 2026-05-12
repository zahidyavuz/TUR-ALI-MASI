'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function RestaurantMenuBuilderPage() {
  const [crossSells, setCrossSells] = useState([
    { id: 1, name: 'Sürpriz Doğum Günü Pastası', price: '25' },
    { id: 2, name: 'VIP Şampanya İkramı', price: '120' }
  ]);

  const [activeMenus, setActiveMenus] = useState([
    {
      id: 1,
      title: 'Boğaz Levrek + Meze Tadım Paketi',
      price: '₺1.200',
      sold: 142,
      image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Şefin Özel Testi Kebabı Menüsü',
      price: '₺950',
      sold: 89,
      image: 'https://images.unsplash.com/photo-1628294895950-980525208535?q=80&w=2070&auto=format&fit=crop'
    }
  ]);

  const removeCrossSell = (id: number) => {
    setCrossSells(crossSells.filter(cs => cs.id !== id));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">VIP Menü Oluşturucu</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Klasik menüleri unutun. Ön ödemeli, yüksek kârlı ve opsiyonlu özel paketler tasarlayın.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* VIP Menü Oluşturma Formu */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Yeni Paket Oluştur</h2>
          </div>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Görsel Yükleme */}
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Sunum Görseli</label>
              <div className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform text-red-400">📸</span>
                <span className="text-sm font-bold text-gray-500">Müşteriyi Acıktıracak Bir Fotoğraf Yükleyin</span>
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Önerilen: 1920x1080px</span>
              </div>
            </div>

            {/* Temel Bilgiler */}
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Özel Paket Adı</label>
              <input type="text" placeholder="Örn: Kapadokya Romantik Akşam Yemeği" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-bold text-slate-800 dark:text-white"/>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Fix Fiyat (₺) - Kişi Başı</label>
              <input type="number" placeholder="Örn: 1500" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-black text-slate-800 dark:text-white text-lg"/>
            </div>

            {/* Çapraz Satış (Cross-Sell) Bölümü */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="block text-sm font-black text-red-600 dark:text-red-400">Ekstra İstekler (Cross-Sell)</label>
                  <p className="text-[10px] text-gray-500 font-medium">Sepette gösterilecek kârlı eklemeler.</p>
                </div>
                <button className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                  + Yeni Ekle
                </button>
              </div>

              <div className="space-y-3">
                {crossSells.map((cs) => (
                  <div key={cs.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-3">
                    <input type="text" defaultValue={cs.name} className="flex-1 bg-transparent outline-none font-bold text-sm text-slate-800 dark:text-white" />
                    <div className="flex items-center gap-1 font-black text-slate-800 dark:text-white border-l border-gray-200 dark:border-slate-700 pl-3">
                      <span>+₺</span>
                      <input type="text" defaultValue={cs.price} className="w-12 bg-transparent outline-none text-right" />
                    </div>
                    <button onClick={() => removeCrossSell(cs.id)} className="w-6 h-6 bg-red-100 text-red-500 rounded flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors ml-1">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-red-500/30 active:scale-95 text-lg mt-4">
              VIP Menüyü Yayına Al
            </button>
          </form>
        </div>

        {/* Aktif Paketler */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Yayındaki Paketleriniz</h2>
          
          {activeMenus.map(menu => (
            <div key={menu.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 group hover:shadow-md transition-shadow">
              <div className="w-full sm:w-32 h-24 relative rounded-2xl overflow-hidden shrink-0">
                <Image src={menu.image} alt={menu.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" unoptimized />
              </div>

              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 dark:text-white leading-tight pr-2">{menu.title}</h3>
                    <span className="font-black text-slate-800 dark:text-white">{menu.price}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                    Toplam Satış: <span className="text-green-500">{menu.sold} Adet</span>
                  </p>
                </div>

                <div className="mt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-800 pt-3">
                  <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-md">
                    AKTİF
                  </span>
                  <div className="flex gap-2">
                    <button className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">Düzenle</button>
                    <span className="text-gray-300 dark:text-slate-700">|</span>
                    <button className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Yayından Kaldır</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
