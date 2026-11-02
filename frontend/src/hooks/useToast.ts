import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { Toast, ToastLevel } from '../types';

let toastCounter = 0;

export function useToast() {
  const { dispatch } = useAppStore();

  const addToast = useCallback((level: ToastLevel, title: string, message?: string) => {
    const id = `toast-${++toastCounter}`;
    const toast: Toast = { id, level, title, message };
    dispatch({ type: 'ADD_TOAST', payload: toast });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 5000);
  }, [dispatch]);

  return { addToast };
}
