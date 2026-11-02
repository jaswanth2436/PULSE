import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAppStore } from '../store/appStore';
import { Play, CheckCircle, Circle, RefreshCw, ChevronRight, Zap, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface DemoStep {
  step: number;
  title: string;
  description: string;
  action: string;
}

export default function GuidedDemo() {
  const { state, dispatch } = useAppStore();
  const { addToast } = useToast();

  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [demoActive, setDemoActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exploreMode, setExploreMode] = useState(false);

  useEffect(() => {
    api.getDemoSteps().then(r => setSteps(r.steps || [])).catch(() => { });
    api.demoStatus().then(r => {
      if (r.demo_state) {
        setDemoActive(r.demo_state.active);
        setCurrentStep(r.demo_state.current_step);
        setCompletedSteps(r.demo_state.steps_completed || []);
      }
    }).catch(() => { });
  }, []);

  const startDemo = async () => {
    setLoading(true);
    try {
      const r = await api.startDemo();
      setDemoActive(true);
      setCurrentStep(1);
      setCompletedSteps([]);
      setSteps(r.steps || steps);
      dispatch({ type: 'SET_DEMO_ACTIVE', payload: true });
      dispatch({ type: 'SET_DEMO_STEP', payload: 1 });
      addToast('success', 'Demo started', 'Follow the steps to explore PULSE');
    } catch (e: any) {
      addToast('error', 'Could not start demo', e.message);
    } finally {
      setLoading(false);
    }
  };

  const advanceStep = async (step: number) => {
    setLoading(true);
    try {
      const r = await api.advanceDemoStep(step);
      setCompletedSteps(prev => [...new Set([...prev, step])]);
      setCurrentStep(r.next_step);
      dispatch({ type: 'SET_DEMO_STEP', payload: r.next_step });
      if (r.is_final) {
        addToast('success', '🎉 Demo complete!', 'All steps finished. Explore freely.');
      } else {
        addToast('info', `Step ${step} complete`, r.step_info?.title);
      }
    } catch (e: any) {
      addToast('error', 'Step failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    try {
      await api.resetDemo();
      setDemoActive(false);
      setCurrentStep(0);
      setCompletedSteps([]);
      dispatch({ type: 'SET_DEMO_ACTIVE', payload: false });
      dispatch({ type: 'SET_DEMO_STEP', payload: 0 });
      addToast('info', 'Demo reset');
    } catch (e: any) {
      addToast('error', 'Reset failed', e.message);
    }
  };

  const isDone = completedSteps.length === steps.length && steps.length > 0;

  return (
    <Layout title="Guided Demo" subtitle="Walk through PULSE capabilities step by step, or explore freely.">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Hero */}
        {!demoActive && !exploreMode && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 text-white text-center shadow-lg">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">PULSE Guided Demonstration</h2>
            <p className="text-blue-100 mb-6 max-w-md mx-auto">
              Experience the complete PULSE workflow: vehicle detection, queue estimation, intent-driven optimization, safety validation, and performance comparison.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={startDemo}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-all shadow"
              >
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Start Guided Demo
              </button>
              <button
                onClick={() => setExploreMode(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500/30 text-white font-semibold rounded-lg hover:bg-blue-500/50 transition-all border border-white/30"
              >
                <ChevronRight className="h-5 w-5" /> Explore Freely
              </button>
            </div>
          </div>
        )}

        {exploreMode && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-700">Explore Mode</h2>
                <p className="text-sm text-slate-500 mt-1">Navigate freely through all PULSE features using the sidebar.</p>
              </div>
              <button onClick={() => setExploreMode(false)} className="text-sm text-blue-600 hover:text-blue-800">
                ← Back to Demo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {[
                { label: 'Overview', path: '/', desc: 'Live intersection state' },
                { label: 'Intersection', path: '/intersection', desc: 'Detection & signal view' },
                { label: 'Intent Studio', path: '/intent-studio', desc: 'Priority controls' },
                { label: 'Performance Lab', path: '/performance-lab', desc: 'Controller comparison' },
              ].map(p => (
                <a key={p.path} href={p.path} className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <p className="text-sm font-semibold text-slate-700">{p.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Demo steps */}
        {(demoActive || isDone) && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Demo Progress</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{completedSteps.length} of {steps.length} steps completed</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDone && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                      <CheckCircle className="h-4 w-4" /> Demo Complete!
                    </span>
                  )}
                  <button onClick={resetDemo} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${steps.length ? (completedSteps.length / steps.length) * 100 : 0}%` }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {steps.map(step => {
                  const isCompleted = completedSteps.includes(step.step);
                  const isCurrent = currentStep === step.step;
                  const isUpcoming = !isCompleted && !isCurrent;

                  return (
                    <div key={step.step} className={clsx(
                      'flex items-start gap-4 p-4 rounded-lg border transition-all',
                      isCompleted ? 'bg-green-50 border-green-200' :
                        isCurrent ? 'bg-blue-50 border-blue-300 shadow-sm' :
                          'bg-white border-slate-200 opacity-60'
                    )}>
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : isCurrent ? (
                          <div className="h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{step.step}</span>
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                            <span className="text-slate-400 text-xs">{step.step}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-semibold', isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-slate-500')}>
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      </div>
                      {isCurrent && !isCompleted && (
                        <button
                          onClick={() => advanceStep(step.step)}
                          disabled={loading}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all"
                        >
                          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {loading ? 'Running…' : 'Execute Step'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulation fallback note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-700">
              <p className="font-semibold mb-1">📡 Simulation Fallback Active</p>
              <p>
                This demo uses the PULSE traffic simulator. All vehicle data is generated algorithmically.
                No real camera or external data source is required.
                To use real video, upload a file in Intersection Intelligence.
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

