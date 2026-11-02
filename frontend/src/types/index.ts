// ============================================================
// PULSE TypeScript Type Definitions
// ============================================================

export interface VehicleData {
  id: string;
  count: number;
  queued: number;
  avgWait: number;
  maxWait: number;
  signal: 'GREEN' | 'YELLOW' | 'RED';
  approach: 'north' | 'south' | 'east' | 'west';
}

export interface ApproachData {
  name: string;
  vehicles: number;
  queued: number;
  avgWait: number;
  maxWait: number;
  signal: string;
  severity: 'normal' | 'elevated' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  category: string;
  timestamp: string;
}

export interface TrafficState {
  vehicles: number;
  avgWait: number;
  maxQueue: number;
  controller: string;
  phase: string;
  phaseRemaining: number;
  approaches: Record<string, ApproachData>;
  alerts: Alert[];
  fps: number;
  modelStatus: string;
  videoStatus: string;
  timestamp: string;
  source?: 'video' | 'webcam' | 'simulation' | 'none';
  detections?: Array<{
    id: string;
    class: string;
    approach: string;
    confidence: number;
    is_queued?: boolean;
    wait?: number;
  }>;
}

export interface SignalPhase {
  name: string;
  approaches: string[];
  greenDuration: number;
}

export interface SignalPlan {
  phases: SignalPhase[];
  cycleTime: number;
  safetyValid: boolean;
  violations: string[];
  explanation: string;
  estimatedDelay: number;
}

export interface IntentProfile {
  priorities: Record<string, number>; // approach -> 1-5
  efficiencyWeight: number;
  fairnessWeight: number;
  priorityWeight: number;
  protectedCrossings: string[];
}

export interface ExperimentResult {
  id: string;
  scenario: string;
  controller: string;
  avgDelay: number;
  p95Delay: number;
  maxQueue: number;
  avgQueue: number;
  throughput: number;
  vehiclesServed: number;
  safetyViolations: number;
  computationTime: number;
  approachDelays: Record<string, number>;
  timestamp: string;
}

export interface SimulationConfig {
  duration: number;
  seed: number;
  arrivalRates: Record<string, number>;
  minGreen: number;
  maxGreen: number;
  yellowDuration: number;
  allRedDuration: number;
  serviceRate: number;
  initialQueues: Record<string, number>;
}

export interface ControllerComparison {
  scenario: string;
  duration: number;
  seed: number;
  results: {
    fixed?: ExperimentResult;
    queue_adaptive?: ExperimentResult;
    pulse?: ExperimentResult;
  };
  timestamp: string;
}

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  level: ToastLevel;
  title: string;
  message?: string;
}

export type SignalState = 'GREEN' | 'YELLOW' | 'RED' | 'OFF';
export type Approach = 'north' | 'south' | 'east' | 'west';
