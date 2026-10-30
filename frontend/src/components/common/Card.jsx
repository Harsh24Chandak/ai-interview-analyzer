import React from 'react';

export default function Card({ children, padding = 'p-6', hover = false, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/75 backdrop-blur-md ${padding} ${
        hover ? 'hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-950/20 transition-all duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
