'use client';

import { useState, useEffect } from 'react';

// İşlem statüleri: 'Redeemed' (Kullanıldı/Hakediş), 'Pending_Tour' (Beklemede/Gelecek Tur), 'Processing' (Ödeme İşlemde)
interface Transaction {
  id: string;
  date: string;
  description: string;
  customerPaid: number;
  status: 'Redeemed' | 'Pending_Tour' | 'Processing';
}

export default function AgencyFinancePage() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const commissionRate = 15; // Tourkia Komisyonu %15

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TRX-1092',
      date: '11 Mayıs 2026',
      description: 'Kapadokya VIP Balon Turu - 2 Kişi',
      customerPaid: 7000,
      status: 'Redeemed' // Kullanıldı, bakiye eklenebilir
    },
    {
      id: 'TRX-1091',
      date: '10 Mayıs 2026',
      description: 'Göreme Kırmızı Tur - 4 Kişi',
      customerPaid: 3400,
      status: 'Redeemed' // Kullanıldı, bakiye eklenebilir
    },
    {
      id: 'TRX-1090',
      date: '12 Mayıs 2026 (Gelecek Tur)',
      description: 'ATV Gün Batımı Turu - 2 Kişi',
      customerPaid: 1800,
      status: 'Pending_Tour' // Tur bekleniyor
    }
  ]);

  // Dinamik Bakiye Hesaplama
  const [currentBalance, setCurrentBalance] = useState(0);
  const [pendingClearance, setPendingClearance] = useState(0);

  useEffect(() => {
    let calculatedBalance = 0;
    let calculatedPending = 0;

    transactions.forEach(trx => {
      const commissionAmount = trx.customerPaid * (commissionRate / 100);
      const netEarned = trx.customerPaid - commissionAmount;

      if (trx.status === 'Redeemed') {
        calculatedBalance += netEarned;
      } else if (trx.status === 'Pending_Tour') {
        calculatedPending += netEarned;
      }
      // 'Processing' statüsündekiler zaten çekim talebi gönderilmiş tutarlardır.
    });

    setCurrentBalance(calculatedBalance);
    setPendingClearance(calculatedPending);
  }, [transactions, commissionRate]);

  const handleWithdrawRequest = async () => {
    if (currentBalance <= 0) return;
    setIsRequesting(true);
    
    // Yalnızca 'Redeemed' statüsündeki işlemleri bul
    const eligibleTransactions = transactions.filter(t => t.status === 'Redeemed');

    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: 'AGENCY-1',
          amount: currentBalance,
          transactions: eligibleTransactions.map(t => t.id)
        })
      });

      if (res.ok) {
        setRequested(true);
        // İşlemlerin lokal durumunu 'İşlemde' (Processing) olarak güncelle
        setTransactions(prev => prev.map(trx => 
          trx.status === 'Redeemed' ? { ...trx, status: 'Processing' } : trx
        ));
      } else {
        alert('İşlem başarısız oldu.');
      }
    } catch (error) {
      console.error('Hakediş talep hatası', error);
      alert('Sistem bağlantı hatası!');
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Redeemed') return <span className="bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-md">Temizlendi (Kullanılabilir)</span>;
    if (status === 'Pending_Tour') return <span className="bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-1 rounded-md">Blokede (Tur Bekleniyor)</span>;
    if (status === 'Processing') return <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-md">İşlemde (Çekim Talebi Alındı)</span>;
    return null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 font-sans">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Finansal Raporlar</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Satışlarınızı, komisyon kesintilerinizi ve kullanılabilir bakiyenizi takip edin.
          </p>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> 
          Platform Komisyonu: %{commissionRate}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Sol Taraf: Bakiye Kartı (Wallet) */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-6 shadow-sm border border-slate-800 text-white font-sans flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Çekilebilir Net Bakiye</h2>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold tracking-tight">{currentBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                <span className="text-xl text-slate-400">₺</span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-md p-3 mb-5 border border-slate-700/50 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Blokeli Tutar (Tur Bekleniyor)</span>
              <span className="text-sm font-semibold text-slate-300">{pendingClearance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>

            <button 
              onClick={handleWithdrawRequest}
              disabled={isRequesting || requested || currentBalance <= 0}
              className={`w-full py-2.5 rounded-md font-semibold text-sm transition-all shadow-sm flex justify-center items-center gap-2 ${
                requested || currentBalance <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isRequesting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> İşleniyor...
                </span>
              ) : requested ? (
                <span>Talebiniz Alındı</span>
              ) : currentBalance <= 0 ? (
                <span>Bakiye Yetersiz</span>
              ) : (
                <span>Hakedişi Talep Et</span>
              )}
            </button>
            {requested && (
              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                Talebiniz alınmıştır, inceleniyor.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 font-sans">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Kayıtlı Banka Hesabı
            </h3>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mb-1">
              TR45 0000 0000 0000 0000 8899 50
            </p>
            <p className="text-[10px] text-slate-500 mb-3">Ziraat Bankası - Acenta A.Ş.</p>
            <button className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline transition-colors">Hesap Bilgilerini Güncelle</button>
          </div>
        </div>

        {/* Sağ Taraf: Şeffaf İşlem Geçmişi (Ledger) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 font-sans">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Son İşlemler Dökümü</h2>
            <button className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Tümünü İndir (Excel)
            </button>
          </div>

          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {transactions.map((trx) => {
              const commissionAmount = trx.customerPaid * (commissionRate / 100);
              const netEarned = trx.customerPaid - commissionAmount;
              return (
              <div key={trx.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlem No</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{trx.id}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{trx.date}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {getStatusBadge(trx.status)}
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
                    <p className="font-bold text-red-500">{(commissionAmount).toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 dark:border-white/5 pt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Hakediş</p>
                  <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">{(netEarned).toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            )})}
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
                {transactions.map((trx) => {
                  const commissionAmount = trx.customerPaid * (commissionRate / 100);
                  const netEarned = trx.customerPaid - commissionAmount;
                  
                  return (
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
                      ₺{trx.customerPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-bold text-red-500 bg-red-50/50 dark:bg-red-900/10 ">
                      -₺{commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-black text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 ">
                      +₺{netEarned.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 pr-0 text-right ">
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {getStatusBadge(trx.status)}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
