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
      
    } catch (error) {
      console.error('Error in handleCreateDocument:', error);
      alert(t('documents.create_error'));
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
    } catch (error) {
      console.error('Error saving document:', error);
      alert(t('documents.update_error'));
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
      } catch (error) {
        alert(t('documents.load_revisions_error'));
      }
    }
  };

  // Обработчик скачивания документа
  const handleDownload = async (documentId: number) => {
    try {
      // Получаем информацию о документе
      const doc = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
      if (!doc) {
        alert(t('documents.not_found'));
        return;
      }

      // Скачиваем файл
      const blob = await documentsApi.download(documentId);
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name || `document_${documentId}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Очищаем URL
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(t('documents.download_error'));
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
    } catch (error) {
      alert(t('documents.delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  // Обработчик закрытия уведомления
  const handleCloseNotification = () => {
    setSuccessNotification({ open: false, message: '' });
  };

  return {
    // Состояния
    isCreatingDocument,
    selectedDocument,
    selectedDocumentId,
    documentToDelete,
    deleting,
    successNotification,
    
    // Сеттеры
    setIsCreatingDocument,
    setSelectedDocument,
    setSelectedDocumentId,
    setDocumentToDelete,
    setDeleting,
    setSuccessNotification,
    
    // Обработчики
    handleUpload,
    handleCreateDocument,
    handleSaveDocument,
    handleShowDocumentDetails,
    handleDownload,
    handleSoftDelete,
    handleConfirmDelete,
    handleCloseNotification,
  };
};
