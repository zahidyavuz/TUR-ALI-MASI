import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface TokenData {
    access: string;
    refresh?: string;
}

export const auth = {
    setTokens: (data: TokenData) => {
        if (data.access) {
            Cookies.set(ACCESS_TOKEN_KEY, data.access, { secure: true, sameSite: 'strict', expires: 1 }); // 1 day expire
        }
        if (data.refresh) {
            Cookies.set(REFRESH_TOKEN_KEY, data.refresh, { secure: true, sameSite: 'strict', expires: 7 }); // 7 days expire
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
