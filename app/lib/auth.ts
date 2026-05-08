import Cookies from 'js-cookie';
import { isSessionValid, secureClear } from './secureVault';

/**
 * SECURE-SESSION-AND-COOKIE-ARMOR
 *
 * Çerez Güvenlik Politikası:
 * - SameSite: 'strict' → CSRF saldırılarını engeller
 * - Secure: true (production) → Yalnızca HTTPS üzerinden iletilir
 * - path: '/' → Tüm site genelinde geçerli
 * - expires: kısa süreli (access: 1 gün, refresh: 7 gün)
 *
 * NOT: Gerçek HttpOnly flag'i yalnızca sunucu taraflı Set-Cookie header'ı
 * ile ayarlanabilir. Django backend'de SESSION_COOKIE_HTTPONLY=True ve
 * CSRF_COOKIE_HTTPONLY=True ayarları yapılmalıdır.
 * Frontend, js-cookie ile bu politikayı mümkün olduğunca yakın taklit eder.
 */

const ACCESS_TOKEN_KEY = 'tourkia_access_token';
const REFRESH_TOKEN_KEY = 'tourkia_refresh_token';

// Üretim ortamında her zaman Secure flag'ini zorla
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface TokenData {
    access: string;
    refresh?: string;
}

export const auth = {
    setTokens: (data: TokenData) => {
        const isSecure = IS_PRODUCTION || (
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:'
        );

        if (data.access) {
            Cookies.set(ACCESS_TOKEN_KEY, data.access, {
                path: '/',
                secure: isSecure,
                sameSite: 'strict',  // CSRF Koruması
                expires: 1,          // 1 gün — kısa ömürlü access token
            });
        }
        if (data.refresh) {
            Cookies.set(REFRESH_TOKEN_KEY, data.refresh, {
                path: '/',
                secure: isSecure,
                sameSite: 'strict',  // CSRF Koruması
                expires: 7,          // 7 gün — refresh token
            });
        }
    },

    getAccessToken: () => {
        const token = Cookies.get(ACCESS_TOKEN_KEY);
        if (!token) return undefined;

        // Oturum geçerliliği — süresi dolmuş token'ı otomatik temizle
        if (!isSessionValid(token)) {
            auth.clearTokens();
            return undefined;
        }

        return token;
    },

    getRefreshToken: () => {
        return Cookies.get(REFRESH_TOKEN_KEY);
    },

    clearTokens: () => {
        Cookies.remove(ACCESS_TOKEN_KEY, { path: '/' });
        Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
        // Hassas tarayıcı verilerini de temizle
        secureClear();
    },

    getAuthHeaders: (): Record<string, string> => {
        const token = auth.getAccessToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    },

    /**
     * Aktif bir oturum var mı kontrolü.
     * Token yoksa veya süresi dolmuşsa false döner.
     */
    isAuthenticated: (): boolean => {
        const token = Cookies.get(ACCESS_TOKEN_KEY);
        if (!token) return false;
        return isSessionValid(token);
    },
};
