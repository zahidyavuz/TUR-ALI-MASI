'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

import { auth } from '@/app/lib/auth';
import { fetchAPI } from '@/app/lib/api';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_agency?: boolean;
    agency_id?: number;
    role?: string;
    is_staff?: boolean;
    // Partner onboarding status — see backend/users/serializers.py UserSerializer.
    agency_status?: string | null;
    agency_business_type?: string | null;
    agency_onboarding_step?: number | null;
    agency_rejection_reason?: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (tokens: { access: string, refresh: string }) => Promise<User | null>;
    logout: () => void;
    checkAuth: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => null,
    logout: () => { },
    checkAuth: async () => null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        // Backend refresh token'ı blacklist'ler ve HttpOnly çerezi siler; bellekteki
        // access da temizlenir. Ağ hatası olsa bile yerel oturumu düşür.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        fetch(`${apiUrl}/auth/logout/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
            body: '{}',
        }).catch(() => { });
        auth.clearTokens();
        setUser(null);
    }, []);

    const checkAuth = useCallback(async (): Promise<User | null> => {
        setIsLoading(true);
        let token = auth.getAccessToken();

        // Sayfa yenilenince bellek boştur; HttpOnly refresh çereziyle sessizce
        // yeni bir access token almayı dene (F3-03).
        if (!token) {
            const refreshed = await auth.refresh();
            token = refreshed ? auth.getAccessToken() : undefined;
        }

        if (token) {
            try {
                const userData = await fetchAPI('/auth/user/', {
                    headers: auth.getAuthHeaders()
                });

                if (userData) {
                    if (!userData.role) {
                        if (userData.is_staff) {
                            userData.role = 'admin';
                        } else if (userData.is_agency) {
                            userData.role = 'agency';
                        } else {
                            userData.role = 'customer';
                        }
                    }
                }

                setUser(userData);
                setIsLoading(false);
                return userData;
            } catch (error) {
                console.error("Auth check failed:", error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
        return null;
    }, [logout]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (tokens: { access: string, refresh: string }): Promise<User | null> => {
        auth.setTokens(tokens);
        return await checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
