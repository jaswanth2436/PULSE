import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

type Color = 'blue' | 'teal' | 'amber' | 'red' | 'slate';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: Color;
}

const colorMap: Record<Color, { iconBg: string; iconText: string }> = {
  blue:  { iconBg: 'bg-blue-100',  iconText: 'text-blue-600'  },
  teal:  { iconBg: 'bg-teal-100',  iconText: 'text-teal-600'  },
  amber: { iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  red:   { iconBg: 'bg-red-100',   iconText: 'text-red-600'   },
  slate: { iconBg: 'bg-slate-100', iconText: 'text-slate-600' },
};

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = 'blue',
}: MetricCardProps) {
  const { iconBg, iconText } = colorMap[color];

  return (
    <div className="pulse-metric-card bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        {/* Labels */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-none">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-3xl font-bold text-slate-900 leading-none tabular-nums">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-slate-400 leading-none">{unit}</span>
            )}
          </div>
        </div>

        {/* Icon circle */}
        <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
          <Icon style={{ width: 18, height: 18 }} className={iconText} strokeWidth={2} />
        </div>
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
