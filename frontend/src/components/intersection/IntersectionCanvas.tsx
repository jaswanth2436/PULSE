// IntersectionCanvas.tsx — Professional traffic engineering SVG diagram

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
  priorities?: Record<string, number>; // 1–5 for Intent Studio highlighting
}

// ── Colour constants ──────────────────────────────────────────────────────────
const ROAD_SURFACE = '#152832';
const ROAD_BG      = '#0b1c25';
const ROAD_CORNER  = '#102f38';
const MARKING_W    = '#d8e9e5';
const DIM_LIGHT    = '#304a50';

function signalColors(signal: string): { red: string; amber: string; green: string } {
  const s = (signal ?? '').toUpperCase();
  return {
    red:   s === 'RED'    || s === 'ALL_RED' ? '#ff5c58' : DIM_LIGHT,
    amber: s === 'YELLOW'                    ? '#f5b942' : DIM_LIGHT,
    green: s === 'GREEN'                     ? '#47e0a1' : DIM_LIGHT,
  };
}

// ── Signal pole (vertical 3-lamp head) ───────────────────────────────────────
function SignalPole({
  px, py, signal, facingAngle,
}: {
  px: number; py: number; signal: string; facingAngle: 'N' | 'S' | 'E' | 'W';
}) {
  const { red, amber, green } = signalColors(signal);
  const poleW = 8;
  const poleH = 24;
  // Housing is taller for the 3 lamps
  const housingW = 12;
  const housingH = 30;

  // Position housing above the pole
  const hx = px - housingW / 2;
  const hy = py - housingH;
  const poleX = px - poleW / 2;
  const poleY = py - poleH;

  // For E/W approaches the pole orientation is the same but we adjust x position slightly
  const isVertical = facingAngle === 'N' || facingAngle === 'S';
  void isVertical; // used for future lane-side placement if needed

  return (
    <g>
      {/* Pole */}
      <rect x={poleX} y={poleY} width={poleW} height={poleH} rx={2} fill="#1f2937" />
      {/* Housing */}
      <rect x={hx} y={hy} width={housingW} height={housingH} rx={3} fill="#111827" />
      {/* Red lamp */}
      <circle cx={px} cy={hy + 6}  r={4} fill={red}   className={red   === '#dc2626' ? 'signal-active' : ''} />
      {/* Amber lamp */}
      <circle cx={px} cy={hy + 15} r={3.5} fill={amber} className={amber === '#ca8a04' ? 'signal-active' : ''} />
      {/* Green lamp */}
      <circle cx={px} cy={hy + 24} r={4} fill={green} className={green === '#16a34a' ? 'signal-active' : ''} />
    </g>
  );
}

// ── Vehicle queue stack ───────────────────────────────────────────────────────
function VehicleQueue({
  approach, cx, cy, roadW, queued,
}: {
  approach: string; cx: number; cy: number; roadW: number; queued: number;
}) {
  const MAX_SHOWN = 8;
  const count = Math.min(queued, MAX_SHOWN);
  const vW = 10;  // vehicle width
  const vH = 16;  // vehicle height
  const gap = 4;
  const color = '#60a5fa';
  const strokeC = '#3b82f6';

  const vehicles: JSX.Element[] = [];

  if (approach === 'north') {
    const laneX = cx - vW / 2 - 6;
    const startY = cy - roadW / 2 - 6;
    for (let i = 0; i < count; i++) {
      vehicles.push(
        <rect key={i} x={laneX} y={startY - i * (vH + gap)} width={vW} height={vH}
          rx={2} fill={color} stroke={strokeC} strokeWidth={0.8} opacity={0.85} />
      );
    }
  } else if (approach === 'south') {
    const laneX = cx + 6 - vW / 2;
    const startY = cy + roadW / 2 + 6;
    for (let i = 0; i < count; i++) {
      vehicles.push(
        <rect key={i} x={laneX} y={startY + i * (vH + gap)} width={vW} height={vH}
          rx={2} fill={color} stroke={strokeC} strokeWidth={0.8} opacity={0.85} />
      );
    }
  } else if (approach === 'west') {
    const laneY = cy - vW / 2 - 6;
    const startX = cx - roadW / 2 - 6;
    for (let i = 0; i < count; i++) {
      // horizontal vehicle
      vehicles.push(
        <rect key={i} x={startX - i * (vH + gap) - vH} y={laneY} width={vH} height={vW}
          rx={2} fill={color} stroke={strokeC} strokeWidth={0.8} opacity={0.85} />
      );
    }
  } else if (approach === 'east') {
    const laneY = cy + 6 - vW / 2;
    const startX = cx + roadW / 2 + 6;
    for (let i = 0; i < count; i++) {
      vehicles.push(
        <rect key={i} x={startX + i * (vH + gap)} y={laneY} width={vH} height={vW}
          rx={2} fill={color} stroke={strokeC} strokeWidth={0.8} opacity={0.85} />
      );
    }
  }

  return <g>{vehicles}</g>;
}

// ── Approach label pill ───────────────────────────────────────────────────────
function ApproachLabel({
  x, y, label, queued, vehicles, selected, onClick, compact,
}: {
  x: number; y: number; label: string; queued: number; vehicles: number;
  selected?: boolean; onClick?: () => void; compact?: boolean;
}) {
  const bgW = compact ? 46 : 58;
  const bgH = compact ? 32 : 40;
  const fillBg  = selected ? '#f5b942' : '#102f38';
  const fillTxt = selected ? '#10202b' : '#d8e9e5';
  const fillSub = selected ? '#4c3b19' : '#8db7b7';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} role="button" aria-label={`${label} approach`}>
      <rect
        x={x - bgW / 2} y={y - bgH / 2}
        width={bgW} height={bgH} rx={7}
        fill={fillBg}
        stroke={selected ? '#ffe19a' : '#32616a'}
        strokeWidth={selected ? 1.5 : 1}
        style={{ filter: selected ? 'drop-shadow(0 0 9px rgba(245,185,66,0.5))' : undefined }}
      />
      <text x={x} y={y - (compact ? 4 : 5)} textAnchor="middle"
        fill={fillTxt} fontSize={compact ? 11 : 13} fontWeight={700}>{label}</text>
      <text x={x} y={y + (compact ? 8 : 11)} textAnchor="middle"
        fill={fillSub} fontSize={compact ? 8 : 9}>
        {vehicles}v · {queued}q
      </text>
    </g>
  );
}

// ── Crosswalk zebra strips helper ─────────────────────────────────────────────
function Crosswalk({
  x1, y1, x2, y2, orientation,
}: {
  x1: number; y1: number; x2: number; y2: number;
  orientation: 'horizontal' | 'vertical';
}) {
  const stripes: JSX.Element[] = [];
  const stripeCount = 7;
  if (orientation === 'horizontal') {
    const totalW = x2 - x1;
    const stripeW = totalW / (stripeCount * 2 - 1);
    for (let i = 0; i < stripeCount; i++) {
      stripes.push(
        <rect key={i} x={x1 + i * stripeW * 2} y={y1} width={stripeW} height={y2 - y1}
          fill={MARKING_W} opacity={0.75} />
      );
    }
  } else {
    const totalH = y2 - y1;
    const stripeH = totalH / (stripeCount * 2 - 1);
    for (let i = 0; i < stripeCount; i++) {
      stripes.push(
        <rect key={i} x={x1} y={y1 + i * stripeH * 2} width={x2 - x1} height={stripeH}
          fill={MARKING_W} opacity={0.75} />
      );
    }
  }
  return <g>{stripes}</g>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntersectionCanvas({
  approaches,
  selectedApproach,
  onApproachClick,
  phase,
  phaseRemaining,
  compact = false,
  priorities,
}: IntersectionCanvasProps) {
  const VB = 560;                // fixed viewBox
  const size = compact ? 320 : 520;
  const cx = VB / 2;             // 280
  const cy = VB / 2;             // 280
  const roadW = 110;             // road width in viewBox units
  const half  = roadW / 2;       // 55

  const getSignal  = (a: string) => approaches[a]?.signal  ?? 'RED';
  const getQueued  = (a: string) => approaches[a]?.queued  ?? 0;
  const getVehicles = (a: string) => approaches[a]?.vehicles ?? 0;

  const handleClick = (a: string) => onApproachClick?.(a);

  // Priority glow colors
  const priorityGlow = (a: string) => {
    if (!priorities) return null;
    const p = priorities[a] ?? 3;
    if (p >= 4) return 'rgba(37,99,235,0.22)';
    if (p >= 2) return null;
    return null;
  };

  // Road approach overlay for selected/priority
  function approachHighlight(approach: string) {
    const isSelected = selectedApproach === approach;
    const glow = priorityGlow(approach);
    if (!isSelected && !glow) return null;
    const fill = isSelected ? 'rgba(59,130,246,0.15)' : (glow ?? 'transparent');

    if (approach === 'north')
      return <rect x={cx - half} y={0} width={roadW} height={cy - half} fill={fill} />;
    if (approach === 'south')
      return <rect x={cx - half} y={cy + half} width={roadW} height={cy - half} fill={fill} />;
    if (approach === 'west')
      return <rect x={0} y={cy - half} width={cx - half} height={roadW} fill={fill} />;
    if (approach === 'east')
      return <rect x={cx + half} y={cy - half} width={cx - half} height={roadW} fill={fill} />;
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className="select-none"
      aria-label="Four-way intersection traffic diagram"
    >
      <defs>
        <filter id="pulse-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="lane-grain" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12L12 0" stroke="#ffffff" strokeOpacity=".025" />
        </pattern>
      </defs>
      {/* ── Background (grass/pavement) ─────────────────────────── */}
      <rect x={0} y={0} width={VB} height={VB} fill={ROAD_BG} />

      {/* ── Corner blocks (sidewalks / buildings) ──────────────── */}
      <rect x={0}         y={0}         width={cx - half} height={cy - half} fill={ROAD_CORNER} rx={4} />
      <rect x={cx + half} y={0}         width={cx - half} height={cy - half} fill={ROAD_CORNER} rx={4} />
      <rect x={0}         y={cy + half} width={cx - half} height={cy - half} fill={ROAD_CORNER} rx={4} />
      <rect x={cx + half} y={cy + half} width={cx - half} height={cy - half} fill={ROAD_CORNER} rx={4} />

      {/* ── Road surfaces ────────────────────────────────────────── */}
      {/* North */}
      <rect x={cx - half} y={0}         width={roadW}    height={cy - half} fill={ROAD_SURFACE} />
      {/* South */}
      <rect x={cx - half} y={cy + half} width={roadW}    height={cy - half} fill={ROAD_SURFACE} />
      {/* West */}
      <rect x={0}         y={cy - half} width={cx - half} height={roadW}   fill={ROAD_SURFACE} />
      {/* East */}
      <rect x={cx + half} y={cy - half} width={cx - half} height={roadW}   fill={ROAD_SURFACE} />
      {/* Centre box */}
      <rect x={cx - half} y={cy - half} width={roadW}    height={roadW}    fill={ROAD_SURFACE} />
      <rect x={0} y={0} width={VB} height={VB} fill="url(#lane-grain)" />

      {/* ── Route traces: the live movement layer ───────────────── */}
      <path d={`M ${cx} 0 L ${cx} ${cy - half - 12}`} fill="none" stroke="#47e0a1" strokeWidth="2" strokeDasharray="3 9" opacity=".8" />
      <path d={`M 0 ${cy} L ${cx - half - 12} ${cy}`} fill="none" stroke="#f5b942" strokeWidth="2" strokeDasharray="3 9" opacity=".75" />
      <path d={`M ${cx + half + 12} ${cy} L ${VB} ${cy}`} fill="none" stroke="#47e0a1" strokeWidth="2" strokeDasharray="3 9" opacity=".8" />
      <path d={`M ${cx} ${cy + half + 12} L ${cx} ${VB}`} fill="none" stroke="#ff8d78" strokeWidth="2" strokeDasharray="3 9" opacity=".65" />

      {/* Direction arrows keep the diagram legible as a transport system. */}
      <path d={`M ${cx - 6} 42 l 6 -10 6 10`} fill="none" stroke="#d8e9e5" strokeWidth="2" opacity=".75" />
      <path d={`M ${VB - 42} ${cy - 6} l 10 6 -10 6`} fill="none" stroke="#d8e9e5" strokeWidth="2" opacity=".75" />
      <path d={`M ${cx + 6} ${VB - 42} l -6 10 -6 -10`} fill="none" stroke="#d8e9e5" strokeWidth="2" opacity=".75" />
      <path d={`M 42 ${cy + 6} l -10 -6 10 -6`} fill="none" stroke="#d8e9e5" strokeWidth="2" opacity=".75" />

      {/* ── Approach highlight overlays ──────────────────────────── */}
      {['north', 'south', 'east', 'west'].map(a => (
        <g key={`highlight-${a}`} onClick={() => handleClick(a)} style={{ cursor: 'pointer' }}>
          {approachHighlight(a)}
        </g>
      ))}

      {/* ── Edge (solid white) lines ─────────────────────────────── */}
      {/* North road edges */}
      <line x1={cx - half} y1={0} x2={cx - half} y2={cy - half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      <line x1={cx + half} y1={0} x2={cx + half} y2={cy - half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      {/* South road edges */}
      <line x1={cx - half} y1={cy + half} x2={cx - half} y2={VB} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      <line x1={cx + half} y1={cy + half} x2={cx + half} y2={VB} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      {/* West road edges */}
      <line x1={0} y1={cy - half} x2={cx - half} y2={cy - half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      <line x1={0} y1={cy + half} x2={cx - half} y2={cy + half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      {/* East road edges */}
      <line x1={cx + half} y1={cy - half} x2={VB} y2={cy - half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />
      <line x1={cx + half} y1={cy + half} x2={VB} y2={cy + half} stroke={MARKING_W} strokeWidth={2} opacity={0.6} />

      {/* ── Centre dashed lane lines ─────────────────────────────── */}
      <line x1={cx} y1={0}         x2={cx} y2={cy - half} stroke={MARKING_W} strokeWidth={1.5} strokeDasharray="10,10" opacity={0.55} />
      <line x1={cx} y1={cy + half} x2={cx} y2={VB}        stroke={MARKING_W} strokeWidth={1.5} strokeDasharray="10,10" opacity={0.55} />
      <line x1={0}         y1={cy} x2={cx - half} y2={cy} stroke={MARKING_W} strokeWidth={1.5} strokeDasharray="10,10" opacity={0.55} />
      <line x1={cx + half} y1={cy} x2={VB}        y2={cy} stroke={MARKING_W} strokeWidth={1.5} strokeDasharray="10,10" opacity={0.55} />

      {/* ── Stop lines ───────────────────────────────────────────── */}
      <line x1={cx - half} y1={cy - half - 2} x2={cx + half} y2={cy - half - 2} stroke={MARKING_W} strokeWidth={4} />
      <line x1={cx - half} y1={cy + half + 2} x2={cx + half} y2={cy + half + 2} stroke={MARKING_W} strokeWidth={4} />
      <line x1={cx - half - 2} y1={cy - half} x2={cx - half - 2} y2={cy + half} stroke={MARKING_W} strokeWidth={4} />
      <line x1={cx + half + 2} y1={cy - half} x2={cx + half + 2} y2={cy + half} stroke={MARKING_W} strokeWidth={4} />

      {/* ── Crosswalk zebra stripes ──────────────────────────────── */}
      {/* North crosswalk (horizontal, above stop line) */}
      <Crosswalk x1={cx - half} y1={cy - half - 20} x2={cx + half} y2={cy - half - 8} orientation="horizontal" />
      {/* South crosswalk */}
      <Crosswalk x1={cx - half} y1={cy + half + 8} x2={cx + half} y2={cy + half + 20} orientation="horizontal" />
      {/* West crosswalk */}
      <Crosswalk x1={cx - half - 20} y1={cy - half} x2={cx - half - 8} y2={cy + half} orientation="vertical" />
      {/* East crosswalk */}
      <Crosswalk x1={cx + half + 8} y1={cy - half} x2={cx + half + 20} y2={cy + half} orientation="vertical" />

      {/* ── Vehicle queues ───────────────────────────────────────── */}
      {['north', 'south', 'east', 'west'].map(a => (
        <VehicleQueue key={`q-${a}`} approach={a} cx={cx} cy={cy} roadW={roadW} queued={getQueued(a)} />
      ))}

      {/* ── Signal poles ─────────────────────────────────────────── */}
      {/* North approach: pole at top-right corner of intersection entry */}
      <SignalPole px={cx + half + 18} py={cy - half + 10} signal={getSignal('north')} facingAngle="N" />
      {/* South approach: pole at bottom-left corner */}
      <SignalPole px={cx - half - 10} py={cy + half + 40} signal={getSignal('south')} facingAngle="S" />
      {/* East approach: pole at right edge, top */}
      <SignalPole px={cx + half + 18} py={cy + half - 10} signal={getSignal('east')} facingAngle="E" />
      {/* West approach: pole at left edge, bottom */}
      <SignalPole px={cx - half - 10} py={cy - half + 10} signal={getSignal('west')} facingAngle="W" />

      {/* ── Approach label pills ─────────────────────────────────── */}
      <ApproachLabel
        x={cx} y={compact ? 24 : 30}
        label="N" queued={getQueued('north')} vehicles={getVehicles('north')}
        selected={selectedApproach === 'north'}
        onClick={() => handleClick('north')}
        compact={compact}
      />
      <ApproachLabel
        x={cx} y={VB - (compact ? 24 : 30)}
        label="S" queued={getQueued('south')} vehicles={getVehicles('south')}
        selected={selectedApproach === 'south'}
        onClick={() => handleClick('south')}
        compact={compact}
      />
      <ApproachLabel
        x={compact ? 30 : 40} y={cy}
        label="W" queued={getQueued('west')} vehicles={getVehicles('west')}
        selected={selectedApproach === 'west'}
        onClick={() => handleClick('west')}
        compact={compact}
      />
      <ApproachLabel
        x={VB - (compact ? 30 : 40)} y={cy}
        label="E" queued={getQueued('east')} vehicles={getVehicles('east')}
        selected={selectedApproach === 'east'}
        onClick={() => handleClick('east')}
        compact={compact}
      />

      {/* ── Phase countdown in centre ─────────────────────────────── */}
      {!compact && phase && (
        <>
          <circle cx={cx} cy={cy} r={33} fill="#091820" opacity={0.96} />
          <circle cx={cx} cy={cy} r={30} fill="none" stroke="#f5b942" strokeWidth={2} opacity={0.75} filter="url(#pulse-glow)" />
          <circle cx={cx} cy={cy} r={24} fill="none" stroke="#2f6065" strokeWidth={1} strokeDasharray="2 4" />
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#a8cfca" fontSize={8} fontWeight={600} letterSpacing={1}>
            {phase === 'PHASE_1' ? 'N–S' : 'E–W'}
          </text>
          <text x={cx} y={cy + 11} textAnchor="middle" fill="#f5b942" fontSize={14} fontWeight={700}>
            {phaseRemaining != null ? `${Math.round(phaseRemaining)}s` : '—'}
          </text>
        </>
      )}
    </svg>
  );
}
