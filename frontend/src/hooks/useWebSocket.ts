import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { TrafficState } from '../types';
import { api } from '../services/api';

const WS_URL = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`;

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
        } catch (error) {
          console.warn('Ignoring malformed telemetry message', error);
        }
      };

      ws.onerror = (error) => {
        console.warn('Telemetry WebSocket error', error);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        dispatch({ type: 'SET_WS_CONNECTED', payload: false });
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch (error) {
      console.warn('Unable to connect to telemetry WebSocket', error);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [dispatch]);

  useEffect(() => {
    mountedRef.current = true;
    api.trafficCurrent()
      .then((snapshot) => {
        if (mountedRef.current) dispatch({ type: 'UPDATE_TRAFFIC', payload: snapshot });
      })
      .catch((error) => {
        console.warn('Traffic snapshot unavailable; waiting for telemetry connection', error);
      });
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
