import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Code2, Cpu, FileText, Wallet,
  LogOut, Menu, X, Moon, Sun, User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../lib/constants';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/service', label: 'Service', icon: Wrench },
  { to: '/software', label: 'Software Development', icon: Code2 },
  { to: '/sparepart', label: 'Sparepart', icon: Cpu },
  { to: '/proposal', label: 'Proposal Penawaran', icon: FileText },
  { to: '/finance', label: 'Keuangan', icon: Wallet },
];

const mobileNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/service', label: 'Service', icon: Wrench },
  { to: '/software', label: 'Software', icon: Code2 },
  { to: '/sparepart', label: 'Part', icon: Cpu },
  { to: '/proposal', label: 'Proposal', icon: FileText },
  { to: '/finance', label: 'Keuangan', icon: Wallet },
];

export default function AppLayout({ children }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 no-print">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">Khawarizmi</p>
              <p className="text-[11px] text-slate-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[profile?.role] || '-'}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Wrench size={16} />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">Khawarizmi</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 no-print" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50" />
          <div
            className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 px-3">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 px-3 mb-2">{ROLE_LABELS[profile?.role] || '-'}</p>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut size={18} />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center justify-around px-2 py-1.5">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium ${
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
