import React from 'react';

export default function Card({ children, padding = 'p-6 sm:p-7', hover = false, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md shadow-xl shadow-black/20 ${padding} ${
        hover ? 'hover:border-indigo-500/45 hover:shadow-indigo-950/30 transition-all duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
