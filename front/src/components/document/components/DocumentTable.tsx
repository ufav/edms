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
  Checkbox,
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
import DocumentsTableSkeleton from './DocumentsTableSkeleton';

export interface ColumnOrder {
  column: string;
  order: number;
}

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
    updated_at: boolean;
    created_by: boolean;
    discipline: boolean;
    document_type: boolean;
    actions: boolean;
  };
  
  // Порядок колонок
  columnOrder?: ColumnOrder[];
  
  
  // Обработчики действий
  onShowDetails: (documentId: number) => void;
  onDownload: (documentId: number) => void;
  onDelete: (document: any) => void;
  
  // Обработчики для выбора документов в трансмиттал
  showSelectColumn?: boolean; // Показывать ли колонку с галочками
  selectedDocuments?: number[]; // Массив ID выбранных документов
  onDocumentSelect?: (documentId: number, selected: boolean) => void; // Обработчик выбора документа
  
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
  columnOrder = [],
  onShowDetails,
  onDownload,
  onDelete,
  showSelectColumn = false,
  selectedDocuments = [],
  onDocumentSelect,
  formatFileSize,
  formatDate,
  language,
}) => {
  const { t } = useTranslation();

  // Функция для расчета высоты таблицы - всегда 13 строк
  const calculateTableHeight = () => {
    const headerHeight = 48; // Высота заголовка
    const rowHeight = 48; // Высота одной строки
    const visibleRows = 13; // Всегда 13 видимых строк
    return headerHeight + (visibleRows * rowHeight);
  };

  // Функция для получения отсортированных колонок
  const getSortedColumns = () => {
    if (columnOrder.length === 0) {
      // Если порядок не задан, используем дефолтный порядок
      return [
        'number', 'title', 'file', 'size', 'revision', 'status', 
        'language', 'discipline', 'document_type', 'drs', 
        'date', 'updated_at', 'created_by'
      ];
    }
    
    // Сортируем колонки по порядку, исключая actions (он всегда справа)
    return columnOrder
      .filter(col => col.column !== 'actions')
      .sort((a, b) => a.order - b.order)
      .map(col => col.column);
  };

  // Функция для получения ширины колонки
  const getColumnWidth = (key: string) => {
    switch (key) {
      case 'number': return { width: '123px', minWidth: '123px' };
      case 'title': return { width: '200px', minWidth: '200px' };
      case 'file': return { width: '200px', minWidth: '200px' };
      case 'size': return { width: '83px', minWidth: '83px' };
      case 'revision': return { width: '83px', minWidth: '83px' };
      case 'status': return { width: '103px', minWidth: '103px' };
      case 'language': return { width: '83px', minWidth: '83px' };
      case 'drs': return { width: '83px', minWidth: '83px' };
      case 'discipline': return { width: '103px', minWidth: '103px' };
      case 'document_type': return { width: '123px', minWidth: '123px' };
      case 'date': return { width: '140px', minWidth: '140px' };
      case 'updated_at': return { width: '140px', minWidth: '140px' };
      case 'created_by': return { width: '123px', minWidth: '123px' };
      default: return { width: '100px', minWidth: '100px' };
    }
  };

  // Функция для рендеринга заголовка колонки
  const renderColumnHeader = (columnKey: string) => {
    const getColumnLabel = (key: string) => {
      switch (key) {
        case 'number': return t('documents.columns.number');
        case 'title': return t('documents.columns.title');
        case 'file': return t('documents.columns.file');
        case 'size': return t('documents.columns.size');
        case 'revision': return t('documents.columns.revision');
        case 'status': return t('documents.columns.status');
        case 'language': return t('documents.columns.language');
        case 'drs': return 'DRS';
        case 'date': return t('documents.columns.created_at');
        case 'updated_at': return t('documents.columns.updated_at');
        case 'created_by': return t('documents.columns.created_by');
        case 'discipline': return t('documents.columns.discipline');
        case 'document_type': return t('documents.columns.document_type');
        default: return key;
      }
    };

    return (
      <TableCell 
        key={columnKey}
        sx={{ 
          ...getColumnWidth(columnKey), 
          maxWidth: '320px', 
          fontWeight: 'bold', 
          fontSize: '0.875rem', 
          whiteSpace: 'nowrap' 
        }}
      >
        {getColumnLabel(columnKey)}
      </TableCell>
    );
  };

  // Функция для рендеринга ячейки данных
  const renderDataCell = (columnKey: string, document: any) => {
    const getColumnWidth = (key: string) => {
      switch (key) {
        case 'number': return { width: '123px', minWidth: '123px' };
        case 'title': return { width: '200px', minWidth: '200px' };
        case 'file': return { width: '200px', minWidth: '200px' };
        case 'size': return { width: '83px', minWidth: '83px' };
        case 'revision': return { width: '83px', minWidth: '83px' };
        case 'status': return { width: '103px', minWidth: '103px' };
        case 'language': return { width: '83px', minWidth: '83px' };
        case 'drs': return { width: '83px', minWidth: '83px' };
        case 'discipline': return { width: '103px', minWidth: '103px' };
        case 'document_type': return { width: '123px', minWidth: '123px' };
        case 'date': return { width: '140px', minWidth: '140px' };
        case 'updated_at': return { width: '140px', minWidth: '140px' };
        case 'created_by': return { width: '123px', minWidth: '123px' };
        default: return { width: '100px', minWidth: '100px' };
      }
    };

    const renderCellContent = () => {
      switch (columnKey) {
        case 'number':
          return (
            <Tooltip title={document.number || `DOC-${document.id}`} arrow>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => onShowDetails(document.id)}
              >
                {document.number || `DOC-${document.id}`}
              </Typography>
            </Tooltip>
          );
        case 'title':
          return (
            <Tooltip title={document.title || 'Без названия'} arrow>
              <Typography variant="body2" sx={{ 
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {document.title || 'Без названия'}
              </Typography>
            </Tooltip>
          );
        case 'file':
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {(() => {
                const fileTypeInfo = getFileTypeInfo(document.file_type || '', document.file_name);
                const IconComponent = fileTypeInfo.icon;
                return <IconComponent sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }} />;
              })()}
              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                {document.file_name || 'N/A'}
              </Typography>
            </Box>
          );
        case 'size':
          return (
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatFileSize(document.file_size)}
            </Typography>
          );
        case 'revision':
          return (
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {documentStore.getFullRevisionNumber(document, referencesStore)}
            </Typography>
          );
        case 'status':
          return (
            <Chip
              label={documentStore.getDocumentStatusLabel(document, referencesStore, language)}
              color={documentStore.getDocumentStatusColor(document, referencesStore) as any}
              size="small"
              sx={{ fontSize: '0.75rem', height: '24px' }}
            />
          );
        case 'language':
          return (
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
          );
        case 'drs':
          return (
            <Tooltip title={document.drs || '-'} arrow>
              <Typography variant="body2" sx={{ 
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {document.drs || '-'}
              </Typography>
            </Tooltip>
          );
        case 'discipline':
          return (
            <Tooltip title={document.discipline_code || '-'} arrow>
              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                {document.discipline_code || '-'}
              </Typography>
            </Tooltip>
          );
        case 'document_type':
          return (
            <Tooltip title={document.document_type_code || '-'} arrow>
              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                {document.document_type_code || '-'}
              </Typography>
            </Tooltip>
          );
        case 'date':
          return (
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatDate(document.created_at)}
            </Typography>
          );
        case 'updated_at':
          return (
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatDate(document.updated_at)}
            </Typography>
          );
        case 'created_by':
          return (
            <Tooltip title={(() => {
              const creator = userStore.users.find(user => user.id === document.created_by);
              return creator ? creator.full_name : `User ${document.created_by}`;
            })()} arrow>
              <Typography variant="body2" sx={{ 
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {(() => {
                  const creator = userStore.users.find(user => user.id === document.created_by);
                  return creator ? creator.full_name : `User ${document.created_by}`;
                })()}
              </Typography>
            </Tooltip>
          );
        default:
          return null;
      }
    };

    return (
      <TableCell 
        key={columnKey}
        sx={{ 
          ...getColumnWidth(columnKey), 
          maxWidth: '320px',
          fontSize: '0.875rem'
        }}
      >
        {renderCellContent()}
      </TableCell>
    );
  };

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
    return <DocumentsTableSkeleton visibleCols={visibleCols} showSelectColumn={showSelectColumn} />;
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: 0,
        marginBottom: 0, // Убираем отступ снизу
        paddingBottom: 0 // Убираем padding снизу
      }}>
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%', 
          flex: 1, // Занимаем всю высоту желтого контейнера
          minHeight: 0, // Важно для flex
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 0, // Убираем скругленные углы
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
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0,
      marginBottom: 0, // Убираем отступ снизу
      paddingBottom: 0 // Убираем padding снизу
    }}>
        {/* Заголовок таблицы - зафиксирован */}
        <Box sx={{ 
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#f5f5f5',
          boxShadow: 2, // Добавляем тень как у основной рабочей области
        }}>
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                {showSelectColumn && (<TableCell sx={{ 
                  width: '50px', 
                  minWidth: '50px', 
                  maxWidth: '50px', 
                  fontWeight: 'bold', 
                  fontSize: '0.875rem', 
                  whiteSpace: 'nowrap', 
                  textAlign: 'center', 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: '#f5f5f5', 
                  zIndex: 3 
                }}></TableCell>)}
                {/* Рендерим колонки в порядке из настроек */}
                {getSortedColumns().map(columnKey => 
                  visibleCols[columnKey as keyof typeof visibleCols] && renderColumnHeader(columnKey)
                )}
                {visibleCols.actions && (<TableCell sx={{ 
                  width: '110px', 
                  minWidth: '110px', 
                  maxWidth: '110px', 
                  fontWeight: 'bold', 
                  fontSize: '0.875rem', 
                  whiteSpace: 'nowrap', 
                  position: 'sticky', 
                  right: 0, 
                  backgroundColor: '#f5f5f5', 
                  zIndex: 3 
                }}>{t('common.actions')}</TableCell>)}
              </TableRow>
            </TableHead>
          </Table>
        </Box>

        {/* Тело таблицы - с прокруткой */}
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%', 
          flex: 1, // Занимаем оставшуюся высоту
          minHeight: 0, // Важно для flex
          overflow: 'auto',
          borderRadius: 0, // Убираем скругленные углы
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              background: '#a8a8a8',
            },
          },
        }}>
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableBody>
            {documents.map((document) => (
              <TableRow 
                key={document.id} 
                sx={{ 
                  '& .MuiTableCell-root': { padding: '8px 16px' },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                    '& .MuiTableCell-root': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04) !important'
                    }
                  }
                }}
              >
                {showSelectColumn && (
                  <TableCell 
                    data-sticky="left"
                    sx={{ 
                      width: '50px', 
                      minWidth: '50px', 
                      maxWidth: '50px', 
                      textAlign: 'center', 
                      position: 'sticky', 
                      left: 0, 
                      zIndex: 2 
                    }}
                  >
                    <Checkbox
                      checked={selectedDocuments.includes(document.id)}
                      onChange={(e) => onDocumentSelect?.(document.id, e.target.checked)}
                      size="small"
                      sx={{ padding: 0 }}
                    />
                  </TableCell>
                )}
                {/* Рендерим колонки в порядке из настроек */}
                {getSortedColumns().map(columnKey => 
                  visibleCols[columnKey as keyof typeof visibleCols] && renderDataCell(columnKey, document)
                )}
                {visibleCols.actions && (<TableCell 
                  data-sticky="right"
                  sx={{ 
                    width: '110px', 
                    minWidth: '110px', 
                    maxWidth: '110px', 
                    position: 'sticky', 
                    right: 0, 
                    zIndex: 2 
                  }}
                >
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
    </Box>
  );
});
