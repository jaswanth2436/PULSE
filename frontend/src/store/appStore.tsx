import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { TrafficState, IntentProfile, ExperimentResult, Toast } from '../types';

interface AppState {
  trafficState: TrafficState | null;
  wsConnected: boolean;
  intentProfile: IntentProfile;
  experiments: ExperimentResult[];
  toasts: Toast[];
  demoStep: number;
  demoActive: boolean;
  simulationRunning: boolean;
  simulationProgress: number;
}

type Action =
  | { type: 'UPDATE_TRAFFIC'; payload: TrafficState }
  | { type: 'SET_WS_CONNECTED'; payload: boolean }
  | { type: 'UPDATE_INTENT'; payload: Partial<IntentProfile> }
  | { type: 'ADD_EXPERIMENT'; payload: ExperimentResult }
  | { type: 'SET_EXPERIMENTS'; payload: ExperimentResult[] }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'DISMISS_TOAST'; payload: string }
  | { type: 'SET_DEMO_STEP'; payload: number }
  | { type: 'SET_DEMO_ACTIVE'; payload: boolean }
  | { type: 'SET_SIM_RUNNING'; payload: boolean }
  | { type: 'SET_SIM_PROGRESS'; payload: number };

const initialState: AppState = {
  trafficState: null,
  wsConnected: false,
  intentProfile: {
    priorities: { north: 3, south: 3, east: 3, west: 3 },
    efficiencyWeight: 0.4,
    fairnessWeight: 0.4,
    priorityWeight: 0.2,
    protectedCrossings: [],
  },
  experiments: [],
  toasts: [],
  demoStep: 0,
  demoActive: false,
  simulationRunning: false,
  simulationProgress: 0,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_TRAFFIC':
      return { ...state, trafficState: action.payload };
    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };
    case 'UPDATE_INTENT':
      return { ...state, intentProfile: { ...state.intentProfile, ...action.payload } };
    case 'ADD_EXPERIMENT':
      return { ...state, experiments: [action.payload, ...state.experiments] };
    case 'SET_EXPERIMENTS':
      return { ...state, experiments: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_DEMO_STEP':
      return { ...state, demoStep: action.payload };
    case 'SET_DEMO_ACTIVE':
      return { ...state, demoActive: action.payload };
    case 'SET_SIM_RUNNING':
      return { ...state, simulationRunning: action.payload };
    case 'SET_SIM_PROGRESS':
      return { ...state, simulationProgress: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
