'use client';

import React from 'react';
import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
} as const;

export default function Card({
  hoverable = false,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card bg-card-bg shadow-card',
        hoverable && 'transition-shadow hover:shadow-card-hover',
        PADDING_CLASSES[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
