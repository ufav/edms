import { useState, useEffect } from 'react';
import type { Document as ApiDocument } from '../../../api/client';
import { referencesStore } from '../../../stores/ReferencesStore';

interface DocumentData {
  title: string;
  title_native: string;
  description: string;
  remarks: string;
  number: string;
  drs: string;
  language_id: string;
  discipline_id: string;
  document_type_id: string;
}

interface UseDocumentViewerStateProps {
  document: ApiDocument | null;
  documentId?: number | null;
  isCreating?: boolean;
  onSaveDocument?: (documentData: any) => Promise<void>;
}

export const useDocumentViewerState = ({
  document,
  documentId,
  isCreating = false,
  onSaveDocument
}: UseDocumentViewerStateProps) => {
  // Основное состояние документа
  const [documentData, setDocumentData] = useState<DocumentData>({
    title: '',
    title_native: '',
    description: '',
    remarks: '',
    number: '',
    drs: '',
    language_id: '',
    discipline_id: '',
    document_type_id: '',
  });

  // Состояние для режима редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [originalDocumentData, setOriginalDocumentData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Состояние для уведомлений
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Инициализация данных документа
  useEffect(() => {
    if (document && !isCreating) {
      setDocumentData({
        title: document.title || '',
        title_native: document.title_native || '',
        description: document.description || '',
        remarks: document.remarks || '',
        number: document.number || '',
        drs: document.drs || '',
        language_id: document.language_id?.toString() || '',
        discipline_id: document.discipline_id?.toString() || '',
        document_type_id: document.document_type_id?.toString() || '',
      });
    } else if (isCreating) {
      // Сбрасываем данные для создания нового документа
      setDocumentData({
        title: '',
        title_native: '',
        description: '',
        remarks: '',
        number: '',
        drs: '',
        language_id: '',
        discipline_id: '',
        document_type_id: '',
      });
    } else {
      // Если документ закрыт (document === null и !isCreating), сбрасываем данные
      setDocumentData({
        title: '',
        title_native: '',
        description: '',
        remarks: '',
        number: '',
        drs: '',
        language_id: '',
        discipline_id: '',
        document_type_id: '',
      });
    }
  }, [document, isCreating]);


  // Сброс состояния уведомлений при открытии диалога
  useEffect(() => {
    if (documentId) {
      setNotificationOpen(false);
      setNotificationMessage('');
    }
  }, [documentId]);

  // Функции для управления состоянием
  const updateDocumentData = (updates: Partial<DocumentData>) => {
    setDocumentData(prev => ({ ...prev, ...updates }));
  };

  const resetDocumentData = () => {
    if (originalDocumentData) {
      setDocumentData(originalDocumentData);
    } else {
      // Сбрасываем данные для создания документа
      setDocumentData({
        title: '',
        title_native: '',
        description: '',
        remarks: '',
        number: '',
        drs: '',
        language_id: '',
        discipline_id: '',
        document_type_id: '',
      });
    }
  };

  const startEditing = () => {
    if (document) {
      setOriginalDocumentData({ ...documentData });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    resetDocumentData();
    setIsEditing(false);
    setHasChanges(false);
  };

  const saveEditing = async () => {
    if (onSaveDocument) {
      try {
        await onSaveDocument(documentData);
        setIsEditing(false);
        setHasChanges(false);
        // Обновляем originalDocumentData с сохраненными данными
        setOriginalDocumentData({ ...documentData });
      } catch (error) {
        console.error('Error saving document:', error);
      }
    } else {
      setIsEditing(false);
      setHasChanges(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotificationMessage(message);
    setNotificationSeverity(severity);
    setNotificationOpen(true);
  };

  const hideNotification = () => {
    setNotificationOpen(false);
    setNotificationMessage('');
  };

  // Автозаполнение DRS при изменении типа документа
  useEffect(() => {
    if (documentData.document_type_id) {
      // Получаем DRS из project_discipline_document_types
      const projectDocumentTypes = referencesStore.projectDocumentTypes || [];
      const selectedDocType = projectDocumentTypes.find(dt => 
        dt.id === parseInt(documentData.document_type_id)
      );
      
      if (selectedDocType?.drs) {
        updateDocumentData({ drs: selectedDocType.drs });
      }
    } else {
      // Очищаем DRS если тип документа не выбран
      updateDocumentData({ drs: '' });
    }
  }, [documentData.document_type_id]);

  return {
    // Состояние
    documentData,
    isEditing,
    originalDocumentData,
    hasChanges,
    notificationOpen,
    notificationMessage,
    notificationSeverity,
    
    // Функции
    updateDocumentData,
    resetDocumentData,
    startEditing,
    cancelEditing,
    saveEditing,
    showNotification,
    hideNotification,
    setHasChanges,
  };
};
