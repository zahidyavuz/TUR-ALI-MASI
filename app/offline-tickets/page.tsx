'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllOfflineTickets, deleteOfflineTicket } from '@/app/lib/offline-db';
import Navbar from '../components/Navbar';
import type { OfflineTicket } from '@/app/lib/offline-types';
import { verifyLocalBookingOwnership } from '@/app/lib/idor';
import ForbiddenPage from '../components/ForbiddenPage';

export default function OfflineTicketsPage() {
  const [tickets, setTickets] = useState<OfflineTicket[]>([]);
  const [selected, setSelected] = useState<OfflineTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedMsg, setDeniedMsg] = useState('');

  const load = async () => {
    try {
      const list = await getAllOfflineTickets();
      setTickets(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu bileti yerel kayıttan silmek istediğinize emin misiniz?')) return;
    await deleteOfflineTicket(id);
    setSelected((s) => (s?.id === id ? null : s));
    load();
  };

  const handleSelectTicket = (t: OfflineTicket) => {
    // IDOR: Biletin bu kullanıcıya ait olduğunu doğrula
    const check = verifyLocalBookingOwnership(t.id);
    if (!check.allowed && check.reason === 'forbidden') {
      setDeniedMsg(`'${t.id}' numaralı bileti görüntüleme yetkiniz yok.`);
      setAccessDenied(true);
      return;
    }
    setSelected(t);
  };

  if (accessDenied) {
    return <ForbiddenPage message={deniedMsg} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Offline Biletlerim</h1>
        <p className="text-gray-600 text-sm mb-8">
          İnternetin çekmediği yerlerde (müze, dağ turları vb.) QR kod ve haritayı göstermek için biletlerinizi buradan açabilirsiniz.
        </p>

        {loading ? (
          <p className="text-gray-500 font-medium">Yükleniyor...</p>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-[32px] p-12 shadow-sm border border-gray-100 text-center relative overflow-hidden">
            {/* Arkaplan Şekilleri */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl"></div>

            <div className="w-24 h-24 mb-6 bg-slate-50 rounded-full flex items-center justify-center text-4xl shadow-inner relative z-10">
              🤷‍♂️
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 relative z-10">Hoppala! Buralar bomboş...</h2>
            <p className="text-gray-500 font-medium mb-8 max-w-md mx-auto relative z-10">Şu an sırt çantanızda hiç offline (internetsiz) bilet bulunmuyor. Dünyayı keşfetmek için harika bir gün, ilk biletinizi indirmeye ne dersiniz?</p>

            <Link href="/" className="relative z-10 inline-flex items-center gap-2 bg-[#008cb3] hover:bg-[#007a9c] hover:-translate-y-1 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              Turları Keşfet
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Liste */}
            <div className="space-y-3">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition ${selected?.id === t.id ? 'border-[#008cb3] bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-slate-800 truncate">{t.tourTitle}</div>
                    {/* 89. BÖLÜM: Offline-Ready-Badge-UI (Consistent across views) */}
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm animate-pulse-slow shrink-0">
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.172 9.172a4 4 0 015.656 5.656m2.828-8.486a9 9 0 011.272 1.272M7.071 7.071a9 9 0 00-1.272 1.272M10 10l4 4" />
                      </svg>
                      <span className="text-[8px] font-black uppercase tracking-tighter">Hazır</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t.location} · {t.savedAt ? new Date(t.savedAt).toLocaleDateString('tr-TR') : ''}
                  </div>
                </button>
              ))}
            </div>

            {/* Seçili bilet: QR + Harita + Rota */}
            <div className="md:sticky md:top-24">
              {selected ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                    <div>
                      <h2 className="font-black text-slate-800">{selected.tourTitle}</h2>
                      <p className="text-sm text-gray-500">{selected.location} · {selected.duration}</p>
                      {selected.dateLabel && <p className="text-xs text-gray-600 mt-1">{selected.dateLabel}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Sil
                    </button>
                  </div>

                  {/* QR Kod */}
                  <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Bilet QR Kodu</h3>
                    <div className="flex justify-center">
                      { }
                      <img src={selected.qrDataUrl} alt="Bilet QR kodu" className="w-40 h-40 rounded-xl bg-white p-2 shadow-inner" />
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">Ref: {selected.bookingRef}</p>
                  </div>

                  {/* Harita (çevrimdışı) */}
                  {selected.mapImageDataUrl && (
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Rota haritası</h3>
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        { }
                        <img
                          src={selected.mapImageDataUrl}
                          alt="Rota haritası"
                          className="w-full h-auto block"
                          width={400}
                          height={220}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tur programı (rota) */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Örnek tur programı</h3>
                    <ul className="space-y-4">
                      {selected.itinerary.map((step) => (
                        <li key={step.day} className="flex gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#008cb3] text-white flex items-center justify-center text-sm font-bold">
                            {step.day}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800">{step.title}</div>
                            <div className="text-sm text-gray-600">{step.description}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dahil / Hariç */}
                  <div className="p-4 bg-slate-50/50 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2">Dahil</h4>
                      <ul className="space-y-1 text-gray-600">
                        {selected.included.slice(0, 4).map((x, i) => (
                          <li key={i}>✓ {x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2">Hariç</h4>
                      <ul className="space-y-1 text-gray-600">
                        {selected.excluded.slice(0, 3).map((x, i) => (
                          <li key={i}>✕ {x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 🚀 CROSS - SELL SECTION (Sana Özel Tamamlayıcı Hizmetler) */}
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Sana Özel Tamamlayıcı Hizmetler</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-orange-600 mt-0.5">Bilet sahiplerine özel %20 indirimli</p>
                      </div>
                    </div>

                    {/* Horizontal Scroll (Yatay Kaydırma) */}
                    <div className="flex overflow-x-auto gap-3 pb-3 custom-scrollbar snap-x">
                      {/* Araba/Transfer */}
                      <div className="min-w-[140px] sm:min-w-[160px] bg-slate-50 border border-gray-100 rounded-2xl p-3 flex flex-col snap-start relative group">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mb-2 shadow-sm">
                          🚗
                        </div>
                        <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs mb-1 line-clamp-1">VIP Karşılama</h4>
                        <span className="font-black text-[#008cb3] text-[12px] sm:text-[13px] mb-3">+ ₺850</span>
                        <button className="w-full bg-white border border-gray-200 text-slate-700 hover:text-white hover:bg-[#008cb3] hover:border-[#008cb3] text-[10px] font-bold py-1.5 rounded-lg transition-colors mt-auto flex items-center justify-center gap-1 active:scale-95">
                          <span className="text-sm leading-none">+</span> Ekle
                        </button>
                      </div>

                      {/* Yemek */}
                      <div className="min-w-[140px] sm:min-w-[160px] bg-slate-50 border border-gray-100 rounded-2xl p-3 flex flex-col snap-start relative group">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm mb-2 shadow-sm">
                          🍱
                        </div>
                        <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs mb-1 line-clamp-1">Özel Akşam Yemeği</h4>
                        <span className="font-black text-[#008cb3] text-[12px] sm:text-[13px] mb-3">+ ₺450</span>
                        <button className="w-full bg-white border border-gray-200 text-slate-700 hover:text-white hover:bg-[#008cb3] hover:border-[#008cb3] text-[10px] font-bold py-1.5 rounded-lg transition-colors mt-auto flex items-center justify-center gap-1 active:scale-95">
                          <span className="text-sm leading-none">+</span> Ekle
                        </button>
                      </div>

                      {/* Fotoğraf Makinesi */}
                      <div className="min-w-[140px] sm:min-w-[160px] bg-slate-50 border border-gray-100 rounded-2xl p-3 flex flex-col snap-start relative group">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm mb-2 shadow-sm">
                          📸
                        </div>
                        <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs mb-1 line-clamp-1">Profesyonel Drone/Çekim</h4>
                        <span className="font-black text-[#008cb3] text-[12px] sm:text-[13px] mb-3">+ ₺600</span>
                        <button className="w-full bg-white border border-gray-200 text-slate-700 hover:text-white hover:bg-[#008cb3] hover:border-[#008cb3] text-[10px] font-bold py-1.5 rounded-lg transition-colors mt-auto flex items-center justify-center gap-1 active:scale-95">
                          <span className="text-sm leading-none">+</span> Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center justify-center h-full min-h-[400px]">
                  <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                  <p className="font-bold text-slate-500">Detaylarını görmek için<br />soldaki listeden bir bilet seçin.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
