import { fetchAPI } from './api';

export async function fetchTours(params: Record<string, string> = {}) {
    try {
        // Construct query string for filters/pagination
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/tours/?${queryString}` : '/tours/';

        const response = await fetchAPI(endpoint, {
            next: { revalidate: 60 } // Cache for 60 seconds (Next.js App Router syntax)
        });

        // Backend down / network error
        if (!response) {
            return {
                tours: TOUR_DATA
                    .filter(t => {
                        if (params.is_popular === 'true' && !t.is_popular) return false;
                        if (params.location && !t.location.toLowerCase().includes(params.location.toLowerCase())) return false;
                        return true;
                    })
                    .map(t => ({
                        ...t,
                        fomoCount: Math.floor(Math.random() * 50) + 10,
                        reviews: t.reviews_count.toString(),
                        originalPrice: t.original_price?.toString() || "",
                        imageMain: t.image_main,
                        imageSub1: t.image_main,
                        imageSub2: t.image_main,
                        included: t.included,
                        excluded: t.excluded,
                        translations: {}
                    })),
                count: TOUR_DATA.length,
                next: null,
                previous: null
            };
        }

        // Django Paginated Response returns results in Response.results 
        const tours = response.results ? response.results : response;

        // Formatted array for frontend consumption
        const formattedTours = tours.map((t: any) => ({
            ...t,
            // Ensure properties match the expected frontend structure
            fomoCount: t.fomo_count || Math.floor(Math.random() * 50) + 10,
            reviews: t.reviews_count?.toString() || "0",
            originalPrice: t.original_price?.toString() || "",
            price: parseFloat(t.price),
            imageMain: t.image_main,
            imageSub1: t.image_sub1 || t.image_main,
            imageSub2: t.image_sub2 || t.image_main,
            included: t.included || [],
            excluded: t.excluded || [],
            translations: {}
        }));

        // Return array and pagination metadata
        return {
            tours: formattedTours,
            count: response.count || formattedTours.length,
            next: response.next,
            previous: response.previous
        };

    } catch (error) {
        return { tours: [], count: 0, next: null, previous: null };
    }
}

export async function fetchTour(slug: string) {
    try {
        const t = await fetchAPI(`/tours/${slug}/`, {
            next: { revalidate: 60 }
        });
        if (!t || Object.keys(t).length === 0 || 
            t.detail === "Bulunamadı." || 
            t.detail === "Not found." || 
            (t.detail && t.detail.includes("matches the given query"))) {
            throw new Error("API not found, using fallback");
        }
        
        return {
            ...t,
            fomoCount: t.fomo_count || Math.floor(Math.random() * 50) + 10,
            reviews: t.reviews_count?.toString() || "0",
            originalPrice: t.original_price?.toString() || "",
            price: parseFloat(t.price),
            imageMain: t.image_main,
            imageSub1: t.image_sub1 || t.image_main,
            imageSub2: t.image_sub2 || t.image_main,
            included: t.included || [],
            excluded: t.excluded || [],
            linked_restaurant: t.linked_restaurant || null,
            translations: {},
            availabilitySlots: t.availability_slots || []
        };
    } catch (error) {
        // FALLBACK TO TOUR_DATA
        const fallbackTour = TOUR_DATA.find(tour => tour.id === slug);
        if (fallbackTour) {
            return {
                ...fallbackTour,
                fomoCount: fallbackTour.fomo_count || Math.floor(Math.random() * 50) + 10,
                reviews: fallbackTour.reviews_count?.toString() || "0",
                originalPrice: fallbackTour.original_price?.toString() || "",
                price: parseFloat(fallbackTour.price.toString()),
                imageMain: fallbackTour.image_main,
                imageSub1: fallbackTour.image_main,
                imageSub2: fallbackTour.image_main,
                included: fallbackTour.included || [],
                excluded: fallbackTour.excluded || [],
                translations: {},
                availabilitySlots: []
            };
        }
        return null;
    }
}

export const TOUR_DATA = [
    {
        id: 'kapadokya-klasik-balon',
        title: 'Standart Balon',
        location: 'Kapadokya, Türkiye',
        price: 3500,
        original_price: 4500,
        discount: 22,
        duration: '3 Saat (1 Saat Uçuş)',
        guide: 'Profesyonel Pilot',
        description: 'Gün doğumunda Kapadokya\'nın büyülü vadileri üzerinde süzülün. Masalsı bir sabahın kapılarını aralayın.',
        category: '✨ En Popüler Deneyim',
        image_main: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG',
        included: ['Otel Transferi', 'Hafif Atıştırmalık', '1 Saat Uçuş', 'Şampanyalı Kutlama', 'Sertifika'],
        excluded: ['Kişisel Harcamalar', 'Fotoğraf ve Video'],
        rating: 4.9,
        reviews_count: 1250,
        fomo_count: 34,
        is_popular: true
    },
    {
        id: 'kirmizi-tur-kuzey',
        title: 'Kırmızı Tur',
        location: 'Göreme, Kapadokya',
        price: 1500,
        original_price: 1800,
        discount: 16,
        duration: '1 Gün',
        guide: 'Milli Rehber',
        description: 'Kapadokya\'nın ikonik peri bacalarını, tarihi kiliselerini ve el sanatlarını keşfedin. Tarihe tanıklık edin.',
        category: '🏺 Kültür & Tarih',
        image_main: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800',
        included: ['Profesyonel Rehber', 'Öğle Yemeği', 'Müze Giriş Biletleri', 'Transfer'],
        excluded: ['Ekstra İçecekler', 'Kişisel Harcamalar'],
        rating: 4.8,
        reviews_count: 856,
        fomo_count: 18,
        linked_restaurant: {
            id: 'urgup-sofrasi',
            name: 'Ürgüp Sofrası',
            description: 'Bölgenin en köklü Kapadokya mutfağı. Gün turu misafirlerine özel fiyatlar.',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
            menu: [
                { id: 'menu-4', name: 'Kapadokya Öğle Menüsü', description: 'Mercimek çorbası, ana yemek (güveç veya ızgara seçenekli), tatlı ve içecek.', original_price: 420, discounted_price: 295, discount_pct: 30, category: 'main' },
                { id: 'menu-5', name: 'Vegetaryen Set', description: 'Taze gözleme, sebze yemekleri, cacık ve mevsim salatası.', original_price: 320, discounted_price: 220, discount_pct: 31, category: 'main' },
            ]
        }
    },
    {
        id: 'yesil-tur-guney',
        title: 'Yeşil Tur',
        location: 'Ihlara, Kapadokya',
        price: 1650,
        original_price: 2000,
        discount: 17,
        duration: '1 Gün',
        guide: 'Milli Rehber',
        description: 'Derin yeraltı şehirlerinden, Ihlara Vadisi\'nin yeşiline uzanan, doğa ve tarihin iç içe geçtiği bir macera.',
        category: '🥾 Doğa Yürüyüşü & Macera',
        image_main: 'https://images.unsplash.com/photo-1596700859582-77eb57ea6837?w=800',
        included: ['Profesyonel Rehber', 'Vadi Kenarı Öğle Yemeği', 'Müze Biletleri', 'Transfer'],
        excluded: ['İçecekler'],
        rating: 4.9,
        reviews_count: 730,
        fomo_count: 22,
        linked_restaurant: {
            id: 'ihlara-vadi-lokantasi',
            name: 'Ihlara Vadi Lokantası',
            description: 'Serin vadi kenarında, nehrin sesine eşlik eden otantik yöresel lezzetler.',
            image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&q=80',
            menu: [
                { id: 'menu-6', name: 'Vadi Mangal Menüsü', description: 'Açık ateşte pişmiş et, köy ekmeği, cacık ve ayran dahil.', original_price: 500, discounted_price: 350, discount_pct: 30, category: 'main' },
                { id: 'menu-7', name: 'Balık & Doğa Seti', description: 'Taze alabalık, sebze grateni ve meyve tabağı.', original_price: 560, discounted_price: 390, discount_pct: 30, category: 'main' },
            ]
        }
    },
    {
        id: 'gun-batimi-atv',
        title: 'ATV Safari',
        location: 'Kızılçukur Vadisi, Kapadokya',
        price: 800,
        original_price: 1000,
        discount: 20,
        duration: '2 Saat',
        guide: 'Tur Lideri',
        description: 'Adrenalin tutkunları buraya! Vadilerin tozunu attırın ve en güzel gün batımını ATV üzerinde karşılayın.',
        category: '🏍️ Adrenalin & Eğlence',
        image_main: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Atv_tour_in_Cappadocia.jpg',
        included: ['Rehberli Konvoy', 'Kask', 'Bone', 'Toz Maskesi'],
        excluded: ['Otel Transferi'],
        rating: 4.7,
        reviews_count: 900,
        fomo_count: 45,
        is_popular: true
    },
    {
        id: 'at-turu-safarisi',
        title: 'At Turu',
        location: 'Gül Vadisi, Kapadokya',
        price: 900,
        original_price: 1100,
        discount: 18,
        duration: '1-2 Saat',
        guide: 'Binicilik Rehberi',
        description: 'Kapadokya\'nın ruhuna dokunun. Araçların giremediği patikalarda, asil atlarla huzurlu bir gezinti.',
        category: '🐎 Romantik & Doğal',
        image_main: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Horse_riding_in_Cappadocia.jpg',
        included: ['Tecrübeli Rehber', 'Kask', 'Kısa Eğitim'],
        excluded: ['Otel Transferi', 'Bahşişler'],
        rating: 4.8,
        reviews_count: 450,
        fomo_count: 14
    },
    {
        id: 'mistik-turk-gecesi',
        title: 'Türk Gecesi',
        location: 'Mağara Restoran, Kapadokya',
        price: 1200,
        original_price: 1500,
        discount: 20,
        duration: '3 Saat',
        guide: 'Aktivite Görevlisi',
        description: 'Mağara restoranda akşam yemeği eşliğinde, Türk kültürünün renkli danslarını ve büyüleyici Semah gösterisini izleyin.',
        category: '💃 Eğlence & Kültür',
        image_main: 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800',
        included: ['Akşam Yemeği', 'Limitsiz İçecek', 'Masa Servisi', 'Şov Programı', 'Otel Transferi'],
        excluded: ['Ekstra Bahşiş'],
        rating: 4.6,
        reviews_count: 650,
        fomo_count: 28
    },
    {
        id: 'gurme-sarap-tadimi',
        title: 'Şarap Tadımı',
        location: 'Ürgüp Mahzenleri, Kapadokya',
        price: 1800,
        original_price: 2000,
        discount: 10,
        duration: '2-3 Saat',
        guide: 'Uzman Sommelier',
        description: 'Bölgenin binlerce yıllık şarap kültürünü, tarihi mahzenlerde en özel yerel şarapları tadarak keşfedin.',
        category: '🍷 Gastronomi',
        image_main: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
        included: ['Mahzen Ziyareti', '4-5 Çeşit Şarap', 'Peynir ve Atıştırmalık', 'Üretim Sunumu'],
        excluded: ['Şişe Satın Alımları'],
        rating: 4.9,
        reviews_count: 320,
        fomo_count: 11
    },
    {
        id: 'sakli-koyler-soganli',
        title: 'Soğanlı Vadisi',
        location: 'Soğanlı Vadisi, Kayseri/Nevşehir',
        price: 1300,
        original_price: 1500,
        discount: 13,
        duration: '1 Gün',
        guide: 'Yerel Rehber',
        description: 'Kalabalıktan uzaklaşın. Unutulmuş köyleri, eski Rum evlerini ve Kapadokya\'nın otantik yüzünü keşfedin.',
        category: '🏘️ Butik & Keşif',
        image_main: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800',
        included: ['Profesyonel Rehber', 'Öğle Yemeği', 'Müze Girişleri', 'Transfer'],
        excluded: ['Bez Bebek/Hediyelik Alımları'],
        rating: 5.0,
        reviews_count: 150,
        fomo_count: 8
    },
    {
        id: 'istanbul-bogaz-turu',
        title: 'Lüks Yatta Boğaz Turu',
        location: 'Boğaz, İstanbul',
        price: 2500,
        original_price: 3200,
        discount: 21,
        duration: '3 Saat',
        guide: 'Milli Rehber',
        description: 'İstanbul Boğazı\'nın büyüleyici sularında, lüks yatta akşam yemeği eşliğinde eşsiz bir deneyim yaşayın.',
        category: '🌊 Lüks & Boğaz',
        image_main: 'https://images.unsplash.com/photo-1541426062085-74dc3dbfb0d1?w=800',
        included: ['Akşam Yemeği', 'Canlı Müzik', 'Limitsiz İçecek', 'Otel Transferi'],
        excluded: ['Özel Fotoğraf Çekimi'],
        rating: 4.9,
        reviews_count: 512,
        fomo_count: 27
    },
    {
        id: 'wellness-yoga',
        title: 'Vadi Doğumu Yoga',
        location: 'Kapadokya, Türkiye',
        price: 1100,
        original_price: 1400,
        discount: 21,
        duration: '2.5 Saat',
        guide: 'Yoga & Meditasyon Eğitmeni',
        description: 'Peri bacalarının mistik enerjisiyle ruhunuzu dinlendirin. Gün doğumunda vadide yoga ve meditasyon seansı.',
        category: '🧘 Wellness & Ruhsal Arınma',
        image_main: 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800',
        included: ['Transfer', '1 Saat Yoga', 'Ses Terapisi', 'Organik Kahvaltı Tabağı'],
        excluded: ['Ekipman (Mat getirilmelidir)'],
        rating: 4.9,
        reviews_count: 410,
        fomo_count: 16
    },
    {
        id: 'istanbul-tarihi-yarimada',
        title: 'Tarihi Yarımada Yürüyüşü',
        location: 'Sultanahmet, İstanbul',
        price: 1200,
        original_price: 1500,
        discount: 20,
        duration: 'Yarım Gün',
        guide: 'Sanat Tarihçisi Rehber',
        description: 'Ayasofya, Sultanahmet Camii ve Yerebatan Sarnıcı\'nın gizemli tarihini uzman rehberimizle keşfedin.',
        category: '🏛️ Tarih & Kültür',
        image_main: 'https://images.unsplash.com/photo-1545638290-7c26fa323f66?w=800',
        included: ['Profesyonel Rehber', 'Müze Giriş Biletleri', 'Öğle Yemeği'],
        excluded: ['Kişisel Harcamalar'],
        rating: 4.8,
        reviews_count: 890,
        fomo_count: 15
    },
    {
        id: 'antalya-mavi-tur',
        title: 'Kekova Mavi Tur',
        location: 'Kaş, Antalya',
        price: 1800,
        original_price: 2200,
        discount: 18,
        duration: 'Tam Gün',
        guide: 'Kaptan & Rehber',
        description: 'Batık şehir Kekova\'nın turkuaz sularında yüzün, koylarda Akdeniz güneşinin tadını çıkarın.',
        category: '🚤 Deniz & Güneş',
        image_main: 'https://images.unsplash.com/photo-1615714088231-318e805d76ea?w=800',
        included: ['Öğle Yemeği (Açık Büfe)', 'Meyve İkramı', 'Snorkel Ekipmanları'],
        excluded: ['Su Sporları'],
        rating: 5.0,
        reviews_count: 420,
        fomo_count: 32
    },
    {
        id: 'antalya-kanyon-rafting',
        title: 'Köprülü Kanyon Rafting',
        location: 'Köprülü Kanyon, Antalya',
        price: 900,
        original_price: 1200,
        discount: 25,
        duration: 'Yarım Gün',
        guide: 'Lisanslı Eğitmen',
        description: 'Torosların buz gibi sularında adrenalin dolu bir rafting macerasına hazır olun!',
        category: '🏄 Adrenalin',
        image_main: 'https://images.unsplash.com/photo-1548074810-7db0786f1e8a?w=800',
        included: ['Rafting Ekipmanları', 'Eğitim', 'Öğle Yemeği', 'Sigorta'],
        excluded: ['Video Çekimi', 'İçecekler'],
        rating: 4.7,
        reviews_count: 650,
        fomo_count: 40
    },
    {
        id: 'vip-1',
        title: 'VIP Gün Batımı ATV Safari & Vadi Yemeği',
        location: 'Kapadokya, Türkiye',
        price: 5350,
        original_price: 6920,
        discount: 22,
        duration: '5 Saat',
        guide: 'Tur Lideri & Şef',
        description: 'Batan güneşin altında peri bacaları arasında ATV safari ve ardından vadide özel bir akşam yemeği.',
        category: '👑 VIP Combo',
        image_main: 'https://images.unsplash.com/photo-1621259182978-f09e5e2ca845?w=1200&q=80',
        included: ['VIP Transfer', 'ATV Ekipmanları', 'Gurme Vadi Yemeği', 'Özel Rehber'],
        excluded: ['Kişisel Harcamalar'],
        rating: 5.0,
        reviews_count: 120,
        fomo_count: 15,
        is_popular: true
    },
    {
        id: 'vip-2',
        title: 'Özel Rehberli Tarihi Yarımada Turu',
        location: 'İstanbul, Türkiye',
        price: 4230,
        original_price: 5770,
        discount: 26,
        duration: '8 Saat',
        guide: 'Profesyonel Tarihçi',
        description: 'Ayasofya ve Sultanahmet\'in büyüleyici gece atmosferinde, size özel rehber eşliğinde tarih yolculuğu.',
        category: '⭐ Top Rated',
        image_main: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80',
        included: ['VIP Araçla Transfer', 'Hızlı Geçiş Biletleri', 'Özel Rehberlik', 'Gece Turu Ayrıcalığı'],
        excluded: ['Yemek'],
        rating: 5.0,
        reviews_count: 210,
        fomo_count: 24,
        is_popular: true
    },
    {
        id: 'vip-3',
        title: 'VIP Jeep Safari ve Rafting Macerası',
        location: 'Antalya, Türkiye',
        price: 2650,
        original_price: 3460,
        discount: 23,
        duration: 'Full Gün',
        guide: 'Macera Rehberi',
        description: 'Antalya\'nın derin kanyonlarında ciplerle off-road ve serin sularda rafting heyecanı bir arada.',
        category: '⚡ Fast Selling',
        image_main: 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=1200&q=80',
        included: ['Otelden Jeep ile Alınış', 'Profesyonel Rafting Ekipmanları', 'Öğle Yemeği', 'Sigorta'],
        excluded: ['Fotoğraf ve Video Paketi'],
        rating: 4.9,
        reviews_count: 42,
        fomo_count: 18,
        is_popular: true
    }
];
