import { useEffect, useRef, useState, useCallback } from 'react';
import type { TestResultEvent, FinalVerdictEvent, StatusUpdateEvent } from '../types';

type WebSocketMessage = TestResultEvent | FinalVerdictEvent | StatusUpdateEvent | { type: 'connected' | 'auth_success' | 'subscribed' | 'pong' | 'error' };

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Avoid re-connecting if already connected
    if (ws.current) return;

    const socket = new WebSocket('ws://localhost:3000/ws');
    ws.current = socket;

    socket.onopen = () => {
      console.log('WS Connected');
      setIsConnected(true);
    };

    socket.onclose = () => {
      console.log('WS Disconnected');
      setIsConnected(false);
      ws.current = null;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    return () => {
      // Cleanup on unmount
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const sendMessage = useCallback((msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    } else {
        console.warn('WS not open, cannot send', msg);
    }
  }, []);

  return { isConnected, sendMessage, lastMessage };
}
