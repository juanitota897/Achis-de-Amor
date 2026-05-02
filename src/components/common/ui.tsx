/**
 * Shared, lightweight UI primitives. No external UI library — keeps bundle small.
 */

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

// ─── Button ───────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50';
    const variants = {
      primary: 'bg-terracotta-500 text-white shadow hover:bg-terracotta-600 active:scale-[0.98]',
      secondary: 'bg-cream-100 text-cream-800 hover:bg-cream-200 active:scale-[0.98]',
      ghost: 'text-cream-700 hover:bg-cream-100',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

// ─── Input ────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className = '', ...rest }, ref) => {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-cream-700">{label}</span>}
      <input
        ref={ref}
        className={`rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-cream-900 outline-none placeholder:text-cream-400 focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-200 ${className}`}
        {...rest}
      />
    </label>
  );
});

// ─── Textarea ─────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', ...rest }, ref) => {
    return (
      <label className="flex flex-col gap-1 h-full">
        {label && <span className="text-xs font-medium text-cream-700">{label}</span>}
        <textarea
          ref={ref}
          className={`flex-1 rounded-lg border border-cream-200 bg-white p-3 text-sm font-mono leading-relaxed text-cream-900 outline-none placeholder:text-cream-400 focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-200 resize-none ${className}`}
          {...rest}
        />
      </label>
    );
  },
);

// ─── Select ───────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...rest }, ref) => {
    return (
      <label className="flex flex-col gap-1">
        {label && <span className="text-xs font-medium text-cream-700">{label}</span>}
        <select
          ref={ref}
          className={`rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-cream-900 outline-none focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-200 ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  },
);

// ─── Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-cream-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'increase' | 'decrease' | 'even' | 'start' | 'mixed' | 'error' | 'warning';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-cream-100 text-cream-700',
    increase: 'bg-sage-100 text-sage-800',
    decrease: 'bg-terracotta-100 text-terracotta-800',
    even: 'bg-cream-100 text-cream-700',
    start: 'bg-cream-200 text-cream-800',
    mixed: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant] ?? variants.default}`}>
      {children}
    </span>
  );
}
