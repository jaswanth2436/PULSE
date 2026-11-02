import { clsx } from 'clsx';

type StatusKind =
  | 'online'
  | 'offline'
  | 'warning'
  | 'error'
  | 'simulation'
  | 'video'
  | 'camera';

type Size = 'sm' | 'md';

interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
  size?: Size;
}

const statusConfig: Record<StatusKind, { dot: string; pill: string; defaultLabel: string }> = {
  online:     { dot: 'bg-emerald-500', pill: 'border-emerald-200 bg-emerald-50  text-emerald-700', defaultLabel: 'Online'     },
  offline:    { dot: 'bg-slate-400',   pill: 'border-slate-200   bg-slate-50    text-slate-600',   defaultLabel: 'Offline'    },
  warning:    { dot: 'bg-amber-500',   pill: 'border-amber-200   bg-amber-50    text-amber-700',   defaultLabel: 'Warning'    },
  error:      { dot: 'bg-red-500',     pill: 'border-red-200     bg-red-50      text-red-700',     defaultLabel: 'Error'      },
  simulation: { dot: 'bg-amber-400',   pill: 'border-amber-200   bg-amber-50    text-amber-700',   defaultLabel: 'Simulation' },
  video:      { dot: 'bg-purple-500',  pill: 'border-purple-200  bg-purple-50   text-purple-700',  defaultLabel: 'Video'      },
  camera:     { dot: 'bg-blue-500',    pill: 'border-blue-200    bg-blue-50     text-blue-700',    defaultLabel: 'Camera'     },
};

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  const displayLabel = label ?? cfg.defaultLabel;

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-semibold',
        cfg.pill,
        size === 'sm' ? 'gap-1 px-2 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('rounded-full flex-shrink-0', cfg.dot, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      {displayLabel}
    </span>
  );
}
