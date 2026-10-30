import React from 'react';

export default function Card({ children, padding = 'p-5', hover = false, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] ${padding} ${
        hover ? 'hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-colors duration-150 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
