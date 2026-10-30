import React from 'react';

export default function Input({ label, rightLabel, materialIcon, className = '', ...props }) {
  return (
    <div className="w-full">
      {(label || rightLabel) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <label className="label-caps text-[var(--text-secondary)]">{label}</label>}
          {rightLabel && <span className="label-caps text-[10px] text-[#42C6D9]">{rightLabel}</span>}
        </div>
      )}
      <div className="relative">
        {materialIcon && (
          <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {materialIcon}
          </span>
        )}
        <input
          className={`w-full obsidian-input py-2.5 text-sm ${materialIcon ? 'pl-9 pr-3.5' : 'px-3.5'} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
