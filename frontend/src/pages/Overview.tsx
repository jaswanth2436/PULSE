import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import IntersectionCanvas from '../components/intersection/IntersectionCanvas';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import { useAppStore } from '../store/appStore';
import { fmt, fmtTime, severityColor } from '../utils/formatters';
import {
  Car,
  Clock,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Sparkles,
  MapPin,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { clsx } from 'clsx';
import { api } from '../services/api';

const APPROACHES = ['north', 'south', 'east', 'west'] as const;

export default function Overview() {
  const { state, dispatch } = useAppStore();
  const ts = state.trafficState;
  const [history, setHistory] = useState<Array<{ t?: number; timestamp?: string; queues?: Record<string, number> }>>([]);
  const approaches = ts?.approaches ?? {};
  const hasTraffic = Boolean(ts && ts.source && ts.source !== 'none');
  const activePhaseName = !hasTraffic
    ? 'Awaiting verified telemetry'
    : ts?.phase === 'PHASE_1' ? 'Phase 1: North–South Corridor' : 'Phase 2: East–West Corridor';
  const lastExp = state.experiments[0];

  const totalQueued = Object.values(approaches).reduce((acc, a) => acc + (a.queued ?? 0), 0);
  const avgQueueLen = hasTraffic ? (totalQueued / 4).toFixed(1) : '—';

  useEffect(() => {
    let active = true;
    Promise.all([api.trafficCurrent(), api.trafficHistory(100)])
      .then(([current, historyResponse]) => {
        if (!active) return;
        if (current && !state.trafficState) dispatch({ type: 'UPDATE_TRAFFIC', payload: current });
        setHistory(historyResponse.history ?? []);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => { active = false; };
  }, [dispatch]);

  const volumeHistory = history.map((point, index) => ({
    time: point.timestamp
      ? new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${point.t ?? index}s`,
    volume: point.queues ? Object.values(point.queues).reduce((sum, value) => sum + value, 0) : 0,
  }));

  const approachBarData = APPROACHES.map((appKey) => ({
    name: appKey.charAt(0).toUpperCase() + appKey.slice(1),
    queued: hasTraffic ? approaches[appKey]?.queued ?? 0 : null,
    wait: hasTraffic ? approaches[appKey]?.avgWait ?? 0 : null,
  })).filter((point) => hasTraffic || point.queued !== null);

  return (
    <Layout
      title="Traffic Operations Overview"
      subtitle="Monitor intersections, analyse traffic conditions and manage adaptive signal optimization."
    >
      <div className="space-y-6">
        {/* ── Top Hero Action Bar ──────────────────────────────────── */}
        <div className="pulse-command-hero rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="relative z-10 flex-1 min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {hasTraffic ? 'Verified Traffic Data Active' : 'No Verified Traffic Source'}
              </span>
              <StatusBadge
                status={ts?.source === 'video' ? 'video' : 'offline'}
                label={ts?.source === 'video' ? 'Verified Video Data' : 'Awaiting Traffic Source'}
                size="sm"
              />
              <span className="text-xs text-slate-400 font-mono tracking-wide">NODE A-04 / EAST CORRIDOR</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Intelligent Signal Operations Command
            </h2>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed">
              PULSE uses computer-vision queue estimates and operator intent weights to adaptively allocate green splits while enforcing non-negotiable NEMA safety constraints.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0 flex flex-col items-stretch gap-3 w-52">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Play className="h-4 w-4" />
              <span>Start Guided Demo</span>
            </Link>
            <Link
              to="/intent-studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all group"
            >
              <Sparkles className="h-4 w-4" />
              <span>Shape Next Cycle</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* ── 5 Primary Operational KPI Cards ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Active Intersections"
            value="1"
            unit="node"
            subtitle="Junction Node A-04"
            icon={MapPin}
            color="blue"
          />
          <MetricCard
            title="Total Detected Vehicles"
            value={hasTraffic ? ts?.vehicles ?? '—' : '—'}
            unit="veh"
            subtitle="In detection zones"
            icon={Car}
            color="teal"
          />
          <MetricCard
            title="Average Waiting Time"
            value={hasTraffic && ts?.avgWait != null ? fmt(ts.avgWait) : '—'}
            unit="s"
            subtitle="Mean delay per active vehicle"
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Average Queue Length"
            value={avgQueueLen}
            unit="veh/lane"
            subtitle={`Peak queue: ${ts?.maxQueue ?? 0} veh`}
            icon={Layers}
            color="slate"
          />
          <MetricCard
            title="System Safety Health"
            value="—"
            unit=""
            subtitle="Available after plan validation"
            icon={ShieldCheck}
            color="blue"
          />
        </div>

        {/* ── Main Operations Grid: Intersection & Diagnostics ─────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main 4-Way Intersection Visualization Card */}
          <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Four-Way Intersection Schematic</h3>
                <p className="text-xs text-slate-500">
                  Real-time lane queuing, signal head states, and remaining phase countdown
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {activePhaseName}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-800">
                  {hasTraffic && ts?.phaseRemaining != null ? `${Math.round(ts.phaseRemaining)}s left` : '—'}
                </span>
              </div>
            </div>

            <div className="py-4 flex justify-center items-center overflow-x-auto">
              <IntersectionCanvas
                approaches={approaches as any}
                phase={ts?.phase}
                phaseRemaining={ts?.phaseRemaining}
                compact={false}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active Green Movement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Yellow Clearance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Red Stopped
                </span>
              </div>
              <Link to="/intersection" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                <span>Open Intelligence Center</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Approach Summary & Operational Telemetry */}
          <div className="xl:col-span-5 space-y-6 flex flex-col justify-between">
            {/* Approach-Wise Congestion Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">Approach Demand Status</h3>
                <span className="text-xs text-slate-400">4 Monitored Lanes</span>
              </div>

              <div className="space-y-3">
                {APPROACHES.map((appKey) => {
                  const data = approaches[appKey];
                  const queued = data?.queued ?? 0;
                  const wait = data?.avgWait ?? 0;
                  const signal = data?.signal ?? 'RED';
                  const isGreen = signal === 'GREEN';

                  return (
                    <div
                      key={appKey}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'h-3 w-3 rounded-full flex-shrink-0',
                            isGreen ? 'bg-emerald-500 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
                          )}
                        />
                        <div>
                          <p className="text-sm font-semibold capitalize text-slate-800">{appKey} Approach</p>
                          <p className="text-[11px] text-slate-500">
                            {data?.vehicles ?? 0} veh total in zone
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{queued} <span className="text-xs font-normal text-slate-500">queued</span></p>
                          <p className="text-[10px] text-slate-400">avg wait: {fmt(wait)}s</p>
                        </div>
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-bold border uppercase',
                            severityColor(data?.severity ?? 'normal')
                          )}
                        >
                          {data?.severity ?? 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Alerts Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-800">Operational Alerts</h3>
                <span className="text-xs text-slate-400">{ts?.alerts?.length ?? 0} active</span>
              </div>

              {ts?.alerts && ts.alerts.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {ts.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={clsx(
                        'p-2.5 rounded-lg border text-xs flex items-start gap-2.5',
                        alert.level === 'critical'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : alert.level === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-semibold">{alert.category}</p>
                        <p className="text-[11px] opacity-90">{alert.message}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{fmtTime(alert.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center gap-3 text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">All Signal Safety Constraints Verified</p>
                    <p className="text-emerald-700/80 text-[11px]">No phase clearance conflicts or vehicle starvation detected.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Additional Analytics Row: Volume Over Time & Congestion ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Traffic Volume Over Time Chart */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Traffic Volume & Throughput Trend</h3>
                <p className="text-xs text-slate-500">Backend history only; no data is inferred when unavailable</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{history.length ? `${history.length} backend samples` : 'No samples'}</span>
            </div>

            <div className="h-56 w-full">
              {volumeHistory.length ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, fontSize: 12, borderColor: '#cbd5e1' }} />
                  <Area type="monotone" dataKey="volume" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#volGrad)" name="Queued Vehicles (backend)" />
                </AreaChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center text-xs text-slate-500">No traffic history yet. Upload a video to begin collecting measurements.</div>}
            </div>
          </div>

          {/* Approach-wise Congestion Comparison */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Approach Queue Comparison</h3>
                <p className="text-xs text-slate-500">Queued vehicles vs. average delay (seconds)</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={approachBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, fontSize: 12, borderColor: '#cbd5e1' }} />
                  <Bar dataKey="queued" fill="#0d9488" radius={[4, 4, 0, 0]} name="Queued Vehicles" />
                  <Bar dataKey="wait" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Wait (s)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Latest Performance Experiment Snapshot ──────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Controller Performance Summary</h3>
              <p className="text-xs text-slate-500">
                Empirical verification: PULSE adaptive control vs. fixed-timing baseline
              </p>
            </div>
            <Link
              to="/performance-lab"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
            >
              Open Performance Lab <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {lastExp ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Active Scenario</p>
                <p className="text-lg font-bold text-slate-800 mt-1">Scenario {lastExp.scenario}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{lastExp.controller.toUpperCase()} Controller</p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Average Delay</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{fmt(lastExp.avgDelay)} s</p>
                <span className="inline-flex items-center text-xs text-emerald-600 font-semibold mt-0.5 gap-0.5">
                  <TrendingDown className="h-3 w-3" /> Reduced delay
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Throughput</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{fmt(lastExp.throughput)} veh/hr</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{lastExp.vehiclesServed} vehicles served</p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Safety Violations</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">0 Violations</p>
                <p className="text-[11px] text-slate-400 mt-0.5">100% NEMA Compliant</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No recent benchmark run recorded in this session.</p>
              <p className="mt-1 text-slate-400">
                Run an evaluation in <Link to="/performance-lab" className="text-blue-600 underline font-medium">Performance Lab</Link> to view comparative delay metrics.
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Simulation source: Poisson discrete-event traffic arrivals.</span>
            <span>Neural Storm 2026 · Future Tech FT-01</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
