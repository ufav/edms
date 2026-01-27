import { useState, useEffect, useRef, useCallback } from 'react';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface UseConnectionStatusWebSocketOptions {
  pingInterval?: number; // Интервал отправки ping в мс (по умолчанию 30000)
  reconnectInterval?: number; // Интервал переподключения при ошибке в мс (по умолчанию 5000)
  reconnectAttempts?: number; // Максимальное количество попыток переподключения (по умолчанию 10)
}

// Получаем базовый URL для WebSocket
const getWebSocketUrl = (): string => {
  // Проверяем, использует ли текущая страница HTTPS
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
  // Получаем API URL из env или используем default
  const apiUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  // Если API URL относительный (начинается с / или без протокола), используем текущий хост
  if (apiUrl.startsWith('/') || !apiUrl.match(/^https?:\/\//)) {
    const protocol = isHttps ? 'wss' : 'ws';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    return `${protocol}://${host}/api/v1/ws/health`;
  }

  // Извлекаем базовый URL (без /api/v1)
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

  // Преобразуем http/https в ws/wss
  // Если страница загружена по HTTPS, всегда используем wss
  const wsProtocol = (isHttps || baseUrl.startsWith('https')) ? 'wss' : 'ws';
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

  // Начальный статус - 'online' по умолчанию
  // WebSocket подключится только если есть токен
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

    // Проверяем, есть ли валидный токен перед подключением
    const token = getToken();
    if (!token) {
      // Если нет токена, просто не пытаемся подключаться
      // Не устанавливаем статус 'offline', так как это может быть до логина
      return;
    }

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

    // Используем уже полученный токен выше
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

        // При ошибке переходим в состояние переподключения только если есть токен
        const token = getToken();
        if (token) {
          setStatus('reconnecting');
        }
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

        // Проверяем, есть ли токен перед переподключением
        const token = getToken();
        if (!token) {
          // Если нет токена, не пытаемся переподключаться и не меняем статус
          return;
        }

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

      // Проверяем, есть ли токен перед переподключением
      const token = getToken();
      if (token) {
        setStatus('reconnecting');
        // Пытаемся переподключиться
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, configRef.current.reconnectInterval);
      }
      // Если нет токена, просто не подключаемся и не меняем статус
    }
  }, []); // Пустой массив зависимостей - connect никогда не пересоздаётся

  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;

    // Подключаемся только если есть токен
    const token = getToken();
    if (token) {
      // Устанавливаем начальный статус перед подключением
      setStatus('online');
      connect();
    }
    // Если нет токена, не подключаемся и не меняем статус
    // Статус остается 'online' по умолчанию (пользователь может быть еще не залогинен)

    // Слушаем событие обновления токена для переподключения WebSocket
    const handleTokenRefresh = (event: CustomEvent) => {
      if (!isMountedRef.current) return;
      
      const newToken = event.detail?.token;
      if (newToken) {
        // Переподключаемся с новым токеном
        shouldReconnectRef.current = false;
        if (wsRef.current) {
          wsRef.current.close();
        }
        // Небольшая задержка перед переподключением
        setTimeout(() => {
          if (isMountedRef.current) {
            shouldReconnectRef.current = true;
            reconnectAttemptsRef.current = 0;
            connect();
          }
        }, 500);
      }
    };

    // Также слушаем события браузера для онлайн/оффлайн
    const handleOnline = () => {
      if (!isMountedRef.current) return;
      const token = getToken();
      if (token) {
        reconnectAttemptsRef.current = 0;
        setStatus('online');
        connect();
      }
      // Если нет токена, не подключаемся
    };

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      // Проверяем, есть ли токен - если нет, это может быть до логина
      const token = getToken();
      if (token) {
        // Только если есть токен, устанавливаем offline при событии браузера
        setStatus('offline');
        shouldReconnectRef.current = false;
        if (wsRef.current) {
          wsRef.current.close();
        }
      }
      // Если нет токена, не меняем статус - пользователь может быть еще не залогинен
    };

    window.addEventListener('token-refreshed', handleTokenRefresh as EventListener);
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

      window.removeEventListener('token-refreshed', handleTokenRefresh as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect]);

  return { status };
};
