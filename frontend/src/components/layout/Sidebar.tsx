import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Eye, Sliders, BarChart2, FileText, Play, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/appStore';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/intersection', icon: Eye, label: 'Intersection Intelligence' },
  { to: '/intent-studio', icon: Sliders, label: 'Intent Studio' },
  { to: '/performance-lab', icon: BarChart2, label: 'Performance Lab' },
  { to: '/reports', icon: FileText, label: 'Reports' },
];
export default function Sidebar() {
  const { state } = useAppStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-navy-900 flex flex-col z-30" style={{ backgroundColor: '#0f172a' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-none tracking-wide">PULSE</div>
            <div className="text-slate-400 text-xs mt-0.5">Traffic Intelligence</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 mb-3">Navigation</div>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
              isActive
                ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400 pl-[10px]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('h-4 w-4 flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white')} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Demo link */}
        <div className="pt-3 mt-3 border-t border-white/10">
          <NavLink
            to="/demo"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 transition-all"
          >
            <Play className="h-4 w-4 flex-shrink-0" />
            <span>Live Demo</span>
            <span className="ml-auto h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          </NavLink>
        </div>
      </nav>

      {/* Status */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        {/* Connection status */}
        <div className="flex items-center gap-2.5">
          <div className={clsx('h-2 w-2 rounded-full flex-shrink-0', state.wsConnected ? 'bg-green-400' : 'bg-red-400')}>
            {state.wsConnected && <div className="h-2 w-2 rounded-full bg-green-400 animate-ping" />}
          </div>
          <span className="text-xs text-slate-400 flex-1 truncate">
            {state.wsConnected ? 'Live Connected' : 'Offline Mode'}
          </span>
        </div>

        {/* Model status */}
        <div className="flex items-center gap-2.5">
          <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-slate-400 truncate">
            {state.trafficState?.modelStatus ?? 'Model inactive'}
          </span>
        </div>

        {/* Time */}
        <div className="text-xs text-slate-500 font-mono">
          {time.toLocaleTimeString()}
        </div>

        {/* Competition badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg px-3 py-2 mt-1">
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-amber-400 fill-current flex-shrink-0">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <div>
            <div className="text-xs font-semibold text-white leading-none">Neural Storm</div>
            <div className="text-xs text-slate-400 leading-none mt-0.5">2026</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
