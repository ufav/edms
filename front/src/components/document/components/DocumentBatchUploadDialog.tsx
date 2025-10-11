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
  canUpload: boolean;
  
  // Обработчики
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export const DocumentBatchUploadDialog: React.FC<DocumentBatchUploadDialogProps> = ({
  open,
  metadataFile,
  uploading,
  canUpload,
  onClose,
  onFileSelect,
  onUpload,
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
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFileIcon />
          {t('documents.import_by_paths') || 'Импорт по путям'}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 400 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
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
                {t('documents.choose_metadata') || 'Выбрать Excel'}
              </Button>
            </label>
            {metadataFile && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {(t('documents.selected_metadata') || 'Выбран файл метаданных') + ': '} {metadataFile.name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Информация о формате Excel */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{t('documents.excel_format_info') || 'Формат Excel'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {(t('documents.excel_required_columns') || 'Обязательные колонки') + ': '} file_path, title
            </Typography>
            <Typography variant="body2">
              {(t('documents.excel_optional_columns') || 'Необязательные колонки') + ': '} description, discipline_code, document_type_code, document_code, language, author, creation_date, revision, sheet_number, total_sheets, scale, format, confidentiality
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onUpload}
          variant="contained"
          disabled={!canUpload}
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
        >
          {uploading ? (t('documents.uploading') || 'Импорт...') : (t('documents.import') || 'Импортировать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
