import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const WORKSPACE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/resume-analyzer', label: 'Resume Analyzer', icon: 'description' },
  { path: '/job-analyzer', label: 'Job Compatibility', icon: 'rule_folder' },
  { path: '/interview/setup', matchPrefix: '/interview', label: 'AI Mock Interviews', icon: 'videocam' },
  { path: '/performance', label: 'Performance Analytics', icon: 'insights' },
  { path: '/history', label: 'Interview History', icon: 'history' },
  { path: '/bookmarks', label: 'Saved Questions', icon: 'bookmark' },
  { path: '/profile', label: 'Profile & Career', icon: 'badge' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export default function AppSidebar({ collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)] transition-all duration-200 ${
          collapsed ? 'w-[64px]' : 'w-[240px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center text-[#786BFF] shrink-0">
                <span className="material-symbols-outlined text-[18px]">radar</span>
              </div>
              {!collapsed && (
                <div className="truncate">
                  <span className="text-sm font-semibold text-[var(--text-primary)] block leading-none truncate">
                    Interview Analyzer
                  </span>
                  <span className="label-caps text-[9px] text-[#42C6D9] block mt-0.5">
                    Career Intelligence
                  </span>
                </div>
              )}
            </Link>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {collapsed ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.matchPrefix && location.pathname.startsWith(item.matchPrefix)) ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[inset_2px_0_0_#786BFF]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-[#786BFF]' : ''}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Candidate Footer */}
        <div className="p-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#17243A] border border-[#26344A] flex items-center justify-center text-xs font-mono-tabular font-bold text-[#C5C0FF] shrink-0">
                {(user?.full_name || 'AR')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user?.full_name || 'Candidate'}
                  </p>
                  <p className="label-caps text-[9px] text-[var(--text-secondary)] truncate">
                    {user?.target_role || 'Software Engineer'}
                  </p>
                </div>
              )}
            </Link>
            {!collapsed && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={toggleTheme}
                  title="Toggle Dark/Light Theme"
                  className="p-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {theme === 'light' ? 'dark_mode' : 'light_mode'}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[#EF7280] hover:bg-[#EF7280]/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
