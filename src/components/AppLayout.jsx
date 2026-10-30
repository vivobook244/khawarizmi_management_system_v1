import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Code2, Cpu, FileText, Wallet,
  LogOut, Menu, X, Moon, Sun, User, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../lib/constants';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, group: 'Ringkasan' },
  { to: '/service', label: 'Service', icon: Wrench, group: 'Operasional' },
  { to: '/software', label: 'Software Development', icon: Code2, group: 'Operasional' },
  { to: '/sparepart', label: 'Sparepart', icon: Cpu, group: 'Operasional' },
  { to: '/proposal', label: 'Proposal Penawaran', icon: FileText, group: 'Bisnis' },
  { to: '/finance', label: 'Keuangan', icon: Wallet, group: 'Bisnis' },
];

export default function AppLayout({ children }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePage = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const Navigation = ({ mobile = false }) => {
    let currentGroup = '';
    return (
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const showGroup = currentGroup !== item.group;
          currentGroup = item.group;
          return (
            <div key={item.to}>
              {showGroup && (
                <p className={`px-3 ${item.to === '/' ? 'mb-2' : 'mt-6 mb-2'} text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400`}>
                  {item.group}
                </p>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => mobile && setMobileOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-600" />}
                    <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="text-brand-500" />}
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>
    );
  };

  const ProfileBlock = ({ mobile = false }) => (
    <div className={`flex items-center gap-3 ${mobile ? 'px-4 py-3' : 'px-3 py-3'}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
        <User size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profile?.full_name || 'Pengguna'}</p>
        <p className="mt-0.5 text-xs text-slate-500">{ROLE_LABELS[profile?.role] || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/20">
            <Wrench size={19} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Khawarizmi</p>
            <p className="mt-0.5 text-[10px] font-medium tracking-[0.13em] text-slate-400">MANAGEMENT SYSTEM</p>
          </div>
        </div>
        <Navigation />
        <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
          <ProfileBlock />
          <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          </button>
          <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><Wrench size={17} /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">Khawarizmi</p>
            <p className="truncate text-[11px] text-slate-500">{activePage?.label || 'Management System'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} aria-label="Ganti tema" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setMobileOpen(true)} aria-label="Buka navigasi" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi utama">
          <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Wrench size={17} /></div>
                <div><p className="text-sm font-bold text-slate-900 dark:text-white">Khawarizmi</p><p className="text-[10px] tracking-wider text-slate-400">MANAGEMENT SYSTEM</p></div>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Tutup menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <Navigation mobile />
            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <ProfileBlock mobile />
              <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}{theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
              </button>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><LogOut size={16} /> Keluar</button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-5 pb-8 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
