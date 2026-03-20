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
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}
