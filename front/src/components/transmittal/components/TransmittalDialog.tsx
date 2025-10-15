import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon,
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
import { projectStore } from '../../../stores/ProjectStore';
import referenceDataStore from '../../../stores/ReferenceDataStore';
import type { ProjectParticipant } from '../../../api/client';

export interface TransmittalData {
  transmittal_number: string;
  title: string;
  direction?: 'out' | 'in';
  counterparty_id?: number;
}

export interface TransmittalDialogProps {
  open: boolean;
  onClose: () => void;
  // Создание
  onCreateTransmittal?: (transmittalData: TransmittalData) => Promise<void>;
  selectedRevisions?: any[];
  onRemoveRevision?: (revisionId: number) => void;
  onOpenDocument?: (documentId: number) => void;
  // Просмотр (readOnly)
  readOnly?: boolean;
  revisions?: any[];
  initialData?: Partial<TransmittalData> & { status?: string };
  titleOverride?: string;
  // Редактирование
  isEditing?: boolean;
  onUpdateTransmittalData?: (field: string, value: any) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  hasChanges?: boolean;
  // Утилиты
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
  isLoading?: boolean;
  error?: string | null;
  onShowNotification?: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const TransmittalDialog: React.FC<TransmittalDialogProps> = observer(({
  open,
  onClose,
  onCreateTransmittal,
  selectedRevisions = [],
  onRemoveRevision,
  onOpenDocument,
  readOnly = false,
  revisions,
  initialData,
  titleOverride,
  isEditing = false,
  onUpdateTransmittalData,
  onEdit,
  onCancel,
  onSave,
  hasChanges = false,
  formatFileSize,
  isLoading = false,
  error = null,
  onShowNotification,
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
  
  // Состояние формы
  const [formData, setFormData] = useState<TransmittalData>({
    transmittal_number: '',
    title: '',
    direction: undefined,
    counterparty_id: undefined,
  });

  // Состояние валидации
  const [validationErrors, setValidationErrors] = useState<{
    transmittal_number?: boolean;
    direction?: boolean;
    counterparty_id?: boolean;
  }>({});

  // Мемоизируем функцию для получения имени пользователя
  const referenceCreatedByName = useCallback((userId?: number) => {
    if (!userId) return '';
    try { return referenceDataStore.getUserName(userId) || `User ${userId}`; } catch { return `User ${userId}`; }
  }, []);


  // Сброс формы при открытии/закрытии диалога
  useEffect(() => {
    if (open) {
      if (readOnly && initialData) {
        setFormData({
          transmittal_number: initialData.transmittal_number || '',
          title: initialData.title || '',
          direction: initialData.direction,
          counterparty_id: (initialData as any).counterparty_id,
        });
      } else {
        setFormData({
          transmittal_number: '',
          title: '',
          direction: undefined,
          counterparty_id: undefined,
        });
      }
    }
  }, [open, readOnly, initialData?.transmittal_number, initialData?.title, (initialData as any)?.direction, (initialData as any)?.counterparty_id]);

  // Функция валидации
  const validateForm = () => {
    const errors: { transmittal_number?: boolean; direction?: boolean; counterparty_id?: boolean } = {};
    
    if (!formData.transmittal_number?.trim()) {
      errors.transmittal_number = true;
    }
    if (!formData.direction) {
      errors.direction = true;
    }
    if (!formData.counterparty_id) {
      errors.counterparty_id = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Загружаем справочные данные при открытии диалога
  useEffect(() => {
    if (open) {
      // Загружаем справочные данные для отображения названий компаний и пользователей
      referenceDataStore.loadAllReferenceData();
    }
  }, [open]);

  // Очищаем ошибки валидации при изменении полей
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [formData.transmittal_number, formData.direction, formData.counterparty_id]);



  // Обработчики
  const handleInputChange = useCallback((field: keyof TransmittalData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  }, []);

  // Простые обработчики без отслеживания каждого символа
  const handleTransmittalNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('transmittal_number')(e);
    // Просто отмечаем, что есть изменения - не отслеживаем каждый символ
    if (isEditing && onUpdateTransmittalData) {
      onUpdateTransmittalData('transmittal_number', e.target.value);
    }
  }, [handleInputChange, isEditing, onUpdateTransmittalData]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('title')(e);
    // Просто отмечаем, что есть изменения - не отслеживаем каждый символ
    if (isEditing && onUpdateTransmittalData) {
      onUpdateTransmittalData('title', e.target.value);
    }
  }, [handleInputChange, isEditing, onUpdateTransmittalData]);

  const handleCreate = async () => {
    console.log('handleCreate called');
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    try {
      if (onCreateTransmittal) {
        await onCreateTransmittal(formData);
      }
      console.log('onCreateTransmittal succeeded, showing success notification');
      if (onShowNotification) {
        onShowNotification(t('transmittals.create_success'), 'success');
      }
      onClose();
    } catch (error) {
      console.error('Error creating transmittal:', error);
      if (onShowNotification) {
        onShowNotification(t('transmittals.create_error'), 'error');
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '800px',
          }
        }}
      >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!readOnly && <SendIcon color="primary" />}
            <Typography variant="h6">
              {readOnly
                ? `${t('transmittals.view_title', { defaultValue: 'Transmittal Details' })}: ${formData.transmittal_number || initialData?.transmittal_number || ''}`
                : (titleOverride || t('transmittals.create'))}
            </Typography>
          </Box>
          {readOnly && (initialData as any)?.created_at && (
            <Typography variant="body2" color="text.secondary">
              {t('document.created')} {new Date((initialData as any).created_at).toLocaleDateString('ru-RU')}
              {(initialData as any).created_by ? ` ${t('document.created_by')} ${referenceCreatedByName((initialData as any).created_by)}` : ''}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Общая информация */}
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
            {/* Первая строка */}
            <Grid item xs={3}>
              {isLoading && readOnly ? (
                <Skeleton variant="rectangular" height={56} />
              ) : (
                <TextField
                  label={t('transmittals.transmittal_number')}
                  value={formData.transmittal_number}
                  onChange={handleTransmittalNumberChange}
                  variant="standard"
                  fullWidth
                  required
                  disabled={isLoading || (readOnly && !isEditing)}
                  error={validationErrors.transmittal_number}
                  helperText={validationErrors.transmittal_number ? t('transmittals.transmittal_number_required') : ''}
                />
              )}
            </Grid>
            <Grid item xs={readOnly ? (1.5 as any) : 0} sx={{ display: readOnly ? 'block' : 'none' }}>
              <TextField
                label={t('common.status')}
                value={(initialData as any)?.status ? t(`transStatus.${(initialData as any).status}`) : t('transStatus.draft')}
                variant="standard"
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={readOnly ? (7.5 as any) : 9}>
              {/* Пустое место */}
            </Grid>
            
            <Grid item xs={3}>
              {isLoading && readOnly ? (
                <Skeleton variant="rectangular" height={56} />
              ) : (
                <TextField
                  label={t('transmittals.columns.direction')}
                  value={formData.direction === 'out' ? t('transmittals.direction.out') : 
                         formData.direction === 'in' ? t('transmittals.direction.in') : ''}
                  variant="standard"
                  fullWidth
                  required
                  disabled={true}
                  error={validationErrors.direction}
                  helperText={validationErrors.direction ? t('common.required', { defaultValue: 'Обязательно' }) : ''}
                />
              )}
            </Grid>
            
            {/* Вторая строка */}
            <Grid item xs={3}>
              {isLoading && readOnly ? (
                <Skeleton variant="rectangular" height={56} />
              ) : isEditing ? (
                <FormControl variant="standard" fullWidth required error={validationErrors.counterparty_id}>
                  <InputLabel>{t('transmittals.recipient_company')}</InputLabel>
                  <Select
                    value={formData.counterparty_id || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        counterparty_id: e.target.value as number
                      }));
                      if (onUpdateTransmittalData) {
                        onUpdateTransmittalData('counterparty_id', e.target.value);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {projectStore.selectedProject?.participants?.length ? (
                      projectStore.selectedProject.participants.map((participant: ProjectParticipant) => (
                        <MenuItem key={participant.id} value={participant.company_id}>
                          {referenceDataStore.getCompanyName(participant.company_id)}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        {t('transmittals.no_participants')}
                      </MenuItem>
                    )}
                  </Select>
                  {validationErrors.counterparty_id && (
                    <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                      {t('transmittals.recipient_company_required')}
                    </Typography>
                  )}
                </FormControl>
              ) : (
                <TextField
                  label={t('transmittals.recipient_company')}
                  value={referenceDataStore.getCompanyName(formData.counterparty_id || 0)}
                  variant="standard"
                  fullWidth
                  required
                  disabled={true}
                  error={validationErrors.counterparty_id}
                  helperText={validationErrors.counterparty_id ? t('transmittals.recipient_company_required') : ''}
                />
              )}
            </Grid>
            
            <Grid item xs={9}>
              {/* Пустое место */}
            </Grid>
            
            {/* Третья строка */}
            <Grid item xs={6}>
              {isLoading && readOnly ? (
                <Skeleton variant="rectangular" height={56} />
              ) : (
                <TextField
                  label={t('transmittals.title')}
                  value={formData.title}
                  onChange={handleTitleChange}
                  variant="standard"
                  fullWidth
                  disabled={isLoading || (readOnly && !isEditing)}
                />
              )}
            </Grid>
            
            <Grid item xs={6}>
              {/* Пустое место */}
            </Grid>
            
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Таблица документов */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Заголовок таблицы */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {t('transmittals.documents')} ({readOnly ? (revisions?.length || 0) : selectedRevisions.length})
            </Typography>
          </Box>

          {/* Таблица с единой сеткой */}
          <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ 
              flexGrow: 1, 
              maxHeight: '400px', 
              overflow: 'auto',
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
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      {t('transmittals.columns.document_number')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      {t('transmittals.columns.revision')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      {t('transmittals.columns.file')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      {t('transmittals.columns.file_size')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        position: 'sticky', 
                        right: 0, 
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t('transmittals.columns.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    // Скелетон для загрузки
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                        <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="text" width="60%" />
                          </Box>
                        </TableCell>
                        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                        <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                      </TableRow>
                    ))
                  ) : (readOnly ? (revisions?.length || 0) === 0 : selectedRevisions.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('transmittals.no_documents_selected')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (readOnly ? (revisions || []) : selectedRevisions).map((revision: any) => {
                    const fileTypeInfo = getFileTypeInfo(revision.file_type || '', revision.file_name);
                    return (
                      <TableRow 
                        key={revision.id} 
                        sx={{ 
                          '& .MuiTableCell-root': { padding: '6px 16px' },
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                            '& .MuiTableCell-root': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04) !important'
                            }
                          }
                        }}
                      >
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold', 
                              cursor: 'pointer', 
                              color: 'primary.main',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={() => onOpenDocument && onOpenDocument(revision.document_id)}
                          >
                            {revision.document_number || `DOC-${revision.document_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={revision.revision_number ? `${revision.revision_description_code || ''}${revision.revision_number}` : (revision.revision_description_code || 'N/A')}
                            size="small"
                            sx={{ backgroundColor: 'grey.200', color: 'text.primary' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <fileTypeInfo.icon 
                              sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }}
                            />
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                              {revision.file_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatFileSize(revision.file_size)}
                          </Typography>
                        </TableCell>
                         <TableCell 
                          sx={{ 
                            position: 'sticky', 
                            right: 0, 
                            backgroundColor: 'background.paper',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
                          }}
                        >
                          {readOnly ? (
                            <IconButton disabled size="small">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <IconButton
                              onClick={() => onRemoveRevision && onRemoveRevision(revision.id)}
                              disabled={isLoading}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      {/* DialogActions для создания трансмитталов */}
      {!readOnly && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleClose} 
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={isLoading || selectedRevisions.length === 0}
          >
            {isLoading ? t('common.creating') : t('transmittals.create')}
          </Button>
        </DialogActions>
      )}
      
      {/* DialogActions для просмотра трансмитталов */}
      {readOnly && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleClose}>{t('common.close')}</Button>
          {isEditing ? (
            <>
              <Button onClick={onCancel}>{t('common.cancel')}</Button>
              <Button 
                onClick={onSave} 
                variant="contained"
                disabled={!hasChanges}
              >
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button onClick={onEdit} variant="contained">
              {t('common.edit')}
            </Button>
          )}
        </DialogActions>
      )}
      
      </Dialog>
    </>
  );
});

export default TransmittalDialog;
