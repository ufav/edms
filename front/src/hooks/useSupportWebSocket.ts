import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  message?: any;
  ticket_id?: number;
  user_id?: number;
}

interface UseSupportWebSocketOptions {
  ticketId: number;
  enabled: boolean;
  onMessage?: (message: any) => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
}

export const useSupportWebSocket = ({
  ticketId,
  enabled,
  onMessage,
  onConnected,
  onError,
}: UseSupportWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getApiBaseUrl = useCallback(() => {
    const apiUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    return apiUrl.replace(/\/api\/v1$/, '') || 'http://localhost:8000';
  }, []);

  const getToken = useCallback(() => {
    try {
      const token = localStorage.getItem('access_token');
      return token;
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !ticketId) return;

    const token = getToken();
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    const baseUrl = getApiBaseUrl();
    // WebSocket URL (ws:// или wss://)
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${baseUrl.replace(/^https?:\/\//, '')}/api/v1/support/ws/tickets/${ticketId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnected?.();

        // Ping каждые 30 секунд для keep-alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('WebSocket connection confirmed');
          } else if (data.type === 'new_message' && data.message) {
            onMessage?.(data.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Очищаем ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Переподключение с экспоненциальной задержкой
        if (enabled) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      onError?.(error as any);
    }
  }, [enabled, ticketId, getToken, getApiBaseUrl, onMessage, onConnected, onError, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, ticketId]);

  return {
    isConnected,
    disconnect,
    reconnect: connect,
  };
};

