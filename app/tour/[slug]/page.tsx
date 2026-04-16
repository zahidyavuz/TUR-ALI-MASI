'use client';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';


import { fetchTours, fetchTour } from '../../lib/tours';
import { useLocale } from '../../context/LocaleContext';
import { DownloadOfflineButton } from '../../components/DownloadOfflineButton';
import GeofenceTrigger from '../../components/GeofenceTrigger';
import CurrencySelector from '../../components/CurrencySelector';
import FavoriteButton from '../../components/FavoriteButton';
import TourReviews from '../../components/TourReviews';

export default function DynamicTourPage() {
    const { t, locale, formatPrice } = useLocale();
    const router = useRouter();

    const params = useParams();
    const slug = typeof params.slug === 'string' ? params.slug : 'kapadokya';

    const [tour, setTour] = useState<any>(null);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [guests, setGuests] = useState(2);
    const [isSticky, setIsSticky] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Yeni Akış State'leri
    const [bookingStep, setBookingStep] = useState<0 | 1 | 2 | 3>(0);
    const [hasInsurance, setHasInsurance] = useState(false);
    const [hasVipTransfer, setHasVipTransfer] = useState(false);
    const [isMealAdded, setIsMealAdded] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'eft' | 'cash'>('eft'); // Yeni ödeme yöntemleri

    useEffect(() => {
        async function loadTour() {
            setLoading(true);
            try {
                const baseTour = await fetchTour(String(slug));

                if (baseTour) {
                    const translation = baseTour.translations?.[locale] || {};
                    let finalTour = { ...baseTour, ...translation };
                    
                    // İş Kuralları: Ek Hizmet Parametresi
                    if (!finalTour.included.some((i:string) => i.includes('Otel Transferi') || i.includes('VIP Transfer'))) {
                        finalTour.included.unshift('Otel Transferi (Ücretsiz)');
                    }
                    if (!finalTour.included.some((i:string) => i.includes('Rehber') || i.includes('Pilot'))) {
                        finalTour.included.unshift('Profesyonel Rehberlik / Pilot Hizmeti');
                    }
                    
                    // İş Kuralları: Takvim Modülü (+1 Gün)
                    const slots = [];
                    const maxCapacity = String(slug).includes('balon') ? 20 : 15;
                    for (let i = 1; i <= 14; i++) {
                        let d = new Date();
                        d.setDate(d.getDate() + i);
                        slots.push({
                            id: `slot_${i}`,
                            date: d.toISOString().split('T')[0],
                            is_available: true,
                            remaining: maxCapacity - Math.floor(Math.random() * 5)
                        });
                    }
                    finalTour.availabilitySlots = slots;
                    finalTour.maxCapacity = maxCapacity;

                    setTour(finalTour);
                } else {
                    setError("Tur bulunamadı.");
                }
            } catch (err) {
                setError("Tur yüklenirken bir sorun oluştu.");
            } finally {
                setLoading(false);
            }
        }
        loadTour();
    }, [slug, locale]);

    // Form Katmanı ve Validation State'leri
    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });
    const [formError, setFormError] = useState<string | null>(null);

    const handleProceedToPayment = () => {
        if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
            setFormError('Lütfen ad, e-posta ve telefon numarası alanlarını eksiksiz doldurun.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerInfo.email)) {
            setFormError('Lütfen geçerli bir e-posta adresi girdiğinizden emin olun.');
            return;
        }
        setFormError(null);
        setBookingStep(2);
    };

    const basePrice = (tour?.price || 0) * guests;
    const extrasPrice = (hasInsurance ? 500 * guests : 0) + (hasVipTransfer ? 1200 : 0) + (isMealAdded && tour?.linked_restaurant ? tour.linked_restaurant.price * guests : 0);
    const totalPriceAmount = basePrice + extrasPrice;

    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!tour) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;

    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Navbar (Basitleştirilmiş) */}
            <nav className="w-full bg-white/80 backdrop-blur-md py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <Link href="/" className="text-4xl font-extrabold text-[#008cb3] tracking-tighter">
                    tour<span className="text-[#005e85]">kia</span>
                </Link>
                <div className="flex gap-4 items-center">
                    <CurrencySelector />
                    <GeofenceTrigger compact />
                    <Link href="/" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">Ana Sayfa</Link>
                </div>
            </nav>

            {/* Top Section: Gallery & Booking Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex flex-col lg:flex-row gap-8 relative items-start">

                {/* Left: Gallery */}
                <div className="w-full lg:w-2/3">
                    <div className="flex flex-col md:flex-row gap-4 h-[400px] md:h-[500px] rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="w-full md:w-2/3 h-full relative group cursor-pointer">
                            <Image
                                src={tour.imageMain}
                                alt={tour.title}
                                fill
                                priority
                                sizes="(max-width: 768px) 100vw, 66vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute top-6 right-6 z-20">
                                <FavoriteButton tourId={tour.id || slug} className="p-3 rounded-full !bg-white/90 hover:!bg-red-50 hover:!text-red-500 shadow-xl" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 shadow-lg">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Çok Satan
                                </div>
                                {tour?.filmedIn && (
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 ml-2 shadow-lg hover:scale-105 transition-transform cursor-default">
                                        🎬 Filmed in {tour.filmedIn}
                                    </div>
                                )}
                                <h1 className="text-3xl md:text-5xl font-black drop-shadow-md leading-tight mb-2">{tour.title}</h1>
                                <div className="flex items-center gap-4 text-sm font-semibold text-gray-200">
                                    <span className="flex items-center gap-1">📍 {tour.location}</span>
                                    <span className="flex items-center gap-1">⭐ {tour.rating} ({tour.reviews} Değerlendirme)</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex w-1/3 flex-col gap-4">
                            <div className="h-1/2 rounded-[24px] overflow-hidden relative group cursor-pointer">
                                <Image src={tour.imageSub1} alt="Resim 2" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="h-1/2 rounded-[24px] overflow-hidden relative group cursor-pointer">
                                <Image src={tour.imageSub2} alt="Resim 3" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 font-bold px-4 py-2 rounded-xl text-sm shadow-xl">+12 Görsel Seç</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Booking Area (Sticky on Desktop) */}
                <div className="w-full lg:w-1/3 z-10">
                    <div className={`bg-white rounded-[32px] p-6 shadow-2xl border border-gray-100 sticky top-24 transition-all duration-300 ${isSticky ? 'shadow-blue-900/10' : ''}`}>
                        {/* Fiyat Alanı */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                {tour.originalPrice && (
                                    <p className="text-gray-400 text-sm font-bold line-through">{formatPrice(parseInt(String(tour.originalPrice).replace(/\./g, '')))}</p>
                                )}
                                <h3 className="text-3xl font-black text-slate-800">{formatPrice(tour.price)} <span className="text-sm font-medium text-gray-500 tracking-normal">/{locale === 'en-US' ? 'per person' : locale === 'de-DE' ? 'pro person' : locale === 'zh-CN' ? '每人' : 'kişi başı'}</span></h3>
                            </div>
                            {tour.discount && (
                                <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-100 flex flex-col items-center">
                                    <span>{tour.discount}</span>
                                    <span>{locale === 'en-US' ? 'OFF' : locale === 'de-DE' ? 'RABATT' : locale === 'zh-CN' ? '折扣' : 'İNDİRİM'}</span>
                                </div>
                            )}
                        </div>

                        {/* Fomo Alert */}
                        {locale === 'en-US' ? (
                            <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">🔥</div>
                                <div>
                                    <p className="text-orange-800 font-bold text-sm">Hurry Up!</p>
                                    <p className="text-orange-600 text-[11px] font-semibold">{tour.fomoCount} travelers are looking at this right now.</p>
                                </div>
                            </div>
                        ) : locale === 'de-DE' ? (
                            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 shrink-0">📊</div>
                                <div>
                                    <p className="text-blue-800 font-bold text-sm">Statistik</p>
                                    <p className="text-blue-600 text-[11px] font-semibold">Derzeit prüfen {tour.fomoCount} weitere Personen dieses Angebot.</p>
                                </div>
                            </div>
                        ) : locale === 'zh-CN' ? (
                            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-3 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">💎</div>
                                <div>
                                    <p className="text-red-800 font-bold text-sm">尊贵提示</p>
                                    <p className="text-red-600 text-[11px] font-semibold">目前有 {tour.fomoCount} 位贵宾正在浏览此行程。</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">🔥</div>
                                <div>
                                    <p className="text-orange-800 font-bold text-sm">Acele Edin!</p>
                                    <p className="text-orange-600 text-[11px] font-semibold">Şu an {tour.fomoCount} kişi bu turu inceliyor.</p>
                                </div>
                            </div>
                        )}

                        {/* Tarih ve Kişi Seçimi */}
                        <div className="space-y-4 mb-6 relative z-10">
                            <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 relative group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tarih Seçin</label>
                                <select 
                                    className="w-full bg-transparent font-bold text-slate-800 outline-none appearance-none cursor-pointer"
                                    value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        if (e.target.value) setSelectedDate(new Date(e.target.value));
                                        else setSelectedDate(null);
                                    }}
                                >
                                    <option value="" disabled>Tarih Seçin</option>
                                    {tour.availabilitySlots && tour.availabilitySlots.filter((slot:any) => slot.is_available).map((slot: any) => (
                                        <option key={slot.id} value={slot.date}>
                                            {new Date(slot.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                                            {slot.remaining < 5 ? ` (Son ${slot.remaining} koltuk!)` : ` (${slot.remaining} Kişilik Yer Var)`}
                                        </option>
                                    ))}
                                    {(!tour.availabilitySlots || tour.availabilitySlots.filter((s:any) => s.is_available).length === 0) && (
                                        <option disabled>Şu an müsait tarih bulunmuyor</option>
                                    )}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>

                            <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t.hero.searchGuestsLabel}</label>
                                    <span className="text-[10px] font-bold text-red-500">Maksimum {tour.maxCapacity} Kişi</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button aria-label="Kişi Sayısını Azalt" onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 transition">-</button>
                                    <span className="font-extrabold text-slate-800 w-4 text-center">{guests}</span>
                                    <button aria-label="Kişi Sayısını Artır" onClick={() => setGuests(Math.min(tour.maxCapacity || 15, guests + 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 transition" disabled={guests >= (tour.maxCapacity || 15)}>+</button>
                                </div>
                            </div>
                        </div>

                        {/* Toplam Fiyat Hesaplama */}
                        <div className="space-y-2 mb-6 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-500 underline decoration-gray-300 underline-offset-4">{locale === 'en-US' ? 'Tour Subtotal' : 'Tur Bedeli'} ({guests})</span>
                                <span className="font-bold text-slate-700">{formatPrice(tour.price * guests)}</span>
                            </div>
                            
                            {(hasInsurance || hasVipTransfer || isMealAdded) && (
                                <div className="flex justify-between items-center text-xs font-medium text-emerald-600">
                                    <span>{locale === 'en-US' ? 'Extra Services' : 'Ek Hizmetler'}</span>
                                    <span>+ {formatPrice(extrasPrice)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <span className="font-black text-slate-800">{locale === 'en-US' ? 'Total' : 'Toplam Tutar'}</span>
                                <span className="text-2xl font-black text-[#008cb3] tracking-tighter">{formatPrice(totalPriceAmount)}</span>
                            </div>
                        </div>

                        {/* Akıllı Paket Satış (Cross-Sell) Widget */}
                        {tour.linked_restaurant && (
                            <div className={`mb-6 p-4 rounded-2xl border-2 transition-all duration-300 ${isMealAdded ? 'bg-orange-50 border-orange-200 shadow-md' : 'bg-slate-50 border-gray-100 hover:border-orange-200 cursor-pointer'}`} onClick={() => setIsMealAdded(!isMealAdded)}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{locale === 'tr-TR' ? 'Hizmet Tamamlayıcı' : 'Smart Add-on'}</h4>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isMealAdded ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                                        {isMealAdded && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">🍽️</div>
                                    <div>
                                        <h5 className="font-bold text-xs text-slate-800 leading-tight">Tur sonrası yemek ister misin?</h5>
                                        <p className="text-[10px] font-medium text-gray-500 mt-1">
                                            <b>{tour.linked_restaurant.name}</b> restoranında geçerli <b>{tour.linked_restaurant.special_menu_name}</b> %{tour.linked_restaurant.discount_rate} indirimle sadece {formatPrice(tour.linked_restaurant.price)}!
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[11px] font-black text-orange-600">{isMealAdded ? (locale === 'tr-TR' ? '✓ Paket Eklendi' : '✓ Package Added') : (locale === 'tr-TR' ? '+ Sepete Ekle' : '+ Add to Bundle')}</span>
                                    <span className="text-[10px] text-gray-400 line-through font-bold">{formatPrice(tour.linked_restaurant.original_price)}</span>
                                </div>
                            </div>
                        )}

                        {/* CTA Butonu */}
                        <div className="flex flex-col gap-2 mb-4">
                            <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (!selectedDate) {
                            alert("Lütfen önce bir tarih seçin.");
                            return;
                        }
                        const formattedDate = selectedDate.toISOString().split('T')[0];
                        const menuParam = isMealAdded && tour.linked_restaurant ? `&menuId=${tour.linked_restaurant.id}` : '';
                        router.push(`/checkout?tourId=${tour.id || slug}&guests=${guests}&date=${formattedDate}${menuParam}`);
                    }}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                {locale === 'en-US' ? 'Secure Your Spot' : locale === 'de-DE' ? 'Jetzt Verbindlich Reservieren' : locale === 'zh-CN' ? '尊享预订，稍后付款' : 'Hemen Yerini Ayır'}
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>

                        {/* Güven Rozetleri (Trust Badges) - Enriched UI */}
                        <div className="mt-2 border-t border-gray-100 pt-5 flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex-1 w-full bg-green-50/70 border border-green-100 rounded-2xl p-3.5 flex items-start gap-3 transition hover:bg-green-50">
                                <div className="text-green-600 mt-0.5 bg-white p-1 rounded-full shadow-sm"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                <div>
                                    <h4 className="text-[12px] font-black text-green-800 uppercase tracking-widest mb-0.5">Ücretsiz İptal</h4>
                                    <p className="text-[10px] text-green-700/80 font-bold leading-tight">Son 24 saate kadar kesintisiz %100 iade hakkı.</p>
                                </div>
                            </div>
                            <div className="flex-1 w-full bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-3 transition hover:bg-blue-50">
                                <div className="text-blue-600 mt-0.5 bg-white p-1 rounded-full shadow-sm"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                <div>
                                    <h4 className="text-[12px] font-black text-blue-800 uppercase tracking-widest mb-0.5">Güvenli Ödeme</h4>
                                    <p className="text-[10px] text-blue-700/80 font-bold leading-tight">256-bit SSL & PCI-DSS korumalı altyapı.</p>
                                </div>
                            </div>
                        </div>

                        {/* Offline indir — Müze, dağ vb. çevrimdışı QR ve harita için */}
                        <div className="mt-5 pt-5 border-t border-gray-100">
                            <DownloadOfflineButton
                                tour={{
                                    id: tour.id,
                                    title: tour.title,
                                    location: tour.location,
                                    duration: tour.duration,
                                    included: tour.included,
                                    excluded: tour.excluded,
                                }}
                                dateLabel="15 Mart 2026 - 17 Mart 2026"
                                guests={guests}
                                locale={locale}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Tur Detayları */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="w-full lg:w-2/3 pr-0 lg:pr-8">
                    {/* Tour Highlights */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 mb-8">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">{locale === 'en-US' ? 'Trip At A Glance' : locale === 'de-DE' ? 'Reiseübersicht' : locale === 'zh-CN' ? '行程亮点' : 'Tur Özeti'}</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-2">
                                <div className="w-12 h-12 bg-blue-50 text-[#008cb3] rounded-2xl flex items-center justify-center text-xl shadow-sm">⏱️</div>
                                <span className="text-xs font-bold text-gray-400 uppercase">{locale === 'en-US' ? 'Duration' : locale === 'de-DE' ? 'Dauer' : locale === 'zh-CN' ? '时长' : 'Süre'}</span>
                                <span className="text-sm font-semibold text-slate-800">{tour.duration}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">🗣️</div>
                                <span className="text-xs font-bold text-gray-400 uppercase">{locale === 'en-US' ? 'Guide' : locale === 'de-DE' ? 'Reiseleiter' : locale === 'zh-CN' ? '中/英文向导' : 'Rehber'}</span>
                                <span className="text-sm font-semibold text-slate-800">{tour.guide}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">{locale === 'zh-CN' ? '👑' : '🛏️'}</div>
                                <span className="text-xs font-bold text-gray-400 uppercase">{locale === 'en-US' ? 'Stay' : locale === 'de-DE' ? 'Unterkunft' : locale === 'zh-CN' ? '奢华下榻' : 'Konaklama'}</span>
                                <span className="text-sm font-semibold text-slate-800">{tour.accommodation}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">✈️</div>
                                <span className="text-xs font-bold text-gray-400 uppercase">{locale === 'en-US' ? 'Transit' : locale === 'de-DE' ? 'Transport' : locale === 'zh-CN' ? 'VIP专车' : 'Ulaşım'}</span>
                                <span className="text-sm font-semibold text-slate-800">{tour.transportation}</span>
                            </div>
                        </div>
                    </div>

                    <hr className="my-8 border-gray-200" />

                    {/* Description */}
                    <div className="mb-10">
                        <h3 className="text-2xl font-black text-slate-800 mb-4">{locale === 'en-US' ? "What's The Vibe?" : locale === 'de-DE' ? 'Was erwartet Sie?' : locale === 'zh-CN' ? '独家尊享体验' : 'Neler Yaşayacaksınız?'}</h3>
                        <p className="text-gray-600 leading-relaxed font-medium text-lg">
                            {tour.description}
                        </p>
                    </div>

                    {/* Included / Excluded */}
                    <div className="flex flex-col md:flex-row gap-8 mb-12 bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="text-green-500 text-xl">✓</span> {locale === 'en-US' ? "We've Got You" : locale === 'de-DE' ? 'Im Preis Inbegriffen' : locale === 'zh-CN' ? '包含尊享服务' : 'Fiyata Dahil Olanlar'}</h4>
                            <ul className="space-y-3">
                                {tour.included.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 font-medium text-sm">
                                        <span className="text-green-500 font-bold mt-0.5">✓</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="text-red-500 text-xl">✕</span> {locale === 'en-US' ? 'Not On Us' : locale === 'de-DE' ? 'Nicht Inbegriffen' : locale === 'zh-CN' ? '不包含项目' : 'Dahil Olmayanlar'}</h4>
                            <ul className="space-y-3">
                                {tour.excluded.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 font-medium text-sm">
                                        <span className="text-red-500 font-bold mt-0.5">✕</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Itinerary */}
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 mb-6">Örnek Tur Programı</h3>
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-blue-100 before:via-blue-300 before:to-transparent">
                            {/* Gün 1 */}
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#008cb3] text-white shadow shadow-blue-500/30 flex-shrink-0 z-10 md:mx-auto">
                                    <span className="font-bold text-sm">1</span>
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-3xl shadow-sm border border-gray-100 md:ml-0 md:mr-10 transition hover:shadow-lg">
                                    <h4 className="font-bold text-lg text-slate-800 mb-2">Karşılama ve İlk Gün Macerası</h4>
                                    <p className="text-sm text-gray-600 font-medium">Havalimanından konforlu araçlarımızla alınıp lokasyona erişim. Günün ilk ışıklarıyla birlikte keşfe başlama ve ilk serbest zaman.</p>
                                </div>
                            </div>
                            {/* Gün 2 */}
                            <div className="relative flex items-center justify-between md:justify-normal group">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#008cb3] text-white shadow shadow-blue-500/30 flex-shrink-0 z-10 md:mx-auto">
                                    <span className="font-bold text-sm">2</span>
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-3xl shadow-sm border border-gray-100 md:mr-0 md:ml-10 transition hover:shadow-lg">
                                    <h4 className="font-bold text-lg text-slate-800 mb-2">Detaylı Çevre Gezisi ve Kültürel Etkinlikler</h4>
                                    <p className="text-sm text-gray-600 font-medium">Yerel lezzetleri tatma, kültürel mekanlara ziyaretler ve opsiyonel aktiviteler ile dolu dolu bir gün. Akşamında serbest dinlenme ve alışveriş.</p>
                                </div>
                            </div>
                            {/* Gün 3 */}
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#008cb3] text-white shadow shadow-blue-500/30 flex-shrink-0 z-10 md:mx-auto">
                                    <span className="font-bold text-sm">3</span>
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-3xl shadow-sm border border-gray-100 md:ml-0 md:mr-10 transition hover:shadow-lg">
                                    <h4 className="font-bold text-lg text-slate-800 mb-2">Doğa veya Şehir Yürüyüşleri ve Veda</h4>
                                    <p className="text-sm text-gray-600 font-medium">Son gün yürüyüşleri, hediyelik eşya durakları ve eşsiz anılar biriktirdikten sonra VIP transferle havalimanı'na uğurlama.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Değerlendirme & Yorumlar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 lg:w-2/3 ml-0 lg:ml-auto mr-auto lg:mr-0 pl-0 lg:pr-8">
               <TourReviews tourId={tour.id || slug} />
            </div>

            {/* Mobile Sticky Booking Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-[60] flex items-center justify-between pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam ({guests} Kişi)</p>
                    <p className="text-2xl font-black text-slate-800 leading-none">{formatPrice(totalPriceAmount)}</p>
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (!selectedDate) {
                            alert("Lütfen rezervasyon için tarih seçiniz.");
                            return;
                        }
                        const formattedDate = selectedDate.toISOString().split('T')[0];
                        const menuParam = isMealAdded && tour.linked_restaurant ? `&menuId=${tour.linked_restaurant.id}` : '';
                        router.push(`/checkout?tourId=${tour.id || slug}&guests=${guests}&date=${formattedDate}${menuParam}`);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 text-sm"
                >
                    Hemen Ayır
                </button>
            </div>

        </main>
    );
}
