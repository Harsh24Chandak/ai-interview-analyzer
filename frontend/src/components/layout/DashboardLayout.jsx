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
    <div className={`min-h-screen flex ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#060913] text-slate-100'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r transition-transform lg:translate-x-0 flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isLight ? 'bg-white border-slate-200' : 'bg-[#0b101e] border-slate-800/80'}`}
      >
        <div>
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/70">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/35">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight block leading-tight">AI Interview</span>
                <span className="text-xs text-indigo-400 font-semibold block">Career Intelligence v3.0</span>
              </div>
            </Link>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-xl text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-slate-800/70 space-y-3">
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="truncate">
              <p className="text-base font-bold truncate">{user?.full_name || 'Candidate'}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.target_role || 'Full Stack Engineer'}</p>
            </div>
            <button
              onClick={toggleTheme}
              title="Toggle Dark/Light Theme"
              className="p-2.5 rounded-xl border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <header
          className={`sticky top-0 z-30 h-20 px-6 lg:px-10 border-b flex items-center justify-between backdrop-blur-md ${
            isLight ? 'bg-white/90 border-slate-200' : 'bg-[#060913]/85 border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                {NAV_ITEMS.find((n) => location.pathname.startsWith(n.path))?.label || 'Workspace'}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                AI Career Readiness • STAR Telemetry • Live Code & Rubric Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/interview/setup"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Mic className="w-4 h-4" />
              Quick Mock Interview
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 w-full max-w-[1600px] mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
