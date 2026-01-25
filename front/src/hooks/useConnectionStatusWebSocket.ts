import { useState, useEffect, useRef, useCallback } from 'react';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface UseConnectionStatusWebSocketOptions {
  pingInterval?: number; // Интервал отправки ping в мс (по умолчанию 30000)
  reconnectInterval?: number; // Интервал переподключения при ошибке в мс (по умолчанию 5000)
  reconnectAttempts?: number; // Максимальное количество попыток переподключения (по умолчанию 10)
}

// Получаем базовый URL для WebSocket
const getWebSocketUrl = (): string => {
  // Получаем API URL из env или используем default
  const apiUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  // Извлекаем базовый URL (без /api/v1)
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

  // Преобразуем http/https в ws/wss
  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const wsHost = baseUrl.replace(/^https?:\/\//, '');

  return `${wsProtocol}://${wsHost}/api/v1/ws/health`;
};

const getToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const useConnectionStatusWebSocket = (options: UseConnectionStatusWebSocketOptions = {}) => {
  const {
    pingInterval = 30000, // 30 секунд
    reconnectInterval = 5000, // 5 секунд
    reconnectAttempts = 10,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('online');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);

  // Используем useRef для хранения конфигурации, чтобы избежать пересоздания connect
  const configRef = useRef({ pingInterval, reconnectInterval, reconnectAttempts });
  configRef.current = { pingInterval, reconnectInterval, reconnectAttempts };

  const connect = useCallback(() => {
    if (!shouldReconnectRef.current || !isMountedRef.current) return;

    // Предотвращаем множественные одновременные подключения
    if (isConnectingRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnectingRef.current = true;

    // Очищаем предыдущее соединение
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Очищаем предыдущие таймеры
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    const token = getToken();
    const wsUrl = getWebSocketUrl() + (token ? `?token=${encodeURIComponent(token)}` : '');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;

        if (!isMountedRef.current) {
          ws.close();
          return;
        }

        reconnectAttemptsRef.current = 0;
        setStatus('online');

        // Отправляем ping каждые pingInterval мс
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && wsRef.current === ws) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, configRef.current.pingInterval);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          // Обрабатываем pong
          if (event.data === 'pong') {
            setStatus('online');
            reconnectAttemptsRef.current = 0;
            return;
          }

          const data = JSON.parse(event.data);

          if (data.type === 'pong' || data.type === 'connected') {
            setStatus('online');
            reconnectAttemptsRef.current = 0;
          }
        } catch (err) {
          // Игнорируем ошибки парсинга
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;

        // При ошибке переходим в состояние переподключения
        setStatus('reconnecting');
      };

      ws.onclose = () => {
        isConnectingRef.current = false;

        if (!isMountedRef.current) return;

        // Очищаем ping интервал
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        wsRef.current = null;

        // Если соединение закрыто не по нашей инициативе и мы должны переподключаться
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < configRef.current.reconnectAttempts) {
          reconnectAttemptsRef.current += 1;

          setStatus('reconnecting');

          // Пытаемся переподключиться через reconnectInterval
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, configRef.current.reconnectInterval);
        } else if (reconnectAttemptsRef.current >= configRef.current.reconnectAttempts) {
          setStatus('offline');
        }
      };
    } catch (error) {
      isConnectingRef.current = false;

      if (!isMountedRef.current) return;

      setStatus('reconnecting');

      // Пытаемся переподключиться
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, configRef.current.reconnectInterval);
    }
  }, []); // Пустой массив зависимостей - connect никогда не пересоздаётся

  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;

    // Подключаемся сразу
    connect();

    // Также слушаем события браузера для онлайн/оффлайн
    const handleOnline = () => {
      if (!isMountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setStatus('online');
      connect();
    };

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      setStatus('offline');
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;

      // Очищаем все таймеры и соединения
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect]);

  return { status };
};
