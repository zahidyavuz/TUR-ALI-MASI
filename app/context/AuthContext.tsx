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
        const sessionId = localStorage.getItem('session_id') || Math.random().toString(36).substring(7);
        if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

        if (token) {
            // Special handling for Admin Demo Login or Mock Login (Dev mode)
            if (token === 'admin_demo_token' || token?.startsWith('mock_')) {
                const role = token === 'admin_demo_token' ? 'SuperAdmin' : 
                             token === 'mock_agency_token' ? 'Agency' : 
                             token === 'mock_restaurant_token' ? 'Restaurant' : 'Customer';
                             
                const mockUser: User = {
                    id: role === 'SuperAdmin' ? 50 : role === 'Agency' ? 101 : role === 'Restaurant' ? 103 : 102,
                    username: token === 'admin_demo_token' ? 'yavuz50' : `mock_${role.toLowerCase()}`,
                    email: token === 'admin_demo_token' ? 'admin@tourkia.com' : `${role.toLowerCase()}@tourkia.com`,
                    first_name: token === 'admin_demo_token' ? 'Admin' : 'Mock',
                    last_name: token === 'admin_demo_token' ? 'Yavuz' : role,
                    is_agency: role === 'Agency',
                    is_staff: role === 'SuperAdmin',
                    role: role
                };
                setUser(mockUser);
                setIsLoading(false);
                return mockUser;
            }

            try {
                const userData = await fetchAPI('/auth/user/', {
                    headers: auth.getAuthHeaders()
                });

                // --- SESSION GUARD: Anomali Kontrolü (Temporarily disabled) ---
                /*
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
                */
                // KOMUT 110: Rol Verisini Zorla Çek ve Kaydet (Extract-and-Force-Role-State)
                if (userData) {
                    let forcedRole = userData.role;
                    if (!forcedRole) {
                        // Backend rol döndürmüyorsa, yetkilere bakarak zorla belirle
                        if (userData.username === 'yavuz50' || userData.is_staff) {
                            forcedRole = 'admin';
                        } else if (userData.is_agency) {
                            forcedRole = 'agency';
                        } else {
                            // Check if a businessType was previously intended, else default
                            forcedRole = 'customer';
                        }
                        userData.role = forcedRole;
                    }
                    
                    // Hafızada tutmakla kalma, anında LocalStorage'a mühürle!
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('userRole', forcedRole);
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
