const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Yayındaki tüm tur slug'larını API'den çekip sitemap'e ekler (F4-02).
 * Dinamik `/tour/[slug]` rotaları statik olmadığından next-sitemap onları
 * kendiliğinden bulamaz; katalog uçundan sayfalayarak toplarız. Backend
 * kapalıysa (ör. ağ hatası) sitemap üretimi kırılmasın diye sessizce boş döner.
 */
async function fetchTourPaths(config) {
    const paths = [];
    try {
        let url = `${API_URL}/tours/`;
        while (url) {
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            const results = data.results || data;
            for (const tour of results) {
                if (tour.id) {
                    paths.push({
                        loc: `/tour/${tour.id}`,
                        changefreq: 'daily',
                        priority: 0.8,
                        lastmod: new Date().toISOString(),
                    });
                }
            }
            url = data.next || null;
        }
    } catch (err) {
        console.warn('[next-sitemap] tur slug\'ları çekilemedi, atlanıyor:', err.message);
    }
    return paths;
}

module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://tourkia.com',
    generateRobotsTxt: true,
    exclude: ['/agency/dashboard*', '/api/*', '/checkout*', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
    additionalPaths: fetchTourPaths,
    robotsTxtOptions: {
        policies: [
            { userAgent: '*', allow: '/' },
            { userAgent: '*', disallow: ['/api/', '/agency/', '/checkout', '/login', '/register'] },
        ],
        additionalSitemaps: [],
    },
}
