import { useState } from 'react';
import { documentsApi } from '../../../api/client';
import { documentStore } from '../../../stores/DocumentStore';
import { projectStore } from '../../../stores/ProjectStore';

export interface UseDocumentBatchUploadProps {
  t: (key: string) => string;
  onClose: () => void;
}

export interface UseDocumentBatchUploadReturn {
  // Состояния
  metadataFile: File | null;
  uploading: boolean;
  
  // Сеттеры
  setMetadataFile: (file: File | null) => void;
  setUploading: (uploading: boolean) => void;
  
  // Обработчики
  handleMetadataFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBatchUpload: () => Promise<void>;
  handleClose: () => void;
  
  // Валидация
  canUpload: boolean;
}

export const useDocumentBatchUpload = ({ 
  t, 
  onClose 
}: UseDocumentBatchUploadProps): UseDocumentBatchUploadReturn => {
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Обработчик выбора файла метаданных
  const handleMetadataFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setMetadataFile(file);
  };

  // Обработчик массовой загрузки
  const handleBatchUpload = async () => {
    if (!metadataFile || !projectStore.selectedProject) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('metadata_file', metadataFile);
      formData.append('project_id', projectStore.selectedProject.id.toString());

      const result = await documentsApi.importByPaths(formData);
        
      // Обновляем список документов
      documentStore.loadDocuments(projectStore.selectedProject.id);
      
      // Закрываем диалог и очищаем состояние
      handleClose();
      
      // Показываем результат
      alert(`Импортировано документов: ${result.total_imported} из ${result.total_rows}`);
      if (result.errors && result.errors.length > 0) {
        // Можно добавить обработку ошибок
      }
    } catch (error) {
      alert(t('documents.import_error'));
    } finally {
      setUploading(false);
    }
  };

  // Обработчик закрытия диалога
  const handleClose = () => {
    setMetadataFile(null);
    setUploading(false);
    onClose();
  };

  // Валидация возможности загрузки
  const canUpload = Boolean(metadataFile && projectStore.selectedProject && !uploading);

  return {
    // Состояния
    metadataFile,
    uploading,
    
    // Сеттеры
    setMetadataFile,
    setUploading,
    
    // Обработчики
    handleMetadataFileSelect,
    handleBatchUpload,
    handleClose,
    
    // Валидация
    canUpload,
  };
};
