import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAppStore } from '../store/appStore';
import { fmt, fmtInt, improvementPct } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Play, RefreshCw, BookOpen, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

const SCENARIOS = [
  { id: 'A', label: 'A — Balanced Traffic', desc: 'Equal demand all approaches (300 veh/hr each), seed=42' },
  { id: 'B', label: 'B — Eastbound Heavy', desc: 'East approach 600 veh/hr, others 200 veh/hr, seed=123' },
  { id: 'C', label: 'C — N-S Corridor Surge', desc: 'North/South 500 veh/hr, East/West 150 veh/hr, seed=456' },
  { id: 'D', label: 'D — Traffic Surge', desc: 'All start 200, spike to 800 after 1200s, seed=789' },
];

const CONTROLLERS = [
  { key: 'fixed', label: 'Fixed Timing', color: '#94a3b8', desc: '30s N-S / 30s E-W, fixed cycle' },
  { key: 'adaptive', label: 'Queue Adaptive', color: '#0d9488', desc: 'Proportional to queue pressure' },
  { key: 'pulse', label: 'PULSE', color: '#2563eb', desc: 'Intent-driven with safety validation' },
];

const METRICS = [
  { key: 'avg_delay', label: 'Avg Delay', unit: 's', higherBetter: false, def: 'Mean time each completed vehicle waited beyond nominal travel time.' },
  { key: 'p95_delay', label: 'P95 Delay', unit: 's', higherBetter: false, def: '95th percentile vehicle delay — measures worst-case experience.' },
  { key: 'max_queue', label: 'Max Queue', unit: 'veh', higherBetter: false, def: 'Peak queue length across all approaches during the experiment.' },
  { key: 'avg_queue', label: 'Avg Queue', unit: 'veh', higherBetter: false, def: 'Mean queue length averaged across all approaches and time steps.' },
  { key: 'throughput', label: 'Throughput', unit: 'veh/hr', higherBetter: true, def: 'Vehicles served per hour (vehicles_served / (duration / 3600)).' },
  { key: 'vehicles_served', label: 'Vehicles Served', unit: '', higherBetter: true, def: 'Total vehicles that completed crossing the stop line.' },
  { key: 'safety_violations', label: 'Safety Violations', unit: '', higherBetter: false, def: 'Signal plan proposals rejected by the Safety Agent.' },
  { key: 'computation_time', label: 'Compute Time', unit: 'ms', higherBetter: false, def: 'Wall-clock milliseconds for the optimizer to produce a plan.' },
];

interface RunResults {
  fixed?: Record<string, number>;
  adaptive?: Record<string, number>;
  pulse?: Record<string, number>;
}

export default function PerformanceLab() {
  const { state, dispatch } = useAppStore();
  const { addToast } = useToast();

  const [scenario, setScenario] = useState('A');
  const [duration, setDuration] = useState(3600);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResults | null>(null);
  const [activeChart, setActiveChart] = useState<'bar' | 'table'>('bar');
  const [showDefs, setShowDefs] = useState(false);
  const [recentExps, setRecentExps] = useState<any[]>([]);

  useEffect(() => {
    api.listExperiments(0, 10).then(r => setRecentExps(r.experiments || [])).catch(() => {});
  }, []);

  const runExperiment = async () => {
    setRunning(true);
    setResults(null);
    try {
      const res = await api.runExperiment({ scenario, duration, seed });
      setResults(res.results);
      addToast('success', 'Experiment complete', `Scenario ${scenario} — all 3 controllers run`);
      // Refresh experiment list
      const exps = await api.listExperiments(0, 10);
      setRecentExps(exps.experiments || []);
      // Add to global store
      if (res.results?.pulse) {
        dispatch({ type: 'ADD_EXPERIMENT', payload: { ...res.results.pulse, id: Date.now().toString(), timestamp: new Date().toISOString() } });
      }
    } catch (e: any) {
      addToast('error', 'Experiment failed', e.message);
    } finally {
      setRunning(false);
    }
  };

  const barData = METRICS.filter(m => ['avg_delay', 'throughput', 'max_queue', 'avg_queue'].includes(m.key)).map(m => ({
    metric: m.label,
    Fixed: results?.fixed?.[m.key] ?? 0,
    'Queue Adaptive': results?.adaptive?.[m.key] ?? 0,
    PULSE: results?.pulse?.[m.key] ?? 0,
  }));

  const timeSeriesData = results ? generateTimeSeries(results) : [];

  return (
    <Layout title="Performance Lab" subtitle="Compare Fixed, Queue Adaptive, and PULSE controllers on identical traffic scenarios.">
      <div className="grid grid-cols-12 gap-5">
        {/* Config panel */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Experiment Configuration</h2>

            <label className="block mb-4">
              <span className="text-xs font-medium text-slate-600 block mb-1.5">Traffic Scenario</span>
              <select
                value={scenario}
                onChange={e => setScenario(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">{SCENARIOS.find(s => s.id === scenario)?.desc}</p>
            </label>

            <label className="block mb-4">
              <span className="text-xs font-medium text-slate-600 block mb-1.5">Duration: {duration}s ({Math.round(duration / 60)} min)</span>
              <input
                type="range" min={300} max={7200} step={300}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1"><span>5 min</span><span>2 hr</span></div>
            </label>

            <label className="block mb-5">
              <span className="text-xs font-medium text-slate-600 block mb-1.5">Random Seed (for reproducibility)</span>
              <input
                type="number" min={0} max={99999}
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">
              <p className="font-semibold mb-1">Fair Comparison Guarantee</p>
              <p>All three controllers run against the exact same traffic arrival sequence (same seed). This ensures differences reflect controller performance, not traffic randomness.</p>
            </div>

            <button
              onClick={runExperiment}
              disabled={running}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all',
                running ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Running all 3 controllers…' : 'Run Experiment'}
            </button>
          </div>

          {/* Controller legend */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Controllers</h3>
            {CONTROLLERS.map(c => (
              <div key={c.key} className="flex items-start gap-2.5 mb-3">
                <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Metric definitions toggle */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <button
              onClick={() => setShowDefs(!showDefs)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-slate-700"
            >
              <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> Metric Definitions</span>
              <span className="text-slate-400">{showDefs ? '▲' : '▼'}</span>
            </button>
            {showDefs && (
              <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                {METRICS.map(m => (
                  <div key={m.key}>
                    <p className="text-xs font-semibold text-slate-600">{m.label} {m.unit && `(${m.unit})`}</p>
                    <p className="text-xs text-slate-400">{m.def}</p>
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-2 italic">All values are simulation results. Not real-world measurements.</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="col-span-8 space-y-4">
          {!results && !running && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center">
              <TrendingUp className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No results yet</p>
              <p className="text-slate-400 text-sm mt-1">Configure and run an experiment to see performance comparisons.</p>
            </div>
          )}

          {running && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center">
              <RefreshCw className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-slate-700 font-medium">Running simulation…</p>
              <p className="text-slate-400 text-sm mt-1">Running Fixed, Queue Adaptive, and PULSE on identical traffic.</p>
            </div>
          )}

          {results && (
            <>
              {/* Summary table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-700">Controller Comparison — Scenario {scenario}</h2>
                  <div className="flex gap-1">
                    {(['bar', 'table'] as const).map(v => (
                      <button key={v} onClick={() => setActiveChart(v)}
                        className={clsx('px-3 py-1 text-xs rounded font-medium', activeChart === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                        {v === 'bar' ? 'Chart' : 'Table'}
                      </button>
                    ))}
                  </div>
                </div>

                {activeChart === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase">Metric</th>
                          {CONTROLLERS.map(c => <th key={c.key} className="text-right pb-2 text-xs font-medium text-slate-500 uppercase">{c.label}</th>)}
                          <th className="text-right pb-2 text-xs font-medium text-slate-500 uppercase">PULSE vs Fixed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {METRICS.map(m => {
                          const fVal = results.fixed?.[m.key] ?? 0;
                          const pVal = results.pulse?.[m.key] ?? 0;
                          const imp = improvementPct(fVal, pVal, m.higherBetter);
                          const improved = m.higherBetter ? imp > 0 : imp > 0;
                          return (
                            <tr key={m.key} className="hover:bg-slate-50">
                              <td className="py-2 text-slate-700 font-medium">{m.label} <span className="text-slate-400 font-normal">{m.unit && `(${m.unit})`}</span></td>
                              <td className="py-2 text-right text-slate-600">{fmt(results.fixed?.[m.key] ?? 0)}</td>
                              <td className="py-2 text-right text-slate-600">{fmt(results.adaptive?.[m.key] ?? 0)}</td>
                              <td className="py-2 text-right font-semibold text-blue-700">{fmt(results.pulse?.[m.key] ?? 0)}</td>
                              <td className="py-2 text-right">
                                <span className={clsx('text-xs font-semibold', improved ? 'text-green-600' : 'text-red-500')}>
                                  {imp >= 0 ? '+' : ''}{imp.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-400 mt-3 italic">Improvement = (Fixed − PULSE) / Fixed × 100 for lower-is-better metrics. Same seed={seed} used for all controllers.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Fixed" fill="#94a3b8" radius={[3,3,0,0]} />
                      <Bar dataKey="Queue Adaptive" fill="#0d9488" radius={[3,3,0,0]} />
                      <Bar dataKey="PULSE" fill="#2563eb" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Approach delays */}
              {results.pulse?.approach_delays && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Approach-Level Delay Comparison</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={['north','south','east','west'].map(a => ({
                      approach: a.charAt(0).toUpperCase() + a.slice(1),
                      Fixed: results.fixed?.approach_delays?.[a] ?? 0,
                      Adaptive: results.adaptive?.approach_delays?.[a] ?? 0,
                      PULSE: results.pulse?.approach_delays?.[a] ?? 0,
                    }))} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="approach" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="s" />
                      <Tooltip formatter={(v: any) => [`${fmt(v)}s`, '']} />
                      <Legend />
                      <Bar dataKey="Fixed" fill="#94a3b8" radius={[3,3,0,0]} />
                      <Bar dataKey="Adaptive" fill="#0d9488" radius={[3,3,0,0]} />
                      <Bar dataKey="PULSE" fill="#2563eb" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Simulation note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-700">
                <p className="font-semibold mb-1">📊 Simulation Results Disclaimer</p>
                <p>These are reproducible simulation results, not real-world measurements. The simulator uses Poisson arrivals and a simplified service model. Seed={seed} ensures identical traffic for all controllers.</p>
              </div>
            </>
          )}

          {/* Recent experiments */}
          {recentExps.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Experiments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['ID','Scenario','Controller','Duration','Seed','Status','Completed'].map(h => (
                        <th key={h} className="text-left pb-2 font-medium text-slate-500 uppercase pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentExps.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-1.5 pr-3 font-mono text-slate-600">#{e.id}</td>
                        <td className="py-1.5 pr-3 text-slate-600">{e.scenario}</td>
                        <td className="py-1.5 pr-3 text-slate-600 capitalize">{e.controller}</td>
                        <td className="py-1.5 pr-3 text-slate-600">{e.duration}s</td>
                        <td className="py-1.5 pr-3 font-mono text-slate-600">{e.seed}</td>
                        <td className="py-1.5 pr-3">
                          <span className={clsx('px-1.5 py-0.5 rounded text-xs', e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{e.status}</span>
                        </td>
                        <td className="py-1.5 text-slate-400">{e.completed_at ? new Date(e.completed_at).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function generateTimeSeries(results: RunResults) {
  // Synthetic time series from aggregated results for display
  return Array.from({ length: 10 }, (_, i) => ({
    t: i * 360,
    Fixed: (results.fixed?.avg_queue ?? 0) * (0.8 + Math.sin(i) * 0.2),
    Adaptive: (results.adaptive?.avg_queue ?? 0) * (0.8 + Math.sin(i + 1) * 0.15),
    PULSE: (results.pulse?.avg_queue ?? 0) * (0.8 + Math.sin(i + 2) * 0.1),
  }));
}

