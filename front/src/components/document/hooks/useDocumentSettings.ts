import { useState, useEffect } from 'react';
import { settingsStore } from '../../../stores/SettingsStore';
import { userStore } from '../../../stores/UserStore';

export interface ColumnVisibility {
  title: boolean;
  number: boolean;
  file: boolean;
  size: boolean;
  revision: boolean;
  status: boolean;
  language: boolean;
  drs: boolean;
  date: boolean;
  updated_at: boolean;
  created_by: boolean;
  discipline: boolean;
  document_type: boolean;
  actions: boolean;
}

export type ColumnKey = keyof ColumnVisibility;

export interface ColumnOrder {
  column: ColumnKey;
  order: number;
}

export interface UseDocumentSettingsReturn {
  // Состояние настроек
  settingsOpen: boolean;
  visibleCols: ColumnVisibility;
  columnOrder: ColumnOrder[];
  
  // Сеттеры
  setSettingsOpen: (open: boolean) => void;
  setVisibleCols: (cols: ColumnVisibility) => void;
  setColumnOrder: (order: ColumnOrder[]) => void;
  
  // Обработчики
  handleColumnVisibilityChange: (column: keyof ColumnVisibility, checked: boolean) => void;
  handleColumnOrderChange: (newOrder: ColumnOrder[]) => void;
  handleSettingsClose: () => void;
  
  // Сохранение настроек
  saveSettings: (newVisibleCols?: ColumnVisibility, newColumnOrder?: ColumnOrder[]) => Promise<void>;
}

const defaultColumnVisibility: ColumnVisibility = {
  title: true,
  number: true,
  file: true,
  size: true,
  revision: true,
  status: true,
  language: true,
  drs: false,
  date: true,
  updated_at: true,
  created_by: true,
  discipline: true,
  document_type: true,
  actions: true,
};

const defaultColumnOrder: ColumnOrder[] = [
  { column: 'number', order: 1 },
  { column: 'title', order: 2 },
  { column: 'file', order: 3 },
  { column: 'size', order: 4 },
  { column: 'revision', order: 5 },
  { column: 'status', order: 6 },
  { column: 'language', order: 7 },
  { column: 'discipline', order: 8 },
  { column: 'document_type', order: 9 },
  { column: 'drs', order: 10 },
  { column: 'date', order: 11 },
  { column: 'updated_at', order: 12 },
  { column: 'created_by', order: 13 },
  { column: 'actions', order: 14 },
];

export const useDocumentSettings = (): UseDocumentSettingsReturn => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColumnVisibility>(defaultColumnVisibility);
  const [columnOrder, setColumnOrder] = useState<ColumnOrder[]>(defaultColumnOrder);

  // Загружаем настройки пользователя
  useEffect(() => {
    const loadSettings = async () => {
      // Сначала проверяем, есть ли уже загруженные настройки
      let settings = settingsStore.getSettings('documents');
      
      // Если настроек нет, загружаем их
      if (!settings || Object.keys(settings).length === 0) {
        settings = await settingsStore.loadSettings('documents');
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
  const saveSettings = async (newVisibleCols?: ColumnVisibility, newColumnOrder?: ColumnOrder[]) => {
    try {
      const settingsToSave: Record<string, any> = {};
      if (newVisibleCols) {
        settingsToSave.column_visibility = newVisibleCols;
      }
      if (newColumnOrder) {
        settingsToSave.column_order = newColumnOrder;
      }
      
      // Сохраняем настройки через settingsStore
      const success = await settingsStore.saveSettings('documents', settingsToSave);
      
      if (success) {
        // Можно добавить уведомление об успешном сохранении
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
    }
  };

  // Обработчик изменения видимости колонки
  const handleColumnVisibilityChange = (column: keyof ColumnVisibility, checked: boolean) => {
    const newVisibleCols = { ...visibleCols, [column]: checked };
    setVisibleCols(newVisibleCols);
    saveSettings(newVisibleCols);
  };

  // Обработчик изменения порядка колонок
  const handleColumnOrderChange = (newOrder: ColumnOrder[]) => {
    setColumnOrder(newOrder);
    saveSettings(undefined, newOrder);
  };


  // Обработчик закрытия диалога настроек
  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return {
    settingsOpen,
    visibleCols,
    columnOrder,
    setSettingsOpen,
    setVisibleCols,
    setColumnOrder,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    handleSettingsClose,
    saveSettings,
  };
};
