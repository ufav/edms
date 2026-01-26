import { useState, useEffect } from 'react';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';
import { documentsApi } from '../../../api/client';
import { useDeleteDialog } from '../../../hooks/useDeleteDialog';
import { useTranslation } from 'react-i18next';

interface UseDocumentRevisionsProps {
  documentId?: number | null;
  open: boolean;
  onError?: (message: string, severity?: 'error' | 'warning' | 'info') => void;
}

export const useDocumentRevisions = ({
  documentId,
  open,
  onError
}: UseDocumentRevisionsProps) => {
  const { t } = useTranslation();
  const [workflowPresetSequence, setWorkflowPresetSequence] = useState<any[]>([]);
  
  // Хук для диалога подтверждения отмены ревизии
  const cancelRevisionDialog = useDeleteDialog();

  // Загрузка ревизий при открытии диалога
  useEffect(() => {
    if (open && documentId) {
      documentRevisionStore.loadRevisions(documentId).catch((error) => {
        console.error('Error loading revisions:', error);
        // Показываем ошибку загрузки ревизий
        if (onError) {
          const errorMessage = error?.response?.data?.detail || error?.message;
          // Проверяем, связана ли ошибка с MinIO
          if (errorMessage && (errorMessage.includes('MinIO') || errorMessage.includes('storage') || errorMessage.includes('хранилищ'))) {
            onError(t('documents.revision_load_storage_error') || t('support.errors.storage_unavailable') || 'Хранилище файлов недоступно', 'error');
          } else {
            onError(t('documents.revision_load_error') || 'Ошибка загрузки ревизий', 'error');
          }
        }
      });
    }
  }, [open, documentId, onError, t]);

  // Функция скачивания ревизии
  const handleDownloadRevision = async (revisionId: number, fileName: string) => {
    if (!documentId) return;
    
    try {
      const blob = await documentsApi.downloadRevision(documentId, revisionId);
      
      // Создаем ссылку для скачивания (как в DocumentsPage)
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Очищаем URL
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading revision:', error);
      // Показываем локализованное сообщение об ошибке
      if (onError) {
        let errorMessage = error?.message || '';
        
        // Пытаемся извлечь детали ошибки из response
        if (error?.response?.data) {
          try {
            // Если response.data - это Blob, пытаемся прочитать его как текст
            if (error.response.data instanceof Blob) {
              const text = await error.response.data.text();
              try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.detail || errorMessage;
              } catch {
                // Если не JSON, используем исходное сообщение
              }
            } else if (typeof error.response.data === 'object' && error.response.data.detail) {
              errorMessage = error.response.data.detail;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
        }
        
        // Проверяем, связана ли ошибка с MinIO или хранилищем
        const isStorageError = errorMessage.includes('MinIO') || 
                               errorMessage.includes('storage') || 
                               errorMessage.includes('хранилищ') ||
                               errorMessage.includes('не найден в MinIO') ||
                               errorMessage.includes('not found in MinIO');
        
        if (isStorageError) {
          onError(t('documents.revision_download_storage_error') || t('support.errors.storage_unavailable') || 'Хранилище файлов недоступно', 'error');
        } else if (error?.response?.status === 404) {
          onError(t('documents.revision_file_not_found') || t('support.errors.file_not_found_in_storage') || 'Файл ревизии не найден', 'error');
        } else {
          onError(t('documents.revision_download_error') || 'Ошибка скачивания файла ревизии', 'error');
        }
      }
    }
  };

  // Функция отмены ревизии
  const handleCancelRevision = async (revision: any) => {
    if (!documentId) return;
    
    try {
      await documentsApi.cancelRevision(revision.id);
      // Обновляем список ревизий
      documentRevisionStore.reloadRevisions(documentId);
      // Закрываем диалог подтверждения
      cancelRevisionDialog.closeDeleteDialog();
    } catch (error) {
      // Ошибка отмены ревизии
      console.error('Error cancelling revision:', error);
    }
  };

  // Функция для определения последней активной ревизии
  const getLatestActiveRevision = () => {
    const revisions = documentRevisionStore.getRevisions(documentId || 0);
    return revisions.find(revision => revision.revision_status_id === 1) || null;
  };

  // Функция для открытия диалога подтверждения отмены ревизии
  const handleOpenCancelRevisionDialog = (revision: any) => {
    cancelRevisionDialog.openDeleteDialog(revision);
  };

  // Функция для получения цвета статуса ревизии
  const getRevisionStatusColor = (statusId: number | null) => {
    if (!statusId) return 'default';
    
    switch (statusId) {
      case 1: return 'success'; // Active
      case 2: return 'error';   // Cancelled
      case 3: return 'warning'; // Hold
      case 4: return 'error';   // Rejected
      case 5: return 'default'; // Superseded
      case 6: return 'default'; // Archived
      default: return 'default';
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Функция для очистки ревизий
  const clearRevisions = (documentId: number) => {
    documentRevisionStore.clearRevisions(documentId);
  };

  return {
    // Состояние
    workflowPresetSequence,
    setWorkflowPresetSequence,
    
    // Функции
    handleDownloadRevision,
    handleCancelRevision,
    getLatestActiveRevision,
    handleOpenCancelRevisionDialog,
    getRevisionStatusColor,
    formatDate,
    clearRevisions,
    
    // Диалог отмены ревизии
    cancelRevisionDialog,
  };
};
