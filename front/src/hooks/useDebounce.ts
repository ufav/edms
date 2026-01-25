import { useState, useEffect } from 'react';

/**
 * Хук для debounce значения
 * @param value - значение для debounce
 * @param delay - задержка в миллисекундах (по умолчанию 500ms)
 * @returns debounced значение
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Устанавливаем таймер для обновления значения
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер при изменении value или delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
