import React from 'react';

export default function Badge({ variant = 'primary', size = 'md', children, className = '' }) {
  const variants = {
    primary: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    gray: 'bg-slate-500/15 text-slate-300 border-slate-500/35',
  };
  const sizes = {
    sm: 'px-3 py-1 text-xs font-semibold',
    md: 'px-3.5 py-1.5 text-sm font-semibold',
    lg: 'px-4 py-2 text-base font-bold',
  };
  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}
