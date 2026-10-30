import React from 'react';

export default function Badge({ variant = 'primary', size = 'sm', children, className = '' }) {
  const variants = {
    primary: 'bg-[#786BFF]/15 text-[#C5C0FF] border-[#786BFF]/30',
    violet: 'bg-[#786BFF]/15 text-[#C5C0FF] border-[#786BFF]/30',
    cyan: 'bg-[#42C6D9]/12 text-[#42C6D9] border-[#42C6D9]/30',
    info: 'bg-[#42C6D9]/12 text-[#42C6D9] border-[#42C6D9]/30',
    success: 'bg-[#36C995]/12 text-[#36C995] border-[#36C995]/30',
    emerald: 'bg-[#36C995]/12 text-[#36C995] border-[#36C995]/30',
    warning: 'bg-[#F1B65D]/12 text-[#F1B65D] border-[#F1B65D]/30',
    amber: 'bg-[#F1B65D]/12 text-[#F1B65D] border-[#F1B65D]/30',
    danger: 'bg-[#EF7280]/12 text-[#EF7280] border-[#EF7280]/30',
    rose: 'bg-[#EF7280]/12 text-[#EF7280] border-[#EF7280]/30',
    gray: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  };
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };
  return (
    <span className={`inline-flex items-center label-caps rounded-[4px] border ${variants[variant] || variants.primary} ${sizes[size] || sizes.sm} ${className}`}>
      {children}
    </span>
  );
}
