'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

import { auth } from '../lib/auth';
import { fetchAPI } from '../lib/api';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_agency?: boolean; // We'll infer this from profile or endpoints later
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (tokens: { access: string, refresh: string }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    logout: () => { },
    checkAuth: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        const token = auth.getAccessToken();

        if (token) {
            try {
                const userData = await fetchAPI('/auth/user/', {
                    headers: auth.getAuthHeaders()
                });
                setUser(userData);
            } catch (error) {
                console.error("Auth check failed:", error);
                auth.clearTokens();
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);


    const login = async (tokens: { access: string, refresh: string }) => {
        auth.setTokens(tokens);
        await checkAuth();
    };

    const logout = () => {
        auth.clearTokens();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
