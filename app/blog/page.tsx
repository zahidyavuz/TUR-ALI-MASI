import Link from 'next/link';
import Image from 'next/image';
import { fetchBlogs } from '../lib/blog';

export const metadata = {
    title: 'Seyahat Blogu & Rehberler | Tourkia',
    description: "Dünyanın dört bir yanından ipuçları, rehberler ve Tourkia uzman kadrosundan eşsiz seyahat anıları.",
};

export default async function BlogIndex() {
    const BLOG_POSTS = await fetchBlogs();
    return (
        <main className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Blog Hero */}
            <div className="bg-[#0f172a] text-white py-20 px-6 sm:px-12 relative overflow-hidden">
                <div className="absolute top-[-100px] right-[-50px] w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <Link href="/" className="text-4xl font-extrabold text-white tracking-tighter mb-8 inline-block">
                        Tourkia<span className="text-blue-400">™</span>
                        <span className="ml-2 text-sm font-medium text-slate-400">| Blog</span>
                    </Link>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight drop-shadow-md">Gezginin<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">El Kitabı</span></h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">Uzman rehberlerimizden gizli rotalar, tatil tüyoları ve tura çıkmadan önce mutlaka bilmeniz gereken sırlar dünyasına hoş geldiniz.</p>
                </div>
            </div>

            {/* Blog Listesi Grid */}
            <div className="max-w-7xl mx-auto px-6 sm:px-12 mt-[-40px] relative z-20">
                {BLOG_POSTS.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-16 shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="text-6xl mb-6 opacity-80">✍️</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">Henüz yazı yok</h2>
                        <p className="text-lg text-slate-500 max-w-md mx-auto">Uzman rehberlerimiz şu anda dünyanın en gizli köşelerini keşfedip sizin için notlar alıyor. Çok yakında burası muhteşem hikayelerle dolacak!</p>
                        <Link href="/" className="mt-8 bg-[#008cb3] hover:bg-[#007a9c] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-transform active:scale-95 shadow-lg shadow-cyan-500/20">
                            Turlara Geri Dön
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {BLOG_POSTS.map((post) => (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col">
                                <div className="relative h-64 overflow-hidden">
                                    <Image
                                        src={post.coverImage}
                                        alt={post.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                    />
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#008cb3] shadow-md">
                                        {post.category}
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col flex-1">
                                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 mb-4">
                                        <span className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{post.readingTime} Okuma</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span>{new Date(post.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 mb-3 leading-snug group-hover:text-blue-600 transition-colors">{post.title}</h2>
                                    <p className="text-slate-500 font-medium text-sm line-clamp-3 mb-6">{post.excerpt}</p>
                                    <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-3">
                                        <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="rounded-full object-cover shadow-sm bg-slate-100" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">{post.author.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{post.author.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
