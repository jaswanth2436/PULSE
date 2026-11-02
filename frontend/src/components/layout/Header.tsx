import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { fmtTime } from '../../utils/formatters';
import { Bell, MapPin, Radio, ShieldCheck, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

type SourceKind = 'SIMULATION' | 'VIDEO' | 'CAMERA' | 'OFFLINE';

function resolveSource(videoStatus?: string): SourceKind {
  if (!videoStatus || videoStatus === 'idle') return 'OFFLINE';
  if (videoStatus === 'playing') return 'VIDEO';
  if (videoStatus === 'camera')  return 'CAMERA';
  return 'SIMULATION';
}

const SOURCE_STYLES: Record<SourceKind, { badge: string; dot: string; label: string }> = {
  SIMULATION: { badge: 'border-amber-200 text-amber-700 bg-amber-50', dot: 'bg-amber-500', label: 'SIMULATION STREAM' },
  VIDEO:      { badge: 'border-purple-200 text-purple-700 bg-purple-50', dot: 'bg-purple-500', label: 'VIDEO REPLAY' },
  CAMERA:     { badge: 'border-blue-200 text-blue-700 bg-blue-50', dot: 'bg-blue-500', label: 'EDGE WEBCAM' },
  OFFLINE:    { badge: 'border-rose-200 text-rose-700 bg-rose-50', dot: 'bg-rose-500', label: 'OFFLINE' },
};

export default function Header({ title, subtitle }: HeaderProps) {
  const { state } = useAppStore();
  const ts = state.trafficState;
  const [showAlerts, setShowAlerts] = useState(false);

  const source = resolveSource(ts?.videoStatus);
  const srcConfig = SOURCE_STYLES[source];
  const alertCount = ts?.alerts?.length ?? 0;

  return (
    <header className="pulse-topbar h-16 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
      {/* ── Left: Page Title & Context ────────────────────────────── */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white leading-none truncate">{title}</h1>
            <span className="text-slate-600">/</span>
            <span className="hidden md:flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <MapPin className="h-3 w-3 text-[#f5b942]" />
              <span>Corridor Node A-04</span>
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Right: Indicators & Context Actions ────────────────────── */}
      <div className="flex items-center gap-2.5 text-xs flex-shrink-0">
        {/* Source indicator pill */}
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wider',
            srcConfig.badge
          )}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', srcConfig.dot)} />
          {srcConfig.label}
        </span>

        {/* Model status */}
        <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-700 bg-slate-50 font-medium text-[11px]">
          <span>YOLOv8 Edge:</span>
          <strong className="text-slate-900 font-semibold">{ts?.modelStatus ?? 'Active'}</strong>
        </span>

        {/* Controller mode */}
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 bg-blue-50 font-semibold text-[11px]">
          <span>Mode:</span>
          <span className="uppercase">{ts?.controller ?? 'PULSE'}</span>
        </span>

        {/* Safety Agent Status */}
        <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 font-medium text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>NEMA Safety Guard</span>
        </span>

        {/* Alert Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
            title="Operational Alerts"
          >
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {alertCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Drawer */}
          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="font-bold text-xs text-slate-800">Operational Alerts ({alertCount})</span>
                <span className="text-[10px] text-slate-400">Real-time Safety Feed</span>
              </div>

              {alertCount > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ts?.alerts.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span>{a.category}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{a.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>No active signal anomalies detected</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
