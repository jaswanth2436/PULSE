export function fmt(n: number | undefined | null, decimals = 1): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

export function fmtInt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString();
}

export function fmtPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function fmtTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString();
  } catch { return '—'; }
}

export function fmtDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch { return '—'; }
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function improvementPct(baseline: number, pulse: number, higherIsBetter = false): number {
  if (baseline === 0) return 0;
  if (higherIsBetter) return ((pulse - baseline) / baseline) * 100;
  return ((baseline - pulse) / baseline) * 100;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'elevated': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default: return 'text-teal-600 bg-teal-50 border-teal-200';
  }
}

export function signalColor(signal: string): string {
  switch (signal?.toUpperCase()) {
    case 'GREEN': return '#16a34a';
    case 'YELLOW': return '#ca8a04';
    case 'RED': return '#dc2626';
    case 'ALL_RED': return '#dc2626';
    default: return '#94a3b8';
  }
}
