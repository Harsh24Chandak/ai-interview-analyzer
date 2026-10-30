import React from 'react';

export default function PageHeader({ breadcrumbs = [], title, subtitle, actions }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
      <div>
        {breadcrumbs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[var(--text-muted)] text-xs font-mono-tabular">/</span>}
                <span
                  className={`label-caps text-[11px] ${
                    idx === breadcrumbs.length - 1 ? 'text-[#42C6D9]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {bc}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
