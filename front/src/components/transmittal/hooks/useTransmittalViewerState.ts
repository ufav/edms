import { useState, useEffect, useCallback } from 'react';
import { transmittalsApi, type Transmittal, type TransmittalUpdate } from '../../../api/client';
import { useTranslation } from 'react-i18next';
import { useRefreshStore } from '../../../hooks/useRefreshStore';

interface TransmittalData {
  transmittal_number: string;
  title: string;
  counterparty_id?: number;
}

interface UseTransmittalViewerStateProps {
  transmittal: Transmittal | null;
  transmittalId?: number | null;
  onSaveTransmittal?: (transmittalData: TransmittalUpdate) => Promise<void>;
}

export const useTransmittalViewerState = ({
  transmittal,
  transmittalId,
  onSaveTransmittal
}: UseTransmittalViewerStateProps) => {
  const { t } = useTranslation();
  const { refreshTransmittals } = useRefreshStore();
  // Основное состояние трансмиттала
  const [transmittalData, setTransmittalData] = useState<TransmittalData>({
    transmittal_number: '',
    title: '',
    counterparty_id: undefined,
  });

  // Состояние для режима редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [originalTransmittalData, setOriginalTransmittalData] = useState<TransmittalData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Локальное состояние для ревизий (как pendingParticipants в проектах)
  const [pendingRevisions, setPendingRevisions] = useState<any[]>([]);
  const [removedRevisionIds, setRemovedRevisionIds] = useState<number[]>([]);

  // Состояние для уведомлений
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  // Состояние загрузки для сохранения
  const [isSaving, setIsSaving] = useState(false);

  // Инициализация данных трансмиттала
  useEffect(() => {
    if (transmittal) {
      setTransmittalData({
        transmittal_number: transmittal.transmittal_number || '',
        title: transmittal.title || '',
        counterparty_id: transmittal.counterparty_id || undefined,
      });
    }
  }, [transmittal]);

  // Отслеживание изменений
  useEffect(() => {
    if (isEditing && originalTransmittalData) {
      const hasDataChanges =
        transmittalData.transmittal_number !== originalTransmittalData.transmittal_number ||
        transmittalData.title !== originalTransmittalData.title ||
        transmittalData.counterparty_id !== originalTransmittalData.counterparty_id;

      const hasRevisionChanges = pendingRevisions.length > 0 || removedRevisionIds.length > 0;

      setHasChanges(hasDataChanges || hasRevisionChanges);
    }
  }, [transmittalData, originalTransmittalData, isEditing, pendingRevisions, removedRevisionIds]);

  // Обновление данных трансмиттала
  const updateTransmittalData = useCallback((field: keyof TransmittalData, value: any) => {
    setTransmittalData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Начать редактирование
  const startEditing = () => {
    // Проверяем, можно ли редактировать трансмиттал
    if (transmittal?.direction === 'out' && transmittal?.status === 'Sent') {
      showNotification(t('transmittals.cannot_edit_sent'), 'warning');
      return;
    }
    
    setOriginalTransmittalData({ ...transmittalData });
    setIsEditing(true);
    // Инициализируем локальное состояние ревизий
    setPendingRevisions([]);
    setRemovedRevisionIds([]);
  };

  // Отменить редактирование
  const cancelEditing = () => {
    if (originalTransmittalData) {
      setTransmittalData(originalTransmittalData);
    }
    setIsEditing(false);
    setOriginalTransmittalData(null);
    setHasChanges(false);
  };

  // Сохранить изменения
  const saveEditing = async () => {
    if (!transmittalId || !onSaveTransmittal) return;

    setIsSaving(true);
    try {
      const updateData: TransmittalUpdate = {
        transmittal_number: transmittalData.transmittal_number,
        title: transmittalData.title,
        counterparty_id: transmittalData.counterparty_id,
      };

      await onSaveTransmittal(updateData);

      // Применяем изменения ревизий
      if (removedRevisionIds.length > 0) {
        for (const revisionId of removedRevisionIds) {
          await transmittalsApi.removeRevision(transmittalId, revisionId);
        }
      }

      if (pendingRevisions.length > 0) {
        const revisionIds = pendingRevisions.map(rev => rev.id);
        await transmittalsApi.addRevisions(transmittalId, revisionIds);
      }

      setIsEditing(false);
      setOriginalTransmittalData(null);
      setHasChanges(false);
      setPendingRevisions([]);
      setRemovedRevisionIds([]);

      // Обновляем списки трансмитталов
      await refreshTransmittals();
      
      // Перезагружаем детали трансмиттала
      if (transmittalId) {
        const { transmittalStore } = await import('../../../stores/TransmittalStore');
        await transmittalStore.loadTransmittalDetails(transmittalId);
      }

      showNotification(t('transmittals.update_success'), 'success');
    } catch (error: any) {
      console.error('Error saving transmittal:', error);
      
      // Обрабатываем ошибки уникальности номера трансмиттала
      if (error.response?.data?.detail?.includes('повторяющееся значение ключа нарушает ограничение уникальности "ix_transmittals_transmittal_number"')) {
        showNotification(t('transmittals.transmittal_number_exists'), 'error');
      } else {
        const errorMessage = error.response?.data?.detail || error.message || t('transmittals.update_error');
        showNotification(errorMessage, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Показать уведомление
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotificationMessage(message);
    setNotificationSeverity(severity);
    setNotificationOpen(true);
  };

  // Скрыть уведомление
  const hideNotification = () => {
    setNotificationOpen(false);
  };

  // Добавить ревизию в локальное состояние
  const addPendingRevision = (revision: any) => {
    setPendingRevisions(prev => [...prev, revision]);
  };

  // Удалить ревизию из локального состояния
  const removePendingRevision = (revisionId: number) => {
    setPendingRevisions(prev => prev.filter(rev => rev.id !== revisionId));
    setRemovedRevisionIds(prev => [...prev, revisionId]);
  };

  // Получить текущие ревизии (оригинальные + добавленные - удаленные)
  const getCurrentRevisions = (originalRevisions: any[]) => {
    const addedIds = pendingRevisions.map(rev => rev.id);
    const removedIds = removedRevisionIds;
    
    return [
      ...originalRevisions.filter(rev => !removedIds.includes(rev.id)),
      ...pendingRevisions
    ];
  };

  return {
    transmittalData,
    updateTransmittalData,
    isEditing,
    hasChanges,
    startEditing,
    cancelEditing,
    saveEditing,
    notificationOpen,
    notificationMessage,
    notificationSeverity,
    showNotification,
    hideNotification,
    // Новые функции для работы с ревизиями
    addPendingRevision,
    removePendingRevision,
    getCurrentRevisions,
    pendingRevisions,
    removedRevisionIds,
    // Состояние загрузки
    isSaving
  };
};
