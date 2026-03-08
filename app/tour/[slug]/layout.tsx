import { Metadata } from 'next';
import { TOUR_DATA } from '../../lib/tours';

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    // Next.js params is potentially generic, so we force it to string
    const slug = (await params).slug;
    const tour = TOUR_DATA[slug as keyof typeof TOUR_DATA];

    if (!tour) {
        return {
            title: 'Tur Bulunamadı | Melih Tours',
            description: 'Aradığınız tur bulunamadı.',
        };
    }

    return {
        title: `${tour.title} | ${tour.location} | Melih Tours B2B`,
        description: `${tour.title} turu sadece ${tour.price}₺ karşılığında. ${tour.description.slice(0, 150)}...`,
        openGraph: {
            images: [tour.imageMain],
            title: tour.title,
            description: tour.description,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: tour.title,
            description: tour.description,
            images: [tour.imageMain],
        }
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
    const tour = TOUR_DATA[slug as keyof typeof TOUR_DATA];

    const jsonLd = tour ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": tour.title,
        "image": [
            tour.imageMain,
            tour.imageSub1,
            tour.imageSub2
        ],
        "description": tour.description,
        "offers": {
            "@type": "Offer",
            "url": `https://melihtours.com/tour/${slug}`,
            "priceCurrency": "TRY",
            "price": tour.price,
            "availability": "https://schema.org/InStock",
            "seller": {
                "@type": "Organization",
                "name": "Melih Tours"
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
