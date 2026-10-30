import React from 'react';

export default function Select({ label, options = [], children, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block label-caps text-[var(--text-secondary)] mb-1.5">{label}</label>}
      <select className={`w-full obsidian-input px-3.5 py-2.5 text-sm ${className}`} {...props}>
        {children
          ? children
          : options.map((opt, idx) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={idx} value={val} className="bg-[#0C1422] text-[#F4F7FC]">
                  {lbl}
                </option>
              );
            })}
      </select>
    </div>
  );
}
