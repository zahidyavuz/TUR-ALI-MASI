import { Metadata } from 'next';
import { fetchTour } from '@/app/lib/tours';
import TourDetailClient from './TourDetailClient';

// ISR: tur detayları saatte bir yeniden üretilir (F4-02). Katalog verisi
// (fiyat/kontenjan) sık değişmediği için 1 saat statik önbellek + arka planda
// tazeleme SEO/hız açısından yeterli. NOT: kök layout CSP nonce'u istek başına
// header okuduğundan (F3-05) build çıktısı şu an dinamik; nonce route bazına
// kapsamlanınca (F5-07) bu revalidate gerçek statik ISR'ye döner.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tourkia.com';

// Sitenin sunduğu diller (bkz. LocaleContext). URL tabanlı dil yönlendirmesi
// yok; tüm diller aynı URL'de istemci tarafında sunuluyor, bu yüzden her
// hreflang aynı kanonik adrese işaret eder (Google'a sayfanın bu dillerde
// mevcut olduğunu bildirir).
const LOCALES = ['tr-TR', 'en-US', 'de-DE', 'zh-CN', 'ar-SA', 'es-ES', 'fr-FR'];

type Props = { params: Promise<{ slug: string }> };

function tourUrl(slug: string): string {
    return `${SITE_URL}/tour/${slug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const tour: any = await fetchTour(slug);

    if (!tour) {
        return {
            title: 'Tur Bulunamadı | Tourkia',
            description: 'Aradığınız tur bulunamadı.',
            robots: { index: false, follow: false },
        };
    }

    const description = `${tour.title} turu sadece ${tour.price}₺'den başlayan fiyatlarla. ${(tour.description || '').slice(0, 140)}...`;
    const url = tourUrl(slug);
    const images = [tour.imageMain || tour.images?.[0]?.image_url].filter(Boolean);

    // hreflang: her dil aynı kanonik URL'e + x-default.
    const languages: Record<string, string> = { 'x-default': url };
    for (const loc of LOCALES) languages[loc] = url;

    return {
        metadataBase: new URL(SITE_URL),
        title: `${tour.title} | ${tour.location} | Tourkia`,
        description,
        alternates: { canonical: url, languages },
        openGraph: {
            images,
            title: tour.title,
            description,
            type: 'website',
            url,
            siteName: 'Tourkia',
        },
        twitter: {
            card: 'summary_large_image',
            title: tour.title,
            description,
            images,
        },
        robots: { index: true, follow: true },
    };
}

/**
 * Tur detay sayfası — server component (SSR/ISR).
 *
 * JSON-LD sunucuda üretilir ki tarama motorları JS çalıştırmadan yapılandırılmış
 * veriyi görsün (Rich Results). İnteraktif kısım (takvim, rezervasyon adımları)
 * istemci bileşenine (`TourDetailClient`) devredilir.
 */
export default async function TourDetailPage({ params }: Props) {
    const { slug } = await params;
    const tour: any = await fetchTour(slug);

    const url = tourUrl(slug);
    const images = tour
        ? [
              tour.imageMain || tour.images?.[0]?.image_url,
              tour.imageSub1 || tour.images?.[1]?.image_url,
              tour.imageSub2 || tour.images?.[2]?.image_url,
          ].filter(Boolean)
        : [];

    // Puan/yorum sunucu tarafı sosyal kanıt alanlarıdır (`rating`,
    // `reviews_count`); yalnız gerçek yorum verisi varsa AggregateRating eklenir.
    const hasRatings = Boolean(tour?.reviews_count && Number(tour.reviews_count) > 0);
    const aggregateRating = hasRatings
        ? {
              '@type': 'AggregateRating',
              ratingValue: tour.rating,
              reviewCount: tour.reviews_count,
          }
        : undefined;

    const offer = tour
        ? {
              '@type': 'Offer',
              url,
              priceCurrency: 'TRY',
              price: tour.price,
              availability: 'https://schema.org/InStock',
              seller: { '@type': 'Organization', name: 'Tourkia' },
          }
        : undefined;

    // Product + TouristTrip tek bir @graph içinde (F4-02).
    const jsonLd = tour
        ? {
              '@context': 'https://schema.org',
              '@graph': [
                  {
                      '@type': 'Product',
                      name: tour.title,
                      image: images,
                      description: tour.description,
                      category: tour.category || undefined,
                      ...(aggregateRating ? { aggregateRating } : {}),
                      offers: offer,
                  },
                  {
                      '@type': 'TouristTrip',
                      name: tour.title,
                      description: tour.description,
                      image: images,
                      url,
                      touristType: tour.category || undefined,
                      itinerary:
                          Array.isArray(tour.itinerary_steps) && tour.itinerary_steps.length > 0
                              ? {
                                    '@type': 'ItemList',
                                    itemListElement: tour.itinerary_steps.map((step: any, i: number) => ({
                                        '@type': 'ListItem',
                                        position: i + 1,
                                        name: step.title,
                                        description: step.description,
                                    })),
                                }
                              : undefined,
                      offers: offer,
                      ...(aggregateRating ? { aggregateRating } : {}),
                  },
              ],
          }
        : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <TourDetailClient />
        </>
    );
}
