'use client';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';


import { TOUR_DATA } from '../../lib/tours';
import { useLocale } from '../../context/LocaleContext';
import { DownloadOfflineButton } from '../../components/DownloadOfflineButton';
import GeofenceTrigger from '../../components/GeofenceTrigger';
import CurrencySelector from '../../components/CurrencySelector';

export default function DynamicTourPage() {
    const { t, locale, formatPrice } = useLocale();
    const router = useRouter();

    const params = useParams();
    const slug = typeof params.slug === 'string' ? params.slug : 'kapadokya';

    const baseTour = TOUR_DATA[slug as keyof typeof TOUR_DATA] || TOUR_DATA['kapadokya'];
    // @ts-ignore
    const translation = baseTour.translations?.[locale] || {};
    const tour = { ...baseTour, ...translation };

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [guests, setGuests] = useState(2);
    const [isSticky, setIsSticky] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Yeni Akış State'leri
    const [bookingStep, setBookingStep] = useState<0 | 1 | 2 | 3>(0);
    const [hasInsurance, setHasInsurance] = useState(false);
    const [hasVipTransfer, setHasVipTransfer] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'eft' | 'cash'>('eft'); // Yeni ödeme yöntemleri

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

    const basePrice = tour.price * guests;
    const extrasPrice = (hasInsurance ? 500 * guests : 0) + (hasVipTransfer ? 1200 : 0);
    const totalPriceAmount = basePrice + extrasPrice;

    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Navbar (Basitleştirilmiş) */}
            <nav className="w-full bg-white/80 backdrop-blur-md py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <Link href="/" className="text-2xl font-extrabold text-[#008cb3] tracking-tighter">
                    melih<span className="text-[#005e85]">tours™</span>
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 shadow-lg">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Çok Satan
                                </div>
                                {(baseTour as any).filmedIn && (
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 ml-2 shadow-lg hover:scale-105 transition-transform cursor-default">
                                        🎬 Filmed in {(baseTour as any).filmedIn}
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
                                <p className="text-gray-400 text-sm font-bold line-through">{formatPrice(parseInt(baseTour.originalPrice.replace(/\./g, '')))}</p>
                                <h3 className="text-3xl font-black text-slate-800">{formatPrice(tour.price)} <span className="text-sm font-medium text-gray-500 tracking-normal">/{locale === 'en-US' ? 'per person' : locale === 'de-DE' ? 'pro person' : locale === 'zh-CN' ? '每人' : 'kişi başı'}</span></h3>
                            </div>
                            <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-100 flex flex-col items-center">
                                <span>{tour.discount}</span>
                                <span>{locale === 'en-US' ? 'OFF' : locale === 'de-DE' ? 'RABATT' : locale === 'zh-CN' ? '折扣' : 'İNDİRİM'}</span>
                            </div>
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
                                <select className="w-full bg-transparent font-bold text-slate-800 outline-none appearance-none cursor-pointer">
                                    <option>15 Mart 2026 - 17 Mart 2026</option>
                                    <option>22 Mart 2026 - 24 Mart 2026</option>
                                    <option>5 Nisan 2026 - 7 Nisan 2026</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>

                            <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t.hero.searchGuestsLabel}</label>
                                <div className="flex items-center gap-4">
                                    <button aria-label="Kişi Sayısını Azalt" onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 transition">-</button>
                                    <span className="font-extrabold text-slate-800 w-4 text-center">{guests}</span>
                                    <button aria-label="Kişi Sayısını Artır" onClick={() => setGuests(guests + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 transition">+</button>
                                </div>
                            </div>
                        </div>

                        {/* Toplam Fiyat Hesaplama */}
                        <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
                            <span className="font-bold text-gray-600 underline decoration-gray-300 underline-offset-4">{formatPrice(tour.price)} x {guests}</span>
                            <span className="font-black text-xl text-slate-800">{formatPrice(tour.price * guests)}</span>
                        </div>

                        {/* Error Message Removed */}

                        {/* CTA Butonu */}
                        <div className="flex flex-col gap-2 mb-4">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push('/bookings');
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

            {/* Mobile Sticky Booking Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-[60] flex items-center justify-between pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam ({guests} Kişi)</p>
                    <p className="text-2xl font-black text-slate-800 leading-none">{formatPrice(tour.price * guests)}</p>
                </div>
                <button
                    onClick={() => setBookingStep(1)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 text-sm"
                >
                    Hemen Ayır
                </button>
            </div>

            {/* 3 Steps Custom Booking Modal */}
            {bookingStep !== 0 && (
                <div className="fixed inset-0 bg-slate-900/60 z-[99999] flex flex-col items-center justify-end sm:justify-center backdrop-blur-sm sm:px-4" onClick={(e) => { if (e.target === e.currentTarget && bookingStep !== 3) setBookingStep(0) }}>
                    <div className="bg-white rounded-t-[32px] sm:rounded-b-[32px] shadow-2xl w-full max-w-[600px] overflow-hidden relative flex flex-col max-h-[90vh]">
                        {/* Header + Progress Bar */}
                        <div className="p-6 sm:px-8 border-b border-gray-100 bg-slate-50 relative shrink-0">
                            {bookingStep !== 3 && (
                                <button onClick={() => setBookingStep(0)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 bg-white rounded-full p-2.5 shadow-sm border border-gray-100 transition-colors">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-6">Rezervasyon Oluştur</h3>

                            {/* Modern Progress Bar */}
                            <div className="flex items-center justify-between relative mt-2 px-2 sm:px-4">
                                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full z-0"></div>
                                <div className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-green-500 rounded-full transition-all duration-500 z-0 ease-out" style={{ width: bookingStep === 1 ? '0%' : bookingStep === 2 ? '40%' : '80%' }}></div>

                                <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm transition-colors duration-300 ${bookingStep >= 1 ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>{bookingStep > 1 ? '✓' : '1'}</div>
                                <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm transition-colors duration-300 ${bookingStep >= 2 ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>{bookingStep > 2 ? '✓' : '2'}</div>
                                <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm transition-colors duration-300 ${bookingStep >= 3 ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>3</div>
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[10px] font-black text-slate-600 uppercase tracking-widest px-1 sm:px-2">
                                <span className={bookingStep >= 1 ? 'text-green-600' : ''}>Kişisel Bilgiler</span>
                                <span className={bookingStep >= 2 ? 'text-green-600' : ''}>Güvenli Ödeme</span>
                                <span className={bookingStep >= 3 ? 'text-green-600' : ''}>Onay Başarılı</span>
                            </div>
                        </div>

                        {/* Steps Content Area */}
                        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                            {bookingStep === 1 && (
                                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Kişisel Bilgiler */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                                            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center">👤</div> İletişim Bilgileri
                                        </h4>
                                        {formError && (
                                            <div className="mb-4 bg-red-50/80 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-bold animate-pulse flex items-center gap-2">
                                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formError}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Ad Soyad" className={`w-full bg-slate-50 border ${formError && !customerInfo.name ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[#008cb3]'} p-4 rounded-xl outline-none focus:bg-white transition-colors text-sm font-semibold text-slate-700`} />
                                            <input type="email" value={customerInfo.email} onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })} placeholder="E-Posta" className={`w-full bg-slate-50 border ${formError && (!customerInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[#008cb3]'} p-4 rounded-xl outline-none focus:bg-white transition-colors text-sm font-semibold text-slate-700`} />
                                            <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} placeholder="Telefon ( +90 )" className={`w-full bg-slate-50 border ${formError && !customerInfo.phone ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[#008cb3]'} p-4 rounded-xl outline-none focus:bg-white transition-colors text-sm font-semibold text-slate-700 col-span-2`} />
                                        </div>
                                    </div>

                                    {/* Upsell / Ekstralar */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                                            <div className="bg-orange-100 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center">✨</div> Deneyiminizi Güzelleştirin
                                        </h4>
                                        <div className="flex flex-col gap-4">
                                            {/* Sigorta */}
                                            <label className={`border-2 rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 cursor-pointer transition-all duration-300 relative overflow-hidden group ${hasInsurance ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
                                                <input type="checkbox" checked={hasInsurance} onChange={(e) => setHasInsurance(e.target.checked)} className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded cursor-pointer accent-indigo-600 shrink-0" />
                                                <div className="w-full">
                                                    <div className="flex justify-between items-start sm:items-center mb-1.5 flex-col sm:flex-row gap-1 sm:gap-0">
                                                        <span className="font-black text-sm sm:text-base text-slate-800">Seyahat Sağlık Sigortası</span>
                                                        <span className="font-black text-indigo-600 text-sm sm:text-base border border-indigo-200 bg-indigo-100 px-2.5 py-1 rounded-lg">+₺500<span className="text-[10px] sm:text-xs font-bold text-indigo-500/80 uppercase ml-1 block sm:inline">/kişi</span></span>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed pr-2">Vize reddi, hastalık veya son dakika iptallerinde <span className="text-indigo-600 font-bold">%100 iade garantisi.</span> Seyahatinizi güvenceye alın.</p>
                                                </div>
                                            </label>

                                            {/* VIP Transfer */}
                                            <label className={`border-2 rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 cursor-pointer transition-all duration-300 relative overflow-hidden group ${hasVipTransfer ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white hover:border-orange-200'}`}>
                                                <input type="checkbox" checked={hasVipTransfer} onChange={(e) => setHasVipTransfer(e.target.checked)} className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded cursor-pointer accent-orange-500 shrink-0" />
                                                <div className="w-full">
                                                    <div className="flex justify-between items-start sm:items-center mb-1.5 flex-col sm:flex-row gap-2 sm:gap-0">
                                                        <span className="font-black text-sm sm:text-base text-slate-800 flex items-center flex-wrap gap-2">VIP Havalimanı Transferi <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-md uppercase font-black w-max">Popüler</span></span>
                                                        <span className="font-black text-orange-600 text-sm sm:text-base border border-orange-200 bg-orange-100 px-2.5 py-1 rounded-lg">+₺1.200</span>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed pr-2">Sizi havalimanından lüks <span className="text-orange-600 font-bold">Mercedes Vito</span> ile karşılayıp otelinize transferinizi sağlayalım.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Alt Bilgi */}
                                    <div className="pt-6 border-t border-gray-100 mt-2 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                        <div className="text-center sm:text-left w-full sm:w-auto">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Genel Toplam</p>
                                            <p className="text-2xl font-black text-slate-800">{formatPrice(totalPriceAmount)}</p>
                                        </div>
                                        <button onClick={handleProceedToPayment} className="w-full sm:w-auto sm:px-10 bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-xl hover:bg-[#005e85] transition-transform active:scale-95 shadow-lg shadow-blue-500/20">
                                            Ödemeye Geç ➔
                                        </button>
                                    </div>
                                </div>
                            )}

                            {bookingStep === 2 && (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 sm:p-6 rounded-[24px] flex justify-between items-center shadow-lg relative overflow-hidden">
                                        {/* Kredi kartı arkaplan grafiği */}
                                        <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-5 rounded-full translate-x-10 -translate-y-10"></div>
                                        <div className="absolute right-0 bottom-0 w-24 h-24 bg-white opacity-5 rounded-full translate-x-5 translate-y-5"></div>

                                        <div className="relative z-10">
                                            <h4 className="font-bold text-slate-300 text-xs sm:text-sm mb-1 uppercase tracking-widest">Ödenecek Tutar</h4>
                                            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">{guests} Kişi + {hasInsurance || hasVipTransfer ? 'Seçili Ekstralar' : 'Tüm Vergiler Dahil'}</p>
                                        </div>
                                        <span className="relative z-10 font-black text-2xl sm:text-3xl text-white">{formatPrice(totalPriceAmount)}</span>
                                    </div>

                                    {/* 3. Psikolojik Tetikleyici (Scarcity / Social Proof) */}
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-row items-center gap-3 shadow-inner">
                                        <div className="bg-orange-100 text-orange-500 rounded-full w-8 h-8 flex items-center justify-center shrink-0 text-lg">🔥</div>
                                        <p className="text-orange-800 text-xs font-bold leading-tight flex-1">
                                            Bu tur son 24 saatte 12 kez rezerve edildi!
                                            <span className="block font-medium text-orange-600 mt-0.5">Yerinizi hemen ayırtın, fırsatı kaçırmayın.</span>
                                        </p>
                                    </div>

                                    {/* 2. Yeni Ödeme Seçenekleri TABS */}
                                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 mt-4">
                                        <button
                                            onClick={() => setPaymentMethod('eft')}
                                            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${paymentMethod === 'eft' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            🏦 Banka Havalesi / EFT
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${paymentMethod === 'cash' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            💵 Tur Günü Nakit Ödeme
                                        </button>
                                    </div>

                                    {/* Dinamik Ödeme Yöntemi Formu */}
                                    {paymentMethod === 'eft' ? (
                                        <div className="space-y-4 animate-in fade-in duration-300 bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">
                                                    🏦
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-800 text-sm">Havale / EFT ile Ödeme</h5>
                                                    <p className="text-xs text-slate-500">Sipariş sonrası IBAN bilgileri iletilecektir.</p>
                                                </div>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                                Aşağıdaki <strong>&quot;Rezervasyonu Tamamla&quot;</strong> butonuna tıkladıktan sonra onay sayfasına yönlendirileceksiniz. Lütfen ödemenizi ekranda belirtilecek olan şirket banka hesabımıza gönderiniz ve dekontunuzu WhatsApp destek hattımıza iletiniz.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-300 bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl">
                                                    💵
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-800 text-sm">Tur Günü Nakit Ödeme</h5>
                                                    <p className="text-xs text-slate-500">Ödemenizi rehberinize yapın.</p>
                                                </div>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                                Rezervasyonunuz sistemimize <strong>Onay Bekliyor</strong> statüsünde kaydedilecektir. Tur saatinden en az 30 dakika önce buluşma noktasında olup, ödemenizi ilgili personelimize tamamlayabilirsiniz.
                                            </p>
                                        </div>
                                    )}

                                    {/* 1. Güven ve İkna Bloğu (Premium Trust Signals) */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2">
                                        <div className="flex flex-col gap-3.5">
                                            <div className="flex items-start gap-3 text-sm">
                                                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                                <div>
                                                    <span className="font-bold text-slate-800 text-xs sm:text-sm">Gizlilik Garantisi</span>
                                                    <span className="block text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide leading-tight mt-0.5">Bilgileriniz sadece rezervasyon işlemleri için kullanılır ve asla üçüncü şahıslarla paylaşılmaz.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-2 flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                                        <button onClick={() => setBookingStep(1)} className="w-full sm:w-1/3 bg-white border-2 border-slate-200 text-slate-500 font-bold text-[15px] py-4 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors">Geri</button>
                                        <button onClick={(e) => {
                                            e.preventDefault();
                                            router.push('/success');
                                        }} className="w-full sm:w-2/3 bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-xl hover:bg-[#005e85] transition-transform active:scale-95 shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2">
                                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Rezervasyonu Tamamla</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {bookingStep === 3 && (
                                <div className="flex flex-col items-center justify-center text-center gap-4 py-8 sm:py-12 animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center shadow-inner relative">
                                        <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
                                        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="3" className="relative z-10"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>

                                    <h2 className="text-3xl font-black text-slate-800 mt-4 tracking-tight">İşlem Onaylandı!</h2>
                                    <p className="text-gray-500 font-medium text-sm max-w-sm leading-relaxed mb-4">
                                        Harika karar! Biletleriniz, seyahat yönergeleri ve fatura detaylarınız e-posta adresinize gönderildi.
                                    </p>

                                    <div className="w-full bg-slate-50 border border-gray-100 p-5 rounded-2xl text-left shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                            <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M2.25 12l9.75-9.75L21.75 12 12 21.75 2.25 12z" /></svg>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Rezervasyon Özeti</p>

                                        <div className="flex border-b border-gray-200 pb-3 mb-3 relative z-10">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                                                <Image src={tour.imageMain} alt="Tur" fill sizes="64px" className="object-cover" />
                                            </div>
                                            <div className="ml-3 flex flex-col justify-center flex-1">
                                                <span className="text-sm font-black text-slate-800 line-clamp-1">{tour.title}</span>
                                                <span className="text-xs text-slate-500 font-medium">{guests} Kişi • {selectedDate ? selectedDate.toLocaleDateString(locale) : 'Tarih Sabit'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 relative z-10">
                                            <div className="flex justify-between items-center text-xs text-gray-600 font-medium"><span>Tur Tutarı</span> <span>{formatPrice(basePrice)}</span></div>
                                            {hasInsurance && <div className="flex justify-between items-center text-xs text-gray-600 font-medium"><span>Sağlık Sigortası</span> <span>{formatPrice(500 * guests)}</span></div>}
                                            {hasVipTransfer && <div className="flex justify-between items-center text-xs text-gray-600 font-medium"><span>VIP Transfer</span> <span>{formatPrice(1200)}</span></div>}
                                            <div className="flex justify-between items-center text-sm font-black text-slate-800 pt-2 border-t border-gray-200 mt-2"><span>Ödenen Net Tutar</span> <span className="text-green-600">{formatPrice(totalPriceAmount)}</span></div>
                                        </div>
                                    </div>

                                    <button onClick={() => { setBookingStep(0); window.scroll({ top: 0, behavior: 'smooth' }); }} className="w-full bg-[#008cb3] text-white font-black text-[15px] py-4 rounded-xl hover:bg-[#005e85] transition-transform active:scale-95 shadow-lg mt-2">
                                        Anasayfaya Dön & Yeni Keşifler Yap
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
