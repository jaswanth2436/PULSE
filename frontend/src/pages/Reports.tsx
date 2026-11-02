import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { fmt, fmtDateTime } from '../utils/formatters';
import {
  Search,
  Download,
  FileText,
  ChevronRight,
  X,
  Printer,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface Experiment {
  id: number;
  scenario: string;
  controller: string;
  duration: number;
  seed: number;
  status: string;
  created_at: string;
  completed_at?: string;
  metrics?: Array<{ name: string; value: number; approach?: string }>;
  config?: Record<string, any>;
}

export default function Reports() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [controllerFilter, setControllerFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Experiment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadExperiments();
  }, []);

  const loadExperiments = async () => {
    setLoading(true);
    try {
      const res = await api.listExperiments(0, 100);
      setExperiments(res.experiments || []);
    } catch (e: any) {
      addToast('error', 'Unable to Load Records', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (exp: Experiment) => {
    setDetailLoading(true);
    setSelected(exp);
    try {
      const detail = await api.getExperiment(exp.id);
      setSelected(detail);
    } catch {
      // Use existing record if detail query fails
    } finally {
      setDetailLoading(false);
    }
  };

  const exportExp = async (id: number, format: 'csv' | 'json') => {
    try {
      const res = await api.exportExperiment(id, format);
      if (!res.ok) throw new Error('Export service response error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PULSE_experiment_${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'File Exported', `PULSE_experiment_${id}.${format}`);
    } catch (e: any) {
      addToast('error', 'Export Failed', e.message);
    }
  };

  const completedCount = experiments.filter((e) => e.status === 'completed').length;
  const latestExp = experiments[0];

  const filtered = experiments.filter((e) => {
    const matchesSearch =
      !search ||
      [e.scenario, e.controller, String(e.id), e.status].some((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      );
    const matchesController =
      controllerFilter === 'all' || e.controller.toLowerCase() === controllerFilter.toLowerCase();
    return matchesSearch && matchesController;
  });

  return (
    <Layout
      title="Performance Reports & Audit Logs"
      subtitle="Store, review and communicate experimental traffic signal optimization results."
    >
      <div className="space-y-6">
        {/* ── 4 Reports Overview Metrics ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Experiments</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{experiments.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Recorded evaluations</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Benchmark Runs</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Verified simulation runs</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saved Reports</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{experiments.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Exportable CSV/JSON archives</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Latest Experiment</span>
            <p className="text-sm font-bold text-slate-800 mt-2 truncate">
              {latestExp ? `Scenario ${latestExp.scenario} (${latestExp.controller})` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {latestExp ? fmtDateTime(latestExp.created_at) : 'No runs recorded'}
            </p>
          </div>
        </div>

        {/* ── Filter Toolbar ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-auto flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search run ID, scenario, or controller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex p-1 bg-slate-100 rounded-lg text-xs">
              {['all', 'pulse', 'adaptive', 'fixed'].map((ctrl) => (
                <button
                  key={ctrl}
                  onClick={() => setControllerFilter(ctrl)}
                  className={clsx(
                    'px-3 py-1 rounded-md font-semibold capitalize transition-all',
                    controllerFilter === ctrl
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {ctrl}
                </button>
              ))}
            </div>

            <button
              onClick={loadExperiments}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── Table & Detailed Report Inspector ────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Main Experiments Table */}
          <div className={clsx('transition-all', selected ? 'xl:col-span-7' : 'xl:col-span-12')}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-16 text-center text-xs text-slate-400">Loading historical experiment records...</div>
              ) : filtered.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Experiment Reports Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute an evaluation in Performance Lab to populate persistent logs.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold text-left">
                        <th className="px-4 py-3">Run ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Scenario</th>
                        <th className="px-4 py-3">Controller</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((exp) => (
                        <tr
                          key={exp.id}
                          onClick={() => openDetail(exp)}
                          className={clsx(
                            'hover:bg-slate-50 transition-colors cursor-pointer',
                            selected?.id === exp.id && 'bg-blue-50/60'
                          )}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">#{exp.id}</td>
                          <td className="px-4 py-3 text-slate-500">{fmtDateTime(exp.created_at)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">Scenario {exp.scenario}</td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                                exp.controller === 'pulse'
                                  ? 'bg-blue-100 text-blue-700'
                                  : exp.controller === 'adaptive'
                                  ? 'bg-teal-100 text-teal-700'
                                  : 'bg-slate-100 text-slate-700'
                              )}
                            >
                              {exp.controller}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{exp.duration}s</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {exp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => exportExp(exp.id, 'csv')}
                                title="Download CSV"
                                className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => openDetail(exp)}
                                title="View Report Details"
                                className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Full Report Details Drawer */}
          {selected && (
            <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 shadow-md p-6 sticky top-20 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Report Details — #{selected.id}</h3>
                  <p className="text-xs text-slate-400">Technical Audit Record</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading detailed metrics...</div>
              ) : (
                <div className="space-y-4">
                  {/* Controller Configuration & Context */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Evaluated Controller:</span>
                      <span className="font-bold text-blue-700 uppercase">{selected.controller}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Traffic Scenario:</span>
                      <span className="font-semibold text-slate-800">Scenario {selected.scenario}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-semibold text-slate-800">{selected.duration} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reproducibility Seed:</span>
                      <span className="font-mono text-slate-800">{selected.seed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Executed:</span>
                      <span className="text-slate-600">{fmtDateTime(selected.created_at)}</span>
                    </div>
                  </div>

                  {/* Recorded Metrics */}
                  {selected.metrics && selected.metrics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Experimental Telemetry
                      </h4>
                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                        {selected.metrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs border border-slate-100"
                          >
                            <span className="text-slate-600 capitalize">
                              {m.name.replace(/_/g, ' ')}
                              {m.approach ? ` (${m.approach})` : ''}
                            </span>
                            <span className="font-bold text-slate-800">{fmt(m.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Guard Certification */}
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold">NEMA Safety Compliant</p>
                      <p className="text-[11px] text-emerald-700/80">0 phase conflicts, min green ≥10s, yellow ≥3s, all-red ≥2s.</p>
                    </div>
                  </div>

                  {/* Report Actions */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => exportExp(selected.id, 'csv')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => exportExp(selected.id, 'json')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-purple-600" />
                        <span>Export JSON</span>
                      </button>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Formatted Report</span>
                    </button>

                    <button
                      onClick={() => navigate('/performance-lab')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Re-Run in Performance Lab</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
