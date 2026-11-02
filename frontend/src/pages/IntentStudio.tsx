import { useState } from 'react';
import Layout from '../components/layout/Layout';
import IntersectionCanvas from '../components/intersection/IntersectionCanvas';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { fmt } from '../utils/formatters';
import {
  Sliders,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock,
  Sparkles,
  ArrowRight,
  Info,
  Scale,
  Flame,
  Bus,
  Users,
  Ambulance,
  GitBranch,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { clsx } from 'clsx';

const APPROACHES = ['north', 'south', 'east', 'west'] as const;

interface SignalPlan {
  phases: Array<{
    phase: string;
    approaches: string[];
    green_duration: number;
    yellow_duration: number;
    all_red_duration: number;
  }>;
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
  const approaches = ts?.approaches ?? {};

  // ── 5 Core Intent Sculpting Priorities ──────────────────────────
  const [emergencyWeight, setEmergencyWeight] = useState(10);
  const [congestionWeight, setCongestionWeight] = useState(35);
  const [transitWeight, setTransitWeight] = useState(20);
  const [pedestrianWeight, setPedestrianWeight] = useState(15);
  const [balancedWeight, setBalancedWeight] = useState(20);

  // Approach-level direct bias (1 to 5)
  const [priorities, setPriorities] = useState<Record<string, number>>({
    north: 3,
    south: 3,
    east: 4,
    west: 3,
  });

  const [protectedCrossings, setProtectedCrossings] = useState<string[]>([
    'north-pedestrian',
    'south-pedestrian',
  ]);
  const [plan, setPlan] = useState<SignalPlan | null>(null);
  const [planB, setPlanB] = useState<SignalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [intentDirty, setIntentDirty] = useState(false);

  // Computed normalized weights
  const sumWeights = emergencyWeight + congestionWeight + transitWeight + pedestrianWeight + balancedWeight;
  const normalizedIntent = {
    emergency: emergencyWeight / sumWeights,
    congestion: congestionWeight / sumWeights,
    transit: transitWeight / sumWeights,
    pedestrian: pedestrianWeight / sumWeights,
    balanced: balancedWeight / sumWeights,
  };

  const radarData = [
    { priority: 'Emergency', value: Math.round(normalizedIntent.emergency * 100) },
    { priority: 'Congestion', value: Math.round(normalizedIntent.congestion * 100) },
    { priority: 'Transit', value: Math.round(normalizedIntent.transit * 100) },
    { priority: 'Pedestrian', value: Math.round(normalizedIntent.pedestrian * 100) },
    { priority: 'Balanced', value: Math.round(normalizedIntent.balanced * 100) },
  ];

  const handlePriorityChange = (approach: string, val: number) => {
    const updated = { ...priorities, [approach]: val };
    setPriorities(updated);
    setIntentDirty(true);
    dispatch({ type: 'UPDATE_INTENT', payload: { priorities: updated } });
  };

  const toggleProtectedCrossing = (crossing: string) => {
    setProtectedCrossings((prev) =>
      prev.includes(crossing) ? prev.filter((c) => c !== crossing) : [...prev, crossing]
    );
    setIntentDirty(true);
  };

  const generatePlan = async (isPlanB = false) => {
    try {
      if (isPlanB) setComparing(true);
      else setLoading(true);

      // Save user intent preferences to backend
      await api.updateIntent({
        priorities,
        efficiencyWeight: normalizedIntent.congestion,
        fairnessWeight: normalizedIntent.balanced,
        priorityWeight: normalizedIntent.emergency + normalizedIntent.transit,
        protectedCrossings,
      });

      const queues = Object.fromEntries(APPROACHES.map((a) => [a, approaches[a]?.queued ?? 0]));
      const waits = Object.fromEntries(APPROACHES.map((a) => [a, approaches[a]?.avgWait ?? 0]));

      const result = await api.optimizeSignal({
        approach_queues: queues,
        approach_waits: waits,
        intent_weights: {
          priorities,
          efficiency_weight: normalizedIntent.congestion,
          fairness_weight: normalizedIntent.balanced,
          priority_weight: (emergencyWeight + transitWeight) / sumWeights,
        },
      });

      if (isPlanB) {
        setPlanB(result);
        setShowComparison(true);
      } else {
        setPlan(result);
        setIntentDirty(false);
      }

      addToast(
        'success',
        isPlanB ? 'Alternative Plan B Generated' : 'Signal Plan Generated & Validated',
        result.safety_valid
          ? 'Safety Agent confirmed 0 constraint violations.'
          : 'Warning: Safety violations detected in plan.'
      );
    } catch (e: any) {
      addToast('error', 'Optimization Engine Failed', e.message);
    } finally {
      if (isPlanB) setComparing(false);
      else setLoading(false);
    }
  };

  return (
    <Layout
      title="Traffic Intent Sculpting™"
      subtitle="Define what matters most at this intersection. PULSE translates your policy preferences into an adaptive traffic signal strategy."
    >
      <div className="space-y-6">
        {/* ── Signature Concept Hero Banner ────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                PULSE Core Innovation
              </span>
              <span className="text-xs text-slate-300">Policy-to-Signal Translation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Traffic Intent Sculpting™ Engine
            </h2>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed">
              Instead of manually coding rigid second durations, express operational goals: emergency green waves, public transit priority, or pedestrian crossing safety. The optimization engine generates valid phase splits under immutable NEMA safety rules.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0 flex items-center gap-3">
            <button
              onClick={() => generatePlan(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span>{loading ? 'Optimizing...' : 'Generate Optimized Plan'}</span>
            </button>
          </div>
        </div>

        {/* ── 3-Column Studio Workspace ────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Column 1: 5 Priority Control Cards */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  <h3 className="text-base font-semibold text-slate-800">Priority Weight Controls</h3>
                </div>
                <span className="text-xs text-slate-400">Sum: 100% Normalized</span>
              </div>

              <div className="space-y-4">
                {/* 1. Emergency Priority */}
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Ambulance className="h-4 w-4 text-rose-600" />
                      <span className="text-xs font-bold text-slate-800">Emergency Vehicle Priority</span>
                    </div>
                    <span className="text-xs font-bold text-rose-700">{Math.round(normalizedIntent.emergency * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Immediate green wave preemption for first responders.</p>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={emergencyWeight}
                    onChange={(e) => {
                      setEmergencyWeight(Number(e.target.value));
                      setIntentDirty(true);
                    }}
                    className="w-full accent-rose-600"
                  />
                </div>

                {/* 2. Congestion Reduction */}
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800">Congestion Reduction</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700">{Math.round(normalizedIntent.congestion * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Maximizes vehicular throughput on highest queue approaches.</p>
                  <input
                    type="range"
                    min={10}
                    max={70}
                    value={congestionWeight}
                    onChange={(e) => {
                      setCongestionWeight(Number(e.target.value));
                      setIntentDirty(true);
                    }}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* 3. Public Transport Priority */}
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Public Transport Priority</span>
                    </div>
                    <span className="text-xs font-bold text-blue-700">{Math.round(normalizedIntent.transit * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Favors bus transit lanes to reduce aggregate passenger delay.</p>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={transitWeight}
                    onChange={(e) => {
                      setTransitWeight(Number(e.target.value));
                      setIntentDirty(true);
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* 4. Pedestrian Safety */}
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Pedestrian Safety Guarantee</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">{Math.round(normalizedIntent.pedestrian * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Guarantees safe crossing intervals and walk clearance phases.</p>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    value={pedestrianWeight}
                    onChange={(e) => {
                      setPedestrianWeight(Number(e.target.value));
                      setIntentDirty(true);
                    }}
                    className="w-full accent-emerald-600"
                  />
                </div>

                {/* 5. Balanced Traffic Flow */}
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Balanced Traffic Flow</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700">{Math.round(normalizedIntent.balanced * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Fairness dampener preventing starvation on low-volume roads.</p>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={balancedWeight}
                    onChange={(e) => {
                      setBalancedWeight(Number(e.target.value));
                      setIntentDirty(true);
                    }}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Approach Priority Levels (1 to 5) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Approach Bias Multipliers (1 = Normal, 5 = Critical)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {APPROACHES.map((appKey) => (
                  <div key={appKey} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold capitalize text-slate-800">{appKey}</span>
                      <span className="text-[11px] font-bold text-blue-700">Lvl {priorities[appKey]}</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => handlePriorityChange(appKey, lvl)}
                          className={clsx(
                            'flex-1 py-0.5 rounded text-[10px] font-bold transition-all',
                            priorities[appKey] >= lvl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                          )}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Intersection Context & Plan Output */}
          <div className="xl:col-span-5 space-y-6">
            {/* Visualizer with Priority Glow */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Traffic Context & Geometric Preview</h3>
                  <p className="text-xs text-slate-500">Live queues, waiting times, and directional priority highlights</p>
                </div>
                {intentDirty && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded animate-pulse">
                    Intent Modified
                  </span>
                )}
              </div>

              <div className="py-2 flex justify-center">
                <IntersectionCanvas
                  approaches={approaches as any}
                  priorities={priorities}
                  phase={ts?.phase}
                  phaseRemaining={ts?.phaseRemaining}
                  compact={false}
                />
              </div>

              {/* Generate Action Button */}
              <button
                onClick={() => generatePlan(false)}
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span>{loading ? 'Synthesizing Signal Schedule...' : 'GENERATE OPTIMIZED SIGNAL PLAN'}</span>
              </button>
            </div>

            {/* Generated Signal Plan Output Card */}
            {plan && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Recommended Signal Plan</h3>
                    <p className="text-xs text-slate-500">Optimized Cycle: {plan.cycle_time}s · Predicted Delay: {fmt(plan.estimated_delay)}s</p>
                  </div>
                  <span
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5',
                      plan.safety_valid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    )}
                  >
                    {plan.safety_valid ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {plan.safety_valid ? 'Safety Validated' : 'Safety Violated'}
                  </span>
                </div>

                {/* Phase Sequence Timeline Visualization */}
                <div>
                  <span className="text-xs font-semibold text-slate-600 block mb-1.5">Cycle Phase Sequence</span>
                  <div className="h-6 rounded-lg overflow-hidden flex text-[10px] font-bold text-white shadow-inner">
                    {plan.phases.map((ph, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          'h-full flex items-center justify-center transition-all',
                          idx % 2 === 0 ? 'bg-blue-600' : 'bg-indigo-600'
                        )}
                        style={{ width: `${(ph.green_duration / plan.cycle_time) * 100}%` }}
                        title={`${ph.phase}: ${ph.green_duration}s Green`}
                      >
                        {ph.phase}: {ph.green_duration}s
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Phase Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold text-left">
                        <th className="pb-2">Phase</th>
                        <th className="pb-2">Direction</th>
                        <th className="pb-2 text-right">Green</th>
                        <th className="pb-2 text-right">Yellow</th>
                        <th className="pb-2 text-right">All-Red</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.phases.map((ph, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 font-bold text-slate-800">{ph.phase}</td>
                          <td className="py-2 text-slate-600 capitalize">{ph.approaches.join(', ')}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{ph.green_duration}s</td>
                          <td className="py-2 text-right text-amber-600">{ph.yellow_duration}s</td>
                          <td className="py-2 text-right text-rose-600">{ph.all_red_duration}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Decision Rationale */}
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                  <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
                    <Info className="h-3.5 w-3.5" />
                    <span>Optimization Rationale</span>
                  </div>
                  <p className="leading-relaxed">{plan.explanation}</p>
                </div>

                {/* Compare Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => generatePlan(true)}
                    disabled={comparing}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {comparing && <RefreshCw className="h-3 w-3 animate-spin" />}
                    <span>Generate Alternative Plan B for Trade-off Comparison →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Plan Comparison Side-by-Side Card */}
            {showComparison && plan && planB && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-md p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Plan A vs Plan B Comparison</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="font-bold text-slate-800 mb-1">Plan A (Current)</p>
                    <p className="text-slate-600">Delay: {fmt(plan.estimated_delay)}s</p>
                    <p className="text-slate-600">Cycle: {plan.cycle_time}s</p>
                    <p className="text-emerald-600 font-semibold mt-1">Status: {plan.safety_valid ? 'Valid' : 'Invalid'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                    <p className="font-bold text-blue-900 mb-1">Plan B (Alternative)</p>
                    <p className="text-blue-700">Delay: {fmt(planB.estimated_delay)}s</p>
                    <p className="text-blue-700">Cycle: {planB.cycle_time}s</p>
                    <p className="text-emerald-600 font-semibold mt-1">Status: {planB.safety_valid ? 'Valid' : 'Invalid'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Radar Intent Distribution & Hard Safety Rules */}
          <div className="xl:col-span-3 space-y-6">
            {/* Weight Distribution Radar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Policy Intent Radar
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="priority" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 50]} tick={false} />
                    <Radar dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-1">Normalized Policy Objective Radar</p>
            </div>

            {/* Dedicated Safety Validation Panel (Hard Constraints) */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Lock className="h-4 w-4 text-rose-600" />
                <h3 className="text-base font-semibold">Mandatory Safety Constraints</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                NEMA safety rules are hard mathematical bounds enforced by the Safety Agent. Operator priorities cannot override these limits.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Minimum Green Time</span>
                  <span className="font-bold text-slate-900">10.0 seconds</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Maximum Green Time</span>
                  <span className="font-bold text-slate-900">90.0 seconds</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Yellow Clearance Interval</span>
                  <span className="font-bold text-slate-900">≥ 3.0 seconds</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">All-Red Clearance Interval</span>
                  <span className="font-bold text-slate-900">≥ 2.0 seconds</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Conflicting Movements</span>
                  <span className="font-bold text-emerald-600">Hard Blocked</span>
                </div>
              </div>
            </div>

            {/* Pedestrian Crossing Safeguards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-800">Protected Crossings</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">Enforce pedestrian walk phases on protected crosswalks.</p>

              <div className="space-y-2">
                {['North Crosswalk', 'South Crosswalk', 'East Crosswalk', 'West Crosswalk'].map((cw) => {
                  const id = cw.toLowerCase().replace(' ', '-');
                  const checked = protectedCrossings.includes(id);
                  return (
                    <label
                      key={id}
                      className={clsx(
                        'flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                        checked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      )}
                    >
                      <span>{cw}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProtectedCrossing(id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
