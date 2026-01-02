import { useEffect, useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../../../api/client';

// Используем тот же базовый URL, что и в client.ts
const getApiBaseUrlFromEnv = () => {
  return (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
};

interface WebSocketMessage {
  type: string;
  message?: any;
  ticket_id?: number;
  user_id?: number;
}

export interface UseSupportWebSocketOptions {
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    // Если мы в браузере, используем текущий хост
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      const host = window.location.host;
      // Если API_BASE_URL указывает на другой хост, используем его
      const envApiUrl = getApiBaseUrlFromEnv();
      if (envApiUrl && !envApiUrl.includes('localhost')) {
        // Используем URL из переменной окружения, но убираем /api/v1
        return envApiUrl.replace(/\/api\/v1$/, '') || `${protocol}://${host}`;
      }
      // Иначе используем текущий хост
      return `${protocol}://${host}`;
    }
    // Fallback для SSR
    const apiUrl = getApiBaseUrlFromEnv();
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
    console.log('Connecting to WebSocket:', { ticketId, wsUrl: wsUrl.replace(token, '***') });

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
          console.log('WebSocket message received:', data);
          
          if (data.type === 'connected') {
            console.log('WebSocket connection confirmed');
          } else if (data.type === 'new_message' && data.message) {
            console.log('New message via WebSocket:', data.message);
            onMessageRef.current?.(data.message);
          } else {
            console.warn('Unknown WebSocket message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err, event.data);
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

