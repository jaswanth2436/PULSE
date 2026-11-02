import { useAppStore } from '../../store/appStore';
import { fmtTime } from '../../utils/formatters';
import { clsx } from 'clsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { state } = useAppStore();
  const ts = state.trafficState;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {/* Video source */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Source:</span>
          <span className={clsx(
            'px-2 py-0.5 rounded text-xs font-medium',
            ts?.videoStatus === 'playing' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          )}>
            {ts?.videoStatus === 'playing' ? 'Video Active' : ts?.videoStatus === 'idle' ? 'Simulation' : 'Idle'}
          </span>
        </div>
        {/* Model status */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Model:</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            {ts?.modelStatus ?? 'Mock Mode'}
          </span>
        </div>
        {/* Controller */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Controller:</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {ts?.controller ? ts.controller.toUpperCase() : 'PULSE'}
          </span>
        </div>
        {/* Last update */}
        <div className="text-slate-400 text-xs">
          Updated: {fmtTime(ts?.timestamp)}
        </div>
      </div>
    </header>
  );
}

