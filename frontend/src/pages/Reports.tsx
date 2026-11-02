import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { fmt, fmtDateTime } from '../utils/formatters';
import { Search, Download, FileText, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';

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
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    } catch (e) {
      // Backend offline — show empty state
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
    } catch (e) {}
    setDetailLoading(false);
  };

  const exportExp = async (id: number, format: 'csv' | 'json') => {
    try {
      const res = await api.exportExperiment(id, format);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `experiment_${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Export downloaded', `experiment_${id}.${format}`);
    } catch (e: any) {
      addToast('error', 'Export failed', e.message);
    }
  };

  const filtered = experiments.filter(e =>
    !search || [e.scenario, e.controller, String(e.id), e.status].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  const controllerBadge = (ctrl: string) => (
    <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize',
      ctrl === 'pulse' ? 'bg-blue-100 text-blue-700' :
      ctrl === 'adaptive' ? 'bg-teal-100 text-teal-700' :
      'bg-slate-100 text-slate-600'
    )}>{ctrl}</span>
  );

  return (
    <Layout title="Reports" subtitle="Experiment history, results, and export.">
      <div className="flex gap-5">
        {/* Main list */}
        <div className="flex-1 min-w-0">
          {/* Search + actions */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by scenario, controller, ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={loadExperiments} className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading experiments…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No experiments found</p>
                <p className="text-slate-400 text-sm mt-1">Run an experiment in the Performance Lab to create records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {['ID','Scenario','Controller','Duration','Seed','Status','Created','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(exp => (
                      <tr
                        key={exp.id}
                        className={clsx('hover:bg-slate-50 transition-colors cursor-pointer', selected?.id === exp.id && 'bg-blue-50')}
                        onClick={() => openDetail(exp)}
                      >
                        <td className="px-4 py-3 font-mono text-slate-600">#{exp.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{exp.scenario}</td>
                        <td className="px-4 py-3">{controllerBadge(exp.controller)}</td>
                        <td className="px-4 py-3 text-slate-600">{exp.duration}s</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{exp.seed}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            exp.status === 'completed' ? 'bg-green-100 text-green-700' :
                            exp.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          )}>{exp.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDateTime(exp.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => exportExp(exp.id, 'csv')}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Export CSV"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openDetail(exp)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View detail"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                  {filtered.length} experiments
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Experiment #{selected.id}</h3>
                <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
              ) : (
                <>
                  {/* Config */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                    <DetailRow label="Scenario" value={selected.scenario} />
                    <DetailRow label="Controller" value={selected.controller} />
                    <DetailRow label="Duration" value={`${selected.duration}s`} />
                    <DetailRow label="Seed" value={String(selected.seed)} />
                    <DetailRow label="Status" value={selected.status} />
                    <DetailRow label="Created" value={fmtDateTime(selected.created_at)} />
                    {selected.completed_at && <DetailRow label="Completed" value={fmtDateTime(selected.completed_at)} />}
                  </div>

                  {/* Metrics */}
                  {selected.metrics && selected.metrics.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Metrics</p>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {selected.metrics.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-500 capitalize">{m.name.replace(/_/g, ' ')}{m.approach ? ` (${m.approach})` : ''}</span>
                            <span className="font-semibold text-slate-700">{fmt(m.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limitations */}
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Limitations</p>
                    <p className="text-xs text-amber-600">Simulation values only. Poisson arrivals, constant service rate. Not real-world validated.</p>
                  </div>

                  {/* Export buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportExp(selected.id, 'csv')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button
                      onClick={() => exportExp(selected.id, 'json')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> JSON
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700 capitalize max-w-[180px] text-right truncate">{value}</span>
    </div>
  );
}

