'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Tour {
  id: number;
  title: string;
  time: string;
  vehicle: string;
}

interface Passenger {
  id: string;
  tourId: number;
  name: string;
  phone: string;
  hotel: string;
  pax: number;
  status: string;
}

export default function AgencyDailyManifestPage() {
  const [selectedDate, setSelectedDate] = useState('2026-05-15');
  const [activeTour, setActiveTour] = useState<number | null>(null);
  
  const [tours, setTours] = useState<Tour[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(false);

  // Veritabanı ile senkronizasyon (GET /api/bookings?date=X)
  const fetchManifest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}&agencyId=123`);
      const result = await res.json();
      
      if (result.success && result.data) {
        setTours(result.data.tours || []);
        setAllPassengers(result.data.passengers || []);
        
        // Eğer seçili tur listede yoksa, ilkini seç
        if (result.data.tours && result.data.tours.length > 0) {
          setActiveTour(result.data.tours[0].id);
        } else {
          setActiveTour(null);
        }
      }
    } catch (error) {
      console.error('Manifesto yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, [selectedDate]);

  // Sadece seçili turdaki yolcuları getir
  const currentPassengers = allPassengers.filter(p => p.tourId === activeTour);

  // jsPDF ile PDF Çıktısı Alma İşlemi
  const handleExportPDF = () => {
    const tour = tours.find(t => t.id === activeTour);
    if (!tour || currentPassengers.length === 0) {
      alert('Yazdırılacak yolcu bulunamadı.');
      return;
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    // Header Bilgileri
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Tourkia - Yolcu Manifestosu`, 40, 40);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Tur: ${tour.title}`, 40, 65);
    doc.text(`Tarih: ${selectedDate}`, 40, 85);
    doc.text(`Kalkis: ${tour.time}`, 250, 85);
    doc.text(`Arac: ${tour.vehicle}`, 40, 105);
    
    const totalPax = currentPassengers.reduce((sum, p) => sum + p.pax, 0);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Toplam Yolcu: ${totalPax}`, 400, 105);

    // Tablo Sütunları ve Satırları
    const tableColumn = ["Bin.", "Bilet No", "Yolcu Adi", "Telefon", "Otel", "Kisi", "Durum"];
    const tableRows: any[] = [];

    currentPassengers.forEach(p => {
      const rowData = [
        "[   ]", // Biniş kontrol kutucuğu için boşluk
        p.id,
        p.name,
        p.phone,
        p.hotel,
        p.pax.toString(),
        p.status
      ];
      tableRows.push(rowData);
    });

    // Otomatik Tablo Çizici
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      styles: { fontSize: 10, cellPadding: 6, font: "helvetica" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' }, // Koyu Header
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Zebra deseni
      margin: { top: 130 }
    });

    // Dosyayı İndir
    doc.save(`Manifesto_${selectedDate}_Tur_${tour.id}.pdf`);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Rezervasyon Takibi & Manifesto</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Şoförler ve rehberler için günlük biniş listelerini yönetin ve çıktı alın.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Tarih Seçici */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 shadow-sm flex-1 md:flex-none flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none font-medium text-sm text-slate-800 dark:text-white cursor-pointer w-full"
            />
          </div>

          <button 
            onClick={handleExportPDF}
            disabled={loading || tours.length === 0}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-4 py-2 rounded-md text-sm transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>PDF Çıktı Al</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sol Sütun: Günün Turları */}
        <div className="lg:col-span-1 space-y-2 print:hidden">
          <div className="flex justify-between items-center mb-3 px-1 border-b border-slate-100 dark:border-slate-800 pb-2">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Günün Planı</h2>
             {loading && <span className="text-[10px] text-slate-500 font-medium">Yükleniyor...</span>}
          </div>
          
          {tours.length === 0 && !loading && (
            <div className="text-sm text-slate-500 font-medium p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
              Bu tarihte aktif tur bulunamadı.
            </div>
          )}

          {tours.map(tour => (
            <div 
              key={tour.id}
              onClick={() => setActiveTour(tour.id)}
              className={`p-3 rounded-md cursor-pointer transition-colors border ${
                activeTour === tour.id 
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded tracking-wide">
                  {tour.time}
                </span>
              </div>
              <h3 className={`font-semibold text-sm ${activeTour === tour.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {tour.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Araç: {tour.vehicle}
              </p>
            </div>
          ))}
        </div>

        {/* Sağ Sütun: Manifesto Tablosu */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
          
          {/* Printable Header */}
          <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 print:border-black">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white print:text-black">
                  {tours.find(t => t.id === activeTour)?.title || 'Tur Seçilmedi'}
                </h2>
                <div className="flex gap-3 mt-2 text-xs font-medium text-slate-500 print:text-gray-700">
                  <span className="flex items-center gap-1">Tarih: {selectedDate}</span>
                  <span className="flex items-center gap-1">Kalkış: {tours.find(t => t.id === activeTour)?.time || '-'}</span>
                  <span className="flex items-center gap-1">Araç: {tours.find(t => t.id === activeTour)?.vehicle || '-'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider print:text-black">Toplam Yolcu</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white print:text-black">
                  {currentPassengers.reduce((sum, p) => sum + p.pax, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {currentPassengers.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-4">Bu tura ait kayıtlı yolcu bulunmuyor.</p>
            )}
            {currentPassengers.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bilet No</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{p.id}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                      p.status === 'Onaylandı' 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      {p.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Yolcu</p>
                    <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Kişi</p>
                    <p className="font-black text-lg text-slate-800 dark:text-white">{p.pax}</p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mt-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.phone}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{p.hotel}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            {currentPassengers.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-8">Bu tura ait kayıtlı yolcu bulunmuyor.</p>
            )}
            {currentPassengers.length > 0 && (
              <table className="w-full text-left border-collapse">
                <thead className="">
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b-2 border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 font-black print:bg-gray-100 print:text-black print:border-black ">
                    <th className="p-4 pl-6 w-12 text-center">Bin.</th>
                    <th className="p-4">Bilet No (QR)</th>
                    <th className="p-4">Yolcu Adı</th>
                    <th className="p-4">İletişim & Otel</th>
                    <th className="p-4 text-center">Kişi</th>
                    <th className="p-4 pr-6 text-right print:hidden">Durum</th>
                  </tr>
                </thead>
                <tbody className="">
                  {currentPassengers.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors print:border-gray-300">
                      <td className="p-4 pl-6 text-center ">
                        {/* Biniş (Boarding) Checkbox for physical paper usage */}
                        <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 mx-auto print:border-black"></div>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-gray-500 print:text-black ">{p.id}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white print:text-black ">{p.name}</td>
                      <td className="p-4 ">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 print:text-black">{p.phone}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 print:text-gray-600">{p.hotel}</p>
                      </td>
                      <td className="p-4 text-center font-black text-lg text-slate-800 dark:text-white print:text-black ">{p.pax}</td>
                      <td className="p-4 pr-6 text-right print:hidden ">
                        <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                          p.status === 'Onaylandı' 
                            ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs font-bold text-gray-400 print:text-black lg:col-span-4">
          Bu belge Tourkia platformu tarafından otomatik olarak oluşturulmuştur. Tarih: {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
