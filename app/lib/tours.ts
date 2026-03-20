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

        // Convert array to the object map format expected by legacy frontend code temporarily
        const tourMap: Record<string, any> = {};
        for (const t of tours) {
            tourMap[t.id] = {
                ...t,
                // Ensure properties match the expected frontend structure
                fomoCount: t.fomo_count || Math.floor(Math.random() * 50) + 10,
                reviews: t.reviews_count?.toString() || "0",
                originalPrice: t.original_price?.toString() || "",
                price: parseFloat(t.price),
                imageSub1: t.image_sub1 || t.image_main,
                imageSub2: t.image_sub2 || t.image_main,
                included: t.included || [],
                excluded: t.excluded || [],
                translations: {}
            };
        }

        // Return both array and map for compatibility, along with pagination metadata
        return {
            map: tourMap,
            array: tours,
            count: response.count || tours.length,
            next: response.next,
            previous: response.previous
        };

    } catch (error) {
        console.error("Fetch tours error:", error);
        return { map: {}, array: [], count: 0, next: null, previous: null };
    }
}

// Stub for now. Frontend components should use fetchTours().
export const TOUR_DATA = {};
