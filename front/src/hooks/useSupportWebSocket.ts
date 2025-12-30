import { useEffect, useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../api/client';

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
  const reconnectAttemptsRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);
  
  // Сохраняем колбэки в ref, чтобы они не вызывали пересоздание connect
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectedRef.current = onConnected;
    onErrorRef.current = onError;
  }, [onMessage, onConnected, onError]);

  const getApiBaseUrl = useCallback(() => {
    const apiUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    return apiUrl.replace(/\/api\/v1$/, '') || 'http://localhost:8000';
  }, []);

  const getToken = useCallback(() => {
    try {
      // Сначала пытаемся получить токен из памяти (основной способ)
      const token = getAuthToken();
      if (token) {
        return token;
      }
      // Fallback: проверяем localStorage (на случай, если токен там сохранен)
      return localStorage.getItem('access_token') || localStorage.getItem('token');
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !ticketId) return;
    
    // Предотвращаем множественные попытки подключения
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    isConnectingRef.current = true;
    const baseUrl = getApiBaseUrl();
    // WebSocket URL (ws:// или wss://)
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    // Убираем протокол и формируем правильный URL
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${wsProtocol}://${host}/api/v1/support/ws/tickets/${ticketId}?token=${encodeURIComponent(token)}`;

    try {
      // Закрываем предыдущее соединение, если оно есть
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnectingRef.current = false;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnectedRef.current?.();

        // Ping каждые 30 секунд для keep-alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          // Обрабатываем pong как текст
          if (event.data === 'pong') {
            return;
          }
          
          const data: WebSocketMessage = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('WebSocket connection confirmed');
          } else if (data.type === 'new_message' && data.message) {
            onMessageRef.current?.(data.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        onErrorRef.current?.(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        isConnectingRef.current = false;
        setIsConnected(false);
        
        // Очищаем ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Переподключение с экспоненциальной задержкой только если соединение не было закрыто намеренно
        // Коды 1000 (Normal Closure) и 1001 (Going Away) обычно означают нормальное закрытие
        if (enabled && shouldReconnectRef.current && event.code !== 1000 && event.code !== 1001) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      isConnectingRef.current = false;
      onErrorRef.current?.(error as any);
    }
  }, [enabled, ticketId, getToken, getApiBaseUrl]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false; // Отключаем автоматическое переподключение
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure'); // Нормальное закрытие
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      shouldReconnectRef.current = true; // Включаем переподключение при включении
      reconnectAttemptsRef.current = 0; // Сбрасываем счетчик попыток
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ticketId]); // Убираем connect и disconnect из зависимостей, чтобы избежать бесконечного цикла

  return {
    isConnected,
    disconnect,
    reconnect: connect,
  };
};

