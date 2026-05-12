'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const [savedCards, setSavedCards] = useState([
    { id: 1, type: 'Visa', last4: '4242', expiry: '12/26' },
    { id: 2, type: 'Mastercard', last4: '8812', expiry: '05/28' }
  ]);

  const handleDeleteCard = (id: number) => {
    setSavedCards(savedCards.filter(card => card.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              Profil & Ayarlar <span className="text-blue-500">⚙️</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 font-medium mt-2 text-sm md:text-base">
              Kişisel bilgilerinizi ve kayıtlı ödeme yöntemlerinizi güvenle yönetin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black">
                  M
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Kişisel Bilgiler</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1">Hesap Detayları</p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Ad Soyad</label>
                  <input type="text" defaultValue="Melih Can" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">E-Posta Adresi</label>
                  <input type="email" defaultValue="melih@tourkia.com" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Telefon Numarası</label>
                  <input type="tel" defaultValue="+90 (555) 123 45 67" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 dark:text-white"/>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-500/30 mt-4">
                  Değişiklikleri Kaydet
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 h-fit">
              <div className="mb-8">
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  Kayıtlı Ödeme Yöntemlerim <span className="text-green-500 text-lg">💳</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-2">
                  Hızlı satın alımlar (1-Click Checkout) için güvenliğe alınmış kartlarınız.
                </p>
              </div>

              <div className="space-y-4">
                {savedCards.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Kayıtlı kartınız bulunmuyor.</p>
                  </div>
                ) : (
                  savedCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-white rounded flex items-center justify-center shadow-sm text-[10px] font-black italic text-slate-800 border border-gray-200">
                          {card.type}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white tracking-widest">
                            <span className="text-gray-400 font-mono tracking-widest mr-1">**** **** ****</span> {card.last4}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Son Kul: {card.expiry}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteCard(card.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white" title="Kartı Sil">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full mt-6 py-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                <span>+</span> Yeni Kart Ekle
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-800 pt-8 text-center">
            <Link href="/search" className="inline-flex items-center gap-2 bg-[#008cb3] text-white px-8 py-4 rounded-xl font-black hover:bg-[#005e85] transition-colors shadow-lg active:scale-95">
              <span>🌍</span> Yeni Turları Keşfet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
