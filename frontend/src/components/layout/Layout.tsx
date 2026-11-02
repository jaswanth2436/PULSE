import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../../store/appStore';
import { Toast as ToastComponent } from '../common/Toast';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const { state } = useAppStore();

  return (
    <div className="pulse-app flex h-screen overflow-hidden">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main area (offset by sidebar width) */}
      <div className="pulse-workspace flex-1 flex flex-col ml-64 min-w-0">
        {/* Sticky topbar */}
        <Header title={title} subtitle={subtitle} />

        {/* Scrollable content */}
        <main className="pulse-main flex-1 overflow-y-auto p-6 xl:p-8 animate-float-in">
          <div className="max-w-[1680px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {state.toasts.map(t => (
          <ToastComponent key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
