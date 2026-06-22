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
        auth.clearTokens();
        setUser(null);
    }, []);

    const checkAuth = useCallback(async (): Promise<User | null> => {
        setIsLoading(true);
        const token = auth.getAccessToken();

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
