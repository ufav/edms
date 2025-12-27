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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [fileMetadataList, setFileMetadataList] = useState<FileMetadata[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка загрузки файла - сохраняем только метаданные
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      const [first] = files;
      setUploadedFile(first);
      setFileMetadata({ name: first.name, size: first.size, type: first.type });
      setUploadedFiles(files);
      setFileMetadataList(files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      onFileSelect?.(first);
    }
  };

  // Прямой хэндлер для массива файлов (без input event)
  const handleFilesUpload = (files: File[]) => {
    if (files && files.length > 0) {
      const [first] = files;
      setUploadedFile(first);
      setFileMetadata({ name: first.name, size: first.size, type: first.type });
      setUploadedFiles(files);
      setFileMetadataList(files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      onFileSelect?.(first);
    }
  };

  // Функция удаления загруженного файла
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFiles([]);
    setFileMetadata(null);
    setFileMetadataList([]);
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
    setUploadedFiles([]);
    setFileMetadata(null);
    setFileMetadataList([]);
    setIsUploadingDocument(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    // Состояние
    uploadedFile,
    uploadedFiles,
    fileMetadata,
    fileMetadataList,
    isUploadingDocument,
    uploadProgress,
    fileInputRef,
    
    // Функции
    handleFileUpload,
    handleFilesUpload,
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
