import { NextRequest, NextResponse } from 'next/server';
import { fetchTours } from '@/app/lib/tours';

export async function POST(req: NextRequest) {
    try {
        const { message, locale, pathname } = await req.json();
        const lowerMsg = message.toLowerCase();

        // Canlı Kur Çekimi (Finansal Zeka)
        let usdToTry = 35.15;
        try {
            const curRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await curRes.json();
            if (data?.rates?.TRY) usdToTry = data.rates.TRY;
        } catch (e) { console.error("Kur hatası:", e); }

        // Kısıtlama: Seyahat dışı konu filtresi
        const offTopic = ['siyaset', 'ekonomi', 'futbol', 'gündem', 'parti', 'dolar ne olur'];
        if (offTopic.some(k => lowerMsg.includes(k))) {
            return NextResponse.json({
                reply: "Benim tutkum Türkiye'nin eşsiz köşeleri, gel sana başka bir rota bakalım.",
                options: []
            });
        }

        // Demo / Ultra Skill Showcase (Örnek Diyalog)
        if (lowerMsg.includes('antalya') && lowerMsg.includes('kapadokya') || lowerMsg.includes('efsanevi örnek') || lowerMsg.includes('4 günlük plan')) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return NextResponse.json({
                reply: `Harika bir rota seçimi! 4 Günlük Antalya & Kapadokya kombinasyonu tam benim uzmanlık alanım.\n\n🌦️ **Hava & Kıyafet Analizi:** \nŞu an Antalya'da güneşli ve ılık bir sahil havası var; ince yazlık kıyafetler ve güneş kremi şart. Ancak Kapadokya'ya geçince sabahları balon kalkışında ciddi bir ayaz olacak, bu yüzden mutlaka kat kat giyinmelisin. Vadi yürüyüşü için de bileği saran sağlam bir bot almayı unutma!\n\n💰 **Finansal Zeka:** \nOluşturduğum VIP paketin (Transferler dahil) toplam maliyeti 450 USD. Sistemimizden anlık çektiğim güncel banka kuruna göre (1 USD = ${usdToTry.toFixed(2)} TL), bu turun bedeli şeffaf olarak **${(450 * usdToTry).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL**'dir.\n\n🔥 **Cappo'nun Tavsiyesi:** \nBalon turunu sabaha planladık, ertesi gün peri bacalarının arasında gün batımına karşı bir 'At Safari' harika bir tamamlayıcı olur. Sana rezervasyon adımlarını açayım mı?`,
                options: [],
                action: 'guide'
            });
        }

        if (lowerMsg.includes('sultanahmet') && (lowerMsg.includes('kahve') || lowerMsg.includes('içilir'))) {
            return NextResponse.json({
                reply: "Sultanahmet'te kahve denince akla hemen tarihi medreselerin avlularındaki gizli kahveciler veya Ayasofya manzaralı teras kafeler gelir. Caferağa Medresesi'nin avlusunda Türk kahveni yudumlarken tarihin dokusunu hissedebilirsin!",
                options: []
            });
        }

        if (lowerMsg.includes('antalya') && (lowerMsg.includes('koy') || lowerMsg.includes('deniz'))) {
            return NextResponse.json({
                reply: "Antalya'da deniz deyince Kaş ve Kalkan civarındaki saklı koylar bir harika! Kaputaş Plajı turkuaz rengiyle ünlüdür ancak kalabalıktan uzaklaşmak istersen tekneyle ulaşabileceğin Korsan Koyu veya Kekova batık şehri etrafındaki koylarda denize girmek efsanevi bir deneyimdir.",
                options: []
            });
        }

        // Site Rehberi Yetenekleri (Yeni Eklendi)
        if (lowerMsg.includes('bilet') || lowerMsg.includes('sipariş') || lowerMsg.includes('rezervasyonlar')) {
            return NextResponse.json({
                reply: "Biletlerini ve siparişlerini hemen gösteriyorum. Oraya yönlendiriliyorsun...",
                action: 'navigate',
                actionData: '/bookings'
            });
        }

        if (lowerMsg.includes('ödeme') || lowerMsg.includes('checkout')) {
            return NextResponse.json({
                reply: "Ödeme ve rezervasyon tamamlama ekranına yönlendiriyorum...",
                action: 'navigate',
                actionData: '/checkout'
            });
        }

        if (lowerMsg.includes('acenta')) {
            return NextResponse.json({
                reply: "Acenta paneline hemen yönlendiriliyorsun...",
                action: 'navigate',
                actionData: '/agency/dashboard'
            });
        }

        if (lowerMsg.includes('nasıl rezervasyon') || lowerMsg.includes('nasıl alırım') || lowerMsg.includes('rezervasyon yap')) {
            return NextResponse.json({
                reply: "Rezervasyon yapmak çok kolay! Sayfanın başındaki arama çubuğundan yer, tarih ve kişi sayısını seçerek başlayabilirsin. Göz atmak isteyebilirsin diye ilgili alanı senin için vurguladım.",
                action: 'guide',
                actionData: 'reservation_step_1'
            });
        }

        // Bağlamsal Zeka (Contextual Intelligence)
        if (pathname && lowerMsg.includes('burada ne yapabilirim')) {
            if (pathname.includes('/blog')) {
                return NextResponse.json({ reply: "Şu an Blog sayfamızdasın. Burada yazar acentalarımızın deneyimlerini okuyabilir ve yeni maceralar keşfedebilirsin!" });
            } else if (pathname.includes('/tour')) {
                return NextResponse.json({ reply: "Şu an bir tur inceleme sayfasındasın. İstersen sana bu turun detaylarını daha iyi anlatabilir veya rezervasyon adımlarına geçmene yardım edebilirim." });
            } else if (pathname.includes('/checkout')) {
                return NextResponse.json({ reply: "Ödeme adımındasın. Tüm işlemlerin 256-bit SSL ile korunuyor. Herhangi bir kart limit veya 3D doğrulama sorunu yaşarsan bana yazabilirsin." });
            } else {
                return NextResponse.json({ reply: "Şu an anasayfadasın. Turları keşfetmek veya popüler rotalara göz atmak istersen, bana bir yer adı (ör. 'Kapadokya') söylemen yeterli!" });
            }
        }

        // Basit NLU / Keyword mapping (Veritabanı Analizi Simülasyonu)
        let recommendedKeys = ['kapadokya-klasik-balon', 'istanbul-bogaz-turu', 'antalya-mavi-tur'];
        let isLead = false;
        let leadData = null;

        if (lowerMsg.includes('vizesiz') || lowerMsg.includes('vize') || lowerMsg.includes('karadağ') || lowerMsg.includes('balkan')) {
            isLead = true;
            leadData = {
                title: "Türkiye'nin Gizli Cennetleri",
                desc: "Vize stresiyle hiç uğraşma! Vizesiz Balkanlar yerine sana İstanbul'un tarihi atmosferini veya Antalya'nın eşsiz koylarını sunabilirim. Türkiye'nin güzellikleri dünyalara bedel!",
                image: "https://images.unsplash.com/photo-1545638290-7c26fa323f66?q=80&w=400&auto=format&fit=crop"
            };
        } else if (lowerMsg.includes('bali') || lowerMsg.includes('tayland') || lowerMsg.includes('phuket') || lowerMsg.includes('maldivler')) {
            isLead = true;
            leadData = {
                title: "Uzakdoğu'yu Unut, Antalya'ya Gel!",
                desc: "Bali veya Maldivler'i aramaya gerek yok. Antalya Kaş'ın turkuaz suları ve Kapadokya'nın masalsı manzaraları dururken uzaklara gitmeye gerek yok! İşte sana efsane alternatifler:",
                image: "https://images.unsplash.com/photo-1615714088231-318e805d76ea?q=80&w=400&auto=format&fit=crop"
            };
        } else if (lowerMsg.includes('yemek') || lowerMsg.includes('gurme') || lowerMsg.includes('gastronomi') || lowerMsg.includes('pizza') || lowerMsg.includes('food') || lowerMsg.includes('essen') || lowerMsg.includes('美食')) {
            recommendedKeys = ['istanbul-bogaz-turu', 'gurme-sarap-tadimi', 'istanbul-tarihi-yarimada'];
        } else if (lowerMsg.includes('adrenalin') || lowerMsg.includes('heyecan') || lowerMsg.includes('ekstrem') || lowerMsg.includes('safari') || lowerMsg.includes('action') || lowerMsg.includes('adventure') || lowerMsg.includes('abenteuer') || lowerMsg.includes('冒险')) {
            recommendedKeys = ['antalya-kanyon-rafting', 'gun-batimi-atv', 'yesil-tur-guney'];
        } else if (lowerMsg.includes('günübirlik') || lowerMsg.includes('deneyim') || lowerMsg.includes('kısa') || lowerMsg.includes('short') || lowerMsg.includes('kurz') || lowerMsg.includes('一日')) {
            recommendedKeys = ['istanbul-tarihi-yarimada', 'kirmizi-tur-kuzey', 'antalya-kanyon-rafting'];
        } else if (lowerMsg.includes('doğa') || lowerMsg.includes('macera') || lowerMsg.includes('kuzey') || lowerMsg.includes('nature') || lowerMsg.includes('natur') || lowerMsg.includes('自然')) {
            recommendedKeys = ['antalya-mavi-tur', 'yesil-tur-guney', 'at-turu-safarisi'];
        } else if (lowerMsg.includes('romantik') || lowerMsg.includes('deniz') || lowerMsg.includes('balayı') || lowerMsg.includes('romantic') || lowerMsg.includes('sea') || lowerMsg.includes('浪漫')) {

            if (lowerMsg.includes('balayı')) {
                if (Math.random() > 0.5) {
                    isLead = true;
                    leadData = {
                        title: "Kapadokya & Antalya VIP Balayı",
                        desc: "Balayı için Kapadokya'nın masalsı balon turları ve Antalya'nın lüks mavi turlarından daha romantik ne olabilir? VIP Balayı paketlerimize göz at!",
                        image: "https://images.unsplash.com/photo-1502485019198-a625bd53ceb7?q=80&w=400&auto=format&fit=crop"
                    };
                }
            }
            if (!isLead) {
                recommendedKeys = ['antalya-mavi-tur', 'istanbul-bogaz-turu', 'at-turu-safarisi'];
            }
        } else if (lowerMsg.includes('kültür') || lowerMsg.includes('tarih') || lowerMsg.includes('şehir') || lowerMsg.includes('culture') || lowerMsg.includes('history') || lowerMsg.includes('kultur') || lowerMsg.includes('历史')) {
            recommendedKeys = ['istanbul-tarihi-yarimada', 'kirmizi-tur-kuzey', 'sakli-koyler-soganli'];
        } else {
            // Global Search Integration: Serbest aramada eşleşme durumlarını bul
            const searchResults: string[] = [];
            const tourData: any = await fetchTours();
            const tourList = tourData.tours || [];
            tourList.forEach((tour: any) => {
                if (tour.title.toLowerCase().includes(lowerMsg) ||
                    tour.location.toLowerCase().includes(lowerMsg) ||
                    tour.category?.toLowerCase().includes(lowerMsg)) {
                    searchResults.push(tour.slug || tour.id);
                }
            });

            if (searchResults.length > 0) {
                recommendedKeys = searchResults.slice(0, 3); // En fazla 3 sonuç
            }
        }

        // Turları çek
        const tourData: any = await fetchTours();
        const tourList = tourData.tours || [];
        const options = recommendedKeys.map(key => {
            const baseTour = tourList.find((t: any) => t.slug === key || t.id === key);
            if (!baseTour) return null; // In case the fallback hardcoded keys (fethiye-yama-parasutu) don't exist anymore
            const translation = baseTour.translations?.[locale] || {};
            const t = { ...baseTour, ...translation };

            let itinerary = '';
            if (locale === 'en-US') {
                itinerary = t.duration.includes('Saat') || t.duration.includes('Hour')
                    ? `Mini Vibe:\n- Meet & Greet\n- ${t.title} Action\n- Chill & Goodbye`
                    : `Quick Look:\n- Day 1: Touchdown & Chill\n- Mid: Epic Adventures\n- End: Souvenirs & Flight`;
            } else if (locale === 'de-DE') {
                itinerary = t.duration.includes('Saat') || t.duration.includes('Stunde')
                    ? `Kurzerlebnis:\n- Begrüßung & Briefing\n- ${t.title} Aktivität\n- Verabschiedung`
                    : `Routenplan:\n- Tag 1: Anreise & Check-in\n- Folgetage: Kultur & Erlebnisse\n- Letzter Tag: Rückreise`;
            } else if (locale === 'zh-CN') {
                itinerary = t.duration.includes('Saat') || t.duration.includes('小时')
                    ? `尊享半日游:\n- 专车接送\n- ${t.title} 专属体验\n- 完美返程`
                    : `行程概览:\n- 第1天: VIP接机 & 入住\n- 核心行程: 深度游览 & 拍照打卡\n- 尾声: 免税店购物 & 送机`;
            } else {
                itinerary = t.duration.includes('Saat')
                    ? `Mini Deneyim:\n- Karşılama ve Brifing\n- ${t.title} Etkinliği\n- Kapanış ve Uğurlama`
                    : `Özet Rota:\n- 1. Gün: Varış ve Yerleşme\n- Ara Günler: Keşif & Aktiviteler\n- Son Gün: Alışveriş ve Dönüş`;
            }

            return {
                id: t.id,
                title: t.title,
                location: t.location,
                duration: t.duration,
                price: t.price,
                image: t.imageSub1 || t.imageMain,
                miniItinerary: itinerary,
            };
        }).filter(Boolean); // Clean any nulls that occurred from hardcoded key misses

        if (isLead && leadData) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return NextResponse.json({
                reply: leadData.desc,
                options: [],
                isLead: true,
                leadData
            });
        }

        const replies: any = {
            'tr-TR': `Harika! İsteğini analiz ettim ve sistemimizdeki turları tarayarak senin için 3 farklı mini-itinerary seçeneği hazırladım. Hangisi daha çok ilgini çekiyor?`,
            'en-US': `Awesome! I've scanned our hype trips and pulled 3 epic options tailored just for your vibe. Which one grabs you?`,
            'de-DE': `Ausgezeichnet! Ich habe unsere Datenbank analiziert und 3 perfekt geplante Routen für Sie zusammengestellt. Welche entspricht Ihren Vorstellungen?`,
            'zh-CN': `太棒了！我已经为您匹配了3款最受贵宾欢迎的专属定制行程，请问您最中意哪一款？`
        };

        let reply = replies[locale] || replies['tr-TR'];

        // Smart Upselling Injection Focus
        if (lowerMsg.includes('balon')) {
            reply = "Bu balon rotası inanılmaz! Yalnız sana benden bir profesyonel tavsiye: Balon turu alan misafirlerimiz için ertesi gün At Safari harika bir tamamlayıcı oluyor. İncelemek istersen seçeneklere ekledim.";
        } else if (lowerMsg.includes('deniz') || lowerMsg.includes('yüzme')) {
            reply = "Mavi sulara aşık olduğunu görebiliyorum. Seçtiğim deniz turlarının yanına, gün batımında küçük bir tekne turu da mükemmel bir tamamlayıcı olur!";
        }

        // İsteklerin çok hızlı dönmemesi için yapay bir delay ekleyelim (Analiz simülasyonu)
        await new Promise(resolve => setTimeout(resolve, 1500));

        return NextResponse.json({
            reply,
            options,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
