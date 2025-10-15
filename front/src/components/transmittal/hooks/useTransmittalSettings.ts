import { useState, useEffect } from 'react';
import { settingsStore } from '../../../stores/SettingsStore';
import { userStore } from '../../../stores/UserStore';

export interface TransmittalColumnVisibility {
  number: boolean;
  title: boolean;
  direction: boolean;
  counterparty: boolean;
  status: boolean;
  date: boolean;
  created_by: boolean;
  actions: boolean;
}

export type TransmittalColumnKey = keyof TransmittalColumnVisibility;

export interface TransmittalColumnOrder {
  column: TransmittalColumnKey;
  order: number;
}

export interface UseTransmittalSettingsReturn {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  visibleCols: TransmittalColumnVisibility;
  columnOrder: TransmittalColumnOrder[];
  onColumnVisibilityChange: (column: TransmittalColumnKey, visible: boolean) => void;
  onColumnOrderChange: (newOrder: TransmittalColumnOrder[]) => void;
  saveSettings: (newVisibleCols?: TransmittalColumnVisibility, newColumnOrder?: TransmittalColumnOrder[]) => Promise<void>;
}

const defaultColumnVisibility: TransmittalColumnVisibility = {
  number: true,
  title: true,
  direction: true,
  counterparty: true,
  status: true,
  date: true,
  created_by: true,
  actions: true,
};

const defaultColumnOrder: TransmittalColumnOrder[] = [
  { column: 'number', order: 1 },
  { column: 'title', order: 2 },
  { column: 'direction', order: 3 },
  { column: 'counterparty', order: 4 },
  { column: 'status', order: 5 },
  { column: 'date', order: 6 },
  { column: 'created_by', order: 7 },
  { column: 'actions', order: 8 },
];

export const useTransmittalSettings = (): UseTransmittalSettingsReturn => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<TransmittalColumnVisibility>(defaultColumnVisibility);
  const [columnOrder, setColumnOrder] = useState<TransmittalColumnOrder[]>(defaultColumnOrder);

  // Загружаем настройки пользователя
  useEffect(() => {
    const loadSettings = async () => {
      // Сначала проверяем, есть ли уже загруженные настройки
      let settings = settingsStore.getSettings('transmittals');
      
      // Если настроек нет, загружаем их
      if (!settings || Object.keys(settings).length === 0) {
        settings = await settingsStore.loadSettings('transmittals');
      }
      
      if (settings.column_visibility) {
        setVisibleCols(prev => ({
          ...prev,
          ...settings.column_visibility
        }));
      }
      
      if (settings.column_order) {
        setColumnOrder(settings.column_order);
      }
    };
    
    loadSettings();
  }, [userStore.currentUser?.id]); // Перезагружаем настройки при смене пользователя

  // Сохраняем настройки при изменении
  const saveSettings = async (newVisibleCols?: TransmittalColumnVisibility, newColumnOrder?: TransmittalColumnOrder[]) => {
    try {
      const settingsToSave: Record<string, any> = {};
      if (newVisibleCols) {
        settingsToSave.column_visibility = newVisibleCols;
      }
      if (newColumnOrder) {
        settingsToSave.column_order = newColumnOrder;
      }
      
      // Сохраняем настройки через settingsStore
      const success = await settingsStore.saveSettings('transmittals', settingsToSave);
      
      if (success) {
        // Можно добавить уведомление об успешном сохранении
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек трансмитталов:', error);
    }
  };

  // Обработчик изменения видимости колонки
  const onColumnVisibilityChange = (column: TransmittalColumnKey, visible: boolean) => {
    const newVisibleCols = { ...visibleCols, [column]: visible };
    setVisibleCols(newVisibleCols);
    saveSettings(newVisibleCols);
  };

  // Обработчик изменения порядка колонок
  const onColumnOrderChange = (newOrder: TransmittalColumnOrder[]) => {
    setColumnOrder(newOrder);
    saveSettings(undefined, newOrder);
  };

  return {
    settingsOpen,
    setSettingsOpen,
    visibleCols,
    columnOrder,
    onColumnVisibilityChange,
    onColumnOrderChange,
    saveSettings,
  };
};
