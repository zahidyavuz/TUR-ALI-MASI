'use client';

import React from 'react';
import { cn } from './cn';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-brand-primary/10 text-brand-primary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

export default function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
