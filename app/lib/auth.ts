/**
 * Oturum token yönetimi (F3-03).
 *
 * Refresh token artık JS'in okuyamadığı bir HttpOnly çerezde (backend set eder);
 * bu dosya onu GÖRMEZ. Access token yalnız bellekte tutulur — sayfa yenilenince
 * kaybolur ve `refresh()` ile HttpOnly çerezden sessizce yeniden alınır.
 *
 * Böylece XSS ile ne uzun ömürlü refresh (çalınamaz, HttpOnly) ne de kalıcı bir
 * access token ele geçirilebilir; bellekteki access en fazla 60 dk yaşar.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Bellekteki access token — modül düzeyinde, sekme ömrüyle sınırlı.
let accessToken: string | null = null;

/** JWT `exp`'ini (ms) döndürür; çözülemezse null. */
function tokenExpiry(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/** Token var ve süresi dolmamış mı? exp okunamıyorsa geçerli sayılır. */
function isValid(token: string | null): token is string {
    if (!token) return false;
    const exp = tokenExpiry(token);
    return exp === null ? true : Date.now() < exp;
}

interface TokenData {
    access?: string;
    // Geriye dönük çağrı uyumu için kabul edilir ama YOK SAYILIR — refresh artık
    // gövdede gelmez, HttpOnly çerezdedir.
    refresh?: string;
}

export const auth = {
    setTokens: (data: TokenData) => {
        if (data?.access) accessToken = data.access;
    },

    setAccessToken: (token: string | null) => {
        accessToken = token;
    },

    getAccessToken: (): string | undefined => {
        return isValid(accessToken) ? accessToken : undefined;
    },

    clearTokens: () => {
        accessToken = null;
    },

    getAuthHeaders: (): Record<string, string> => {
        return isValid(accessToken) ? { Authorization: `Bearer ${accessToken}` } : {};
    },

    isAuthenticated: (): boolean => {
        return isValid(accessToken);
    },

    /**
     * Sessiz yenileme: HttpOnly refresh çereziyle yeni bir access token alır.
     * Çerez tarayıcı tarafından otomatik gönderilir (`credentials:'include'`).
     * Başarılıysa belleğe yazar ve true döner; aksi halde belleği temizler.
     */
    refresh: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: '{}',
            });
            if (!res.ok) {
                accessToken = null;
                return false;
            }
            const data = await res.json().catch(() => null);
            if (data?.access) {
                accessToken = data.access;
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },
};
