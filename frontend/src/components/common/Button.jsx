import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  materialIcon,
  children,
  className = '',
  disabled,
  ...props
}) {
  const variants = {
    primary: 'btn-primary-violet text-white font-semibold',
    secondary: 'bg-[var(--bg-elevated)] hover:bg-[#1E2E48] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]',
    outline: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]',
    danger: 'bg-[#EF7280]/10 hover:bg-[#EF7280]/20 text-[#EF7280] border border-[#EF7280]/30',
    ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    cyan: 'bg-[#42C6D9]/15 hover:bg-[#42C6D9]/25 text-[#42C6D9] border border-[#42C6D9]/30',
    emerald: 'bg-[#36C995]/15 hover:bg-[#36C995]/25 text-[#36C995] border border-[#36C995]/30',
  };
  const sizes = {
    xs: 'px-2.5 py-1 text-xs rounded-[4px] gap-1.5',
    sm: 'px-3 py-1.5 text-xs rounded-[6px] gap-1.5',
    md: 'px-4 py-2 text-sm rounded-[6px] gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-[6px] gap-2',
  };
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : materialIcon ? (
        <span className="material-symbols-outlined text-[16px] leading-none">{materialIcon}</span>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
