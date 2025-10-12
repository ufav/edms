import { useState, useEffect } from 'react';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';
import { documentsApi } from '../../../api/client';
import { useDeleteDialog } from '../../../hooks/useDeleteDialog';

interface UseDocumentRevisionsProps {
  documentId?: number | null;
  open: boolean;
}

export const useDocumentRevisions = ({
  documentId,
  open
}: UseDocumentRevisionsProps) => {
  const [workflowPresetSequence, setWorkflowPresetSequence] = useState<any[]>([]);
  
  // Хук для диалога подтверждения отмены ревизии
  const cancelRevisionDialog = useDeleteDialog();

  // Загрузка ревизий при открытии диалога
  useEffect(() => {
    if (open && documentId) {
      documentRevisionStore.loadRevisions(documentId).catch((error) => {
        console.error('Error loading revisions:', error);
      });
    }
  }, [open, documentId]);

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
    } catch (error) {
      // Ошибка скачивания файла
    }
  };

  // Функция отмены ревизии
  const handleCancelRevision = async (revision: any) => {
    if (!documentId) return;
    
    try {
      await documentsApi.cancelRevision(revision.id);
      // Обновляем список ревизий
      documentRevisionStore.reloadRevisions(documentId);
    } catch (error) {
      // Ошибка отмены ревизии
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
