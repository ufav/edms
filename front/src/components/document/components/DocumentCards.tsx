import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
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
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { documentStore } from '../../../stores/DocumentStore';
import AppPagination from '../../AppPagination';
import { referencesStore } from '../../../stores/ReferencesStore';
import { canDeleteDocument } from '../../../hooks/usePermissions';
import { userStore } from '../../../stores/UserStore';

export interface DocumentCardsProps {
  // Данные
  documents: any[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Пагинация
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Обработчики действий
  onShowDetails: (documentId: number) => void;
  onDownload: (documentId: number) => void;
  onDelete: (document: any) => void;
  
  // Утилиты
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
  language: string;
}

export const DocumentCards: React.FC<DocumentCardsProps> = observer(({
  documents,
  totalCount,
  isLoading,
  error,
  page,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
  onShowDetails,
  onDownload,
  onDelete,
  formatFileSize,
  formatDate,
  language,
}) => {
  const { t } = useTranslation();

  // Функция для получения иконки и названия типа файла
  const getFileTypeInfo = (fileType: string, fileName?: string) => {
    if (!fileType) return { icon: FolderIcon, label: 'N/A', color: 'default' };
    
    const type = fileType.toLowerCase();
    
    // PDF файлы
    if (type.includes('pdf')) {
      return { icon: PdfIcon, label: 'PDF', color: 'error' };
    }
    
    // Excel файлы (проверяем раньше Word, так как Excel MIME содержит "document")
    if (type.includes('excel') || type.includes('sheet') || type.includes('xls') || type.includes('spreadsheet')) {
      return { icon: ExcelIcon, label: 'XLSX', color: 'success' };
    }
    
    // Word документы
    if (type.includes('word') || type.includes('doc') || type.includes('wordprocessing')) {
      return { icon: DocIcon, label: 'DOCX', color: 'primary' };
    }
    
    // PowerPoint файлы
    if (type.includes('powerpoint') || type.includes('presentation') || type.includes('ppt')) {
      return { icon: PptIcon, label: 'PPTX', color: 'warning' };
    }
    
    // Изображения
    if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png') || type.includes('gif') || type.includes('bmp')) {
      return { icon: ImageIcon, label: 'IMG', color: 'info' };
    }
    
    // Видео файлы
    if (type.includes('video') || type.includes('mp4') || type.includes('avi') || type.includes('mov')) {
      return { icon: VideoIcon, label: 'VID', color: 'secondary' };
    }
    
    // Аудио файлы
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
      return { icon: AudioIcon, label: 'AUD', color: 'secondary' };
    }
    
    // CAD файлы
    if (type.includes('dwg') || type.includes('dxf') || type.includes('cad')) {
      return { icon: DwgIcon, label: 'CAD', color: 'primary' };
    }
    
    // Текстовые файлы
    if (type.includes('text') || type.includes('txt')) {
      return { icon: TextIcon, label: 'TXT', color: 'default' };
    }
    
    // Код файлы
    if (type.includes('code') || type.includes('js') || type.includes('html') || type.includes('css')) {
      return { icon: CodeIcon, label: 'CODE', color: 'default' };
    }
    
    // По умолчанию - пытаемся извлечь расширение из имени файла
    if (fileName) {
      const extension = fileName.split('.').pop()?.toUpperCase();
      if (extension) {
        return { icon: FolderIcon, label: extension, color: 'default' };
      }
    }
    
    return { icon: FolderIcon, label: fileType.split('/').pop()?.toUpperCase() || 'FILE', color: 'default' };
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (totalCount === 0) {
    return (
      <Box sx={{ width: '100%', minWidth: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ m: 2, width: '100%' }}>
          {t('documents.no_documents')}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={2} sx={{ p: 2 }}>
        {documents.map((document) => (
          <Grid item xs={12} key={document.id}>
            <Card sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {document.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {document.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {(() => {
                    const fileTypeInfo = getFileTypeInfo(document.file_type || '', document.file_name);
                    const IconComponent = fileTypeInfo.icon;
                    return (
                      <Chip 
                        icon={<IconComponent />}
                        label={document.file_name || 'N/A'} 
                        size="small" 
                        variant="outlined" 
                        color={fileTypeInfo.color as any}
                      />
                    );
                  })()}
                  <Chip 
                    label={formatFileSize(document.file_size || 0)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={documentStore.getFullRevisionNumber(document, referencesStore)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={documentStore.getDocumentStatusLabel(document, referencesStore, language)} 
                    size="small" 
                    color={documentStore.getDocumentStatusColor(document, referencesStore) as any} 
                  />
                  <Chip 
                    label={formatDate(document.created_at)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={(() => {
                      const creator = userStore.users.find(user => user.id === document.created_by);
                      return creator ? creator.full_name : `User ${document.created_by}`;
                    })()} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title={t('documents.details')}>
                  <IconButton size="small" onClick={() => onShowDetails(document.id)}>
                    <DescriptionIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.download_latest')}>
                  <IconButton size="small" onClick={() => onDownload(document.id)}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                {canDeleteDocument(document) && (
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" onClick={() => onDelete(document)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {!isLoading && totalCount > 0 && (
        <Box sx={{ p: 2 }}>
          <AppPagination
            count={totalCount}
            page={page}
            onPageChange={onPageChange}
            showRowsPerPage
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onRowsPerPageChange={onRowsPerPageChange}
            labelRowsPerPage={t('common.rows_per_page') || 'Строк на странице:'}
            labelDisplayedRows={({ from, to, count }) => {
              const ofText = t('common.of') || 'из';
              const moreThanText = t('common.more_than') || 'больше чем';
              const countText = count !== -1 ? count.toString() : `${moreThanText} ${to}`;
              return `${from}-${to} ${ofText} ${countText}`;
            }}
            fixedBottom={false}
            align="right"
          />
        </Box>
      )}
    </>
  );
});
