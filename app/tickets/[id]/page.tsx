import Link from 'next/link';
import Image from 'next/image';

// Mock Ticket Data
const MOCK_TICKETS: Record<string, any> = {
  'TKT-8932': {
    id: 'TKT-8932',
    title: 'Kapadokya Balon Turu',
    image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f638?q=80&w=1200&auto=format&fit=crop',
    purchaseDate: '12 Mayıs 2026',
    totalAmount: '₺4.500',
    passengers: [
      { name: 'Melih Can', type: 'Yetişkin' },
      { name: 'Ayşe Yılmaz', type: 'Yetişkin' }
    ],
    date: '15 Mayıs 2026',
    time: '05:30',
    location: 'Göreme, Nevşehir',
    meetingPoint: 'Kaya Otel Önü (Transfer Aracı)',
    status: 'Yaklaşan',
    serviceType: 'tour'
  },
  'TKT-4410': {
    id: 'TKT-4410',
    title: 'Şefin Özel Tadım Menüsü',
    image: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?q=80&w=1200&auto=format&fit=crop',
    purchaseDate: '13 Mayıs 2026',
    totalAmount: '₺2.400',
    passengers: [
      { name: 'Melih Can', type: 'Yetişkin' },
      { name: 'Ayşe Yılmaz', type: 'Yetişkin' }
    ],
    date: '18 Mayıs 2026',
    time: '20:00',
    location: 'Sultanahmet, İstanbul',
    meetingPoint: 'Deraliye Restaurant',
    status: 'Yaklaşan',
    serviceType: 'meal',
    menuItems: [
      'Geleneksel Türk Mezeleri Tabağı',
      'Ara Sıcak: İçli Köfte',
      'Ana Yemek: Testi Kebabı veya Kuzu İncik',
      'Tatlı: Fıstıklı Kadayıf',
      '2 Kadeh Yerli İçecek'
    ]
  }
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Try to find the ticket, otherwise fallback to a generic mock
  const ticket = MOCK_TICKETS[id] || {
    ...MOCK_TICKETS['TKT-8932'],
    id: id,
    title: 'Özel Tur Deneyimi',
    serviceType: 'tour'
  };

  const isUpcoming = ticket.status === 'Yaklaşan';
  const isMeal = ticket.serviceType === 'meal';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-500">
      
      {/* Hero Header with Image */}
      <div className="relative h-64 md:h-80 w-full">
        <div className={`absolute inset-0 ${isMeal ? 'bg-orange-900' : 'bg-slate-900'}`}>
          <Image 
            src={ticket.image} 
            alt={ticket.title} 
            fill 
            className="object-cover opacity-60"
            priority
          />
        </div>
        <div className={`absolute inset-0 bg-gradient-to-t ${isMeal ? 'from-orange-900' : 'from-slate-900'} via-transparent to-transparent`}></div>
        <div className="absolute top-6 left-4 md:left-8 z-10">
          <Link href="/tickets" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
        </div>

        <div className="absolute bottom-10 left-4 md:left-8 right-4 z-10">
          <div className="flex justify-between items-end">
            <div>
              <span className={`inline-block px-3 py-1 text-xs font-black tracking-widest uppercase rounded-lg mb-3 shadow-md ${isUpcoming ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                {ticket.status}
              </span>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-xl">{ticket.title}</h1>
              <p className="text-white/90 font-medium mt-2 text-sm md:text-base flex items-center gap-2 drop-shadow-md">
                <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>{ticket.location}</span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V12zM8.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75V12zM11.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V12zM14.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V12zM5.25 15a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V15zM8.25 15a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75V15zM11.25 15a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V15zM14.25 15a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V15z" /><path fillRule="evenodd" d="M4.39 2.052c.287.054.51.276.564.563l.034.185h10.024l.034-.185a.75.75 0 011.472.27l-.034.185A2.25 2.25 0 0118.75 5.25v10.5A2.25 2.25 0 0116.5 18H3.5A2.25 2.25 0 011.25 15.75V5.25A2.25 2.25 0 013.5 3h.016l-.034-.185a.75.75 0 01.908-.763zM3.5 4.5c-.414 0-.75.336-.75.75v1.5h14.5V5.25c0-.414-.336-.75-.75-.75H3.5zM2.75 8.25v7.5c0 .414.336.75.75.75h13c.414 0 .75-.336.75-.75v-7.5H2.75z" clipRule="evenodd" /></svg>{ticket.date}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sol Kolon - Detaylar (8 Kolon Genişliğinde) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Saat ve Buluşma */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                <span className={isMeal ? "text-orange-600" : "text-[#008cb3]"}>⏰</span> {isMeal ? "Rezervasyon & Konum" : "Zaman & Konum"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{isMeal ? "Rezervasyon Saati" : "Kalkış Saati"}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{ticket.time}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{isMeal ? "Restoran Adresi" : "Buluşma Noktası"}</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{ticket.meetingPoint}</p>
                </div>
              </div>
            </div>

            {/* Yolcu Bilgileri */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className={isMeal ? "text-orange-600" : "text-[#008cb3]"}>👥</span> {isMeal ? "Davetli Bilgileri" : "Yolcu Bilgileri"}
                </h3>
                <span className="text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg">
                  {ticket.passengers.length} Kişi
                </span>
              </div>
              <div className="space-y-4">
                {ticket.passengers.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-800 last:border-0 pb-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${isMeal ? 'bg-orange-600/10 text-orange-600' : 'bg-[#008cb3]/10 text-[#008cb3]'} flex items-center justify-center font-black text-lg`}>
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-bold text-lg text-slate-800 dark:text-white">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">{p.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Menü İçeriği (Sadece Yemek) */}
            {isMeal && ticket.menuItems && (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                  <span className="text-orange-600">🍽️</span> Menü İçeriği
                </h3>
                <ul className="space-y-3">
                  {ticket.menuItems.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ödeme Bilgileri */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800">
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                <span className="text-[#008cb3]">💳</span> Sipariş Özeti
              </h3>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 font-medium">Bilet No (PNR)</span>
                <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider">{ticket.id}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 font-medium">Satın Alma Tarihi</span>
                <span className="font-bold text-slate-800 dark:text-white">{ticket.purchaseDate}</span>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
                <span className="text-gray-800 dark:text-slate-200 font-black text-lg">Toplam Tutar</span>
                <span className="font-black text-2xl text-[#008cb3]">{ticket.totalAmount}</span>
              </div>
            </div>

          </div>

          {/* Sağ Kolon - Aksiyonlar (4 Kolon Genişliğinde) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              
              {/* Dinamik Butonlar */}
              {isUpcoming ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                  <div className="w-40 h-40 mx-auto bg-white p-2 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 relative overflow-hidden">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.id}`} 
                      alt="Ticket QR Code" 
                      width={150} 
                      height={150}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-center text-sm text-gray-500 font-medium mb-8 px-4">
                    {isMeal 
                      ? "Restoran girişinde aşağıdaki kodu veya QR'ı gösterebilirsiniz."
                      : "Etkinlik günü bu ekrandaki QR kodu görevliye göstererek giriş yapabilirsiniz."}
                  </p>
                  
                  {isMeal && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6 text-center">
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-1">Rezervasyon Kodu</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white tracking-widest">{ticket.id.split('-')[1]}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <button className={`w-full flex items-center justify-center gap-2 ${isMeal ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#008cb3] hover:bg-[#007a99]'} text-white py-4 px-6 rounded-xl font-black transition-colors shadow-md active:scale-95 text-[15px]`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      {isMeal ? "Restoran Yol Tarifi" : "Buluşma Noktası Yol Tarifi"}
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-4 px-6 rounded-xl font-bold transition-colors active:scale-95 border border-slate-200 dark:border-slate-700 text-[15px]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Bileti İndir (PDF)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#008cb3] to-[#005e85] rounded-[2rem] p-8 shadow-xl text-white text-center">
                  <span className="text-6xl block mb-6 animate-bounce">📸</span>
                  <h3 className="text-2xl font-black mb-3">Deneyimini Paylaş</h3>
                  <p className="text-white/80 text-sm font-medium mb-8 px-2 leading-relaxed">
                    Bu turu değerlendir, en güzel anılarını paylaş ve bir sonraki rezervasyonunda anında <strong className="text-white">%10 indirim</strong> kazan!
                  </p>
                  <button className="w-full flex items-center justify-center gap-2 bg-white text-[#008cb3] py-4 rounded-xl font-black hover:bg-slate-50 transition-colors shadow-lg active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                    Hemen Yorum Yap
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
