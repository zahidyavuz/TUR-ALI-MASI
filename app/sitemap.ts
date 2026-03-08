import { MetadataRoute } from 'next';
import { TOUR_DATA } from './lib/tours';
import { BLOG_POSTS } from './lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://melihtours.com';

    // Statik Sayfalar
    const routes = [
        { url: '', priority: 1, changeFreq: 'daily' },
        { url: '/blog', priority: 0.9, changeFreq: 'daily' },
        { url: '/agency/login', priority: 0.8, changeFreq: 'monthly' }
    ].map((route) => ({
        url: `${baseUrl}${route.url}`,
        lastModified: new Date().toISOString().split('T')[0],
        changeFrequency: route.changeFreq as any,
        priority: route.priority,
    }));

    // Dinamik Tur Sayfaları
    const tourRoutes = Object.keys(TOUR_DATA).map((slug) => ({
        url: `${baseUrl}/tour/${slug}`,
        lastModified: new Date().toISOString().split('T')[0],
        changeFrequency: 'weekly' as any,
        priority: 0.9,
    }));

    // Dinamik Blog Sayfaları
    const blogRoutes = BLOG_POSTS.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt).toISOString().split('T')[0],
        changeFrequency: 'monthly' as any,
        priority: 0.7,
    }));

    return [...routes, ...tourRoutes, ...blogRoutes];
}
