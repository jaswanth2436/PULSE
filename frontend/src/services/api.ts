const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request<any>('/health'),
  systemStatus: () => request<any>('/system/status'),

  // Traffic
  trafficCurrent: () => request<any>('/traffic/current'),
  trafficApproaches: () => request<any>('/traffic/approaches'),
  trafficHistory: (limit = 100) => request<any>(`/traffic/history?limit=${limit}`),

  // Video
  videoUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/video/upload`, { method: 'POST', body: form }).then(async r => {
      if (!r.ok) {
        const error = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(error.detail || `HTTP ${r.status}`);
      }
      return r.json();
    });
  },
  videoStart: () => request<any>('/video/start', { method: 'POST' }),
  videoPause: () => request<any>('/video/pause', { method: 'POST' }),
  videoStop: () => request<any>('/video/stop', { method: 'POST' }),
  videoStatus: () => request<any>('/video/status'),

  // Controller
  controllerStatus: () => request<any>('/controller/status'),
  setControllerMode: (mode: string) => request<any>('/controller/mode', { method: 'POST', body: JSON.stringify({ mode }) }),
  optimizeSignal: (body: any) => request<any>('/controller/optimize', { method: 'POST', body: JSON.stringify(body) }),
  validatePlan: (body: any) => request<any>('/controller/validate', { method: 'POST', body: JSON.stringify(body) }),

  // Intent
  getIntent: () => request<any>('/intent/current'),
  updateIntent: (intent: any) => request<any>('/intent/update', { method: 'POST', body: JSON.stringify(intent) }),
  comparePlans: (body: any) => request<any>('/intent/compare', { method: 'POST', body: JSON.stringify(body) }),

  // Simulation
  startSimulation: (config: any) => request<any>('/simulation/start', { method: 'POST', body: JSON.stringify(config) }),
  stopSimulation: () => request<any>('/simulation/stop', { method: 'POST' }),
  resetSimulation: () => request<any>('/simulation/reset', { method: 'POST' }),
  simulationStatus: () => request<any>('/simulation/status'),
  getScenarios: () => request<any>('/simulation/scenarios'),

  // Experiments
  runExperiment: (config: any) => request<any>('/experiments/run', { method: 'POST', body: JSON.stringify(config) }),
  listExperiments: (skip = 0, limit = 50) => request<any>(`/experiments?skip=${skip}&limit=${limit}`),
  getExperiment: (id: number) => request<any>(`/experiments/${id}`),
  exportExperiment: (id: number, format: 'csv' | 'json') =>
    fetch(`${BASE}/experiments/${id}/export?format=${format}`),

  // Reports
  listReports: () => request<any>('/reports'),
  getReport: (id: number) => request<any>(`/reports/${id}`),

  // Demo
  startDemo: () => request<any>('/demo/start', { method: 'POST' }),
  demoStatus: () => request<any>('/demo/status'),
  advanceDemoStep: (step: number) => request<any>(`/demo/step/${step}`, { method: 'POST' }),
  resetDemo: () => request<any>('/demo/reset', { method: 'POST' }),
  getDemoSteps: () => request<any>('/demo/steps'),
};
