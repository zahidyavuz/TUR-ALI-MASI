import { MetadataRoute } from 'next';
import { fetchTours } from './lib/tours';
import { fetchBlogs } from './lib/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://tourkia.com';
    const tourData: any = await fetchTours();
    const blogData = await fetchBlogs();

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
    const tourRoutes = (tourData.tours || []).map((tour: any) => ({
        url: `${baseUrl}/tour/${tour.slug || tour.id}`,
        lastModified: new Date().toISOString().split('T')[0],
        changeFrequency: 'weekly' as any,
        priority: 0.9,
    }));

    // Dinamik Blog Sayfaları
    const blogRoutes = blogData.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt).toISOString().split('T')[0],
        changeFrequency: 'monthly' as any,
        priority: 0.7,
    }));

    return [...routes, ...tourRoutes, ...blogRoutes];
}
