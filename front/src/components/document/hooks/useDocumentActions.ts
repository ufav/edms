import { useState } from 'react';
import { documentsApi, type Document as ApiDocument } from '../../../api/client';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';
import { projectStore } from '../../../stores/ProjectStore';
import { useRefreshStore } from '../../../hooks/useRefreshStore';

export interface UseDocumentActionsProps {
  t: (key: string) => string;
  onCloseDialog?: () => void;
  onRefreshActiveRevisions?: () => void;
  onRefreshDocuments?: () => Promise<void>; // Добавляем функцию обновления документов
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
  errorNotification: {
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
  setErrorNotification: (notification: { open: boolean; message: string }) => void;
  
  // Обработчики действий
  handleUpload: () => void;
  handleCreateDocument: (documentData: any) => Promise<void>;
  handleSaveDocument: (documentData: any) => Promise<void>;
  handleShowDocumentDetails: (documentId: number) => Promise<void>;
  handleDownload: (documentId: number) => Promise<void>;
  handleSoftDelete: (document: ApiDocument) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCloseNotification: () => void;
  handleCloseErrorNotification: () => void;
}

export const useDocumentActions = ({ t, onCloseDialog, onRefreshActiveRevisions, onRefreshDocuments }: UseDocumentActionsProps): UseDocumentActionsReturn => {
  const { refreshDocuments } = useRefreshStore();
  
  // Функция для определения ошибок хранилища и возврата понятного сообщения
  const getErrorMessage = (error: any, defaultMessage: string): string => {
    const errorDetail = error?.response?.data?.detail || '';
    const errorMessage = error?.message || '';
    const errorText = (typeof errorDetail === 'string' ? errorDetail : '') + ' ' + errorMessage;
    const lowerErrorText = errorText.toLowerCase();
    
    // Проверяем, является ли это ошибкой хранилища/MinIO
    const isStorageError = 
      lowerErrorText.includes('minio') ||
      lowerErrorText.includes('хранилищ') ||
      lowerErrorText.includes('storage') ||
      lowerErrorText.includes('could not connect') ||
      lowerErrorText.includes('endpoint url') ||
      lowerErrorText.includes('ошибка хранения файла в minio') ||
      lowerErrorText.includes('ошибка загрузки файла в minio');
    
    if (isStorageError) {
      return t('support.errors.storage_unavailable') || 'Файловое хранилище недоступно. Сохранение файлов невозможно.';
    }
    
    // Если это структурированная ошибка для ревизий
    if (error?.response?.data?.detail?.error_type === 'revision_status_error') {
      const { revision, status } = error.response.data.detail;
      const template = t('documents.revision_error');
      return template
        .replace('{revision}', revision || 'Unknown')
        .replace('{status}', status || 'Unknown');
    }
    
    // Если detail - это строка, используем её
    if (error?.response?.data?.detail && typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    
    // Используем message, если есть
    if (error?.message) {
      return error.message;
    }
    
    return defaultMessage;
  };
  
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
      
      // Добавляем файлы (множественные приоритетно)
      if (documentData.uploadedFiles && Array.isArray(documentData.uploadedFiles) && documentData.uploadedFiles.length > 0) {
        documentData.uploadedFiles.forEach((f: File) => formData.append('files', f));
      } else if (documentData.uploadedFile) {
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
      // Добавляем area_id (пустая строка будет обработана бэкендом как null)
      formData.append('area_id', documentData.area_id?.toString() || '');
      
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
      if (onRefreshDocuments) {
        await onRefreshDocuments();
      } else {
        refreshDocuments();
      }
      
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
      const errorMessage = getErrorMessage(error, t('documents.create_error'));
      
      // Показываем ошибку через снакбар вместо alert
      setErrorNotification({
        open: true,
        message: errorMessage
      });
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
        // Подготавливаем данные для обновления
        const updateData: any = {
          title: documentData.title,
          title_native: documentData.title_native,
          remarks: documentData.remarks,
          number: documentData.number,
          language_id: documentData.language_id ? parseInt(documentData.language_id, 10) : undefined,
          discipline_id: documentData.discipline_id ? parseInt(documentData.discipline_id, 10) : undefined,
          document_type_id: documentData.document_type_id ? parseInt(documentData.document_type_id, 10) : undefined,
        };
        
        // Преобразуем area_id: строка -> число или null (всегда включаем, даже если null)
        if (documentData.area_id === '' || documentData.area_id === null || documentData.area_id === undefined || documentData.area_id === '0') {
          updateData.area_id = null;
        } else {
          const parsedAreaId = parseInt(documentData.area_id, 10);
          updateData.area_id = isNaN(parsedAreaId) ? null : parsedAreaId;
        }
        
        // Вызываем API для обновления документа
        await documentsApi.update(selectedDocumentId, updateData);
        
        // Обновляем список документов
        if (onRefreshDocuments) {
          await onRefreshDocuments();
        } else {
          await refreshDocuments();
        }
        
        // Загружаем обновленный документ через API
        try {
          const updatedDocument = await documentsApi.getById(selectedDocumentId);
          setSelectedDocument(updatedDocument);
        } catch (error) {
          // Игнорируем ошибку загрузки обновленного документа
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
      const errorMessage = getErrorMessage(error, t('documents.update_error'));
      
      // Показываем ошибку через снакбар вместо alert
      setErrorNotification({
        open: true,
        message: errorMessage
      });
      throw error;
    }
  };

  // Обработчик показа деталей документа
  const handleShowDocumentDetails = async (documentId: number) => {
    setIsCreatingDocument(false); // Сбрасываем флаг создания
    try {
      // Получаем данные документа через API
      const document = await documentsApi.getById(documentId);
      setSelectedDocument(document);
      setSelectedDocumentId(documentId);
      
      try {
        await documentRevisionStore.loadRevisions(documentId);
      } catch (error: any) {
        const errorMessage = getErrorMessage(error, t('documents.load_revisions_error'));
        
        // Показываем ошибку через снакбар вместо alert
        setErrorNotification({
          open: true,
          message: errorMessage
        });
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, t('documents.load_document_error'));
      
      // Показываем ошибку через снакбар вместо alert
      setErrorNotification({
        open: true,
        message: errorMessage
      });
    }
  };

  // Обработчик скачивания документа
  const handleDownload = async (documentId: number) => {
    try {
      // Получаем информацию о документе через API
      let doc: ApiDocument;
      try {
        doc = await documentsApi.getById(documentId);
      } catch (error: any) {
        // Показываем ошибку через снакбар вместо alert
        const errorMessage = getErrorMessage(error, t('documents.not_found'));
        setErrorNotification({
          open: true,
          message: errorMessage
        });
        return;
      }

      // Скачиваем файл
      const blob = await documentsApi.download(documentId);
      
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
        } catch (clickError) {
          // Игнорируем ошибку клика
        }
        
        // Очищаем через небольшую задержку
        setTimeout(() => {
          try {
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (cleanupError) {
            // Игнорируем ошибку очистки
          }
        }, 100);
      }, 10);
      
    } catch (error: any) {
      // Специальная обработка для "файл не найден"
      const errorDetail = error?.response?.data?.detail || '';
      const errorMessage = error?.message || '';
      const errorText = (typeof errorDetail === 'string' ? errorDetail : '') + ' ' + errorMessage;
      const lowerErrorText = errorText.toLowerCase();
      
      let finalErrorMessage: string;
      if (lowerErrorText.includes('file not found') || lowerErrorText.includes('файл не найден')) {
        finalErrorMessage = t('documents.file_not_found');
      } else {
        finalErrorMessage = getErrorMessage(error, t('documents.download_error'));
      }
      
      // Показываем уведомление об ошибке
      setErrorNotification({
        open: true,
        message: finalErrorMessage
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
      
      // Обновляем список документов
      if (onRefreshDocuments) {
        await onRefreshDocuments();
      } else {
        await refreshDocuments();
      }
      
      // Перезагружаем активные ревизии для обновления данных в корзине
      if (onRefreshActiveRevisions) {
        onRefreshActiveRevisions();
      }
      
      setDocumentToDelete(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, t('documents.delete_error'));
      
      // Показываем ошибку через снакбар вместо alert
      setErrorNotification({
        open: true,
        message: errorMessage
      });
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
