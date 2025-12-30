import { useState, useEffect, useRef, useCallback } from 'react';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface UseConnectionStatusOptions {
  checkInterval?: number; // Интервал проверки в мс (по умолчанию 5000)
  healthEndpoint?: string; // Эндпоинт для проверки (по умолчанию /health)
  timeout?: number; // Таймаут запроса в мс (по умолчанию 3000)
}

// Получаем базовый URL API (без /api/v1, так как /health в корне)
const getApiBaseUrl = (): string => {
  const apiUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  // Убираем /api/v1 из конца, если есть
  return apiUrl.replace(/\/api\/v1$/, '') || 'http://localhost:8000';
};

export const useConnectionStatus = (options: UseConnectionStatusOptions = {}) => {
  const {
    checkInterval = 5000,
    healthEndpoint = '/health',
    timeout = 3000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const isMountedRef = useRef(true);
  const currentIntervalRef = useRef(checkInterval);

  const checkConnection = useCallback(async () => {
    if (isChecking || !isMountedRef.current) return;
    
    setIsChecking(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}${healthEndpoint}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        consecutiveFailuresRef.current = 0;
        setStatus('online');
        // При успехе возвращаем нормальный интервал (30 секунд)
        if (currentIntervalRef.current !== checkInterval) {
          currentIntervalRef.current = checkInterval;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          intervalRef.current = setInterval(() => {
            checkConnection();
          }, checkInterval);
        }
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      consecutiveFailuresRef.current += 1;
      
      // При ошибках проверяем чаще (каждые 5 секунд) для быстрой реакции
      const errorCheckInterval = 5000;
      if (currentIntervalRef.current !== errorCheckInterval) {
        currentIntervalRef.current = errorCheckInterval;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          checkConnection();
        }, errorCheckInterval);
      }
      
      // Если запрос не прошел, показываем статус
      if (consecutiveFailuresRef.current >= 2) {
        setStatus('offline');
      } else {
        // Первая неудача - переподключение
        setStatus('reconnecting');
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [healthEndpoint, timeout]);

  useEffect(() => {
    isMountedRef.current = true;
    currentIntervalRef.current = checkInterval;
    
    // Первая проверка сразу
    checkConnection();
    
    // Затем проверяем с интервалом
    intervalRef.current = setInterval(() => {
      checkConnection();
    }, checkInterval);
    
    // Также слушаем события браузера для онлайн/оффлайн
    const handleOnline = () => {
      if (!isMountedRef.current) return;
      consecutiveFailuresRef.current = 0;
      setStatus('online');
      checkConnection();
    };
    
    const handleOffline = () => {
      if (!isMountedRef.current) return;
      setStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInterval, checkConnection]);

  return { status, isChecking };
};

