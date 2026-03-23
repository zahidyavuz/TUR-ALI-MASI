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
    relatedTourSlug?: string;
}

const mapDjangoBlog = (b: any): BlogPost => ({
    id: b.slug, // ID or Slug is fine
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt || '',
    content: b.content || '',
    coverImage: b.cover_image || 'https://images.unsplash.com/photo-1596395819057-afbf19aff3fb',
    publishedAt: b.published_at || new Date().toISOString(),
    readingTime: b.reading_time || '3 dk',
    author: {
        name: b.author_display?.name || 'Anonim Yazar',
        role: b.author_display?.role || 'Acenta Yöneticisi',
        avatar: b.author_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
    },
    category: b.category || 'Genel',
    relatedTourSlug: b.related_tour_slug || undefined
});

export async function fetchBlogs(): Promise<BlogPost[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/blogs/`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        const results = data.results || data;
        return results.map(mapDjangoBlog);
    } catch {
        return [];
    }
}

export async function fetchBlog(slug: string): Promise<BlogPost | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/blogs/${slug}/`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return mapDjangoBlog(data);
    } catch {
        return null;
    }
}
