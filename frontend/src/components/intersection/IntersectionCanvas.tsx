import { signalColor } from '../../utils/formatters';

interface ApproachInfo {
  signal: string;
  queued: number;
  vehicles: number;
}

interface IntersectionCanvasProps {
  approaches: Record<string, ApproachInfo>;
  selectedApproach?: string | null;
  onApproachClick?: (approach: string) => void;
  phase?: string;
  phaseRemaining?: number;
  compact?: boolean;
}

const APPROACHES = ['north', 'south', 'east', 'west'] as const;

export default function IntersectionCanvas({
  approaches,
  selectedApproach,
  onApproachClick,
  phase,
  phaseRemaining,
  compact = false,
}: IntersectionCanvasProps) {
  const size = compact ? 300 : 460;
  const cx = size / 2;
  const cy = size / 2;
  const roadW = size * 0.28;
  const half = roadW / 2;

  const getSignal = (approach: string) => approaches[approach]?.signal ?? 'RED';
  const getQueued = (approach: string) => approaches[approach]?.queued ?? 0;
  const getVehicles = (approach: string) => approaches[approach]?.vehicles ?? 0;

  // Queue bar dimensions
  const queueBarMax = 20;
  const queueBarH = compact ? 40 : 60;

  const handleClick = (approach: string) => onApproachClick?.(approach);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="select-none"
      aria-label="Four-way intersection diagram"
    >
      {/* Background */}
      <rect x={0} y={0} width={size} height={size} fill="#f8fafc" />

      {/* City blocks (corners) */}
      {[[0,0],[cx+half,0],[0,cy+half],[cx+half,cy+half]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={cx-half} height={cy-half} fill="#e2e8f0" rx={4} />
      ))}

      {/* Roads */}
      {/* North road */}
      <rect x={cx-half} y={0} width={roadW} height={cy-half} fill="#475569" />
      {/* South road */}
      <rect x={cx-half} y={cy+half} width={roadW} height={cy-half} fill="#475569" />
      {/* West road */}
      <rect x={0} y={cy-half} width={cx-half} height={roadW} fill="#475569" />
      {/* East road */}
      <rect x={cx+half} y={cy-half} width={cx-half} height={roadW} fill="#475569" />
      {/* Center box */}
      <rect x={cx-half} y={cy-half} width={roadW} height={roadW} fill="#374151" />

      {/* Lane dividers - dashed center lines */}
      <line x1={cx} y1={0} x2={cx} y2={cy-half} stroke="#fff" strokeWidth={1.5} strokeDasharray="6,6" opacity={0.4} />
      <line x1={cx} y1={cy+half} x2={cx} y2={size} stroke="#fff" strokeWidth={1.5} strokeDasharray="6,6" opacity={0.4} />
      <line x1={0} y1={cy} x2={cx-half} y2={cy} stroke="#fff" strokeWidth={1.5} strokeDasharray="6,6" opacity={0.4} />
      <line x1={cx+half} y1={cy} x2={size} y2={cy} stroke="#fff" strokeWidth={1.5} strokeDasharray="6,6" opacity={0.4} />

      {/* Stop lines */}
      <line x1={cx-half} y1={cy-half-4} x2={cx+half} y2={cy-half-4} stroke="white" strokeWidth={3} />
      <line x1={cx-half} y1={cy+half+4} x2={cx+half} y2={cy+half+4} stroke="white" strokeWidth={3} />
      <line x1={cx-half-4} y1={cy-half} x2={cx-half-4} y2={cy+half} stroke="white" strokeWidth={3} />
      <line x1={cx+half+4} y1={cy-half} x2={cx+half+4} y2={cy+half} stroke="white" strokeWidth={3} />

      {/* Crosswalks */}
      {[0,1,2,3,4].map(i => (
        <rect key={`cw-n-${i}`} x={cx-half+2+i*10} y={cy-half-18} width={8} height={12} fill="white" opacity={0.7} />
      ))}
      {[0,1,2,3,4].map(i => (
        <rect key={`cw-s-${i}`} x={cx-half+2+i*10} y={cy+half+8} width={8} height={12} fill="white" opacity={0.7} />
      ))}
      {[0,1,2,3,4].map(i => (
        <rect key={`cw-w-${i}`} x={cx-half-18} y={cy-half+2+i*10} width={12} height={8} fill="white" opacity={0.7} />
      ))}
      {[0,1,2,3,4].map(i => (
        <rect key={`cw-e-${i}`} x={cx+half+8} y={cy-half+2+i*10} width={12} height={8} fill="white" opacity={0.7} />
      ))}

      {/* Direction arrows */}
      <text x={cx} y={cy-half/2} textAnchor="middle" fill="white" fontSize={compact ? 14 : 16} opacity={0.5}>↑↓</text>
      <text x={cx} y={cy+half/2+6} textAnchor="middle" fill="white" fontSize={compact ? 14 : 16} opacity={0.5}>↑↓</text>
      <text x={cx-half/2} y={cy+5} textAnchor="middle" fill="white" fontSize={compact ? 14 : 16} opacity={0.5}>↔</text>
      <text x={cx+half/2} y={cy+5} textAnchor="middle" fill="white" fontSize={compact ? 14 : 16} opacity={0.5}>↔</text>

      {/* Signal heads */}
      {/* North (before entering) */}
      <SignalHead x={cx-half-22} y={cy-half-24} color={signalColor(getSignal('north'))} />
      {/* South */}
      <SignalHead x={cx+half+6} y={cy+half+6} color={signalColor(getSignal('south'))} />
      {/* East */}
      <SignalHead x={cx+half+6} y={cy-half-24} color={signalColor(getSignal('east'))} />
      {/* West */}
      <SignalHead x={cx-half-22} y={cy+half+6} color={signalColor(getSignal('west'))} />

      {/* Approach labels + queue indicators */}
      {/* North */}
      <ApproachLabel
        x={cx} y={compact ? 16 : 22}
        label="N" queued={getQueued('north')} vehicles={getVehicles('north')}
        selected={selectedApproach === 'north'}
        onClick={() => handleClick('north')}
        compact={compact}
      />
      {/* South */}
      <ApproachLabel
        x={cx} y={size - (compact ? 16 : 22)}
        label="S" queued={getQueued('south')} vehicles={getVehicles('south')}
        selected={selectedApproach === 'south'}
        onClick={() => handleClick('south')}
        compact={compact}
      />
      {/* West */}
      <ApproachLabel
        x={compact ? 22 : 32} y={cy}
        label="W" queued={getQueued('west')} vehicles={getVehicles('west')}
        selected={selectedApproach === 'west'}
        onClick={() => handleClick('west')}
        compact={compact}
        horizontal
      />
      {/* East */}
      <ApproachLabel
        x={size - (compact ? 22 : 32)} y={cy}
        label="E" queued={getQueued('east')} vehicles={getVehicles('east')}
        selected={selectedApproach === 'east'}
        onClick={() => handleClick('east')}
        compact={compact}
        horizontal
      />

      {/* Phase countdown in center */}
      {!compact && phase && (
        <>
          <circle cx={cx} cy={cy} r={26} fill="#0f172a" opacity={0.85} />
          <text x={cx} y={cy-4} textAnchor="middle" fill="white" fontSize={9} fontWeight={600}>
            {phase === 'PHASE_1' ? 'N-S' : 'E-W'}
          </text>
          <text x={cx} y={cy+11} textAnchor="middle" fill="#4ade80" fontSize={13} fontWeight={700}>
            {phaseRemaining != null ? `${Math.round(phaseRemaining)}s` : '—'}
          </text>
        </>
      )}
    </svg>
  );
}

function SignalHead({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={16} height={22} rx={3} fill="#1e293b" />
      <circle cx={x+8} cy={y+7} r={4} fill={color} className={color === '#16a34a' ? 'signal-active' : ''} />
      <circle cx={x+8} cy={y+16} r={3} fill="#374151" />
    </g>
  );
}

function ApproachLabel({
  x, y, label, queued, vehicles, selected, onClick, compact, horizontal
}: {
  x: number; y: number; label: string; queued: number; vehicles: number;
  selected?: boolean; onClick?: () => void; compact?: boolean; horizontal?: boolean;
}) {
  const fs = compact ? 9 : 10;
  const bgW = compact ? 38 : 52;
  const bgH = compact ? 28 : 36;
  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${label} approach`}
    >
      <rect
        x={x - bgW/2} y={y - bgH/2}
        width={bgW} height={bgH}
        rx={6}
        fill={selected ? '#2563eb' : '#0f172a'}
        opacity={0.9}
        stroke={selected ? '#60a5fa' : 'transparent'}
        strokeWidth={1.5}
      />
      <text x={x} y={y - (compact ? 4 : 5)} textAnchor="middle" fill="white" fontSize={compact ? 11 : 13} fontWeight={700}>{label}</text>
      <text x={x} y={y + (compact ? 8 : 10)} textAnchor="middle" fill="#94a3b8" fontSize={fs}>
        {vehicles}v / {queued}q
      </text>
    </g>
  );
}

