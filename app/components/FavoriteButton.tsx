'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth as authHelper } from '../lib/auth';
import { fetchAPI } from '../lib/api';

interface FavoriteButtonProps {
    tourId: string;
    className?: string; // Optional custom styling
}

export default function FavoriteButton({ tourId, className = '' }: FavoriteButtonProps) {
    const { user } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Only run check if user is logged in
        if (user && tourId) {
            checkStatus();
        }
    }, [user, tourId]);

    const checkStatus = async () => {
        try {
            const token = authHelper.getAccessToken();
            if (!token) return;

            const data = await fetchAPI(`/users/wishlist/check/${tourId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (data) {
                setIsWishlisted(data.is_wishlisted);
            }
        } catch (error) {
            console.error('Check wishlist error:', error);
        }
    };

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            // Need to login, maybe emit an event or route to login
            alert('Lütfen favorilere eklemek için giriş yapınız.');
            window.location.href = '/login';
            return;
        }

        if (isLoading) return;

        setIsLoading(true);
        // Optimistic UI update
        setIsWishlisted(!isWishlisted);

        try {
            const token = authHelper.getAccessToken();
            const data = await fetchAPI(`/users/wishlist/toggle/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ tour: tourId })
            });

            if (!data) {
                // Revert if failed
                setIsWishlisted(isWishlisted);
            } else {
                setIsWishlisted(data.is_wishlisted);
            }
        } catch (error) {
            // Revert if failed
            setIsWishlisted(isWishlisted);
            console.error('Toggle request error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={toggleFavorite}
            aria-label={isWishlisted ? "Favorilerden Çıkar" : "Favorilere Ekle"}
            disabled={isLoading}
            className={`transition-colors flex items-center justify-center ${
                isWishlisted 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-500 bg-white/90 hover:text-red-500 hover:bg-red-50'
            } ${className}`}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    );
}
