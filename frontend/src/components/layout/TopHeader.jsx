import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { WORKSPACE_NAV_ITEMS } from './AppSidebar';

export default function TopHeader({ onOpenMobileMenu }) {
  const { user } = useAuth();
  const location = useLocation();
  const activeNav = WORKSPACE_NAV_ITEMS.find(
    (n) => location.pathname === n.path || (n.matchPrefix && location.pathname.startsWith(n.matchPrefix))
  );

  return (
    <header className="sticky top-0 z-20 h-14 px-4 lg:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <span className="label-caps text-[var(--text-secondary)]">WORKSPACE</span>
        <span className="text-[var(--text-muted)] text-xs">/</span>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {activeNav?.label || 'Executive Cockpit'}
        </span>
        <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] label-caps text-[10px] text-[var(--text-secondary)]">
          TELEMETRY RUNTIME
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="w-2 h-2 rounded-full bg-[#36C995]" />
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">
            AI Engine: Active (v4.2)
          </span>
        </div>

        <Link
          to="/interview/setup"
          className="btn-primary-violet px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
          Launch Mock
        </Link>

        <Link
          to="/profile"
          className="w-7 h-7 rounded-full bg-[#17243A] border border-[#26344A] flex items-center justify-center text-[11px] font-mono-tabular font-bold text-[#C5C0FF]"
          title={user?.full_name || 'Candidate Profile'}
        >
          {(user?.full_name || 'AR')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
