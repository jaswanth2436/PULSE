import { useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import IntersectionCanvas from '../components/intersection/IntersectionCanvas';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { fmt, fmtDuration, signalColor } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { Upload, Play, Pause, Square, Monitor, Video, Cpu, Sliders } from 'lucide-react';
import { clsx } from 'clsx';

const SOURCES = ['simulation', 'upload', 'webcam'] as const;
type Source = typeof SOURCES[number];

export default function IntersectionIntelligence() {
  const { state, dispatch } = useAppStore();
  const { addToast } = useToast();
  const ts = state.trafficState;
  const approaches = ts?.approaches ?? {};

  const [source, setSource] = useState<Source>('simulation');
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [controller, setController] = useState('pulse');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedData = selectedApproach ? approaches[selectedApproach] : null;

  const handleStartSim = async () => {
    try {
      setSimRunning(true);
      await api.startSimulation({ scenario: 'A', controller_type: controller });
      dispatch({ type: 'SET_SIM_RUNNING', payload: true });
      addToast('success', 'Simulation started', 'Scenario A: Balanced traffic');
    } catch (e: any) {
      addToast('error', 'Failed to start simulation', e.message);
      setSimRunning(false);
    }
  };

  const handleStopSim = async () => {
    try {
      await api.stopSimulation();
      setSimRunning(false);
      dispatch({ type: 'SET_SIM_RUNNING', payload: false });
      addToast('info', 'Simulation stopped');
    } catch (e: any) {
      addToast('error', 'Stop failed', e.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadStatus('Uploading...');
      await api.videoUpload(file);
      setUploadStatus(`Uploaded: ${file.name}`);
      addToast('success', 'Video uploaded', file.name);
    } catch (err: any) {
      setUploadStatus('Upload failed');
      addToast('error', 'Upload failed', err.message);
    }
  };

  return (
    <Layout title="Intersection Intelligence" subtitle="Live vehicle detection, tracking, and signal management.">
      <div className="flex gap-6">
        {/* Main intersection view */}
        <div className="flex-1 min-w-0">
          {/* Source selector */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-slate-600">Traffic Source:</span>
              <div className="flex gap-1">
                {SOURCES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={clsx(
                      'px-3 py-1.5 rounded text-xs font-medium transition-all',
                      source === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                {source === 'simulation' ? '🟡 Simulation Data' : source === 'upload' ? '📹 User Video' : '📷 Webcam'}
              </span>
            </div>

            {/* Controls */}
            {source === 'simulation' && (
              <div className="flex items-center gap-3">
                <select
                  value={controller}
                  onChange={e => setController(e.target.value)}
                  className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed Timing</option>
                  <option value="adaptive">Queue Adaptive</option>
                  <option value="pulse">PULSE Controller</option>
                </select>
                {!simRunning ? (
                  <button onClick={handleStartSim} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    <Play className="h-4 w-4" /> Start Simulation
                  </button>
                ) : (
                  <button onClick={handleStopSim} className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors">
                    <Square className="h-4 w-4" /> Stop
                  </button>
                )}
              </div>
            )}

            {source === 'upload' && (
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".mp4,.avi,.mov,.mkv" onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                  <Upload className="h-4 w-4" /> Upload Video
                </button>
                {uploadStatus && <span className="text-sm text-slate-600">{uploadStatus}</span>}
              </div>
            )}

            {source === 'webcam' && (
              <div className="text-sm text-slate-500">
                Webcam support requires browser permission. Camera access is used for local detection only.
              </div>
            )}
          </div>

          {/* Intersection canvas */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-700">Four-Way Intersection</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Phase: <strong className="text-slate-700">{ts?.phase ?? '—'}</strong></span>
                <span>Remaining: <strong className="text-slate-700">{ts?.phaseRemaining != null ? `${Math.round(ts.phaseRemaining)}s` : '—'}</strong></span>
                <span>FPS: <strong className="text-slate-700">{ts?.fps ?? 0}</strong></span>
              </div>
            </div>
            <div className="flex justify-center">
              <IntersectionCanvas
                approaches={approaches as any}
                selectedApproach={selectedApproach}
                onApproachClick={setSelectedApproach}
                phase={ts?.phase}
                phaseRemaining={ts?.phaseRemaining}
              />
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">Click an approach to inspect details</p>
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Approach detail */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {selectedApproach ? `${selectedApproach.charAt(0).toUpperCase() + selectedApproach.slice(1)} Approach` : 'Select an Approach'}
            </h3>
            {selectedData ? (
              <div className="space-y-3">
                <SignalBadge signal={selectedData.signal as string} />
                <Metric label="Vehicles detected" value={String(selectedData.vehicles ?? 0)} />
                <Metric label="Queued vehicles" value={String(selectedData.queued ?? 0)} />
                <Metric label="Avg wait" value={`${fmt(selectedData.avgWait as number)}s`} />
                <Metric label="Max wait" value={`${fmt(selectedData.maxWait as number)}s`} />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Queue pressure</p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (((selectedData.queued as number) ?? 0) / 20) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedData.queued ?? 0} / 20 capacity</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Severity</p>
                  <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize',
                    (selectedData as any).severity === 'critical' ? 'bg-red-100 text-red-700' :
                    (selectedData as any).severity === 'high' ? 'bg-amber-100 text-amber-700' :
                    (selectedData as any).severity === 'elevated' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-teal-100 text-teal-700'
                  )}>{(selectedData as any).severity ?? 'normal'}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Click on an approach in the intersection diagram to view details.</p>
            )}
          </div>

          {/* System status */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              <StatusRow label="Detector" value={ts?.modelStatus ?? 'Mock'} ok={(ts?.modelStatus ?? '') !== 'error'} />
              <StatusRow label="Video" value={ts?.videoStatus ?? 'idle'} ok />
              <StatusRow label="Controller" value={ts?.controller ?? 'pulse'} ok />
              <StatusRow label="Backend" value={state.wsConnected ? 'Connected' : 'Offline'} ok={state.wsConnected} />
            </div>
          </div>

          {/* Detection note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">Detection Mode</p>
            <p className="text-xs text-amber-600">
              Running in <strong>Simulation Mode</strong>. Vehicle counts are generated from the traffic simulator.
              Upload a video or connect a webcam for real detection.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const color = signal === 'GREEN' ? 'bg-green-100 text-green-700 border-green-300' :
    signal === 'YELLOW' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
    'bg-red-100 text-red-700 border-red-300';
  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2 rounded border', color)}>
      <div className={clsx('w-3 h-3 rounded-full', signal === 'GREEN' ? 'bg-green-500' : signal === 'YELLOW' ? 'bg-yellow-500' : 'bg-red-500')} />
      <span className="text-sm font-semibold">{signal}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={clsx('w-1.5 h-1.5 rounded-full', ok ? 'bg-green-500' : 'bg-red-500')} />
        <span className="text-slate-700 capitalize text-xs">{value}</span>
      </div>
    </div>
  );
}

