'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useCurrency } from './CurrencyContext';

export type Locale = 'tr-TR' | 'en-US' | 'de-DE' | 'zh-CN' | 'ar-SA' | 'es-ES' | 'fr-FR';

type Translations = {
    [key in Locale]: {
        nav: {
            destinations: string;
            styles: string;
            memories: string;
            deals: string;
            taste: string;
            contact: string;
            competitorReport: string;
            customerLogin: string;
            agencyLogin: string;
        };
        checkout: {
            paymentDisclaimer: string;
        };
        tastePage: {
            title: string;
            subtitle: string;
            filters: {
                location: string;
                cuisine: string;
                price: string;
            };
            actions: {
                buyMenu: string;
                reserve: string;
            };
            stats: {
                prepaid: string;
                rating: string;
            }
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
        nationalShowcase: {
            badge: string;
            title: string;
            subtitle: string;
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
            taste: "Lezzet Durakları",
            contact: "Temas",
            competitorReport: "Rakip Analizi",
            customerLogin: "Müşteri Girişi",
            agencyLogin: "Acenta Girişi",
        },
        checkout: {
            paymentDisclaimer: "'Ön Ödemeli Menü' tutarı Tourkia güvencesiyle şu an tahsil edilmektedir. Restoranda vereceğiniz tüm 'Ekstra Siparişler' ise doğrudan işletmeye ödenecektir."
        },
        tastePage: {
            title: "Gastronomi Haritası & Lezzet Durakları",
            subtitle: "Kapadokya ve ötesindeki en seçkin restoranlarda yerinizi ayırtın, özel menülerle tasarruf edin.",
            filters: {
                location: "Bölge Seçin",
                cuisine: "Mutfak Tipi",
                price: "Fiyat Seviyesi"
            },
            actions: {
                buyMenu: "Ön Ödemeli Özel Menü Satın Al",
                reserve: "Ücretsiz Rezervasyon Yap"
            },
            stats: {
                prepaid: "Ön ödemeli menü ile %30 tasarruf",
                rating: "Misafir Memnuniyeti"
            }
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
        popularDestinations: "Türkiye'deki Popüler Turlar",
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
        },
        nationalShowcase: {
            badge: "Ulusal Vitrin",
            title: "Türkiye'nin En Seçkin Deneyimleri",
            subtitle: "Kapadokya'dan İstanbul'a, Antalya'dan Ege'ye uzanan en prestijli tur ve aktiviteler."
        }
    },
    'en-US': {
        nav: {
            destinations: "Destinations",
            styles: "Vibes",
            memories: "Epic Moments",
            deals: "Hot Deals",
            taste: "Taste Hub",
            contact: "Hit Us Up",
            competitorReport: "Market Edge",
            customerLogin: "Traveler Login",
            agencyLogin: "Partner Portal",
        },
        checkout: {
            paymentDisclaimer: "The 'Prepaid Menu' amount is collected now via Tourkia. Any 'Extra Orders' at the restaurant will be paid directly to the establishment."
        },
        tastePage: {
            title: "Gourmet Route & Foodie Hotspots",
            subtitle: "Secure your table at top-rated restaurants and unlock exclusive prepaid menu deals.",
            filters: {
                location: "Pick a Spot",
                cuisine: "Cuisine Type",
                price: "Price Range"
            },
            actions: {
                buyMenu: "Buy Pre-paid Special Menu",
                reserve: "Make a Free Reservation"
            },
            stats: {
                prepaid: "Save up to 30% with prepaid menus",
                rating: "Guest Satisfaction"
            }
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
        },
        nationalShowcase: {
            badge: "National Showcase",
            title: "Turkey's Most Exclusive Experiences",
            subtitle: "From Cappadocia to Istanbul, the most prestigious tours and activities curated for you."
        }
    },
    'de-DE': {
        nav: {
            destinations: "Reiseziele",
            styles: "Reisestile",
            memories: "Erfahrungen",
            deals: "Angebote",
            taste: "Kulinarik",
            contact: "Kontakt",
            competitorReport: "Marktanalyse",
            customerLogin: "Kunden-Login",
            agencyLogin: "Agentur-Login",
        },
        checkout: {
            paymentDisclaimer: "Der Betrag für das 'Prepaid-Menü' wird jetzt über Tourkia eingezogen. Alle 'Extra-Bestellungen' im Restaurant werden direkt vor Ort bezahlt."
        },
        tastePage: {
            title: "Kulinarische Highlights & Restaurants",
            subtitle: "Reservieren Sie Ihren Tisch in erstklassigen Restaurants und sparen Sie mit exklusiven Menüs.",
            filters: {
                location: "Ort wählen",
                cuisine: "Küche",
                price: "Preisklasse"
            },
            actions: {
                buyMenu: "Prepaid-Spezialmenü kaufen",
                reserve: "Kostenlos reservieren"
            },
            stats: {
                prepaid: "Bis zu 30% sparen mit Prepaid-Menüs",
                rating: "Gästezufriedenheit"
            }
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
        },
        nationalShowcase: {
            badge: "Nationales Schaufenster",
            title: "Türkei's Exklusivste Erlebnisse",
            subtitle: "Von Kappadokien bis Istanbul, die prestigeträchtigsten Touren und Aktivitäten für Sie kuratiert."
        }
    },
    'zh-CN': {
        nav: {
            destinations: "热门目的地",
            styles: "豪华体验",
            memories: "尊享时刻",
            deals: "特惠优选",
            taste: "美食之都",
            contact: "联系我们",
            competitorReport: "市场优势",
            customerLogin: "贵宾登录",
            agencyLogin: "合作伙伴",
        },
        checkout: {
            paymentDisclaimer: "“预付费套餐”金额现通过 Tourkia 收取。餐厅内的所有“额外订单”将直接支付给店方。"
        },
        tastePage: {
            title: "美食路线与味蕾盛宴",
            subtitle: "在顶级餐厅预订位置，尊享独家预付费套餐优惠。",
            filters: {
                location: "选择地点",
                cuisine: "菜系类型",
                price: "价格范围"
            },
            actions: {
                buyMenu: "购买预付费尊享套餐",
                reserve: "免费预约位置"
            },
            stats: {
                prepaid: "预付套餐最高可省30%",
                rating: "贵宾评分"
            }
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
        },
        nationalShowcase: {
            badge: "国家展厅",
            title: "土耳其最独特的体验",
            subtitle: "从卡帕多奇亚到伊斯坦布尔，为您精心策划的最负盛名的旅游和活动。"
        }
    },
    'ar-SA': {
        nav: {
            destinations: "الوجهات",
            styles: "أنماط المغامرة",
            memories: "ذكريات",
            deals: "عروض",
            taste: "نكهات",
            contact: "اتصل بنا",
            competitorReport: "تحليل السوق",
            customerLogin: "تسجيل دخول العميل",
            agencyLogin: "بوابة الوكلاء",
        },
        checkout: {
            paymentDisclaimer: "يتم تحصيل مبلغ 'قائمة الطعام مسبقة الدفع' الآن عبر Tourkia. سيتم دفع أي 'طلبات إضافية' في المطعم مباشرة للمنشأة."
        },
        tastePage: {
            title: "خارطة النكهات وأفضل المطاعم",
            subtitle: "احجز طاولتك في أرقى المطاعم ووفر مع قوائم الطعام مسبقة الدفع.",
            filters: {
                location: "اختر الموقع",
                cuisine: "نوع المطبخ",
                price: "مستوى السعر"
            },
            actions: {
                buyMenu: "شراء قائمة خاصة مسبقة الدفع",
                reserve: "حجز طاولة مجاناً"
            },
            stats: {
                prepaid: "وفر حتى 30% مع القوائم مسبقة الدفع",
                rating: "رضا الضيوف"
            }
        },
        hero: {
            title: "اكتشف العالم بأرقى الطرق",
            subtitle: "هل أنت مستعد لجمع ذكريات لا تُنسى؟ اكتشف عطلة أحلامك مع مرشدين متخصصين وإقامة ممتازة.",
            searchLocationLabel: "الوجهة",
            searchLocationPlaceholder: "إلى أين تريد الذهاب؟",
            searchDateLabel: "التاريخ",
            searchPriceLabel: "الميزانية",
            searchGuestsLabel: "عدد الأشخاص",
            searchButton: "ابحث عن جولات"
        },
        trustTexts: [
            "⭐ أكثر من 10 سنوات من الخبرة السياحية",
            "🌍 500+ مسار مختلف، آلاف الذكريات",
            "🛡️ رضا العملاء بنسبة 100% معتمدة",
            "💸 ضمان أفضل الأسعار"
        ],
        categories: ['مستكشف ثقافي', 'شهر العسل', 'زيارة العمرة', 'تزلج وثلوج', 'عطلة بحرية', 'جولات جماعية', 'حياة برية'],
        whyUs: {
            title: "لماذا تختارنا؟",
            items: [
                { title: "آمن ومعتمد", desc: "يتم فحص جميع المشغلين والجولات بعناية." },
                { title: "دفع مرن", desc: "احجز الآن مع مرونة في الدفع والإلغاء حتى 100%." },
                { title: "ضمان السعر", desc: "لن تدفع رسوماً مخفية أبداً، תקבל ضمان أفضل الأسعار." },
                { title: "دعم 24/7", desc: "فريقنا ذو الخبرة على بعد مكالمة هاتفية أينما كنت." }
            ]
        },
        popularDestinations: "الوجهات الأكثر شعبية",
        adventureStylesTitle: "اختر أسلوب رحلتك",
        bestSellersTitle: "الجولات الأكثر مبيعاً",
        dealOfTheDay: {
            badge: "عرض اليوم فقط",
            title: "عطلة فاخرة في بالي بنصف السعر",
            desc: "أماكن محدودة! احجز إقامتك الفاخرة لمدة 7 ليالٍ بخصم 50%.",
            button: "احجز الآن",
            savings: "توفير"
        },
        stats: {
            travelers: "مسافر سعيد",
            guides: "مرشد خبير",
            destinations: "دولة مختلفة",
            support: "دعم العملاء"
        },
        nationalShowcase: {
            badge: "المعرض الوطني",
            title: "تجارب تركيا الأكثر تميزاً",
            subtitle: "من كابادوكيا إلى إسطنبول، أرقى الجولات والأنشطة المختارة لك."
        }
    },
    'es-ES': {
        nav: {
            destinations: "Destinos",
            styles: "Estilos",
            memories: "Memorias",
            deals: "Ofertas",
            taste: "Sabor",
            contact: "Contacto",
            competitorReport: "Análisis de Mercado",
            customerLogin: "Acceso Clientes",
            agencyLogin: "Portal de Agencias",
        },
        checkout: {
            paymentDisclaimer: "El monto del 'Menú Prepagado' se cobra ahora a través de Tourkia. Cualquier 'Pedido Extra' en el restaurante se pagará directamente al establecimiento."
        },
        tastePage: {
            title: "Ruta Gastronómica & Puntos de Sabor",
            subtitle: "Reserva tu mesa en los mejores restaurantes y ahorra con menús exclusivos prepagados.",
            filters: {
                location: "Elegir lugar",
                cuisine: "Tipo de cocina",
                price: "Rango de precio"
            },
            actions: {
                buyMenu: "Comprar menú especial prepagado",
                reserve: "Hacer reserva gratuita"
            },
            stats: {
                prepaid: "Ahorra hasta un 30% con menús prepagados",
                rating: "Satisfacción del cliente"
            }
        },
        hero: {
            title: "La Forma Más Exclusiva de Descubrir el Mundo",
            subtitle: "¿Listo para crear recuerdos inolvidables? Descubre tus vacaciones soñadas con guías privados y alojamientos premium.",
            searchLocationLabel: "Destino",
            searchLocationPlaceholder: "¿A dónde quieres ir?",
            searchDateLabel: "Fecha",
            searchPriceLabel: "Presupuesto",
            searchGuestsLabel: "Huéspedes",
            searchButton: "Buscar Tours"
        },
        trustTexts: [
            "⭐ Más de 10 Años de Experiencia en Turismo",
            "🌍 Más de 500 Rutas, Miles de Recuerdos",
            "🛡️ 100% Satisfacción del Cliente",
            "💸 Mejor Precio Garantizado"
        ],
        categories: ['Cultura', 'Luna de Miel', 'Religioso', 'Nieve y Esquí', 'Playa', 'Tours Grupales', 'Vida Salvaje'],
        whyUs: {
            title: "¿Por Qué Elegirnos?",
            items: [
                { title: "Seguro y Verificado", desc: "Todos los operadores son examinados por nuestro equipo de expertos." },
                { title: "Pago Flexible", desc: "Reserva ahora, disfruta de flexibilidad total en cancelaciones." },
                { title: "Garantía de Precio", desc: "Sin cargos ocultos, obteniendo siempre el mejor precio." },
                { title: "Soporte 24/7", desc: "Guía disponible todo el día estés donde estés." }
            ]
        },
        popularDestinations: "Explora Destinos",
        adventureStylesTitle: "Elige Tu Estilo de Aventura",
        bestSellersTitle: "Los Tours Más Vendidos",
        dealOfTheDay: {
            badge: "Solo Por Hoy",
            title: "Vacaciones de Ensueño en Bali a Mitad de Precio",
            desc: "Cupos limitados. Consigue tu paquete premium de 7 noches con un 50% de descuento.",
            button: "Reservar Ahora",
            savings: "AHORRAS"
        },
        stats: {
            travelers: "Viajeros Felices",
            guides: "Guías Expertos",
            destinations: "Países",
            support: "Atención al Cliente"
        },
        nationalShowcase: {
            badge: "Escaparate Nacional",
            title: "Las Experiencias Más Exclusivas de Turquía",
            subtitle: "Desde Capadocia hasta Estambul, los tours y actividades más prestigiosos seleccionados para ti."
        }
    },
    'fr-FR': {
        nav: {
            destinations: "Destinations",
            styles: "Styles",
            memories: "Souvenirs",
            deals: "Bons Plans",
            taste: "Saveurs",
            contact: "Contact",
            competitorReport: "Rapport de Marché",
            customerLogin: "Connexion Client",
            agencyLogin: "Portail Agence",
        },
        checkout: {
            paymentDisclaimer: "Le montant du 'Menu Prépayé' est perçu maintenant via Tourkia. Toute 'Commande Supplémentaire' au restaurant sera payée directement à l'établissement."
        },
        tastePage: {
            title: "Route Gastronomique & Saveurs",
            subtitle: "Réservez votre table dans les meilleurs restaurants et profitez de menus prépayés exclusifs.",
            filters: {
                location: "Choisir un lieu",
                cuisine: "Cuisine",
                price: "Gamme de prix"
            },
            actions: {
                buyMenu: "Acheter un menu spécial prépayé",
                reserve: "Faire une réservation gratuite"
            },
            stats: {
                prepaid: "Économisez jusqu'à 30% avec les menus prépayés",
                rating: "Satisfaction client"
            }
        },
        hero: {
            title: "La Façon La Plus Exclusive de Découvrir le Monde",
            subtitle: "Prêt à créer des souvenirs inoubliables ? Découvrez les vacances de vos rêves avec des guides privés et un hébergement premium.",
            searchLocationLabel: "Destination",
            searchLocationPlaceholder: "Où voulez-vous aller ?",
            searchDateLabel: "Date",
            searchPriceLabel: "Budget",
            searchGuestsLabel: "Voyageurs",
            searchButton: "Trouver des circuits"
        },
        trustTexts: [
            "⭐ Plus de 10 ans d'expérience dans le tourisme",
            "🌍 Plus de 500 itinéraires, des milliers de souvenirs",
            "🛡️ 100% de satisfaction client garantie",
            "💸 Meilleur prix garanti"
        ],
        categories: ['Culture', 'Lune de Miel', 'Religieux', 'Neige & Ski', 'Plage', 'Tours en Groupe', 'Faune'],
        whyUs: {
            title: "Pourquoi Nous Choisir ?",
            items: [
                { title: "Sûr et Vérifié", desc: "Tous nos opérateurs sont examinés par notre équipe d'experts." },
                { title: "Paiement Flexible", desc: "Réservez maintenant avec flexibilité sur les annulations." },
                { title: "Prix Garanti", desc: "Aucun frais caché, vous obtenez toujours le meilleur prix." },
                { title: "Assistance 24/7", desc: "Notre équipe expérimentée est toujours à un appel." }
            ]
        },
        popularDestinations: "Destinations Populaires",
        adventureStylesTitle: "Choisissez Votre Style d'Aventure",
        bestSellersTitle: "Nos Meilleures Ventes",
        dealOfTheDay: {
            badge: "Seulement Aujourd'hui",
            title: "Des vacances de rêve à Bali à moitié prix",
            desc: "Places limitées. Obtenez un forfait premium de 7 nuits avec une réduction de 50%.",
            button: "Réservez Maintenant",
            savings: "VOUS ÉCONOMISEZ"
        },
        stats: {
            travelers: "Voyageurs Heureux",
            guides: "Guides Experts",
            destinations: "Pays Différents",
            support: "Service Client"
        },
        nationalShowcase: {
            badge: "Vitrine Nationale",
            title: "Les Expériences les Plus Exclusives de Turquie",
            subtitle: "De la Cappadoce à Istanbul, les visites et activités les plus prestigieuses sélectionnées pour vous."
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
        const saved = localStorage.getItem('tourkia_locale') as Locale;
        if (saved && ['tr-TR', 'en-US', 'de-DE', 'zh-CN', 'ar-SA', 'es-ES', 'fr-FR'].includes(saved)) {
            setLocale(saved);
        }
    }, []);

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('tourkia_locale', newLocale);
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
