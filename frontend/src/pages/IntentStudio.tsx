import { useState } from 'react';
import Layout from '../components/layout/Layout';
import IntersectionCanvas from '../components/intersection/IntersectionCanvas';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { fmt } from '../utils/formatters';
import { Sliders, Shield, Zap, RefreshCw, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

const APPROACHES = ['north', 'south', 'east', 'west'] as const;
const PRIORITY_LABELS: Record<number, string> = { 1: 'Low', 2: 'Below Normal', 3: 'Normal', 4: 'High', 5: 'Critical' };
const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-slate-400', 2: 'bg-blue-400', 3: 'bg-teal-500', 4: 'bg-amber-500', 5: 'bg-red-500'
};

interface SignalPlan {
  phases: Array<{ phase: string; approaches: string[]; green_duration: number; yellow_duration: number; all_red_duration: number }>;
  cycle_time: number;
  safety_valid: boolean;
  violations: string[];
  explanation: string;
  estimated_delay: number;
  weights_used?: Record<string, number>;
}

export default function IntentStudio() {
  const { state, dispatch } = useAppStore();
  const { addToast } = useToast();
  const ts = state.trafficState;

  const [priorities, setPriorities] = useState<Record<string, number>>({ north: 3, south: 3, east: 3, west: 3 });
  const [effWeight, setEffWeight] = useState(40);
  const [fairWeight, setFairWeight] = useState(40);
  const [prioWeight, setPrioWeight] = useState(20);
  const [protectedCrossings, setProtectedCrossings] = useState<string[]>([]);
  const [plan, setPlan] = useState<SignalPlan | null>(null);
  const [planB, setPlanB] = useState<SignalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [intentDirty, setIntentDirty] = useState(false);

  const totalWeight = effWeight + fairWeight + prioWeight;
  const normalizedWeights = {
    efficiency: effWeight / totalWeight,
    fairness: fairWeight / totalWeight,
    priority: prioWeight / totalWeight,
  };

  const approaches = ts?.approaches ?? {};

  const handlePriorityChange = (approach: string, val: number) => {
    setPriorities(p => ({ ...p, [approach]: val }));
    setIntentDirty(true);
    dispatch({ type: 'UPDATE_INTENT', payload: { priorities: { ...priorities, [approach]: val } } });
  };

  const handleWeightChange = (setter: (v: number) => void, val: number) => {
    setter(val);
    setIntentDirty(true);
  };

  const toggleProtectedCrossing = (crossing: string) => {
    setProtectedCrossings(prev =>
      prev.includes(crossing) ? prev.filter(c => c !== crossing) : [...prev, crossing]
    );
    setIntentDirty(true);
  };

  const generatePlan = async (isPlanB = false) => {
    try {
      if (isPlanB) setComparing(true); else setLoading(true);

      // Save intent first
      await api.updateIntent({
        priorities,
        efficiencyWeight: normalizedWeights.efficiency,
        fairnessWeight: normalizedWeights.fairness,
        priorityWeight: normalizedWeights.priority,
        protectedCrossings,
      });

      const queues = Object.fromEntries(APPROACHES.map(a => [a, approaches[a]?.queued ?? 0]));
      const waits = Object.fromEntries(APPROACHES.map(a => [a, approaches[a]?.avgWait ?? 0]));

      const result = await api.optimizeSignal({
        approach_queues: queues,
        approach_waits: waits,
        intent_weights: {
          priorities: Object.fromEntries(Object.entries(priorities).map(([k, v]) => [k, v])),
          efficiency_weight: normalizedWeights.efficiency,
          fairness_weight: normalizedWeights.fairness,
          priority_weight: normalizedWeights.priority,
        },
      });

      if (isPlanB) {
        setPlanB(result);
        setShowComparison(true);
      } else {
        setPlan(result);
        setIntentDirty(false);
      }
      addToast('success', isPlanB ? 'Plan B generated' : 'Signal plan generated', result.safety_valid ? 'Safety validated ✓' : 'Safety violations detected');
    } catch (e: any) {
      addToast('error', 'Optimization failed', e.message);
    } finally {
      if (isPlanB) setComparing(false); else setLoading(false);
    }
  };

  // Build approach info for canvas showing priorities
  const canvasApproaches = Object.fromEntries(
    APPROACHES.map(a => [a, {
      signal: approaches[a]?.signal ?? 'RED',
      queued: approaches[a]?.queued ?? 0,
      vehicles: approaches[a]?.vehicles ?? 0,
    }])
  );

  return (
    <Layout title="Intent Studio" subtitle="Shape signal decisions through visual priority controls and optimization preferences.">
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Approach priorities */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-700">Traffic Priorities</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Set desired priority for each approach. The AI translates these into optimized signal timings.</p>

            {APPROACHES.map(approach => (
              <div key={approach} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 capitalize">{approach}</span>
                  <span className={clsx(
                    'text-xs font-semibold px-2 py-0.5 rounded text-white',
                    PRIORITY_COLORS[priorities[approach]]
                  )}>{PRIORITY_LABELS[priorities[approach]]}</span>
                </div>
                {/* Priority dots */}
                <div className="flex gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => handlePriorityChange(approach, v)}
                      className={clsx(
                        'w-7 h-7 rounded-full text-xs font-bold border-2 transition-all',
                        priorities[approach] >= v
                          ? `${PRIORITY_COLORS[priorities[approach]]} border-transparent text-white`
                          : 'bg-slate-100 border-slate-200 text-slate-400 hover:border-slate-300'
                      )}
                      aria-label={`Set ${approach} priority to ${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <input
                  type="range" min={1} max={5} step={1}
                  value={priorities[approach]}
                  onChange={e => handlePriorityChange(approach, Number(e.target.value))}
                  className="w-full h-1.5 rounded appearance-none bg-slate-200 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Low</span><span>Critical</span>
                </div>
              </div>
            ))}
          </div>

          {/* Protected crossings */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-700">Protected Crossings</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Hard safety constraints — cannot be overridden.</p>
            {['north-pedestrian', 'south-pedestrian', 'east-pedestrian', 'west-pedestrian'].map(c => (
              <label key={c} className="flex items-center gap-2 mb-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={protectedCrossings.includes(c)}
                  onChange={() => toggleProtectedCrossing(c)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 group-hover:text-slate-800 capitalize">
                  {c.replace('-', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Center: Intersection + plan */}
        <div className="col-span-6 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Intersection Preview</h2>
              {intentDirty && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  ⚠ Intent changed — regenerate plan
                </span>
              )}
            </div>
            <div className="flex justify-center">
              <IntersectionCanvas approaches={canvasApproaches} phase={ts?.phase} phaseRemaining={ts?.phaseRemaining} compact={false} />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => generatePlan(false)}
                disabled={loading}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm',
                  loading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                )}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? 'Optimizing…' : 'Generate Optimized Signal Plan'}
              </button>
            </div>
          </div>

          {/* Plan result */}
          {plan && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700">Proposed Signal Plan</h2>
                <span className={clsx(
                  'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                  plan.safety_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}>
                  {plan.safety_valid ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {plan.safety_valid ? 'SAFETY VALIDATED' : 'VIOLATIONS DETECTED'}
                </span>
              </div>

              {/* Phase table */}
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase">Phase</th>
                    <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase">Approaches</th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-500 uppercase">Green</th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-500 uppercase">Yellow</th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-500 uppercase">All-Red</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.phases.map((ph, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-700">{ph.phase}</td>
                      <td className="py-2 text-slate-600 capitalize">{ph.approaches.join(', ')}</td>
                      <td className="py-2 text-right font-semibold text-green-700">{ph.green_duration}s</td>
                      <td className="py-2 text-right text-amber-600">{ph.yellow_duration}s</td>
                      <td className="py-2 text-right text-slate-400">{ph.all_red_duration}s</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="pt-2 text-xs text-slate-400">Cycle time</td>
                    <td colSpan={3} className="pt-2 text-right font-semibold text-slate-700">{plan.cycle_time}s total</td>
                  </tr>
                </tfoot>
              </table>

              {/* Violations */}
              {!plan.safety_valid && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Safety Violations:</p>
                  {plan.violations.map((v, i) => <p key={i} className="text-xs text-red-600">• {v}</p>)}
                </div>
              )}

              {/* Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Why this plan?</p>
                <p className="text-xs text-blue-600">{plan.explanation}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Estimated delay</span>
                <span className="font-semibold text-slate-700">{fmt(plan.estimated_delay)}s</span>
              </div>

              {/* Compare button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => generatePlan(true)}
                  disabled={comparing}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-medium"
                >
                  {comparing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Generate Alternative Plan B for comparison
                </button>
              </div>
            </div>
          )}

          {/* Plan comparison */}
          {showComparison && plan && planB && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Plan Comparison</h2>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Plan A (Current)', p: plan }, { label: 'Plan B (Alternative)', p: planB }].map(({ label, p }) => (
                  <div key={label} className="border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-3">{label}</p>
                    <CompareRow label="Cycle time" value={`${p.cycle_time}s`} />
                    <CompareRow label="Est. delay" value={`${fmt(p.estimated_delay)}s`} />
                    <CompareRow label="Safety" value={p.safety_valid ? '✓ Valid' : '✗ Violations'} ok={p.safety_valid} />
                    {p.phases.map((ph, i) => (
                      <CompareRow key={i} label={ph.phase} value={`${ph.green_duration}s green`} />
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Recommendation: {plan.estimated_delay <= planB.estimated_delay ? 'Plan A' : 'Plan B'} (lower estimated delay)
              </p>
            </div>
          )}
        </div>

        {/* Right: Optimization weights */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-700">Optimization Weights</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Adjust the balance between efficiency, fairness, and user priorities. Weights auto-normalize.</p>

            <WeightSlider
              label="Traffic Efficiency"
              desc="Prioritize throughput and queue reduction"
              value={effWeight}
              onChange={v => handleWeightChange(setEffWeight, v)}
              color="blue"
              normalized={normalizedWeights.efficiency}
            />
            <WeightSlider
              label="Waiting-Time Fairness"
              desc="Equalize wait times across all approaches"
              value={fairWeight}
              onChange={v => handleWeightChange(setFairWeight, v)}
              color="teal"
              normalized={normalizedWeights.fairness}
            />
            <WeightSlider
              label="Priority Responsiveness"
              desc="How strongly user priorities influence allocation"
              value={prioWeight}
              onChange={v => handleWeightChange(setPrioWeight, v)}
              color="purple"
              normalized={normalizedWeights.priority}
            />

            {/* Active weights display */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Normalized Weights (sum = 1.0)</p>
              {Object.entries(normalizedWeights).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 capitalize">{k}</span>
                  <span className="font-mono font-semibold text-slate-700">{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring model explanation */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">PULSE Scoring Model</h2>
            <div className="text-xs text-slate-500 space-y-2">
              <p className="font-mono text-xs bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                Score(phase) =<br/>
                &nbsp;&nbsp;w1 × NormQueue<br/>
                &nbsp;&nbsp;+ w2 × NormWait<br/>
                &nbsp;&nbsp;+ w3 × UserPriority
              </p>
              <p>Each term is normalized to [0,1] before weighting.</p>
              <p>Starvation prevention: if any approach waits &gt;120s, it gets boosted priority.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function WeightSlider({ label, desc, value, onChange, color, normalized }: {
  label: string; desc: string; value: number; onChange: (v: number) => void; color: string; normalized: number;
}) {
  const colorMap: Record<string, string> = { blue: 'accent-blue-600', teal: 'accent-teal-600', purple: 'accent-purple-600' };
  const bgMap: Record<string, string> = { blue: 'bg-blue-500', teal: 'bg-teal-500', purple: 'bg-purple-500' };
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
        <span className="text-xs font-semibold text-slate-600 ml-2">{value}%</span>
      </div>
      <input
        type="range" min={5} max={80} step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={clsx('w-full h-1.5 rounded appearance-none bg-slate-200', colorMap[color])}
      />
      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', bgMap[color])} style={{ width: `${normalized * 100}%` }} />
      </div>
      <p className="text-xs text-slate-400 text-right">{(normalized * 100).toFixed(0)}% effective</p>
    </div>
  );
}

function CompareRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={clsx('font-medium', ok === false ? 'text-red-600' : ok === true ? 'text-green-600' : 'text-slate-700')}>{value}</span>
    </div>
  );
}

