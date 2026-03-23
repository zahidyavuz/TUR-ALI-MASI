import { Metadata } from 'next';
import { fetchTour } from '../../lib/tours';

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const slug = (await params).slug;
    const tour: any = await fetchTour(slug);

    if (!tour) {
        return {
            title: 'Tur Bulunamadı | TourScanner',
            description: 'Aradığınız tur bulunamadı.',
        };
    }

    const description = `${tour.title} turu sadece ${tour.price}₺'den başlayan fiyatlarla. ${(tour.description || '').slice(0, 140)}...`;

    return {
        title: `${tour.title} | ${tour.location} | TourScanner`,
        description,
        alternates: {
            canonical: `https://melihtours.com/tour/${slug}`,
        },
        openGraph: {
            images: [tour.imageMain || tour.images?.[0]?.image_url].filter(Boolean),
            title: tour.title,
            description,
            type: 'website',
            url: `https://melihtours.com/tour/${slug}`,
            siteName: 'TourScanner',
        },
        twitter: {
            card: 'summary_large_image',
            title: tour.title,
            description,
            images: [tour.imageMain || tour.images?.[0]?.image_url].filter(Boolean),
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function TourLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const slug = (await params).slug;
    const tour: any = await fetchTour(slug);

    const jsonLd = tour ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": tour.title,
        "image": [
            tour.imageMain || tour.images?.[0]?.image_url,
            tour.imageSub1 || tour.images?.[1]?.image_url,
            tour.imageSub2 || tour.images?.[2]?.image_url
        ].filter(Boolean),
        "description": tour.description,
        ...(tour.average_rating ? {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": tour.average_rating,
                "reviewCount": tour.review_count || 1
            }
        } : {}),
        "offers": {
            "@type": "Offer",
            "url": `https://melihtours.com/tour/${slug}`,
            "priceCurrency": "TRY",
            "price": tour.price,
            "availability": "https://schema.org/InStock",
            "seller": {
                "@type": "Organization",
                "name": "TourScanner"
            }
        }
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            {children}
        </>
    );
}

