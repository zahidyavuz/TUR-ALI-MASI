import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'tourkia_access_token';
const REFRESH_TOKEN_KEY = 'tourkia_refresh_token';

interface TokenData {
    access: string;
    refresh?: string;
}

export const auth = {
    setTokens: (data: TokenData) => {
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        if (data.access) {
            Cookies.set(ACCESS_TOKEN_KEY, data.access, { path: '/', secure: isSecure, sameSite: 'strict', expires: 1 }); // 1 day expire
        }
        if (data.refresh) {
            Cookies.set(REFRESH_TOKEN_KEY, data.refresh, { path: '/', secure: isSecure, sameSite: 'strict', expires: 7 }); // 7 days expire
        }
    },
    getAccessToken: () => {
        return Cookies.get(ACCESS_TOKEN_KEY);
    },
    getRefreshToken: () => {
        return Cookies.get(REFRESH_TOKEN_KEY);
    },
    clearTokens: () => {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
    },
    getAuthHeaders: (): Record<string, string> => {
        const token = Cookies.get(ACCESS_TOKEN_KEY);
        if (token) {
            return {
                'Authorization': `Bearer ${token}`
            };
        }
        return {};
    }
};
