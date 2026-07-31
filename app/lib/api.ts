import { sanitizePayload } from './sanitizer';
import { auth } from './auth';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FetchAPIOptions extends RequestInit {
    /**
     * Opt-in, additive-only: when true, an HTTP error response (4xx/5xx)
     * throws (preserving err.message/err.data/err.status) instead of being
     * swallowed into a `null` return. Default behavior for every existing
     * caller is unchanged. Use this when the caller needs to show the
     * specific field-level validation message (e.g. multi-step forms),
     * not just "something went wrong".
     */
    throwOnHttpError?: boolean;
}

/**
 * Dosya (CSV/PDF) indirir ve tarayıcıya kaydettirir.
 *
 * `fetchAPI` her yanıtı JSON olarak çözdüğü için ekstre/rapor indirmede
 * kullanılamıyor. Ham `fetch`'i bileşene taşımak yerine buraya konuldu:
 * kimlik doğrulama başlığı ve API kök adresi tek yerde kalsın.
 *
 * Hata durumunda `false` döner — çağıran kullanıcıya mesaj gösterir.
 */
export async function downloadFile(endpoint: string, fallbackFilename: string): Promise<boolean> {
    const authHeaders = typeof window !== 'undefined' ? auth.getAuthHeaders() : {};
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { headers: { ...authHeaders } });
        if (!res.ok) return false;

        const blob = await res.blob();
        // Sunucunun önerdiği ad varsa o kullanılır; yoksa çağıranın verdiği.
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^";]+)"?/);
        const filename = match ? match[1] : fallbackFilename;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return true;
    } catch {
        return false;
    }
}

export async function fetchAPI(endpoint: string, options: FetchAPIOptions = {}) {
    const { throwOnHttpError, ...fetchOptions } = options;
    // ZERO-TRUST: Otomatik Sanitization
    let bodyObj = fetchOptions.body;
    if (typeof fetchOptions.body === 'string') {
        try {
            // Sadece JSON formatındaki body'leri parse et ve sanitize et
            const parsedBody = JSON.parse(fetchOptions.body);
            const sanitizedBody = sanitizePayload(parsedBody);
            bodyObj = JSON.stringify(sanitizedBody);
        } catch (e) {
            // Eğer JSON parse edilemiyorsa (örneğin FormData vb. ise), orijinal body'i koru
        }
    }

    // FormData (multipart) uploads must NOT get a manual Content-Type — the
    // browser sets the multipart boundary itself. Forcing application/json
    // here would silently break every file-upload caller.
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    const defaultHeaders: Record<string, string> = isFormData ? {} : {
        'Content-Type': 'application/json',
    };

    // KOMUT 143: Interceptor (Token Enjeksiyonu)
    // Eğer token varsa (auth.getAuthHeaders) otomatik olarak header'a Bearer token ekler
    let authHeaders = {};
    if (typeof window !== 'undefined') {
        authHeaders = auth.getAuthHeaders();
    }

    const config = {
        ...fetchOptions,
        body: bodyObj,
        headers: {
            ...defaultHeaders,
            ...authHeaders,
            ...fetchOptions.headers,
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
            // Backend is not available — return null silently, even with
            // throwOnHttpError, since there's no specific field error to show.
            return null;
        }

        // An HTTP error response (4xx/5xx) with a real Django error body —
        // (error as any).data/.status were set above before this catch.
        if (throwOnHttpError && (error as any)?.status !== undefined) {
            throw error;
        }

        // For other errors, we still return null to avoid breaking components,
        // but you might want to log them in a real production app.
        return null;
    }
}
