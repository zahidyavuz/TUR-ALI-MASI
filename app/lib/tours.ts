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
                tours: TOUR_DATA.map(t => ({
                    ...t,
                    fomoCount: Math.floor(Math.random() * 50) + 10,
                    reviews: t.reviews_count.toString(),
                    originalPrice: t.original_price.toString(),
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
        console.error("Fetch tours error:", error);
        return { tours: [], count: 0, next: null, previous: null };
    }
}

export async function fetchTour(slug: string) {
    try {
        const t = await fetchAPI(`/tours/${slug}/`, {
            next: { revalidate: 60 }
        });
        if (!t || Object.keys(t).length === 0 || t.detail === "Bulunamadı." || t.detail === "Not found.") {
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
        console.error("Fetch singular tour error:", error);
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
        fomo_count: 34
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
        fomo_count: 18
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
        fomo_count: 22
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
        fomo_count: 45
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
        id: 'luks-balon-kahvalti',
        title: 'VIP Balon Kahvaltı',
        location: 'Kapadokya (Özel Uçuş)',
        price: 12000,
        original_price: 13500,
        discount: 11,
        duration: '1.5 Saat Uçuş',
        guide: 'Kıdemli Pilot',
        description: 'Hayallerinizin ötesinde bir deneyim. Kişiye özel lüks sepette, bulutların üzerinde şampanyalı kahvaltı keyfi.',
        category: '⭐ VIP & Exclusive',
        image_main: 'https://images.unsplash.com/photo-1502485019198-a625bd53ceb7?w=800',
        included: ['VIP Transfer', 'Lüks Uçuş Sepeti', 'Sıcak/Soğuk Kahvaltı', 'Şampanya Şöleni', 'Premium Sertifika'],
        excluded: ['Drone Çekimi'],
        rating: 5.0,
        reviews_count: 85,
        fomo_count: 5
    },
    {
        id: 'zen-kapadokya-yoga',
        title: 'Vadide Yoga',
        location: 'Aşk Vadisi, Kapadokya',
        price: 600,
        original_price: 750,
        discount: 20,
        duration: '2.5 Saat',
        guide: 'Yoga & Meditasyon Eğitmeni',
        description: 'Peri bacalarının mistik enerjisiyle ruhunuzu dinlendirin. Gün doğumunda vadide yoga ve meditasyon seansı.',
        category: '🧘 Wellness & Ruhsal Arınma',
        image_main: 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800', // Need another image? Let's use it for now
        included: ['Transfer', '1 Saat Yoga', 'Ses Terapisi', 'Organik Kahvaltı Tabağı'],
        excluded: ['Ekipman (Mat getirilmelidir)'],
        rating: 4.9,
        reviews_count: 410,
        fomo_count: 16
    }
];
