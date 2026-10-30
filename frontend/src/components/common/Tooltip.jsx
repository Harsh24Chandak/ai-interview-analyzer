import React from 'react';

export default function Tooltip({ text, children }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      {text && (
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-[4px] bg-[#1A2840] border border-[#26344A] px-2 py-1 text-[11px] text-[#F4F7FC] shadow-lg z-50">
          {text}
        </span>
      )}
    </span>
  );
}
