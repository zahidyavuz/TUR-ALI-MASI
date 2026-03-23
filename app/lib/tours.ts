import { fetchAPI } from './api';

export async function fetchTours(params: Record<string, string> = {}) {
    try {
        // Construct query string for filters/pagination
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/tours/?${queryString}` : '/tours/';

        const response = await fetchAPI(endpoint, {
            next: { revalidate: 60 } // Cache for 60 seconds (Next.js App Router syntax)
        });

        // Django Paginated Response returns results in Response.results 
        const tours = response.results ? response.results : response;

        // Formatted array for frontend consumption
        const formattedTours = tours.map((t: any) => ({
            ...t,
            // Ensure properties match the expected frontend structure
            fomoCount: t.fomo_count || Math.floor(Math.random() * 50) + 10,
            reviews: t.reviews_count?.toString() || "0",
            originalPrice: t.original_price?.toString() || "",
            price: parseFloat(t.price),
            imageMain: t.image_main,
            imageSub1: t.image_sub1 || t.image_main,
            imageSub2: t.image_sub2 || t.image_main,
            included: t.included || [],
            excluded: t.excluded || [],
            translations: {}
        }));

        // Return array and pagination metadata
        return {
            tours: formattedTours,
            count: response.count || formattedTours.length,
            next: response.next,
            previous: response.previous
        };

    } catch (error) {
        console.error("Fetch tours error:", error);
        return { tours: [], count: 0, next: null, previous: null };
    }
}

export async function fetchTour(slug: string) {
    try {
        const t = await fetchAPI(`/tours/${slug}/`, {
            next: { revalidate: 60 }
        });
        if (!t || Object.keys(t).length === 0 || t.detail === "Bulunamadı." || t.detail === "Not found.") return null;
        
        return {
            ...t,
            fomoCount: t.fomo_count || Math.floor(Math.random() * 50) + 10,
            reviews: t.reviews_count?.toString() || "0",
            originalPrice: t.original_price?.toString() || "",
            price: parseFloat(t.price),
            imageMain: t.image_main,
            imageSub1: t.image_sub1 || t.image_main,
            imageSub2: t.image_sub2 || t.image_main,
            included: t.included || [],
            excluded: t.excluded || [],
            translations: {},
            availabilitySlots: t.availability_slots || []
        };
    } catch (error) {
        console.error("Fetch singular tour error:", error);
        return null;
    }
}

// Stub for now. Frontend components should use fetchTours().
export const TOUR_DATA = {};
