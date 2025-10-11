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
  created_by: boolean;
  discipline: boolean;
  document_type: boolean;
  actions: boolean;
}

export interface UseDocumentSettingsReturn {
  // Состояние настроек
  settingsOpen: boolean;
  visibleCols: ColumnVisibility;
  
  // Сеттеры
  setSettingsOpen: (open: boolean) => void;
  setVisibleCols: (cols: ColumnVisibility) => void;
  
  // Обработчики
  handleColumnVisibilityChange: (column: keyof ColumnVisibility, checked: boolean) => void;
  handleSettingsClose: () => void;
  
  // Сохранение настроек
  saveSettings: (newVisibleCols?: ColumnVisibility) => Promise<void>;
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
  created_by: true,
  discipline: true,
  document_type: true,
  actions: true,
};

export const useDocumentSettings = (): UseDocumentSettingsReturn => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColumnVisibility>(defaultColumnVisibility);

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
    };
    
    loadSettings();
  }, [userStore.currentUser?.id]); // Перезагружаем настройки при смене пользователя

  // Сохраняем настройки при изменении
  const saveSettings = async (newVisibleCols?: ColumnVisibility) => {
    try {
      const settingsToSave: Record<string, any> = {};
      if (newVisibleCols) {
        settingsToSave.column_visibility = newVisibleCols;
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


  // Обработчик закрытия диалога настроек
  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return {
    settingsOpen,
    visibleCols,
    setSettingsOpen,
    setVisibleCols,
    handleColumnVisibilityChange,
    handleSettingsClose,
    saveSettings,
  };
};
