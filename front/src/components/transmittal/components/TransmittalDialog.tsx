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
  TableContainer,
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
  Autocomplete,
} from '@mui/material';
import {
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
import { projectStore } from '../../../stores/ProjectStore';
import { transmittalStore } from '../../../stores/TransmittalStore';
import referenceDataStore from '../../../stores/ReferenceDataStore';
import { referencesStore } from '../../../stores/ReferencesStore';
import { transmittalCartStore } from '../../../stores/TransmittalCartStore';
import { transmittalsApi, type ProjectParticipant } from '../../../api/client';

export interface TransmittalData {
  transmittal_number: string;
  title: string;
  direction?: 'out' | 'in';
  counterparty_id?: number;
  revision_ids?: number[];
}

export interface TransmittalDialogProps {
  open: boolean;
  onClose: () => void;
  // Создание
  onCreateTransmittal?: (transmittalData: TransmittalData) => Promise<void>;
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
  onAddRevision?: (revision: any) => void;
  onRemoveRevision?: (revisionId: number) => void;
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
  onAddRevision,
  onRemoveRevision,
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

  // Состояние для выбора документов
  const [availableRevisions, setAvailableRevisions] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  // Получаем выбранные ревизии из store
  const selectedRevisionsFromStore = transmittalCartStore.getSelectedRevisions(availableRevisions);

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
          direction: 'out', // По умолчанию исходящий при создании
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
    // Направление не валидируем при создании, так как оно автоматически устанавливается как 'out'
    if (readOnly && initialData && !formData.direction) {
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
      
      // Загружаем справочные данные для ревизий
      referencesStore.loadAll();
      
      // Загружаем активные ревизии проекта для выбора
      if (projectStore.selectedProject) {
        loadActiveRevisions();
      }
    }
  }, [open]);

  // Функция загрузки активных ревизий проекта
  const loadActiveRevisions = async () => {
    if (!projectStore.selectedProject) return;
    
    setDocumentsLoading(true);
    try {
      const revisions = await transmittalsApi.getActiveRevisions(projectStore.selectedProject.id);
      setAvailableRevisions(revisions);
    } catch (err) {
      console.error('Ошибка загрузки активных ревизий:', err);
    } finally {
      setDocumentsLoading(false);
    }
  };

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

  // Функции для работы с документами
  const handleAddDocument = (revision: any) => {
    if (!revision) return;
    
    if (isEditing && onAddRevision) {
      // В режиме редактирования - добавляем в локальное состояние
      onAddRevision(revision);
    } else {
      // В режиме создания - добавляем в store
      transmittalCartStore.addRevision(revision.id);
    }
  };

  // Функция удаления ревизии
  const handleRemoveRevision = (revisionId: number) => {
    if (isEditing && onRemoveRevision) {
      // В режиме редактирования - удаляем из локального состояния
      onRemoveRevision(revisionId);
    } else {
      // В режиме создания - удаляем из store
      transmittalCartStore.removeRevision(revisionId);
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (onCreateTransmittal) {
        // Добавляем ID ревизий к данным трансмиттала
        const transmittalData = {
          ...formData,
          revision_ids: transmittalCartStore.selectedRevisionIds
        };
        await onCreateTransmittal(transmittalData);
      }
      if (onShowNotification) {
        onShowNotification(t('transmittals.create_success'), 'success');
      }
      // Очищаем корзину после успешного создания
      transmittalCartStore.clearAll();
      onClose();
    } catch (error: any) {
      console.error('Error creating transmittal:', error);
      
      // Обрабатываем ошибки уникальности номера трансмиттала
      if (error.response?.data?.detail?.includes('повторяющееся значение ключа нарушает ограничение уникальности "ix_transmittals_transmittal_number"')) {
        if (onShowNotification) {
          onShowNotification(t('transmittals.transmittal_number_exists'), 'error');
        }
      } else {
        const errorMessage = error.response?.data?.detail || error.message || t('transmittals.create_error');
        if (onShowNotification) {
          onShowNotification(errorMessage, 'error');
        }
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      // Очищаем корзину при закрытии диалога
      transmittalCartStore.clearAll();
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
            position: 'relative', // Для позиционирования overlay
          }
        }}
      >
        {/* Overlay со спиннером при сохранении */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                {t('common.saving')}
              </Typography>
            </Box>
          </Box>
        )}
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {readOnly
              ? `${t('transmittals.view_title', { defaultValue: 'Transmittal Details' })}: ${formData.transmittal_number || initialData?.transmittal_number || ''}`
              : (titleOverride || t('transmittals.create'))}
          </Typography>
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
                value={(initialData as any)?.status ? transmittalStore.getTransmittalStatusLabel((initialData as any).status, t) : transmittalStore.getTransmittalStatusLabel('draft', t)}
                variant="standard"
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={readOnly ? (7.5 as any) : 9}>
              {/* Пустое место */}
            </Grid>
            
            {/* Показываем направление только при просмотре/редактировании, не при создании */}
            {readOnly && initialData && (
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
                    disabled={true}
                    error={validationErrors.direction}
                    helperText={validationErrors.direction ? t('common.required', { defaultValue: 'Обязательно' }) : ''}
                  />
                )}
              </Grid>
            )}
            
            {/* Вторая строка */}
            <Grid item xs={3}>
              {isLoading && readOnly ? (
                <Skeleton variant="rectangular" height={56} />
              ) : (
                <FormControl variant="standard" fullWidth required error={validationErrors.counterparty_id}>
                  <InputLabel>
                    {formData.direction === 'in' ? t('transmittals.columns.sender') : t('transmittals.recipient_company')}
                  </InputLabel>
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
                    disabled={isLoading || (readOnly && !isEditing)}
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
                      {formData.direction === 'in' ? t('transmittals.sender_company_required', { defaultValue: 'Компания отправитель обязательна' }) : t('transmittals.recipient_company_required')}
                    </Typography>
                  )}
                </FormControl>
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
              {t('transmittals.documents')} ({readOnly || isEditing ? (revisions?.length || 0) : selectedRevisionsFromStore.length})
            </Typography>
          </Box>

          {/* Поле для добавления документов */}
          {(!readOnly || isEditing) && (
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                options={availableRevisions}
                getOptionLabel={(option) => option.document_number || option.document_title}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                filterOptions={(options, { inputValue }) => {
                  return options.filter(option => 
                    option.document_number?.toLowerCase().includes(inputValue.toLowerCase()) ||
                    option.document_title.toLowerCase().includes(inputValue.toLowerCase())
                  );
                }}
                loading={documentsLoading}
                onChange={(_, newValue) => {
                  handleAddDocument(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('transmittals.add_documents')}
                    placeholder={t('transmittals.search_documents')}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {documentsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {option.document_number || ''}
                        </Typography>
                        {option.revision_number && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              label={`Rev. ${option.revision_number}`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          </Box>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {option.document_title}
                      </Typography>
                    </Box>
                  </Box>
                  );
                }}
                noOptionsText={t('transmittals.no_documents_found')}
                clearOnEscape
                selectOnFocus
                handleHomeEndKeys
              />
            </Box>
          )}

          {/* Таблица с единой сеткой */}
          {isLoading ? (
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
                    {/* Скелетон для загрузки */}
                    {Array.from({ length: 3 }).map((_, index) => (
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
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          ) : (readOnly ? (revisions?.length || 0) === 0 : selectedRevisionsFromStore.length === 0) ? (
            <TableContainer component={Paper} sx={{ 
              flexGrow: 1, 
              maxHeight: '400px', 
              overflow: 'auto',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
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
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  {t('transmittals.no_documents_selected')}
                </Typography>
              </Box>
            </TableContainer>
          ) : (
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
                    {(readOnly || isEditing ? (revisions || []) : selectedRevisionsFromStore).map((revision: any) => {
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
                          {readOnly && !isEditing ? (
                            <IconButton disabled size="small">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <IconButton
                              onClick={() => handleRemoveRevision(revision.id)}
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
                  }
                </TableBody>
              </Table>
            </Box>
          </Paper>
          )}
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
            startIcon={isLoading ? <CircularProgress size={16} /> : ''}
            disabled={isLoading}
          >
            {isLoading ? t('common.creating') : t('transmittals.create_button')}
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
            // Показываем кнопку редактирования только если трансмиттал не отправлен
            !(initialData?.direction === 'out' && initialData?.status === 'Sent') && (
              <Button onClick={onEdit} variant="contained">
                {t('common.edit')}
              </Button>
            )
          )}
        </DialogActions>
      )}
      
      </Dialog>

    </>
  );
});

export default TransmittalDialog;
