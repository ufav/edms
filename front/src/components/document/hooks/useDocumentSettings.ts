import { useState, useEffect } from 'react';
import { settingsStore } from '../../../stores/SettingsStore';
import { userStore } from '../../../stores/UserStore';
import { usePermissions } from '../../../hooks/usePermissions';

export interface ColumnVisibility {
  id: boolean;
  title: boolean;
  number: boolean;
  file: boolean;
  size: boolean;
  revision: boolean;
  status: boolean;
  review_status: boolean;
  language: boolean;
  drs: boolean;
  date: boolean;
  updated_at: boolean;
  created_by: boolean;
  discipline: boolean;
  document_type: boolean;
  area: boolean;
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
  id: false, // По умолчанию скрыто, показывается только админу
  title: true,
  number: true,
  file: true,
  size: true,
  revision: true,
  status: true,
  review_status: true,
  language: true,
  drs: false,
  date: true,
  updated_at: true,
  created_by: true,
  discipline: true,
  document_type: true,
  area: true,
  actions: true,
};

const defaultColumnOrder: ColumnOrder[] = [
  { column: 'id', order: 0 },
  { column: 'number', order: 1 },
  { column: 'title', order: 2 },
  { column: 'file', order: 3 },
  { column: 'size', order: 4 },
  { column: 'revision', order: 5 },
  { column: 'status', order: 6 },
  { column: 'review_status', order: 7 },
  { column: 'language', order: 8 },
  { column: 'discipline', order: 9 },
  { column: 'document_type', order: 10 },
  { column: 'area', order: 11 },
  { column: 'drs', order: 12 },
  { column: 'date', order: 13 },
  { column: 'updated_at', order: 14 },
  { column: 'created_by', order: 15 },
  { column: 'actions', order: 16 },
];

export const useDocumentSettings = (): UseDocumentSettingsReturn => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { canViewSystemIds } = usePermissions();

  // Колонка ID видна только если есть соответствующее разрешение
  const getDefaultVisibility = (): ColumnVisibility => ({
    ...defaultColumnVisibility,
    id: canViewSystemIds,
  });

  const [visibleCols, setVisibleCols] = useState<ColumnVisibility>(getDefaultVisibility());
  const [columnOrder, setColumnOrder] = useState<ColumnOrder[]>(defaultColumnOrder);

  // Обновляем видимость по умолчанию при изменении прав
  useEffect(() => {
    setVisibleCols(prev => ({
      ...prev,
      id: canViewSystemIds
    }));
  }, [canViewSystemIds]);

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
        // Для id колонки всегда применяем логику на основе роли
        // Даже если в сохранённых настройках нет id, для админа показываем
        const savedVisibility = settings.column_visibility;

        setVisibleCols(prev => ({
          ...prev,
          ...savedVisibility,
          // id: если в настройках явно указано false — скрываем, иначе используем системное право
          id: savedVisibility.id !== undefined ? savedVisibility.id : canViewSystemIds,
        }));
      } else {
        // Если настроек нет, применяем дефолтные с учётом прав
        setVisibleCols(prev => ({
          ...prev,
          id: canViewSystemIds,
        }));
      }

      if (settings.column_order) {
        // Если в сохранённом порядке нет id, добавляем его первым
        const hasId = settings.column_order.some((col: any) => col.column === 'id');
        if (!hasId) {
          setColumnOrder([{ column: 'id', order: 0 }, ...settings.column_order]);
        } else {
          setColumnOrder(settings.column_order);
        }
      }
    };

    loadSettings();
  }, [userStore.currentUser?.id, canViewSystemIds]); // Перезагружаем настройки при смене пользователя или прав

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
