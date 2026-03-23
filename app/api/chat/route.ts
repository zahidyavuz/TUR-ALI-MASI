import { NextRequest, NextResponse } from 'next/server';
import { fetchTours } from '../../lib/tours';

export async function POST(req: NextRequest) {
    try {
        const { message, locale, pathname } = await req.json();
        const lowerMsg = message.toLowerCase();

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
        let recommendedKeys = ['kapadokya', 'buyuk-italya', 'maldivler-ruyasi'];
        let isLead = false;
        let leadData = null;

        if (lowerMsg.includes('vizesiz') || lowerMsg.includes('vize') || lowerMsg.includes('karadağ') || lowerMsg.includes('balkan')) {
            isLead = true;
            leadData = {
                title: "Vizesiz Balkanlar & Karadağ",
                desc: "Tur listemizi analiz ettim. Sistemimizde henüz vizesiz bir seçenek yok ancak Google Maps & TripAdvisor trendlerine göre en popüler vizesiz rotalar Karadağ (Kotor) ve Belgrad. Çok yakında efsane bir vizesiz Balkan rotası ekleyeceğiz!",
                image: "https://images.unsplash.com/photo-1600100411132-84bc53de2b61?q=80&w=400&auto=format&fit=crop"
            };
        } else if (lowerMsg.includes('bali') || lowerMsg.includes('tayland') || lowerMsg.includes('phuket')) {
            isLead = true;
            leadData = {
                title: "Egzotik Uzak Doğu (Bali, Phuket)",
                desc: "Listemizde Maldivler ve Japonya mevcut ancak TripAdvisor verilerine göre aradığınız vibe kesinlikle Bali veya Phuket! Uzak Doğu macera rotamız çok yakında açılacak.",
                image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=400&auto=format&fit=crop"
            };
        } else if (lowerMsg.includes('yemek') || lowerMsg.includes('gurme') || lowerMsg.includes('gastronomi') || lowerMsg.includes('pizza') || lowerMsg.includes('food') || lowerMsg.includes('essen') || lowerMsg.includes('美食')) {
            recommendedKeys = ['napoli-pizza-atolyesi', 'gaziantep-gurme', 'buyuk-italya'];
        } else if (lowerMsg.includes('adrenalin') || lowerMsg.includes('heyecan') || lowerMsg.includes('ekstrem') || lowerMsg.includes('safari') || lowerMsg.includes('action') || lowerMsg.includes('adventure') || lowerMsg.includes('abenteuer') || lowerMsg.includes('冒险')) {
            recommendedKeys = ['fethiye-yama-parasutu', 'kapadokya-atv-safari', 'iskandinav-fiyort'];
        } else if (lowerMsg.includes('günübirlik') || lowerMsg.includes('deneyim') || lowerMsg.includes('kısa') || lowerMsg.includes('short') || lowerMsg.includes('kurz') || lowerMsg.includes('一日')) {
            recommendedKeys = ['napoli-pizza-atolyesi', 'fethiye-yama-parasutu', 'kapadokya-atv-safari'];
        } else if (lowerMsg.includes('doğa') || lowerMsg.includes('macera') || lowerMsg.includes('kuzey') || lowerMsg.includes('nature') || lowerMsg.includes('natur') || lowerMsg.includes('自然')) {
            recommendedKeys = ['iskandinav-fiyort', 'kapadokya', 'japonya-bahar'];
        } else if (lowerMsg.includes('romantik') || lowerMsg.includes('deniz') || lowerMsg.includes('balayı') || lowerMsg.includes('romantic') || lowerMsg.includes('sea') || lowerMsg.includes('浪漫')) {

            if (lowerMsg.includes('balayı')) {
                // For honeymoon, occasionally offer lead for Bora Bora or just standard Maldivler + Kapadokya
                if (Math.random() > 0.5) {
                    isLead = true;
                    leadData = {
                        title: "Bora Bora & Los Roques",
                        desc: "Portföyümüzdeki Maldivler harika bir seçenek. Ancak Google Travel analizlerine göre tam sana göre yepyeni bir VIP Balayı konsepti (Bora Bora) hazırlıyoruz!",
                        image: "https://images.unsplash.com/photo-1549488344-9b2f63f53198?q=80&w=400&auto=format&fit=crop"
                    };
                }
            }
            if (!isLead) {
                recommendedKeys = ['maldivler-ruyasi', 'kapadokya', 'buyuk-italya'];
            }
        } else if (lowerMsg.includes('kültür') || lowerMsg.includes('tarih') || lowerMsg.includes('şehir') || lowerMsg.includes('culture') || lowerMsg.includes('history') || lowerMsg.includes('kultur') || lowerMsg.includes('历史')) {
            recommendedKeys = ['gaziantep-gurme', 'buyuk-italya', 'japonya-bahar'];
        } else {
            // Global Search Integration: Serbest aramada eşleşme durumlarını bul
            let searchResults: string[] = [];
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
            // @ts-ignore
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
            'de-DE': `Ausgezeichnet! Ich habe unsere Datenbank analysiert und 3 perfekt geplante Routen für Sie zusammengestellt. Welche entspricht Ihren Vorstellungen?`,
            'zh-CN': `太棒了！我已经为您匹配了3款最受贵宾欢迎的专属定制行程，请问您最中意哪一款？`
        };

        const reply = replies[locale] || replies['tr-TR'];

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
