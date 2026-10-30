import React from 'react';

export default function ChartCard({ title, subtitle, materialIcon = 'ssid_chart', rightSlot, children, footerSlot, className = '' }) {
  return (
    <div className={`obsidian-card p-5 flex flex-col justify-between ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          {materialIcon && (
            <span className="material-symbols-outlined text-[#786BFF] text-[20px] mt-0.5">{materialIcon}</span>
          )}
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] leading-snug">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
      <div className="flex-1 w-full">{children}</div>
      {footerSlot && <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">{footerSlot}</div>}
    </div>
  );
}
