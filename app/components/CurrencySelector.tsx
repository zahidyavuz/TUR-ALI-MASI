'use client';
import { useState, useRef, useEffect } from 'react';
import { useCurrency, Currency } from '../context/CurrencyContext';

export default function CurrencySelector() {
    const { currency, setCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currencies: { code: Currency; label: string; flag: string; symbol: string }[] = [
        { code: 'EUR', label: 'EUR', flag: '🇪🇺', symbol: '€' },
        { code: 'USD', label: 'USD', flag: '🇺🇸', symbol: '$' },
        { code: 'TRY', label: 'TRY', flag: '🇹🇷', symbol: '₺' },
        { code: 'CNY', label: 'CNY', flag: '🇨🇳', symbol: '¥' },
        { code: 'RUB', label: 'RUB', flag: '🇷🇺', symbol: '₽' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCur = currencies.find(c => c.code === currency) || currencies[0];

    return (
        <div className="relative dropdown-container" ref={dropdownRef} data-dropdown="currencySelect">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-full transition-colors border border-slate-200 dark:border-slate-700 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20"
                aria-label="Para Birimi Seçimi"
            >
                <span className="text-base leading-none">{selectedCur.flag}</span>
                <span>{selectedCur.code}</span>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 text-gray-400 dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-[120%] w-36 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    <div className="py-2">
                        {currencies.map((cur) => (
                            <button
                                key={cur.code}
                                onClick={() => {
                                    setCurrency(cur.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors flex items-center justify-between group ${currency === cur.code ? 'bg-blue-50 dark:bg-slate-700 text-[#008cb3] dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-base group-hover:scale-110 transition-transform">{cur.flag}</span>
                                    <span>{cur.code}</span>
                                </span>
                                <span className="text-gray-400 font-medium scale-90">{cur.symbol}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
