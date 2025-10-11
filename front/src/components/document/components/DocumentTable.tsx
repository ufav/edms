import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TablePagination,
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
import { languageStore } from '../../../stores/LanguageStore';
import { referencesStore } from '../../../stores/ReferencesStore';
import { canDeleteDocument } from '../../../hooks/usePermissions';
import { userStore } from '../../../stores/UserStore';

export interface DocumentTableProps {
  // Данные
  documents: any[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Настройки колонок
  visibleCols: {
    number: boolean;
    title: boolean;
    file: boolean;
    size: boolean;
    revision: boolean;
    status: boolean;
    language: boolean;
    drs: boolean;
    date: boolean;
    created_by: boolean;
    discipline: boolean;
    document_type: boolean;
    actions: boolean;
  };
  
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

export const DocumentTable: React.FC<DocumentTableProps> = observer(({
  documents,
  totalCount,
  isLoading,
  error,
  visibleCols,
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
            <TableContainer component={Paper} sx={{ 
              boxShadow: 2, 
              width: '100%', 
              minWidth: '100%', 
              minHeight: '400px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {t('documents.no_documents')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('documents.no_documents_hint')}
          </Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <>
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%', 
          flex: 1
        }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
              {visibleCols.number && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.number')}</TableCell>)}
              {visibleCols.title && (<TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.title')}</TableCell>)}
              {visibleCols.file && (<TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.file')}</TableCell>)}
              {visibleCols.size && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.size')}</TableCell>)}
              {visibleCols.revision && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.revision')}</TableCell>)}
              {visibleCols.status && (<TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.status')}</TableCell>)}
              {visibleCols.language && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.language')}</TableCell>)}
              {visibleCols.drs && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>DRS</TableCell>)}
              {visibleCols.discipline && (<TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.discipline')}</TableCell>)}
              {visibleCols.document_type && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.document_type')}</TableCell>)}
              {visibleCols.date && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.created_at')}</TableCell>)}
              {visibleCols.created_by && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{t('documents.columns.created_by')}</TableCell>)}
              {visibleCols.actions && (<TableCell sx={{ width: '110px', minWidth: '110px', maxWidth: '110px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap', position: 'sticky', right: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>{t('common.actions')}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} hover sx={{ '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                {visibleCols.number && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Tooltip title={document.number || 'DOC-' + document.id} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {document.number || 'DOC-' + document.id}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.title && (<TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px' }}>
                  <Tooltip title={document.title} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {document.title}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.file && (<TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(() => {
                      const fileTypeInfo = getFileTypeInfo(document.file_type || '', document.file_name);
                      const IconComponent = fileTypeInfo.icon;
                      return <IconComponent sx={{ fontSize: '1.25rem', color: `${fileTypeInfo.color}.main` }} />;
                    })()}
                    <Tooltip title={document.file_name} arrow>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                        {document.file_name}
                      </Typography>
                    </Tooltip>
                  </Box>
                </TableCell>)}
                {visibleCols.size && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {formatFileSize(document.file_size)}
                  </Typography>
                </TableCell>)}
                {visibleCols.revision && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {documentStore.getFullRevisionNumber(document, referencesStore)}
                  </Typography>
                </TableCell>)}
                {visibleCols.status && (<TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px' }}>
                  <Chip
                    label={documentStore.getDocumentStatusLabel(document, referencesStore, language)}
                    color={documentStore.getDocumentStatusColor(document, referencesStore) as any}
                    size="small"
                    sx={{ fontSize: '0.75rem', height: '24px' }}
                  />
                </TableCell>)}
                {visibleCols.language && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Tooltip title={(() => {
                    const languageItem = languageStore.languages.find(l => l.id === document.language_id);
                    return languageItem ? languageItem.code : 'ru';
                  })()} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {(() => {
                        const languageItem = languageStore.languages.find(l => l.id === document.language_id);
                        return languageItem ? languageItem.code : 'ru';
                      })()}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.drs && (<TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Tooltip title={document.drs || '-'} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {document.drs || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.discipline && (<TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px' }}>
                  <Tooltip title={document.discipline_code || '-'} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {document.discipline_code || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.document_type && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Tooltip title={document.document_type_code || '-'} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {document.document_type_code || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.date && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {formatDate(document.created_at)}
                  </Typography>
                </TableCell>)}
                {visibleCols.created_by && (<TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Tooltip title={(() => {
                    const creator = userStore.users.find(user => user.id === document.created_by);
                    return creator ? creator.full_name : `User ${document.created_by}`;
                  })()} arrow>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {(() => {
                        const creator = userStore.users.find(user => user.id === document.created_by);
                        return creator ? creator.full_name : `User ${document.created_by}`;
                      })()}
                    </Typography>
                  </Tooltip>
                </TableCell>)}
                {visibleCols.actions && (<TableCell sx={{ width: '110px', minWidth: '110px', maxWidth: '110px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('documents.details')}>
                      <IconButton size="small" onClick={() => onShowDetails(document.id)} sx={{ padding: '4px' }}>
                        <DescriptionIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.download_latest')}>
                      <IconButton size="small" onClick={() => onDownload(document.id)} sx={{ padding: '4px' }}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canDeleteDocument(document) && (
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => onDelete(document)} sx={{ padding: '4px' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {!isLoading && totalCount > 0 && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          labelRowsPerPage={t('common.rows_per_page') || 'Строк на странице:'}
          labelDisplayedRows={({ from, to, count }) => {
            const ofText = t('common.of') || 'из';
            const moreThanText = t('common.more_than') || 'больше чем';
            const countText = count !== -1 ? count.toString() : `${moreThanText} ${to}`;
            return `${from}-${to} ${ofText} ${countText}`;
          }}
          sx={{
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 0,
              paddingRight: 0,
              flexWrap: 'wrap',
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
            },
          }}
        />
      )}
    </>
  );
});
