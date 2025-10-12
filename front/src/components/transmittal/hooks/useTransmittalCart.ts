import { useState, useCallback } from 'react';
import { transmittalsApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';

export interface SelectedRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  revision_description_code?: string;
  file_name: string;
  file_type?: string;
  file_size: number;
  created_at: string;
}

export interface UseTransmittalCartReturn {
  // Состояние
  selectedRevisionIds: number[];
  isLoading: boolean;
  error: string | null;
  
  // Обработчики
  addRevision: (revisionId: number) => void;
  removeRevision: (revisionId: number) => void;
  clearAll: () => void;
  createTransmittal: (transmittalData: any) => Promise<void>;
  
  // Утилиты
  isRevisionSelected: (revisionId: number) => boolean;
  getSelectedDocumentIds: () => number[];
}

export const useTransmittalCart = (): UseTransmittalCartReturn => {
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Добавление ревизии в корзину
  const addRevision = useCallback((revisionId: number) => {
    setSelectedRevisionIds(prev => {
      // Проверяем, что ревизия еще не добавлена
      if (prev.includes(revisionId)) {
        return prev;
      }
      return [...prev, revisionId];
    });
    setError(null);
  }, []);

  // Удаление ревизии из корзины
  const removeRevision = useCallback((revisionId: number) => {
    setSelectedRevisionIds(prev => prev.filter(id => id !== revisionId));
    setError(null);
  }, []);

  // Очистка всей корзины
  const clearAll = useCallback(() => {
    setSelectedRevisionIds([]);
    setError(null);
  }, []);

  // Проверка, выбрана ли ревизия
  const isRevisionSelected = useCallback((revisionId: number) => {
    return selectedRevisionIds.includes(revisionId);
  }, [selectedRevisionIds]);

  // Получение ID выбранных документов (пока возвращаем пустой массив, так как у нас нет доступа к данным ревизий)
  const getSelectedDocumentIds = useCallback(() => {
    return []; // Будет реализовано в компоненте, где есть доступ к activeRevisions
  }, []);

  // Создание трансмиттала
  const createTransmittal = useCallback(async (transmittalData: any) => {
    if (selectedRevisionIds.length === 0) {
      setError('Выберите хотя бы одну ревизию для создания трансмиттала');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Подготавливаем данные для создания трансмиттала
      const transmittalCreateData = {
        ...transmittalData,
        revision_ids: selectedRevisionIds
      };

      // Создаем трансмиттал через API
      await transmittalsApi.create(transmittalCreateData);

      // Очищаем корзину после успешного создания
      setSelectedRevisionIds([]);
      
      // Перезагружаем список трансмитталов
      if (projectStore.selectedProject?.id) {
        // Здесь можно добавить перезагрузку списка трансмитталов
        // transmittalStore.loadTransmittals(projectStore.selectedProject.id);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка создания трансмиттала');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRevisionIds]);

  return {
    selectedRevisionIds,
    isLoading,
    error,
    addRevision,
    removeRevision,
    clearAll,
    createTransmittal,
    isRevisionSelected,
    getSelectedDocumentIds,
  };
};
