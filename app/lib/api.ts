import { sanitizePayload } from './sanitizer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    // ZERO-TRUST: Otomatik Sanitization
    let bodyObj = options.body;
    if (typeof options.body === 'string') {
        try {
            // Sadece JSON formatındaki body'leri parse et ve sanitize et
            const parsedBody = JSON.parse(options.body);
            const sanitizedBody = sanitizePayload(parsedBody);
            bodyObj = JSON.stringify(sanitizedBody);
        } catch (e) {
            // Eğer JSON parse edilemiyorsa (örneğin FormData vb. ise), orijinal body'i koru
        }
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const config = {
        ...options,
        body: bodyObj,
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
            
            // Extract the most relevant error message from Django's various formats
            let message = err.detail || err.error;
            
            if (!message) {
                if (err.non_field_errors) {
                    message = Array.isArray(err.non_field_errors) ? err.non_field_errors[0] : err.non_field_errors;
                } else {
                    // Collect field-specific validation errors
                    const fieldErrors = Object.entries(err)
                        .map(([key, value]) => {
                            const val = Array.isArray(value) ? value[0] : value;
                            return `${key}: ${val}`;
                        });
                    if (fieldErrors.length > 0) {
                        message = fieldErrors.join(', ');
                    }
                }
            }
            
            const error = new Error(message || `API Error: ${res.status}`);
            (error as any).data = err;
            (error as any).status = res.status;
            throw error;
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

        // For other errors, we still return null to avoid breaking components,
        // but you might want to log them in a real production app.
        return null;
    }
}
