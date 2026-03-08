export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    publishedAt: string;
    readingTime: string;
    author: {
        name: string;
        role: string;
        avatar: string;
    };
    category: string;
    relatedTourSlug?: string; // Tura yönlendirme (CTA) için
}

export const BLOG_POSTS: BlogPost[] = [
    {
        id: '1',
        slug: 'kapadokyada-gezilecek-10-buyuleyici-yer',
        title: "Kapadokya'da Mutlaka Görmeniz Gereken 10 Büyüleyici Yer",
        excerpt: "Peri bacaları, yeraltı şehirleri ve muhteşem gün doğumlarıyla Kapadokya'nın en saklı güzelliklerini keşfedin.",
        content: `
Kapadokya, volkanik patlamaların ve rüzgarların binlerce yılda yonttuğu doğal şaheserleriyle kelimenin tam anlamıyla dünya dışı bir manzaraya sahiptir. 

### 1. Göreme Açık Hava Müzesi
Göreme'nin kayalara oyulmuş kiliselerini ve içlerindeki bin yıllık freskleri mutlaka görmelisiniz. Hristiyanlığın en köklü izlerini barındırır.

### 2. Uçhisar Kalesi
Kapadokya sınırlarında ulaşabileceğiniz en yüksek noktadır. Güneşin batışını Uçhisar'dan izlemek, hayatta yapabileceğiniz en romantik şeylerden biridir.

### 3. Ihlara Vadisi
Doğa yürüyüşü severler için Ihlara kanyonunun içinden geçen serin Melendiz nehri kenarında bir öğleden sonrası unutulmaz olacaktır.

### 4. Yeraltı Şehirleri (Derinkuyu ve Kaymaklı)
Binlerce yıl önce insanların düşman baskınlarından korunmak için inşa ettikleri muazzam yer altı metropollerini gezerken dar tünellerden geçerken büyüleneceksiniz.

Bu mistik deneyimi gerçeğe dönüştürmek ve vadilerin üzerinde sıcak hava balonu ile süzülmek ister misiniz? **[Hemen İncele](/tour/kapadokya)** butonuna basın.
        `,
        coverImage: 'https://images.unsplash.com/photo-1596395819057-afbf19aff3fb',
        publishedAt: '2026-03-05',
        readingTime: '4 dk',
        author: {
            name: 'Melih Yılmaz',
            role: 'Kurucu Yönetici & Gezgin',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
        },
        category: 'Rehberler',
        relatedTourSlug: 'kapadokya'
    },
    {
        id: '2',
        slug: 'italya-sokak-lezzetleri',
        title: "İtalya Sokak Lezzetleri Rehberi: Pizzadan Fazlası",
        excerpt: "Roma'dan Napoli'ye, sokak aralarında saklanmış gerçek İtalyan lezzetlerinin peşine düşüyoruz.",
        content: `
İtalya denince akla hemen pizzası ve makarnası geliyor ancak işin içine girdiğinizde uçsuz bucaksız bir sokak lezzeti cennetiyle karşılaşıyorsunuz.

### 1. Arancini (Sicilya)
Dışı çıtır çıtır, içi ise erimiş peynir ve ragù sosu ile doldurulmuş kızarmış pirinç toplarıdır. Hem doyurucu hem çok lezzetlidir.

### 2. Porchetta (Roma)
Yavaş yavaş kızartılmış bütün bir domuzdan veya tavuk/hindi varyantlarından hazırlanan baharatlı ve inanılmaz aromatik sokak sandviçleri Roma şaraplarıyla mükemmel gider.

### 3. Gelato (Tüm İtalya)
Orijinal bir İtalyan dondurmasını tatmadan İtalya'dan döndüm demeyin. Yoğun kıvamı ve gerçek meyve hissiyatı bambaşkadır.

*Eğer bu lezzetleri bizzat ana vatanında, yerel İtalyan şeflerle birlikte deneyimlemek isterseniz Napoli ve Roma turlarımıza göz atın!*
        `,
        coverImage: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?fit=crop&w=1200&q=80',
        publishedAt: '2026-03-02',
        readingTime: '3 dk',
        author: {
            name: 'Aylin Şahin',
            role: 'Gastronomi Yazarı',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80'
        },
        category: 'Gurme',
        relatedTourSlug: 'napoli-pizza-atolyesi'
    }
];
