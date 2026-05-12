import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { fetchBlog } from '@/app/lib/blog';
import { fetchTours } from '@/app/lib/tours';
import Navbar from '../../components/Navbar';
import { Metadata } from 'next';

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    // Next.js params is potentially generic, so we force it to string
    const slug = (await params).slug;
    const post = await fetchBlog(slug);

    if (!post) {
        return {
            title: 'Yazı Bulunamadı | Tourkia Blog',
            description: 'Aradığınız blog yazısı bulunamadı.',
        };
    }

    return {
        title: `${post.title} | Tourkia Rehberi`,
        description: post.excerpt,
        openGraph: {
            images: [post.coverImage],
            title: post.title,
            description: post.excerpt,
            type: 'article',
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const slug = (await params).slug;
    const post = await fetchBlog(slug);

    if (!post) {
        return notFound();
    }

    const tourData: any = await fetchTours();
    const tourList = tourData.tours || [];
    const relatedTour = post.relatedTourSlug ? tourList.find((t: any) => String(t.slug) === String(post.relatedTourSlug) || String(t.id) === String(post.relatedTourSlug)) : null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://tourkia.com/blog/${slug}`
        },
        "headline": post.title,
        "description": post.excerpt,
        "image": post.coverImage,
        "author": {
            "@type": "Person",
            "name": post.author.name
        },
        "publisher": {
            "@type": "Organization",
            "name": "Tourkia",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tourkia.com/logo.png"
            }
        },
        "datePublished": post.publishedAt,
        "dateModified": post.publishedAt
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <main className="min-h-screen bg-white font-sans text-slate-800 pb-20">
                {/* Navbar */}
                <Navbar />

                <article className="max-w-4xl mx-auto px-6 sm:px-12 mt-12">
                    {/* Header Info */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <span className="bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-blue-100">{post.category}</span>
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {post.readingTime} Okuma Süresi</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6">{post.title}</h1>
                        <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">{post.excerpt}</p>
                    </div>

                    {/* Author Info Matrix */}
                    <div className="flex items-center justify-center gap-4 py-8 border-y border-gray-100 mb-10 bg-slate-50 rounded-3xl mx-auto max-w-xl">
                        <Image src={post.author.avatar} alt={post.author.name} width={56} height={56} className="rounded-full object-cover shadow-sm bg-white" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Yazarımız</p>
                            <h4 className="text-lg font-black text-slate-800 leading-none">{post.author.name}</h4>
                            <p className="text-xs font-semibold text-blue-500 mt-1">{post.author.role}</p>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="relative w-full h-[300px] md:h-[500px] rounded-[32px] overflow-hidden shadow-2xl mb-12">
                        <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 1000px" />
                    </div>

                    {/* Content Area with Tailwind Typography Plugin */}
                    <div className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-800 prose-a:text-blue-600 prose-img:rounded-[24px] prose-p:leading-relaxed mx-auto">
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>

                    {/* Call to Action (CTA) for Related Tour */}
                    {relatedTour && (
                        <div className="mt-16 bg-gradient-to-br from-indigo-900 via-[#0f172a] to-blue-900 rounded-[32px] p-8 md:p-12 shadow-2xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                            <div className="relative z-10 w-full md:w-2/3 text-center md:text-left">
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block shadow-[0_0_15px_rgba(16,185,129,0.2)]">Hazır Mısın? 🎒</span>
                                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Bu Macerayı Kendin Yaşa!</h3>
                                <p className="text-indigo-200 font-medium text-lg leading-relaxed">{relatedTour.title} paketimizi incele ve hayalindeki tatile ilk adımını at.</p>
                            </div>

                            <div className="relative z-10 w-full md:w-1/3 flex flex-col items-center md:items-end gap-3">
                                <Link href={`/tour/${post.relatedTourSlug}`} className="bg-emerald-500 hover:bg-emerald-400 text-white w-full text-center py-4 px-8 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-300 shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_10px_40px_rgba(16,185,129,0.6)] hover:-translate-y-1">
                                    Hemen İncele 🚀
                                </Link>
                                <span className="text-xs font-semibold text-indigo-300 bg-black/20 px-3 py-1 rounded-full border border-white/5">Sadece ₺{relatedTour.price}'den başlayan fiyatlarla</span>
                            </div>
                        </div>
                    )}
                </article>

                {/* Related/Footer Navigation */}
                <div className="max-w-4xl mx-auto px-6 mt-16 pt-8 border-t border-gray-100 flex items-center justify-center">
                    <Link href="/blog" className="text-blue-600 font-bold hover:text-blue-800 transition flex items-center gap-2">
                        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        Tüm Blog Yazılarına Dön
                    </Link>
                </div>
            </main>
        </>
    );
}
