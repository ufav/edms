import { useState } from 'react';
import { documentsApi, type Document as ApiDocument } from '../../../api/client';
import { documentStore } from '../../../stores/DocumentStore';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';
import { projectStore } from '../../../stores/ProjectStore';
import { useRefreshStore } from '../../../hooks/useRefreshStore';

export interface UseDocumentActionsProps {
  t: (key: string) => string;
  onCloseDialog?: () => void;
  onRefreshActiveRevisions?: () => void;
}

export interface UseDocumentActionsReturn {
  // Состояния для действий
  isCreatingDocument: boolean;
  selectedDocument: ApiDocument | null;
  selectedDocumentId: number | null;
  documentToDelete: ApiDocument | null;
  deleting: boolean;
  successNotification: {
    open: boolean;
    message: string;
  };
  
  // Сеттеры
  setIsCreatingDocument: (creating: boolean) => void;
  setSelectedDocument: (document: ApiDocument | null) => void;
  setSelectedDocumentId: (id: number | null) => void;
  setDocumentToDelete: (document: ApiDocument | null) => void;
  setDeleting: (deleting: boolean) => void;
  setSuccessNotification: (notification: { open: boolean; message: string }) => void;
  
  // Обработчики действий
  handleUpload: () => void;
  handleCreateDocument: (documentData: any) => Promise<void>;
  handleSaveDocument: (documentData: any) => Promise<void>;
  handleShowDocumentDetails: (documentId: number) => Promise<void>;
  handleDownload: (documentId: number) => Promise<void>;
  handleSoftDelete: (document: ApiDocument) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCloseNotification: () => void;
}

export const useDocumentActions = ({ t, onCloseDialog, onRefreshActiveRevisions }: UseDocumentActionsProps): UseDocumentActionsReturn => {
  const { refreshDocuments } = useRefreshStore();
  
  // Состояния для действий
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ApiDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successNotification, setSuccessNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Состояние для уведомлений об ошибках
  const [errorNotification, setErrorNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Обработчик загрузки документа
  const handleUpload = () => {
    setIsCreatingDocument(true);
    setSelectedDocument(null);
  };

  // Обработчик создания документа
  const handleCreateDocument = async (documentData: any) => {
    try {
      // Создаем FormData для отправки файла и данных
      const formData = new FormData();
      
      // Добавляем файл
      if (documentData.uploadedFile) {
        formData.append('file', documentData.uploadedFile);
      }
      
      // Добавляем данные документа
      formData.append('title', documentData.title);
      formData.append('title_native', documentData.title_native || '');
      formData.append('remarks', documentData.remarks || '');
      formData.append('number', documentData.number || '');
      formData.append('drs', documentData.drs || '');
      formData.append('project_id', projectStore.selectedProject?.id?.toString() || '');
      formData.append('discipline_id', documentData.discipline_id || '');
      formData.append('document_type_id', documentData.document_type_id || '');
      formData.append('language_id', documentData.language_id || '1');
      
      // Добавляем данные ревизии
      if (documentData.revisionDescription?.id) {
        formData.append('revision_description_id', documentData.revisionDescription.id.toString());
      }
      if (documentData.revisionStep?.id) {
        formData.append('revision_step_id', documentData.revisionStep.id.toString());
      }
      
      // Добавляем комментарий загрузки
      if (documentData.uploadComment) {
        formData.append('change_description', documentData.uploadComment);
      }
      
      // Отправляем запрос с отслеживанием прогресса
      await (documentsApi.createWithRevision as any)(formData, {
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            documentData.onProgress?.(progress);
          }
        }
      });
      
      // Обновляем список документов
      refreshDocuments();
      
      // Очищаем ревизии после успешного создания документа
      if (selectedDocumentId) {
        documentRevisionStore.clearRevisions(selectedDocumentId);
      }
      
      // Показываем сообщение об успехе
      setSuccessNotification({
        open: true,
        message: t('documents.create_success')
      });

      // Перезагружаем активные ревизии для обновления данных в корзине
      if (onRefreshActiveRevisions) {
        onRefreshActiveRevisions();
      }
      
    } catch (error: any) {
      console.error('Error in handleCreateDocument:', error);
      let errorMessage = t('documents.create_error');
      
      // Обрабатываем структурированную ошибку для ревизий
      if (error?.response?.data?.detail?.error_type === 'revision_status_error') {
        const { revision, status } = error.response.data.detail;
        console.log('Revision error details in useDocumentActions:', { revision, status });
        // Используем ручную интерполяцию, если t() не работает
        const template = t('documents.revision_error');
        errorMessage = template
          .replace('{revision}', revision || 'Unknown')
          .replace('{status}', status || 'Unknown');
      } else if (error?.response?.data?.detail) {
        // Если detail - это строка, используем её
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      // Сбрасываем состояние загрузки в любом случае
      setIsCreatingDocument(false);
      // Также закрываем диалог
      setSelectedDocument(null);
      
      // Очищаем ревизии при создании нового документа
      if (selectedDocumentId) {
        documentRevisionStore.clearRevisions(selectedDocumentId);
      }
      
      onCloseDialog?.();
    }
  };

  // Обработчик сохранения документа
  const handleSaveDocument = async (documentData: any) => {
    try {
      if (selectedDocumentId) {
        // Вызываем API для обновления документа
        await documentsApi.update(selectedDocumentId, documentData);
        
        // Обновляем список документов
        await refreshDocuments();
        
        // Загружаем обновленный документ из списка
        const updatedDocument = documentStore.documents.find((d: any) => d.id === selectedDocumentId);
        if (updatedDocument) {
          setSelectedDocument(updatedDocument);
        }
        
        // Показываем сообщение об успехе
        setSuccessNotification({
          open: true,
          message: t('documents.update_success')
        });

        // Перезагружаем активные ревизии для обновления данных в корзине
        if (onRefreshActiveRevisions) {
          onRefreshActiveRevisions();
        }
      }
    } catch (error: any) {
      console.error('Error saving document:', error);
      let errorMessage = t('documents.update_error');
      
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      throw error;
    }
  };

  // Обработчик показа деталей документа
  const handleShowDocumentDetails = async (documentId: number) => {
    setIsCreatingDocument(false); // Сбрасываем флаг создания
    const document = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
    if (document) {
      setSelectedDocument(document);
      setSelectedDocumentId(documentId);
      try {
        await documentRevisionStore.loadRevisions(documentId);
    } catch (error: any) {
      let errorMessage = t('documents.load_revisions_error');
      
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      }
    }
  };

  // Обработчик скачивания документа
  const handleDownload = async (documentId: number) => {
    try {
      console.log(`Starting download for document ${documentId}`);
      
      // Получаем информацию о документе
      const doc = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
      if (!doc) {
        console.error('Document not found in store:', documentId);
        alert(t('documents.not_found'));
        return;
      }

      console.log('Document found:', doc.file_name);
      
      // Скачиваем файл
      console.log('Calling documentsApi.download...');
      const blob = await documentsApi.download(documentId);
      console.log('Download completed, blob size:', blob.size);
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name || `document_${documentId}`;
      link.style.display = 'none'; // Скрываем ссылку
      
      window.document.body.appendChild(link);
      
      // Используем setTimeout для асинхронного клика
      setTimeout(() => {
        try {
          link.click();
          console.log('Download link clicked');
        } catch (clickError) {
          console.error('Error clicking download link:', clickError);
        }
        
        // Очищаем через небольшую задержку
        setTimeout(() => {
          try {
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('Download cleanup completed');
          } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
          }
        }, 100);
      }, 10);
      
    } catch (error: any) {
      console.error('Download error details:', {
        error,
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      
      let errorMessage = t('documents.download_error');
      
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          const detail = error.response.data.detail.toLowerCase();
          if (detail.includes('файл не найден')) {
            errorMessage = t('documents.file_not_found');
          } else {
            errorMessage = error.response.data.detail;
          }
        }
      } else if (error?.message) {
        const lower = String(error.message).toLowerCase();
        if (lower.includes('file not found') || lower.includes('файл не найден')) {
          errorMessage = t('documents.file_not_found');
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error('Final error message:', errorMessage);
      
      // Показываем уведомление об ошибке
      setErrorNotification({
        open: true,
        message: errorMessage
      });
    }
  };

  // Обработчик мягкого удаления документа
  const handleSoftDelete = (document: ApiDocument) => {
    setDocumentToDelete(document);
  };

  // Обработчик подтверждения удаления
  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      await documentsApi.softDelete(documentToDelete.id);
      
      // Обновляем список документов в store
      await refreshDocuments();
      
      // Перезагружаем активные ревизии для обновления данных в корзине
      if (onRefreshActiveRevisions) {
        onRefreshActiveRevisions();
      }
      
      setDocumentToDelete(null);
    } catch (error: any) {
      let errorMessage = t('documents.delete_error');
      
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Обработчик закрытия уведомления
  const handleCloseNotification = () => {
    setSuccessNotification({ open: false, message: '' });
  };

  // Обработчик закрытия уведомления об ошибке
  const handleCloseErrorNotification = () => {
    setErrorNotification({ open: false, message: '' });
  };

  return {
    // Состояния
    isCreatingDocument,
    selectedDocument,
    selectedDocumentId,
    documentToDelete,
    deleting,
    successNotification,
    errorNotification,
    
    // Сеттеры
    setIsCreatingDocument,
    setSelectedDocument,
    setSelectedDocumentId,
    setDocumentToDelete,
    setDeleting,
    setSuccessNotification,
    setErrorNotification,
    
    // Обработчики
    handleUpload,
    handleCreateDocument,
    handleSaveDocument,
    handleShowDocumentDetails,
    handleDownload,
    handleSoftDelete,
    handleConfirmDelete,
    handleCloseNotification,
    handleCloseErrorNotification,
  };
};
