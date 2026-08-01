'use client';

import React from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-white hover:bg-brand-primary-dark focus-visible:ring-brand-primary',
  secondary:
    'bg-brand-dark text-white hover:opacity-90 focus-visible:ring-brand-dark',
  outline:
    'border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white focus-visible:ring-brand-primary',
  ghost:
    'text-brand-primary hover:bg-brand-primary/10 focus-visible:ring-brand-primary',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
