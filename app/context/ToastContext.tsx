'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '../components/ui/cn';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  /** Bir toast bildirimi gösterir. Varsayılan tip 'info'. */
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TYPE_STYLES: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
  success: {
    bar: 'border-l-green-500',
    icon: (
      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bar: 'border-l-red-500',
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    bar: 'border-l-amber-500',
    icon: (
      <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  info: {
    bar: 'border-l-brand-primary',
    icon: (
      <svg className="h-5 w-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value: ToastContextType = {
    show,
    success: useCallback((m: string) => show(m, 'success'), [show]),
    error: useCallback((m: string) => show(m, 'error'), [show]),
    info: useCallback((m: string) => show(m, 'info'), [show]),
    warning: useCallback((m: string) => show(m, 'warning'), [show]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-control border-l-4 bg-white px-4 py-3 shadow-card-hover',
              'animate-[fadeInDown_0.2s_ease-out]',
              TYPE_STYLES[toast.type].bar,
            )}
          >
            <span className="mt-0.5 shrink-0">{TYPE_STYLES[toast.type].icon}</span>
            <p className="flex-1 text-sm font-medium text-gray-800">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Kapat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
