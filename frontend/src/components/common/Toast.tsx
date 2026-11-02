import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/appStore';
import type { Toast as ToastType } from '../../types';

const levelConfig = {
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', icon_color: 'text-blue-500', title_color: 'text-blue-800' },
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', icon_color: 'text-green-500', title_color: 'text-green-800' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', icon_color: 'text-amber-500', title_color: 'text-amber-800' },
  error: { icon: AlertCircle, bg: 'bg-red-50 border-red-200', icon_color: 'text-red-500', title_color: 'text-red-800' },
};

export function Toast({ toast }: { toast: ToastType }) {
  const { dispatch } = useAppStore();
  const cfg = levelConfig[toast.level];
  const Icon = cfg.icon;

  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', payload: toast.id });

  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-lg border shadow-md max-w-sm', cfg.bg)}>
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', cfg.icon_color)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', cfg.title_color)}>{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-600 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={dismiss} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { state } = useAppStore();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {state.toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  );
}
