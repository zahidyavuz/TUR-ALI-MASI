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
        const sessionId = localStorage.getItem('session_id') || Math.random().toString(36).substring(7);
        if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

        if (token) {
            // Special handling for Admin Demo Login or Mock Login (Dev mode)
            if (token === 'admin_demo_token' || token === 'mock_token') {
                const mockUser: User = {
                    id: 50,
                    username: token === 'admin_demo_token' ? 'yavuz50' : 'demo_user',
                    email: token === 'admin_demo_token' ? 'admin@tourkia.com' : 'demo@tourkia.com',
                    first_name: token === 'admin_demo_token' ? 'Admin' : 'Demo',
                    last_name: token === 'admin_demo_token' ? 'Yavuz' : 'User',
                    is_agency: false, // Set demo user as a regular customer by default
                    is_staff: token === 'admin_demo_token',
                    role: token === 'admin_demo_token' ? 'SuperAdmin' : 'Customer'
                };
                setUser(mockUser);
                setIsLoading(false);
                return mockUser;
            }

            try {
                const userData = await fetchAPI('/auth/user/', {
                    headers: auth.getAuthHeaders()
                });

                // --- SESSION GUARD: Anomali Kontrolü ---
                if (userData) {
                    const sessionRes = await fetch('/api/auth/session-check', {
                        method: 'POST',
                        body: JSON.stringify({ sessionId, userId: userData.id })
                    });
                    
                    if (sessionRes.status === 403) {
                        const errorData = await sessionRes.json();
                        alert(`🚨 GÜVENLİK UYARISI:\n${errorData.message}`);
                        logout();
                        setIsLoading(false);
                        return null;
                    }
                }

                setUser(userData);
                setIsLoading(false);
                return userData;
            } catch (error) {
                console.error("Auth check failed:", error);
                // Do not clear tokens automatically on network errors to prevent aggressive logouts
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
