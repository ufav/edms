import { useState, useEffect, useCallback } from 'react';
import { transmittalsApi, type Transmittal, type TransmittalUpdate } from '../../../api/client';
import { useTranslation } from 'react-i18next';

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

  // Состояние для уведомлений
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

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
      const hasChanges =
        transmittalData.transmittal_number !== originalTransmittalData.transmittal_number ||
        transmittalData.title !== originalTransmittalData.title ||
        transmittalData.counterparty_id !== originalTransmittalData.counterparty_id;

      setHasChanges(hasChanges);
    }
  }, [transmittalData, originalTransmittalData, isEditing]);

  // Обновление данных трансмиттала
  const updateTransmittalData = useCallback((field: keyof TransmittalData, value: any) => {
    setTransmittalData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Начать редактирование
  const startEditing = () => {
    setOriginalTransmittalData({ ...transmittalData });
    setIsEditing(true);
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

    try {
      const updateData: TransmittalUpdate = {
        transmittal_number: transmittalData.transmittal_number,
        title: transmittalData.title,
        counterparty_id: transmittalData.counterparty_id,
      };

      await onSaveTransmittal(updateData);

      setIsEditing(false);
      setOriginalTransmittalData(null);
      setHasChanges(false);

      showNotification(t('transmittals.update_success'), 'success');
    } catch (error) {
      console.error('Error saving transmittal:', error);
      showNotification(t('transmittals.update_error'), 'error');
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
  };
};
