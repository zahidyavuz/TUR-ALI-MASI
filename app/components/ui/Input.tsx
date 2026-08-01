'use client';

import React from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-semibold text-foreground"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-control border bg-card-bg px-3 py-2.5 text-sm text-gray-900',
          'placeholder:text-gray-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary',
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
