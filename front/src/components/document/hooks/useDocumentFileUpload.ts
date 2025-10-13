import { useState, useRef } from 'react';

interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

interface UseDocumentFileUploadProps {
  onFileSelect?: (file: File) => void;
  onFileRemove?: () => void;
}

export const useDocumentFileUpload = ({
  onFileSelect,
  onFileRemove
}: UseDocumentFileUploadProps = {}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка загрузки файла - сохраняем только метаданные
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Сохраняем только метаданные, не загружаем файл в память
      setFileMetadata({
        name: file.name,
        size: file.size,
        type: file.type
      });
      setUploadedFile(file);
      onFileSelect?.(file);
    }
  };

  // Функция удаления загруженного файла
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  };

  // Функция открытия диалога выбора файла
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Функция для создания обработчика прогресса загрузки
  const createProgressHandler = (onProgress?: (progress: number) => void) => {
    return (progressEvent: any) => {
      if (progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
        onProgress?.(progress);
      }
    };
  };

  // Функция для сброса состояния загрузки
  const resetUploadState = () => {
    setIsUploadingDocument(false);
    setUploadProgress(0);
  };

  // Функция для начала загрузки
  const startUpload = () => {
    setIsUploadingDocument(true);
    setUploadProgress(0);
  };

  // Функция для полного сброса состояния
  const resetAll = () => {
    setUploadedFile(null);
    setFileMetadata(null);
    setIsUploadingDocument(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    // Состояние
    uploadedFile,
    fileMetadata,
    isUploadingDocument,
    uploadProgress,
    fileInputRef,
    
    // Функции
    handleFileUpload,
    handleRemoveFile,
    openFileDialog,
    createProgressHandler,
    resetUploadState,
    startUpload,
    resetAll,
    setUploadProgress,
    setIsUploadingDocument,
  };
};
