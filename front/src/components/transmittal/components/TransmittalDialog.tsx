import React, { useState, useEffect } from 'react';
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

export interface TransmittalData {
  transmittal_number: string;
  title: string;
  recipient_id?: number;
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
  initialData?: Partial<TransmittalData> & { recipient_id?: number; status?: string };
  titleOverride?: string;
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
    recipient_id: undefined,
  });

  // Состояние валидации
  const [validationErrors, setValidationErrors] = useState<{
    transmittal_number?: boolean;
    recipient_id?: boolean;
  }>({});


  // Сброс формы при открытии/закрытии диалога
  useEffect(() => {
    if (open) {
      if (readOnly && initialData) {
        setFormData({
          transmittal_number: initialData.transmittal_number || '',
          title: initialData.title || '',
          recipient_id: initialData.recipient_id,
        });
      } else {
        setFormData({
          transmittal_number: '',
          title: '',
          recipient_id: undefined,
        });
      }
    }
  }, [open, readOnly, initialData?.transmittal_number, initialData?.title, initialData?.recipient_id]);

  // Функция валидации
  const validateForm = () => {
    const errors: { transmittal_number?: boolean; recipient_id?: boolean } = {};
    
    if (!formData.transmittal_number?.trim()) {
      errors.transmittal_number = true;
    }
    if (!formData.recipient_id) {
      errors.recipient_id = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Очищаем ошибки валидации при изменении полей
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [formData.transmittal_number, formData.recipient_id]);


  // Обработчики
  const handleInputChange = (field: keyof TransmittalData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleCreate = async () => {
    console.log('handleCreate called');
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    try {
      console.log('Calling onCreateTransmittal with:', formData);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!readOnly && <SendIcon color="primary" />}
          <Typography variant="h6">
            {titleOverride || (readOnly ? t('transmittals.view_title', { defaultValue: 'Просмотр трансмиттала' }) : t('transmittals.create'))}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Общая информация */}
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                label={t('transmittals.transmittal_number')}
                value={formData.transmittal_number}
                onChange={handleInputChange('transmittal_number')}
                variant="standard"
                fullWidth
                required
                disabled={isLoading || readOnly}
                error={validationErrors.transmittal_number}
                helperText={validationErrors.transmittal_number ? t('transmittals.transmittal_number_required') : ''}
              />
            </Grid>
            {readOnly && (
              <Grid item xs={1.5 as any}>
                <TextField
                  label={t('common.status')}
                  value={(initialData as any)?.status ? t(`transStatus.${(initialData as any).status}`) : t('transStatus.draft')}
                  variant="standard"
                  fullWidth
                  disabled
                />
              </Grid>
            )}

            <Grid item xs={readOnly ? (7.5 as any) : 9}>
              {/* Пустое место */}
            </Grid>
            
            <Grid item xs={3}>
              <FormControl variant="standard" fullWidth required error={validationErrors.recipient_id}>
                <InputLabel>{t('transmittals.recipient_company')}</InputLabel>
                <Select
                  value={formData.recipient_id || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      recipient_id: e.target.value as number
                    }));
                  }}
                  disabled={isLoading || readOnly}
                >
                  {projectStore.selectedProject?.participants?.map((participant) => (
                    <MenuItem key={participant.id} value={participant.company_id}>
                      {participant.company?.name || `Company ${participant.company_id}`}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.recipient_id && (
                  <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    {t('transmittals.recipient_company_required')}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={9}>
              {/* Пустое место */}
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label={t('transmittals.title')}
                value={formData.title}
                onChange={handleInputChange('title')}
                variant="standard"
                fullWidth
                disabled={isLoading || readOnly}
              />
            </Grid>
            
            <Grid item xs={6}>
              {/* Пустое место */}
            </Grid>
            
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Таблица документов */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {t('transmittals.documents')} ({selectedRevisions.length})
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {(readOnly ? (revisions?.length || 0) === 0 : selectedRevisions.length === 0) ? (
            <Box sx={{ 
              flex: 1,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}>
              <Typography variant="body2">
                {t('transmittals.no_documents_selected')}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader size="small">
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
                        width: '80px',
                        minWidth: '80px',
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t('transmittals.columns.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(readOnly ? (revisions || []) : selectedRevisions).map((revision: any) => {
                    const fileTypeInfo = getFileTypeInfo(revision.file_type || '', revision.file_name);
                    return (
                      <TableRow key={revision.id} sx={{ '& .MuiTableCell-root': { padding: '6px 16px' } }}>
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
                            width: '80px',
                            minWidth: '80px',
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
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button 
          onClick={handleClose} 
          disabled={isLoading}
        >
          {readOnly ? t('common.close') : t('common.cancel')}
        </Button>
        {!readOnly && (
          <Button
            onClick={handleCreate}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={isLoading || selectedRevisions.length === 0}
          >
            {isLoading ? t('common.creating') : t('transmittals.create')}
          </Button>
        )}
      </DialogActions>
      </Dialog>
    </>
  );
});

export default TransmittalDialog;
