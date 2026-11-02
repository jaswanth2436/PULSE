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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
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

