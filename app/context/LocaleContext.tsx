'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useCurrency } from './CurrencyContext';

export type Locale = 'tr-TR' | 'en-US' | 'de-DE' | 'zh-CN';

type Translations = {
    [key in Locale]: {
        nav: {
            destinations: string;
            styles: string;
            memories: string;
            deals: string;
            contact: string;
            competitorReport: string;
            customerLogin: string;
            agencyLogin: string;
        };
        hero: {
            title: string;
            subtitle: string;
            searchLocationLabel: string;
            searchLocationPlaceholder: string;
            searchDateLabel: string;
            searchPriceLabel: string;
            searchGuestsLabel: string;
            searchButton: string;
        };
        trustTexts: string[];
        categories: string[];
        whyUs: {
            title: string;
            items: { title: string; desc: string }[];
        };
        popularDestinations: string;
        adventureStylesTitle: string;
        bestSellersTitle: string;
        dealOfTheDay: {
            badge: string;
            title: string;
            desc: string;
            button: string;
            savings: string;
        };
        stats: {
            travelers: string;
            guides: string;
            destinations: string;
            support: string;
        };
    }
};

const TRANSLATIONS: Translations = {
    'tr-TR': {
        nav: {
            destinations: "Hedefler",
            styles: "Macera Stilleri",
            memories: "Anılar",
            deals: "Fırsatlar",
            contact: "Temas",
            competitorReport: "Rakip Analizi",
            customerLogin: "Müşteri Girişi",
            agencyLogin: "Acenta Girişi",
        },
        hero: {
            title: "Dünyayı Keşfetmenin En Ayrıcalıklı Yolu",
            subtitle: "Unutulmaz anılar biriktirmeye hazır mısın? Özel rehberler, premium konaklama ve ruhunuza hitap edecek benzersiz rotalarla hayalinizdeki tatili şimdi keşfedin.",
            searchLocationLabel: "Gidilecek Yer",
            searchLocationPlaceholder: "Nereye gitmek istersin?",
            searchDateLabel: "Tarih",
            searchPriceLabel: "Fiyat aralığı",
            searchGuestsLabel: "Kişi Sayısı",
            searchButton: "Turları Bul"
        },
        trustTexts: [
            "⭐ 10 Yılı Aşkın Turizm Tecrübesiyle Güvenli Seyahat",
            "🌍 500+ Farklı Rota, Binlerce Unutulmaz Anı",
            "🛡️ TURSAB Onaylı %100 Müşteri Memnuniyeti",
            "💸 En İyi Fiyat Garantisi ve Taksit İmkanları"
        ],
        categories: ['Kültür Avcısı', 'Balayı Turları', 'Umre Ziyareti', 'Kar & Kayak', 'Deniz Tatili', 'Grup Turları', 'Vahşi Yaşam'],
        whyUs: {
            title: "Neden Bizi Seçmelisiniz?",
            items: [
                { title: "Güvenilir ve Onaylı", desc: "Tüm operatörlerimiz ve turlarımız uzman ekibimiz tarafından detaylı incelenir." },
                { title: "Esnek Ödeme", desc: "Şimdi rezerve edin, iptal veya değişiklik durumunda %100 esneklik yaşayın." },
                { title: "Fiyat Garantisi", desc: "Hiçbir zaman gizli ücret ödemez, en iyi fiyat garantisini alırsınız." },
                { title: "7/24 Rehberlik", desc: "Dünyanın neresinde olursanız olun deneyimli ekibimiz bir telefon uzağınızda." }
            ]
        },
        popularDestinations: "Kapadokya'yı Keşfet",
        adventureStylesTitle: "Sana Uygun Macera Stilini Seç",
        bestSellersTitle: "Haftanın En Çok Satan Turları",
        dealOfTheDay: {
            badge: "Sadece Bugüne Özel",
            title: "Yarı Fiyatına Rüya Gibi Bir Bali Tatili",
            desc: "Sınırlı sayıda kontenjan! Tropikal cennet Bali'deki 7 gecelik ultra lüks konaklama paketini %50 indirimle yakalayarak hayatınızın tatilini yapın.",
            button: "Hemen Rezerve Et",
            savings: "KAZANÇ"
        },
        stats: {
            travelers: "Mutlu Gezgin",
            guides: "Uzman Rehber",
            destinations: "Farklı Ülke",
            support: "Müşteri Desteği"
        }
    },
    'en-US': {
        nav: {
            destinations: "Destinations",
            styles: "Vibes",
            memories: "Epic Moments",
            deals: "Hot Deals",
            contact: "Hit Us Up",
            competitorReport: "Market Edge",
            customerLogin: "Traveler Login",
            agencyLogin: "Partner Portal",
        },
        hero: {
            title: "Zero Boring Moments. Maximum Adventure.",
            subtitle: "Fast-track your bucket list. We cut the planning stress so you can dive straight into high-energy experiences, epic parties, and ultimate relaxation.",
            searchLocationLabel: "Where to?",
            searchLocationPlaceholder: "Type a vibe or city...",
            searchDateLabel: "When?",
            searchPriceLabel: "Budget",
            searchGuestsLabel: "Squad Size",
            searchButton: "Let's Go!"
        },
        trustTexts: [
            "🚀 Quick Bookings, Instant Confirmations",
            "🎉 Handpicked Experiences for Maximum Fun",
            "😎 Used by 25,000+ Adventure Seekers",
            "💳 Pay Over Time - Book Now, Pay Later"
        ],
        categories: ['Adrenaline Junkie', 'Baecation', 'Party Hard', 'Snow Vibes', 'Beach Bums', 'Squad Trips', 'Safari'],
        whyUs: {
            title: "Why Travel With US?",
            items: [
                { title: "No Cap Experiences", desc: "Only the most highly-rated, instagram-worthy tours make our cut." },
                { title: "Book Now, Pay Later", desc: "Lock it in now with flexibility to pay over time with Stripe." },
                { title: "Price Match", desc: "Find it cheaper? We'll match it so you always win." },
                { title: "24/7 Concierge", desc: "Got an issue? Hit our text support anytime, day or night." }
            ]
        },
        popularDestinations: "Trending Global Hotspots",
        adventureStylesTitle: "Pick Your Poison",
        bestSellersTitle: "Most Hyped Tours This Week",
        dealOfTheDay: {
            badge: "Flash Sale Alert",
            title: "Half-Off Bali VIP Getaway",
            desc: "Don't get FOMO! Secure this insanely discounted 7-night luxury Bali getaway before spots sell out.",
            button: "Snag The Deal",
            savings: "YOU SAVE"
        },
        stats: {
            travelers: "Thrill Seekers",
            guides: "Local Legends",
            destinations: "Countries",
            support: "Live Support"
        }
    },
    'de-DE': {
        nav: {
            destinations: "Reiseziele",
            styles: "Reisestile",
            memories: "Erfahrungen",
            deals: "Angebote",
            contact: "Kontakt",
            competitorReport: "Marktanalyse",
            customerLogin: "Kunden-Login",
            agencyLogin: "Agentur-Login",
        },
        hero: {
            title: "Sicher, Zuverlässig und Perfekt Geplant.",
            subtitle: "Reisen Sie mit deutschem Qualitätsstandard. Geprüfte Sicherheit, detailliert geplante Routen und transparente Preise für Ihren perfekten Urlaub.",
            searchLocationLabel: "Reiseziel",
            searchLocationPlaceholder: "Wohin möchten Sie reisen?",
            searchDateLabel: "Datum",
            searchPriceLabel: "Preisspanne",
            searchGuestsLabel: "Personenzahl",
            searchButton: "Tour Suchen"
        },
        trustTexts: [
            "🛡️ 100% Sicherheit und TÜV-Geprüfte Partner",
            "💶 Transparente Preise: Keine Versteckten Kosten",
            "🇩🇪 Deutschsprachige Reiseleitung Verfügbar",
            "✅ Reisesicherungsschein Inklusive"
        ],
        categories: ['Kultur & Geschichte', 'Kur- & Erholung', 'Wandern & Natur', 'Städtereisen', 'Flusskreuzfahrten', 'Familienurlaub', 'Seniorenreisen'],
        whyUs: {
            title: "Ihre Vorteile im Überblick",
            items: [
                { title: "Geprüfte Qualität", desc: "Unsere Partner unterliegen strengen Sicherheits- und Qualitätskontrollen." },
                { title: "100% Stornoschutz", desc: "Mit unserer Flex-Option können Sie bis 24h vorher kostenlos stornieren." },
                { title: "Bestpreisgarantie", desc: "Detaillierte Kostenaufstellung ohne versteckte Gebühren." },
                { title: "Rundum-Betreuung", desc: "Ihr persönlicher Berater steht Ihnen mit deutscher Pünktlichkeit zur Seite." }
            ]
        },
        popularDestinations: "Strukturierte Reiserouten",
        adventureStylesTitle: "Finden Sie Ihre Ideale Reise",
        bestSellersTitle: "Meistgebuchte Premium-Touren",
        dealOfTheDay: {
            badge: "Exklusives Zeitangebot",
            title: "50% Ersparnis: Bali Premium-Urlaub",
            desc: "Sichern Sie sich ein exzellent bewertetes 7-Nächte-Paket mit geprüften 5-Sterne-Hotels und durchgeplanter Reiseroute.",
            button: "Jetzt Verbindlich Buchen",
            savings: "ERSPARNIS"
        },
        stats: {
            travelers: "Zufriedene Kunden",
            guides: "Zertifizierte Führer",
            destinations: "Streng Geprüfte Länder",
            support: "Zuverlässiger Support"
        }
    },
    'zh-CN': {
        nav: {
            destinations: "热门目的地",
            styles: "豪华体验",
            memories: "尊享时刻",
            deals: "特惠优选",
            contact: "联系我们",
            competitorReport: "市场优势",
            customerLogin: "贵宾登录",
            agencyLogin: "合作伙伴",
        },
        hero: {
            title: "尽享奢华，尊贵出行 (VIP之旅)",
            subtitle: "为您和您的家人量身定制的高端定制游。五星级酒店、专属中文导游以及豪华接送服务，让您倍有面子，尊享世界。",
            searchLocationLabel: "目的地",
            searchLocationPlaceholder: "您想去哪里？",
            searchDateLabel: "出行日期",
            searchPriceLabel: "预算",
            searchGuestsLabel: "出行人数",
            searchButton: "立刻预订"
        },
        trustTexts: [
            "👑 VIP专属通道 & 全程中文导游",
            "📸 最佳拍照打卡点安排 (小红书推荐)",
            "🛍️ 专属免税店购物体验",
            "💎 100% 豪华五星级酒店保障"
        ],
        categories: ['家庭尊享游', '浪漫蜜月', '顶级购物游', '摄影打卡', '海岛度假', '高级定制', '美食之旅'],
        whyUs: {
            title: "为什么选择我们的高端定制？",
            items: [
                { title: "尊贵服务", desc: "全程VIP接待，私人专车，让您出行有里有面。" },
                { title: "中文无忧", desc: "全程资深中文向导陪同，跨越语言障碍。" },
                { title: "奢华下榻", desc: "承诺均为国际知名五星级连锁或特色顶级酒店。" },
                { title: "私人管家", desc: "24小时微信中文私人管家在线，随叫随到。" }
            ]
        },
        popularDestinations: "全球热门名胜",
        adventureStylesTitle: "选择您的奢华主题",
        bestSellersTitle: "最受中国贵宾欢迎的路线",
        dealOfTheDay: {
            badge: "限时秒杀",
            title: "半价抢购！巴厘岛至尊7晚水上别墅",
            desc: "仅剩少量名额！抢订巴厘岛顶级水屋，赠送一次浪漫烛光晚餐及双人SPA，尽显尊荣。",
            button: "立即抢购",
            savings: "为您节省"
        },
        stats: {
            travelers: "位尊贵客人",
            guides: "名金牌导游",
            destinations: "个精选国家",
            support: "小时私人管家"
        }
    }
}

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Translations[Locale];
    formatPrice: (amount: number) => string;
    formatDateRange: (start: Date, end: Date) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('tr-TR');

    useEffect(() => {
        const saved = localStorage.getItem('melih_tours_locale') as Locale;
        if (saved && ['tr-TR', 'en-US', 'de-DE', 'zh-CN'].includes(saved)) {
            setLocale(saved);
        }
    }, []);

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('melih_tours_locale', newLocale);
    };

    const { formatPrice } = useCurrency();

    const formatDateRange = (start: Date, end: Date) => {
        const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        if (locale === 'en-US') {
            return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
        }
        if (locale === 'de-DE') {
            return `${start.toLocaleDateString('de-DE', opts)} bis ${end.toLocaleDateString('de-DE', { ...opts, year: 'numeric' })}`;
        }
        if (locale === 'zh-CN') {
            return `${start.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 至 ${end.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        }
        return `${start.toLocaleDateString('tr-TR', opts)} - ${end.toLocaleDateString('tr-TR', { ...opts, year: 'numeric' })}`;
    }

    return (
        <LocaleContext.Provider value={{
            locale,
            setLocale: handleSetLocale,
            t: TRANSLATIONS[locale],
            formatPrice,
            formatDateRange
        }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = () => {
    const context = useContext(LocaleContext);
    if (!context) throw new Error("useLocale must be used within LocaleProvider");
    return context;
};
