const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (!res.ok) {
            // Trying to parse standard Django REST error response
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || err.error || `API Error: ${res.status}`);
        }
        return await res.json();
    } catch (error: unknown) {
        // Silently handle network errors (backend not running)
        const errorWithCause = error as { message?: string, cause?: { message?: string } };
        const msg = (errorWithCause.message || String(error)).toLowerCase();
        const causeMsg = (errorWithCause.cause?.message || '').toLowerCase();
        
        const isNetworkError =
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('econnrefused') ||
            causeMsg.includes('fetch') ||
            causeMsg.includes('econnrefused');


        if (isNetworkError) {
            // Backend is not available — return null silently
            return null;
        }

        // Re-throw API errors (non-network)
        throw error;
    }
}
