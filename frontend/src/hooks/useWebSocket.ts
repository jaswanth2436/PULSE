import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { TrafficState } from '../types';

const WS_URL = 'ws://localhost:8000/ws/telemetry';

export function useWebSocket() {
  const { dispatch } = useAppStore();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        dispatch({ type: 'SET_WS_CONNECTED', payload: true });
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          const data: TrafficState = JSON.parse(evt.data);
          dispatch({ type: 'UPDATE_TRAFFIC', payload: data });
        } catch (_) {}
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        dispatch({ type: 'SET_WS_CONNECTED', payload: false });
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch (_) {
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [dispatch]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
