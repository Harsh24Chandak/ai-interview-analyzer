import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50',
    secondary: 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700',
    outline: 'bg-transparent hover:bg-slate-800/70 text-slate-200 border border-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-300',
  };
  const sizes = {
    sm: 'px-3.5 py-2 text-sm rounded-xl gap-2',
    md: 'px-5 py-2.5 text-[15px] rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
  };
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}
