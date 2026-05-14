'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type CartItem = {
  id: string;
  type: 'tour' | 'meal';
  name: string;
  price: number;
  pax: number;
  date?: string;
  menuType?: string;
  image: string;
  location?: string;
  isFull?: boolean;
};

const INITIAL_CART: CartItem[] = [
  {
    id: 'c1',
    type: 'tour',
    name: 'Kapadokya Balon Turu',
    price: 4500,
    pax: 2,
    date: '15 Mayıs 2026',
    location: 'Göreme, Nevşehir',
    image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f638?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'c2',
    type: 'meal',
    name: 'Deraliye Restaurant',
    price: 1200,
    pax: 2,
    menuType: 'Şefin Özel Tadım Menüsü',
    location: 'Sultanahmet, İstanbul',
    image: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?q=80&w=400&auto=format&fit=crop'
  }
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // API'den anlık stok/kontenjan kontrolü simülasyonu
    const checkStock = async () => {
      setCheckingAvailability(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Ağ gecikmesi simülasyonu
      
      setCartItems(prev => prev.map(item => {
        // Örnek olarak ID'si c1 olan Kapadokya turunu "dolmuş" olarak işaretleyelim (Demo amaçlı)
        if (item.id === 'c1') {
          return { ...item, isFull: true };
        }
        return item; 
      }));
      setCheckingAvailability(false);
    };
    checkStock();
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newPax = Math.max(1, item.pax + delta);
        return { ...item, pax: newPax };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const rawTotalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.pax), 0);
  const discountAmount = (rawTotalPrice * appliedDiscount) / 100;
  const totalPrice = rawTotalPrice - discountAmount;

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'TOURKIA10') {
      setAppliedDiscount(10);
      setCouponError('');
    } else {
      setAppliedDiscount(0);
      setCouponError('Geçersiz indirim kodu.');
    }
  };

  const handleCheckout = () => {
    const hasFullItems = cartItems.some(item => item.isFull);
    if (hasFullItems) {
      alert("Sepetinizde kontenjanı dolmuş ürünler var. Lütfen ödemeye geçmeden önce bu ürünleri sepetten çıkarın.");
      return;
    }

    setIsProcessing(true);

    // Tüm veriyi session içine alarak checkout'a taşıma hazırlığı
    const checkoutSession = {
      items: cartItems,
      discount: discountAmount,
      total: totalPrice,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('tourkia_checkout_session', JSON.stringify(checkoutSession));
    
    // Iyzico Basket formatting logic bridge
    const basketItems = cartItems.map(item => ({
      id: item.id,
      name: item.type === 'tour' ? item.name : `${item.name} - ${item.menuType}`,
      category1: item.type === 'tour' ? 'Turizm' : 'Yeme-İçme',
      category2: item.type === 'tour' ? 'Aktivite' : 'Restoran',
      itemType: 'PHYSICAL', // or VIRTUAL depending on integration
      price: (item.price * item.pax).toString()
    }));

    console.log("Proceeding to Iyzico Checkout with Basket:", JSON.stringify(basketItems, null, 2));

    // Simulate API delay and redirect
    setTimeout(() => {
      // For demo, we just route to checkout page
      router.push('/checkout');
    }, 1000);
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-6xl opacity-50">🛒</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">Sepetin Şu An Boş</h2>
        <p className="text-gray-500 dark:text-slate-400 font-medium mb-8 max-w-sm">
          Türkiye'nin eşsiz güzelliklerini keşfetmek veya efsanevi tatları denemek için hemen bir şeyler ekle!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/search" className="bg-[#008cb3] hover:bg-[#007a99] text-white px-8 py-4 rounded-xl font-black transition-colors shadow-lg active:scale-95 flex items-center gap-2">
            <span>🌍</span> Turları Keşfet
          </Link>
          <Link href="/menu" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-black transition-colors shadow-lg active:scale-95 flex items-center gap-2">
            <span>🍽️</span> Menüleri İncele
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          <span>🛒</span> Sepetim {checkingAvailability && <span className="ml-2 text-sm text-gray-400 font-medium animate-pulse flex items-center gap-1"><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span> Stok kontrol ediliyor...</span>}
        </h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">
          Harika seçimler! İşlemi tamamlamadan önce sepetini gözden geçir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sol Kolon - Sepet Öğeleri */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-6 relative group transition-all hover:shadow-md">
              
              <button 
                onClick={() => removeItem(item.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-slate-800 p-2 rounded-full"
                title="Sepetten Çıkar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="w-full sm:w-32 h-32 relative rounded-2xl overflow-hidden shrink-0 border border-gray-100 dark:border-slate-700">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg text-white shadow-sm ${item.type === 'tour' ? 'bg-[#008cb3]' : 'bg-orange-500'}`}>
                    {item.type === 'tour' ? 'TUR' : 'YEMEK'}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div className="pr-8">
                  <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight mb-2">
                    {item.name}
                  </h3>
                  
                  {item.type === 'tour' ? (
                    <div className="text-sm font-medium text-gray-500 space-y-1.5 mt-3">
                      <div className="flex items-center gap-2"><span className="text-[#008cb3]">📅</span> {item.date}</div>
                      <div className="flex items-center gap-2"><span className="text-[#008cb3]">📍</span> Kalkış: <span className="text-slate-700 dark:text-slate-300 font-bold">{item.location}</span></div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-500 space-y-1.5 mt-3">
                      <div className="flex items-center gap-2"><span className="text-orange-500">🍽️</span> {item.menuType}</div>
                      <div className="flex items-center gap-2"><span className="text-orange-500">📍</span> Restoran: <span className="text-slate-700 dark:text-slate-300 font-bold">{item.location}</span></div>
                    </div>
                  )}

                  {item.isFull && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30">
                      ⚠️ Maalesef bu {item.type === 'tour' ? 'tur' : 'paket'} dolmuştur.
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end mt-4 sm:mt-0 border-t sm:border-0 border-gray-100 dark:border-slate-800 pt-4 sm:pt-0">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm min-w-[2ch] text-center">{item.pax} <span className="text-xs text-gray-500">Kişi</span></span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 mb-0.5">{item.pax} x ₺{item.price.toLocaleString('tr-TR')}</p>
                    <p className="font-black text-xl text-slate-800 dark:text-white leading-none">
                      ₺{(item.price * item.pax).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sağ Kolon - Sipariş Özeti (Sticky) */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 sticky top-24">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
              Sipariş Özeti
            </h3>
            
            {/* Kupon Alanı */}
            <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">İndirim Kodu</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Kupon Girin (Örn: TOURKIA10)"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-[#008cb3] transition-colors uppercase placeholder:normal-case"
                />
                <button onClick={applyCoupon} className="bg-slate-900 dark:bg-slate-700 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
                  Uygula
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">❌ {couponError}</p>}
              {appliedDiscount > 0 && <p className="text-xs text-green-500 font-bold mt-2 flex items-center gap-1">✓ %{appliedDiscount} İndirim uygulandı!</p>}
            </div>

            <div className="space-y-3 mb-6 text-sm font-medium">
              <div className="flex justify-between text-gray-500">
                <span>Ara Toplam</span>
                <span>₺{rawTotalPrice.toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between text-green-500">
                <span>İndirim (Promo)</span>
                <span>-₺{discountAmount.toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Vergiler (%18 KDV)</span>
                <span>Dahil</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-6 mb-6">
              <button 
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-400 text-white py-5 rounded-[20px] font-black transition-all shadow-[0_15px_35px_-5px_rgba(249,115,22,0.5)] active:scale-95 flex flex-col items-center justify-center gap-1.5 group overflow-hidden relative"
              >
                {isProcessing ? (
                  <span className="animate-pulse">İşleniyor...</span>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_10px_rgba(110,231,183,0.8)]"></span> GÜVENLİ ÖDEME
                    </span>
                    <span className="text-2xl flex items-center gap-2" suppressHydrationWarning>
                      ₺{totalPrice.toLocaleString('tr-TR')}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 group-hover:translate-x-1 transition-transform">
                        <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 font-bold mt-4 tracking-wider uppercase">
              256-Bit SSL ile Güvenli Ödeme
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
