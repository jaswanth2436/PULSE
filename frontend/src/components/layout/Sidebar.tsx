import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Eye,
  Sliders,
  BarChart2,
  FileText,
  Play,
  Zap,
  Radio,
  User,
  Settings,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/appStore';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/intersection', icon: Eye, label: 'Intersection Intelligence', end: false },
  { to: '/intent-studio', icon: Sliders, label: 'Intent Studio', end: false },
  { to: '/performance-lab', icon: BarChart2, label: 'Performance Lab', end: false },
  { to: '/reports', icon: FileText, label: 'Reports', end: false },
];

export default function Sidebar() {
  const { state } = useAppStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside
      className="app-sidebar fixed left-0 top-0 h-screen w-64 flex flex-col z-30"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* ── Brand & Logo ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#f5b942] flex items-center justify-center flex-shrink-0 shadow-[0_0_22px_rgba(245,185,66,.22)]">
          <Radio className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="text-white font-black text-lg leading-none tracking-[0.2em] flex items-center gap-1.5">
            <span>PULSE</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#f5b942]/15 text-[#f5b942] border border-[#f5b942]/30">OPS</span>
          </div>
          <div className="text-[#8ba7c7] text-[10px] mt-1 tracking-wider uppercase truncate">
            Intelligent Traffic Operations
          </div>
        </div>
      </div>

      {/* ── Guided Demo Hero Shortcut ─────────────────────────────── */}
      <div className="px-3 pt-4 pb-2">
        <NavLink
          to="/demo"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow-sm',
              isActive
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-400/30 text-blue-200 hover:border-blue-400 hover:text-white'
            )
          }
        >
          <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="truncate block font-bold">Start Guided Demo</span>
            <span className="text-[10px] text-slate-300 block font-normal">Judge Presentation Mode</span>
          </div>
          <Play className="h-3 w-3 text-slate-300 flex-shrink-0" />
        </NavLink>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Primary navigation">
        <div className="text-[10px] font-bold text-[#4a6180] uppercase tracking-[0.2em] px-3 mb-2 pt-2">
          Operations
        </div>

        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-blue-600/20 text-white border-l-[3px] border-l-blue-400 font-semibold'
                  : 'text-[#8ba7c7] hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  style={{ width: 16, height: 16, flexShrink: 0 }}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? 'text-blue-400' : 'text-[#4a6180] group-hover:text-blue-300'}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Operator & System Status Area ──────────────────── */}
      <div className="px-4 py-4 border-t border-white/10 flex-shrink-0 space-y-3 bg-[#0c1524]">
        {/* Operator Profile Card */}
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">Traffic Engineer</p>
            <p className="text-[10px] text-[#7895b6] truncate">Junction Node A-04</p>
          </div>
          <NavLink to="/demo" title="Help / Documentation" className="text-[#7895b6] hover:text-white">
            <HelpCircle className="h-3.5 w-3.5" />
          </NavLink>
        </div>

        {/* Telemetry and Model status */}
        <div className="flex items-center justify-between text-xs text-[#8ba7c7] px-1">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'h-2 w-2 rounded-full',
                state.wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              )}
            />
            <span className="text-[11px] font-medium">
              {state.wsConnected ? '10 Hz Telemetry' : 'Offline'}
            </span>
          </div>

          <div className="text-[11px] font-mono tabular-nums text-slate-400">
            {time.toLocaleTimeString()}
          </div>
        </div>

        {/* Competition Badge */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">★</span>
            <span className="text-white text-[11px] font-semibold">Neural Storm 2026</span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono">FT-01</span>
        </div>
      </div>
    </aside>
  );
}
