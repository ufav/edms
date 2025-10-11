import {
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  Slideshow as PptIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  TextSnippet as TextIcon,
  Architecture as DwgIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

interface FileTypeInfo {
  icon: any;
  label: string;
  color: string;
}

// Функция для получения иконки и названия типа файла
export const getFileTypeInfo = (fileType: string, fileName?: string): FileTypeInfo => {
  if (!fileType) return { icon: FolderIcon, label: 'N/A', color: 'default' };

  // Определяем тип файла по MIME типу или расширению
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName?.toLowerCase() || '';

  // PDF файлы
  if (lowerFileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
    return { icon: PdfIcon, label: 'PDF', color: 'error' };
  }

  // Word документы
  if (lowerFileType.includes('word') || 
      lowerFileType.includes('document') || 
      lowerFileName.endsWith('.doc') || 
      lowerFileName.endsWith('.docx')) {
    return { icon: DocIcon, label: 'DOC', color: 'primary' };
  }

  // Excel файлы
  if (lowerFileType.includes('excel') || 
      lowerFileType.includes('spreadsheet') || 
      lowerFileName.endsWith('.xls') || 
      lowerFileName.endsWith('.xlsx')) {
    return { icon: ExcelIcon, label: 'XLS', color: 'success' };
  }

  // PowerPoint файлы
  if (lowerFileType.includes('powerpoint') || 
      lowerFileType.includes('presentation') || 
      lowerFileName.endsWith('.ppt') || 
      lowerFileName.endsWith('.pptx')) {
    return { icon: PptIcon, label: 'PPT', color: 'warning' };
  }

  // Изображения
  if (lowerFileType.includes('image') || 
      lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/)) {
    return { icon: ImageIcon, label: 'IMG', color: 'info' };
  }

  // Видео файлы
  if (lowerFileType.includes('video') || 
      lowerFileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/)) {
    return { icon: VideoIcon, label: 'VID', color: 'secondary' };
  }

  // Аудио файлы
  if (lowerFileType.includes('audio') || 
      lowerFileName.match(/\.(mp3|wav|flac|aac|ogg)$/)) {
    return { icon: AudioIcon, label: 'AUD', color: 'secondary' };
  }

  // CAD файлы
  if (lowerFileType.includes('dwg') || 
      lowerFileType.includes('dxf') || 
      lowerFileName.endsWith('.dwg') || 
      lowerFileName.endsWith('.dxf')) {
    return { icon: DwgIcon, label: 'DWG', color: 'default' };
  }

  // Текстовые файлы
  if (lowerFileType.includes('text') || 
      lowerFileName.match(/\.(txt|rtf|md)$/)) {
    return { icon: TextIcon, label: 'TXT', color: 'default' };
  }

  // Код файлы
  if (lowerFileType.includes('code') || 
      lowerFileName.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs)$/)) {
    return { icon: CodeIcon, label: 'CODE', color: 'default' };
  }

  // По умолчанию
  return { icon: FolderIcon, label: 'FILE', color: 'default' };
};

// Функция для форматирования размера файла
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Функция для получения расширения файла
export const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex + 1).toUpperCase();
};
