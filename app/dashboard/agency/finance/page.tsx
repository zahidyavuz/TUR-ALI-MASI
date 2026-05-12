'use client';

import { useState } from 'react';

export default function AgencyFinancePage() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  // Mock Financial Data
  const currentBalance = 84500.00;
  const pendingClearance = 12400.00; // Henüz tur gerçekleşmediği için bekleyen para
  const commissionRate = 15; // Tourkia Komisyonu %15

  const transactions = [
    {
      id: 'TRX-1092',
      date: '11 Mayıs 2026',
      description: 'Kapadokya VIP Balon Turu - 2 Kişi',
      customerPaid: 7000,
      commissionPercentage: 15,
      commissionAmount: 1050,
      netEarned: 5950,
      status: 'Temizlendi (Kullanılabilir)'
    },
    {
      id: 'TRX-1091',
      date: '10 Mayıs 2026',
      description: 'Göreme Kırmızı Tur - 4 Kişi',
      customerPaid: 3400,
      commissionPercentage: 15,
      commissionAmount: 510,
      netEarned: 2890,
      status: 'Temizlendi (Kullanılabilir)'
    },
    {
      id: 'TRX-1090',
      date: '12 Mayıs 2026 (Gelecek Tur)',
      description: 'ATV Gün Batımı Turu - 2 Kişi',
      customerPaid: 1800,
      commissionPercentage: 15,
      commissionAmount: 270,
      netEarned: 1530,
      status: 'Blokede (Tur Bekleniyor)'
    }
  ];

  const handleWithdrawRequest = () => {
    setIsRequesting(true);
    // Simüle edilmiş API İsteği
    setTimeout(() => {
      setIsRequesting(false);
      setRequested(true);
      // Gerçek senaryoda bu işlem /api/finance/withdraw endpoint'ine POST atar
      // ve Admin tarafına bir bildirim düşürür.
    }, 1500);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Finans & Hakedişler</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Satışlarınızı, komisyon kesintilerinizi ve kullanılabilir bakiyenizi şeffafça takip edin.
          </p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-orange-200 dark:border-orange-800/50 shadow-sm">
          <span>ℹ️</span> Tourkia Platform Komisyonu: %{commissionRate}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Sol Taraf: Bakiye Kartı (Wallet) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden text-white border border-slate-700">
            {/* Dekoratif Arka Plan Deseni */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500 opacity-10 rounded-full blur-2xl"></div>
            
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Çekilebilir Net Bakiye</h2>
            <div className="flex items-baseline gap-1 relative z-10 mb-8">
              <span className="text-2xl font-bold text-slate-300">₺</span>
              <span className="text-5xl font-black tracking-tight">{currentBalance.toLocaleString('tr-TR')}</span>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50 relative z-10 backdrop-blur-sm">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Blokeli Tutar (Tur Bekleniyor)</p>
              <p className="text-lg font-bold text-orange-400">₺{pendingClearance.toLocaleString('tr-TR')}</p>
            </div>

            <button 
              onClick={handleWithdrawRequest}
              disabled={isRequesting || requested || currentBalance <= 0}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all relative z-10 shadow-lg flex justify-center items-center gap-2 ${
                requested 
                  ? 'bg-green-500 text-white shadow-green-500/30 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30 active:scale-95'
              }`}
            >
              {isRequesting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> İşleniyor...
                </span>
              ) : requested ? (
                <span>Talebiniz Alındı ✅</span>
              ) : (
                <span>Hakedişi Talep Et 💸</span>
              )}
            </button>
            {requested && (
              <p className="text-[10px] text-center text-green-400 mt-3 font-medium relative z-10 animate-pulse">
                Onay bildirimi Admin'e iletildi. Para transferi IBAN'ınıza yapılacaktır.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center">
            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">🏦</div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Kayıtlı Banka Hesabı</h3>
            <p className="text-xs text-gray-500 font-mono tracking-widest bg-gray-50 dark:bg-slate-950 py-2 rounded-lg border border-gray-200 dark:border-slate-800">
              TR45 **** **** **** 8899 50
            </p>
            <button className="text-xs font-bold text-blue-500 mt-3 hover:text-blue-700 transition-colors">IBAN Güncelle</button>
          </div>
        </div>

        {/* Sağ Taraf: Şeffaf İşlem Geçmişi (Ledger) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Son İşlemler Dökümü</h2>
            <button className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Tümünü İndir (Excel)
            </button>
          </div>

          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {transactions.map((trx) => (
              <div key={trx.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlem No</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{trx.id}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{trx.date}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                      trx.status.includes('Temizlendi') 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      {trx.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Açıklama</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{trx.description}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tahsilat</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{(trx.customerPaid).toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Komisyon</p>
                    <p className="font-bold text-red-500">{(trx.commissionAmount).toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 dark:border-white/5 pt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Hakediş</p>
                  <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">{(trx.netEarned).toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">

            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="">
                <tr className="border-b-2 border-gray-100 dark:border-slate-800 text-[10px] uppercase tracking-widest text-gray-400 font-black ">
                  <th className="p-3 pl-0">İşlem / Tarih</th>
                  <th className="p-3 text-right">Müşteri Ödedi</th>
                  <th className="p-3 text-right text-red-500">Kesinti (%{commissionRate})</th>
                  <th className="p-3 text-right text-green-500">Size Kalan (Net)</th>
                  <th className="p-3 pr-0 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 ">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                    <td className="p-4 pl-0 ">
                      <p className="font-bold text-sm text-slate-800 dark:text-white mb-0.5">{trx.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="font-mono">{trx.id}</span>
                        <span>•</span>
                        <span>{trx.date}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-600 dark:text-slate-400 ">
                      ₺{trx.customerPaid.toLocaleString('tr-TR')}
                    </td>
                    <td className="p-4 text-right font-bold text-red-500 bg-red-50/50 dark:bg-red-900/10 ">
                      -₺{trx.commissionAmount.toLocaleString('tr-TR')}
                    </td>
                    <td className="p-4 text-right font-black text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 ">
                      +₺{trx.netEarned.toLocaleString('tr-TR')}
                    </td>
                    <td className="p-4 pr-0 text-right ">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                        trx.status.includes('Temizlendi')
                          ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
