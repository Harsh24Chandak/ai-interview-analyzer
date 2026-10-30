import React from 'react';

export default function Badge({ variant = 'primary', size = 'sm', children, className = '' }) {
  const variants = {
    primary: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    gray: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variants[variant] || variants.primary} ${sizes[size] || sizes.sm} ${className}`}>
      {children}
    </span>
  );
}
