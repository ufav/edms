# Анализ и исправление проблем с сетью и авторизацией

**Дата:** 26 января 2026  
**Проблема:** Периодические 401 ошибки, WebSocket не подключается, показывается "Переподключение..." при работающем бэкенде

---

## 🔴 КРИТИЧНЫЕ ПРОБЛЕМЫ

### 1. Дублирование Response Interceptors

**Файл:** `front/src/api/client.ts`

**Проблема:**
- Есть ДВА response interceptor'а (строки 46-79 и 1526-1550)
- Второй перезаписывает первый через `apiClient.interceptors.response.use()`
- Первый interceptor обрабатывает 401 и делает refresh токена
- Второй interceptor просто удаляет токен при 401, не пытаясь обновить

**Последствия:**
- Refresh токена не работает правильно
- При 401 сразу происходит logout вместо попытки обновить токен
- Множественные 401 ошибки

**Решение:**
- Удалить второй interceptor (строки 1526-1550)
- Оставить только первый с логикой refresh

---

### 2. WebSocket использует устаревший токен

**Файл:** `front/src/hooks/useConnectionStatusWebSocket.ts`

**Проблема:**
- WebSocket берет токен из localStorage при подключении (строка 93)
- Если токен истек, WebSocket не может подключиться
- Токен не обновляется автоматически при refresh

**Последствия:**
- WebSocket постоянно пытается переподключиться с невалидным токеном
- Показывается "Переподключение..." даже когда бэкенд работает
- Соединение не устанавливается

**Решение:**
- Обновлять WebSocket соединение при успешном refresh токена
- Переподключать WebSocket с новым токеном
- Проверять валидность токена перед подключением

---

### 3. Обработка сетевых ошибок при refresh

**Файл:** `front/src/api/client.ts` и `front/src/App.tsx`

**Проблема:**
- При ошибке `ERR_NETWORK_IO_SUSPENDED` (браузер приостановил запрос) происходит logout
- Это временная ошибка, не критичная
- Refresh токена может упасть с сетевой ошибкой, но это не значит, что пользователь не авторизован

**Последствия:**
- Пользователь выходит из системы при временных сетевых проблемах
- Бэкенд работает, но приложение считает, что пользователь не авторизован

**Решение:**
- Различать сетевые ошибки от проблем с авторизацией
- При `ERR_NETWORK_IO_SUSPENDED` не делать logout
- Retry логика для сетевых ошибок
- Не logout при сетевых ошибках во время refresh

---

### 4. Постоянный опрос notifications при невалидном токене

**Файл:** `front/src/components/Layout.tsx`

**Проблема:**
- `notificationsApi.getUnreadCount()` вызывается каждые 30 секунд (строка 158)
- При 401 ошибке пытается refresh, но если refresh падает, продолжает опрашивать
- Множественные 401 ошибки в консоли

**Последствия:**
- Спам 401 ошибок в консоли
- Лишняя нагрузка на сервер
- Плохой UX

**Решение:**
- Остановить опрос если получили 401 и refresh не удался
- Проверять авторизацию перед опросом
- Retry с экспоненциальной задержкой при ошибках

---

## 🟡 СРЕДНИЕ ПРОБЛЕМЫ

### 5. Нет различения типов ошибок

**Проблема:**
- Все ошибки обрабатываются одинаково
- Нет различия между:
  - Временными сетевыми ошибками
  - Проблемами с авторизацией
  - Проблемами с сервером

**Решение:**
- Классифицировать ошибки
- Разная обработка для разных типов
- Retry только для временных ошибок

---

### 6. WebSocket не обновляется при refresh токена

**Проблема:**
- При успешном refresh токена WebSocket не переподключается
- Продолжает использовать старый токен

**Решение:**
- Слушать события успешного refresh
- Переподключать WebSocket с новым токеном

---

## 🔧 РЕШЕНИЯ

### Решение 1: Исправить дублирование interceptors

**Файл:** `front/src/api/client.ts`

**Удалить:**
```typescript
// Строки 1526-1550 - УДАЛИТЬ ЭТОТ INTERCEPTOR
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Этот interceptor перезаписывает предыдущий!
    ...
  }
);
```

**Оставить только первый interceptor (строки 46-79)** с улучшениями для сетевых ошибок.

---

### Решение 2: Улучшить обработку сетевых ошибок в interceptor

**Файл:** `front/src/api/client.ts` (строки 46-79)

**Изменить:**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const errorCode = error?.code;

    // Обработка сетевых ошибок (не критичные)
    if (!error.response) {
      // ERR_NETWORK_IO_SUSPENDED - временная ошибка браузера
      if (errorCode === 'ERR_NETWORK_IO_SUSPENDED' || 
          errorCode === 'ERR_NETWORK' ||
          error.message === 'Network Error') {
        // Не делаем logout при временных сетевых ошибках
        // Просто пробрасываем ошибку дальше
        return Promise.reject(error);
      }
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (isRefreshing) {
          await new Promise<void>((resolve) => pendingQueue.push(resolve));
        } else {
          isRefreshing = true;
          const refreshed = await authApi.refresh();
          setAuthToken(refreshed.access_token);
          
          // Уведомляем о новом токене для WebSocket
          window.dispatchEvent(new CustomEvent('token-refreshed', { 
            detail: { token: refreshed.access_token } 
          }));
          
          pendingQueue.forEach((res) => res());
          pendingQueue = [];
          isRefreshing = false;
        }
        return apiClient(originalRequest);
      } catch (e) {
        isRefreshing = false;
        pendingQueue = [];
        
        // Проверяем, это сетевая ошибка или реальная проблема с авторизацией
        const isNetworkError = !e?.response && (
          e?.code === 'ERR_NETWORK_IO_SUSPENDED' ||
          e?.code === 'ERR_NETWORK' ||
          e?.message === 'Network Error'
        );
        
        if (!isNetworkError) {
          // Только при реальной проблеме с авторизацией делаем logout
          removeAuthToken();
          if (onUnauthorized) onUnauthorized();
        }
        
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
```

---

### Решение 3: Обновить WebSocket при refresh токена

**Файл:** `front/src/hooks/useConnectionStatusWebSocket.ts`

**Добавить:**
```typescript
useEffect(() => {
  // Слушаем событие обновления токена
  const handleTokenRefresh = (event: CustomEvent) => {
    const newToken = event.detail?.token;
    if (newToken && wsRef.current) {
      // Переподключаемся с новым токеном
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      setTimeout(() => {
        shouldReconnectRef.current = true;
        connect();
      }, 1000);
    }
  };

  window.addEventListener('token-refreshed', handleTokenRefresh as EventListener);

  return () => {
    window.removeEventListener('token-refreshed', handleTokenRefresh as EventListener);
  };
}, [connect]);
```

**Также улучшить проверку токена:**
```typescript
const connect = useCallback(() => {
  // Проверяем, есть ли валидный токен
  const token = getToken();
  if (!token) {
    // Если нет токена, не пытаемся подключаться
    setStatus('offline');
    return;
  }
  
  // ... остальной код
}, []);
```

---

### Решение 4: Улучшить опрос notifications

**Файл:** `front/src/components/Layout.tsx` (строки 142-160)

**Изменить:**
```typescript
// Загружаем количество непрочитанных уведомлений
useEffect(() => {
  let isMounted = true;
  let retryCount = 0;
  const maxRetries = 3;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      if (isMounted) {
        setUnreadNotificationsCount(count);
        retryCount = 0; // Сбрасываем счетчик при успехе
      }
    } catch (error: any) {
      if (!isMounted) return;
      
      const status = error?.response?.status;
      const errorCode = error?.code;
      
      // Если 401 и refresh не помог, останавливаем опрос
      if (status === 401) {
        // Проверяем, это реальная проблема с авторизацией или сетевая ошибка
        const isNetworkError = errorCode === 'ERR_NETWORK_IO_SUSPENDED' ||
                              errorCode === 'ERR_NETWORK' ||
                              !error.response;
        
        if (!isNetworkError) {
          // Реальная проблема с авторизацией - останавливаем опрос
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
      }
      
      // Для сетевых ошибок - retry с экспоненциальной задержкой
      if (retryCount < maxRetries && (
        errorCode === 'ERR_NETWORK_IO_SUSPENDED' ||
        errorCode === 'ERR_NETWORK' ||
        !error.response
      )) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(loadUnreadCount, delay);
      } else if (status !== 401) {
        // Логируем только не-401 ошибки
        console.error('Error loading unread notifications count:', error);
      }
    }
  };

  loadUnreadCount();
  
  // Обновляем каждые 30 секунд, но только если нет проблем с авторизацией
  intervalId = setInterval(() => {
    // Проверяем, есть ли токен перед опросом
    const token = localStorage.getItem('token');
    if (token) {
      loadUnreadCount();
    }
  }, 30000);
  
  return () => {
    isMounted = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, []);
```

---

### Решение 5: Улучшить обработку ошибок в App.tsx

**Файл:** `front/src/App.tsx` (строки 107-124)

**Изменить:**
```typescript
useEffect(() => {
  if (!isAuthenticated) return;
  const id = setInterval(async () => {
    if (!tokenExpiryMs) return;
    const now = Date.now();
    const timeLeft = tokenExpiryMs - now;
    const isActive = now - lastActivityRef.current <= activityWindowMs;
    if (timeLeft <= refreshThresholdMs && isActive) {
      try {
        const refreshed = await authApi.refresh();
        setAuthToken(refreshed.access_token);
        setTokenExpiryMs(Date.now() + refreshed.expires_in * 1000);
      } catch (err: any) {
        // Проверяем, это сетевая ошибка или реальная проблема с авторизацией
        const isNetworkError = !err?.response && (
          err?.code === 'ERR_NETWORK_IO_SUSPENDED' ||
          err?.code === 'ERR_NETWORK' ||
          err?.message === 'Network Error'
        );
        
        if (!isNetworkError) {
          // Только при реальной проблеме с авторизацией выходим
          handleLogout();
        }
        // При сетевых ошибках просто пропускаем этот refresh
        // Попробуем в следующий раз
      }
    }
  }, 30000);
  return () => clearInterval(id);
}, [isAuthenticated, tokenExpiryMs]);
```

---

## 📋 ПЛАН ИСПРАВЛЕНИЙ

### Приоритет 1 (Критично)
1. ✅ **Удалить дублирующий interceptor** - исправит проблему с refresh токена
2. ✅ **Улучшить обработку сетевых ошибок** - не будет logout при временных ошибках

### Приоритет 2 (Важно)
3. ✅ **Обновлять WebSocket при refresh** - исправит "Переподключение..."
4. ✅ **Улучшить опрос notifications** - уберет спам 401 ошибок

### Приоритет 3 (Желательно)
5. ✅ **Улучшить обработку в App.tsx** - более умная логика refresh

---

## 🧪 ТЕСТИРОВАНИЕ

### Сценарии для проверки:

1. **Истечение токена:**
   - Дождаться истечения access token
   - Проверить, что refresh происходит автоматически
   - Проверить, что WebSocket переподключается с новым токеном

2. **Сетевые ошибки:**
   - Симулировать `ERR_NETWORK_IO_SUSPENDED`
   - Проверить, что не происходит logout
   - Проверить, что retry происходит

3. **Проблемы с авторизацией:**
   - Симулировать реальную проблему с refresh (невалидный refresh token)
   - Проверить, что происходит logout

4. **Notifications:**
   - Проверить, что опрос останавливается при проблемах с авторизацией
   - Проверить, что retry работает при сетевых ошибках

---

## 📝 ЗАМЕТКИ

- `ERR_NETWORK_IO_SUSPENDED` - это ошибка браузера, когда запрос был приостановлен (вкладка в фоне, экономия батареи)
- Не нужно делать logout при временных сетевых ошибках
- WebSocket должен обновляться при refresh токена
- Опрос notifications должен быть умным - останавливаться при проблемах с авторизацией

---

**Статус:** Требуется исправление критичных проблем
