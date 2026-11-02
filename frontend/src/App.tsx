import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/appStore';
import { useWebSocket } from './hooks/useWebSocket';
import Overview from './pages/Overview';
import IntersectionIntelligence from './pages/IntersectionIntelligence';
import IntentStudio from './pages/IntentStudio';
import PerformanceLab from './pages/PerformanceLab';
import Reports from './pages/Reports';
import GuidedDemo from './pages/GuidedDemo';

function AppInner() {
  useWebSocket(); // Connect WebSocket at app level
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/intersection" element={<IntersectionIntelligence />} />
      <Route path="/intent-studio" element={<IntentStudio />} />
      <Route path="/performance-lab" element={<PerformanceLab />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/demo" element={<GuidedDemo />} />
      <Route path="*" element={<Overview />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AppProvider>
  );
}

