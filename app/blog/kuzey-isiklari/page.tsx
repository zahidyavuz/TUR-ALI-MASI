'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function BlogKuzeyIsiklari() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header (Tourkia Global Style) */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="text-4xl font-extrabold text-[#005e85] tracking-tighter">
                        tourkia<span className="text-[#008cb3]">™</span><span className="text-[10px] ml-1 px-1.5 py-0.5 bg-[#005e85]/10 rounded-md">BLOG</span>
                    </Link>
                    <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Ana Sayfa'ya Dön ➔</Link>
                </div>
            </header>

            {/* Hero Image Section */}
            <section className="relative w-full h-[60vh] max-h-[600px] bg-slate-900 overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1579033461387-adb47ae2a114?auto=format&fit=crop&q=80"
                    alt="Kuzey Işıkları (Aurora Borealis) Tromso Norveç Manzarası"
                    fill
                    className="object-cover opacity-80"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-16 lg:px-32">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest border border-white/30">#BucketList</span>
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest border border-white/30">#TravelTips</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight max-w-4xl tracking-tight mb-4 drop-shadow-lg">
                        Kuzey Işıklarını Görme Garantisi Veren İpuçları: Tromsø Rehberi 🌌
                    </h1>
                    <div className="flex items-center gap-4 text-slate-300 text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            Tourkia Editör Ekibi
                        </span>
                        <span>•</span>
                        <span>Okuma Süresi: 4 Dk</span>
                    </div>
                </div>
            </section>

            {/* Article Content */}
            <section className="max-w-[800px] mx-auto px-6 py-12 lg:py-20 w-full">
                <div className="prose prose-lg prose-slate max-w-none text-slate-700 leading-relax">
                    <p className="text-xl font-medium text-slate-600 mb-10 leading-relaxed border-l-4 border-indigo-500 pl-6 bg-indigo-50/50 py-4 pr-4 rounded-r-2xl">
                        Eğer TikTok'ta "Sabah 5'te kalkmaya değecek mi?" ya da "Cam iglolarda donar mıyız?" gibi sorular soruyorsanız yalnız değilsiniz. Son günlerin en viral trendi; Aurora Borealis (Kuzey Işıkları) altında uyumak! İşte Bucket List'inize eklemeniz gereken 2026 Tromsø Kuzey Işıkları sırları...
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-6">En Çok Sorulan Soru: Gerçekten Görülebiliyor Mu?</h2>
                    <p className="mb-6">
                        Evet, ancak doğru zaman ve yeri bulursanız! Norveç'in Tromsø şehri "Kuzey Işıklarının Başkenti" olarak bilinir. Ancak, gökyüzünün sadece karanlık değil, aynı zamanda bulutsuz olması çok kritiktir. <b>İpucu:</b> Tur programlarınız sırasında mutlaka Aurora Forecast (Işık Tahmini) uygulamalarını takip eden yerel rehberlerle hareket edin.
                    </p>

                    <div className="my-10 grid gap-6 grid-cols-1 sm:grid-cols-2">
                        <div className="relative h-64 rounded-3xl overflow-hidden shadow-xl">
                            <Image src="https://images.unsplash.com/photo-1520699697851-3dc68aa3a474?auto=format&fit=crop&q=80" alt="Cam İglo" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover hover:scale-105 transition-transform duration-700" />
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white font-bold text-sm">Glass Igloo (Cam İglo) Deneyimi</div>
                        </div>
                        <div className="relative h-64 rounded-3xl overflow-hidden shadow-xl">
                            <Image src="https://images.unsplash.com/photo-1517457210599-2a9ee2d6d8db?auto=format&fit=crop&q=80" alt="Haski Kizak Turu" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover hover:scale-105 transition-transform duration-700" />
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white font-bold text-sm">Haski Köpekleriyle Kızak Safarisi</div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-6">Cam İglolarda Üşümüyor Musunuz? (Soğuk Sorunsalı)</h2>
                    <p className="mb-6">
                        Viral olan o videolardaki cam tavanlı odalar genellikle özel bir ısıtma mimarisine sahip. Dışarısı -20 derece olsa da, siz sıcacık kahvenizi yudumlarken yatağınızın içinden ışıkları izleyebilirsiniz. Camlar "termo-bardak" mantığıyla donmayı engelleyen özel ısıtıcılara sahip olduğu için buzlanma da yapmaz.
                    </p>

                    <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Hangi Aylarda Gitmeli?</h3>
                    <ul className="list-disc pl-6 space-y-3 mb-8 marker:text-indigo-500">
                        <li><b>Ekim - Kasım:</b> Karın henüz sadece ince bir örtü şeklinde olduğu, aşırı soğukların başlamadığı ideal fotoğraf ayları.</li>
                        <li><b>Aralık - Ocak:</b> Kutup gecesinin (Güneşin doğmaması) yaşandığı en fantastik kış masalı ayları.</li>
                        <li><b>Şubat - Mart:</b> Işıkların renk skalasının (yeşil, mor, pembe) en coşkulu şekilde gökyüzüne yansıdığı, yüksek ihtimalli zaman dilimi.</li>
                    </ul>

                    {/* Viral Video Call-to-action */}
                    <div className="bg-slate-900 text-white rounded-3xl p-8 my-12 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                        <h4 className="text-2xl font-black mb-3">Sıra Sende: Bu Kış Kuzey Işıkları Macerasına Katıl!</h4>
                        <p className="text-slate-300 mb-6 text-sm">Hayatınızda unutamayacağınız bir anı mı biriktirmek istiyorsunuz? Çarpıcı Norveç Fiyortları ve garanti kuzey ışığı avımızla İskandinavya Turu sizleri bekliyor.</p>
                        <Link href="/tour/iskandinav-fiyortlari" className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">
                            İskandinav Fiyortları Turunu İncele ➔
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}
