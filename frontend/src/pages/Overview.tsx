import Layout from '../components/layout/Layout';
import { useAppStore } from '../store/appStore';
import { fmt, fmtTime, severityColor } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Car, Clock, List, Activity, Info } from 'lucide-react';
import IntersectionCanvas from '../components/intersection/IntersectionCanvas';
import { clsx } from 'clsx';

const APPROACHES = ['north', 'south', 'east', 'west'] as const;

function KPICard({ title, value, unit, subtitle, icon: Icon, color }: {
  title: string; value: string; unit: string; subtitle: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={clsx('text-4xl font-bold', color)}>{value}</span>
            <span className="text-sm text-slate-400">{unit}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={clsx('p-2 rounded-lg', color.replace('text-', 'bg-').replace('-700','-100').replace('-600','-100'))}>
          <Icon className={clsx('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { state } = useAppStore();
  const ts = state.trafficState;
  const approaches = ts?.approaches ?? {};

  const alertIcon = (level: string) => {
    if (level === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />;
    if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
    return <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />;
  };

  const getSeverityBadge = (severity: string) => (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', severityColor(severity))}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );

  return (
    <Layout title="Traffic Operations Overview" subtitle="Real-time intersection intelligence and adaptive signal monitoring.">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Vehicles Detected"
          value={ts ? String(ts.vehicles) : '—'}
          unit="vehicles"
          subtitle={`Source: ${ts?.videoStatus ?? 'simulation'} · ${fmtTime(ts?.timestamp)}`}
          icon={Car}
          color="text-blue-600"
        />
        <KPICard
          title="Average Waiting Time"
          value={ts ? fmt(ts.avgWait) : '—'}
          unit="seconds"
          subtitle="Mean across all approaches"
          icon={Clock}
          color="text-teal-600"
        />
        <KPICard
          title="Maximum Queue"
          value={ts ? String(ts.maxQueue) : '—'}
          unit="vehicles"
          subtitle={ts ? `Most congested: ${Object.entries(ts.approaches ?? {}).sort((a,b) => (b[1].queued||0)-(a[1].queued||0))[0]?.[0] ?? '—'}` : 'No data'}
          icon={List}
          color="text-amber-600"
        />
        <KPICard
          title="Active Controller"
          value={ts?.controller?.toUpperCase() ?? 'PULSE'}
          unit=""
          subtitle={`Phase: ${ts?.phase ?? '—'} · ${ts?.phaseRemaining != null ? `${Math.round(ts.phaseRemaining)}s remaining` : ''}`}
          icon={Activity}
          color="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section A: Intersection Snapshot */}
        <div className="xl:col-span-1 bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Intersection Snapshot</h2>
          <div className="flex justify-center">
            <IntersectionCanvas
              approaches={approaches as any}
              phase={ts?.phase}
              phaseRemaining={ts?.phaseRemaining}
              compact={false}
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Green</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Yellow</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Red</span>
          </div>
        </div>

        {/* Section B: Approach Summary */}
        <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Approach Summary</h2>
          {ts ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Approach','Vehicles','Queued','Avg Wait','Max Wait','Signal','Severity'].map(h => (
                      <th key={h} className="text-left pb-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {APPROACHES.map(approach => {
                    const a = approaches[approach];
                    if (!a) return null;
                    return (
                      <tr key={approach} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-slate-700 capitalize">{approach}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{a.vehicles ?? 0}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{a.queued ?? 0}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{fmt(a.avgWait)}s</td>
                        <td className="py-2.5 pr-4 text-slate-600">{fmt(a.maxWait)}s</td>
                        <td className="py-2.5 pr-4">
                          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                            a.signal === 'GREEN' ? 'bg-green-100 text-green-700' :
                            a.signal === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}>{a.signal}</span>
                        </td>
                        <td className="py-2.5">{getSeverityBadge(a.severity ?? 'normal')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyTableState />
          )}
        </div>
      </div>

      {/* Section C & D: Alerts + Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Operational Alerts</h2>
          {ts?.alerts && ts.alerts.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ts.alerts.map((alert: any) => (
                <div key={alert.id} className={clsx(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  alert.level === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.level === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                )}>
                  {alertIcon(alert.level)}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.category} · {fmtTime(alert.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-teal-700">All systems operating normally</p>
                <p className="text-xs text-teal-600 mt-0.5">No active alerts detected.</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance Snapshot */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Performance Snapshot</h2>
          {state.experiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No experiment results yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Run an experiment in the Performance Lab to see comparison results here.
              </p>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              <p className="mb-2">Last experiment results:</p>
              {state.experiments.slice(0, 3).map((exp, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="capitalize">{exp.controller}</span>
                  <span className="font-medium">{fmt(exp.avgDelay)}s avg delay</span>
                  <span className="text-slate-400">{Math.round(exp.throughput)} veh/hr</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EmptyTableState() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-slate-400">No traffic data available.</p>
      <p className="text-xs text-slate-300 mt-1">Start a simulation or connect a video source.</p>
    </div>
  );
}

