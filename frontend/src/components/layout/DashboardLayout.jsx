import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Mic,
  BarChart3,
  History,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/resume-analyzer', label: 'Resume Analyzer', icon: FileText },
  { path: '/job-analyzer', label: 'Job Match & Gaps', icon: Briefcase },
  { path: '/interview/setup', label: 'AI Mock Interview', icon: Mic },
  { path: '/performance', label: 'Performance Analytics', icon: BarChart3 },
  { path: '/history', label: 'Interview History', icon: History },
  { path: '/profile', label: 'Profile & Career', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }) {
  const { user, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-slate-800/80'}`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800/60">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">AI Interview</span>
              <span className="text-[11px] text-indigo-400 font-medium block">Career Intelligence</span>
            </div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate">
              <p className="text-sm font-semibold truncate">{user?.full_name || 'Candidate'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.target_role || 'Software Engineer'}</p>
            </div>
            <button
              onClick={toggleTheme}
              title="Toggle Dark/Light Theme"
              className="p-2 rounded-lg border border-slate-700/80 text-slate-400 hover:text-white"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header
          className={`sticky top-0 z-30 h-16 px-6 border-b flex items-center justify-between backdrop-blur-md ${
            isLight ? 'bg-white/85 border-slate-200' : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-400">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight">
              {NAV_ITEMS.find((n) => location.pathname.startsWith(n.path))?.label || 'Workspace'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/interview/setup"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Mic className="w-3.5 h-3.5" />
              Quick Mock Interview
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
