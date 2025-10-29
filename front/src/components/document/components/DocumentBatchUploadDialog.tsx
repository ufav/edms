import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  UploadFile as UploadFileIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export interface DocumentBatchUploadDialogProps {
  // Состояние диалога
  open: boolean;
  
  // Состояния загрузки
  metadataFile: File | null;
  uploading: boolean;
  validating: boolean;
  canUpload: boolean;
  validationErrors?: Array<{row: number, field: string, message: string}>;
  
  // Обработчики
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onValidateAndUpload: () => void;
}

export const DocumentBatchUploadDialog: React.FC<DocumentBatchUploadDialogProps> = ({
  open,
  metadataFile,
  uploading,
  validating,
  canUpload,
  validationErrors,
  onClose,
  onFileSelect,
  onValidateAndUpload,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : '600px', // Фиксированная высота
          maxHeight: isMobile ? '100vh' : '600px',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFileIcon />
          {t('documents.import_by_paths') || 'Импорт по путям'}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 3, 
          mt: 2,
          height: '100%',
          overflow: 'auto'
        }}>
          {/* Выбор файла метаданных */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('documents.metadata_file') || 'Файл метаданных (Excel)'}
            </Typography>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileSelect}
              style={{ display: 'none' }}
              id="metadata-input"
              name="metadata-input"
            />
            <label htmlFor="metadata-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<DescriptionIcon />}
                sx={{ width: '100%' }}
              >
                {t('documents.select_metadata') || 'Выбрать Excel'}
              </Button>
            </label>
            <Box sx={{ mt: 1, minHeight: '24px' }}>
              <Typography variant="body2" color="text.secondary">
                {metadataFile 
                  ? (t('documents.selected_metadata') || 'Выбран файл метаданных') + ': ' + metadataFile.name
                  : t('documents.file_not_selected') || 'Файл не выбран'
                }
              </Typography>
            </Box>
          </Box>

          {/* Информация о формате Excel */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{t('documents.excel_format_info') || 'Формат Excel'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{(t('documents.excel_required_columns') || 'Обязательные колонки') + ': '}</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ ml: 2 }}>
              • <strong>Document ID</strong><br/>
              • <strong>Title</strong><br/>
              • <strong>Discipline</strong><br/>
              • <strong>Document Type</strong><br/>
              • <strong>File Path</strong><br/>
              • <strong>Language</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{(t('documents.excel_optional_columns') || 'Необязательные колонки') + ': '}</strong>
              Secondary Title
            </Typography>
          </Alert>

          {/* Ошибки валидации */}
          {validationErrors && validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>{t('documents.validation_errors_found') || 'Найдены ошибки валидации:'}</strong>
              </Typography>
              <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                {validationErrors.map((error, index) => (
                  <Typography key={index} variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {t('documents.validation_error_row')
                      .replace('{row}', error.row.toString())
                      .replace('{field}', error.field)
                      .replace('{message}', error.message)}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid', 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        flexShrink: 0
      }}>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onValidateAndUpload}
          variant="contained"
          disabled={!canUpload}
          startIcon={(uploading || validating) ? <CircularProgress size={20} /> : <UploadFileIcon />}
        >
          {validating ? 'Проверка...' : uploading ? (t('documents.uploading') || 'Импорт...') : (t('documents.import') || 'Импортировать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
