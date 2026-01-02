import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { documentsApi } from '../../../api/client';

interface DocumentRevisionDialogProps {
  open: boolean;
  documentId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentRevisionDialog: React.FC<DocumentRevisionDialogProps> = ({
  open,
  documentId,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [newRevisionFiles, setNewRevisionFiles] = useState<File[]>([]);
  const [changeDescription, setChangeDescription] = useState('');
  const [fileError, setFileError] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      setNewRevisionFiles(files);
      setFileError('');
    } else {
      setNewRevisionFiles([]);
    }
  };

  const handleSubmit = async () => {
    if (newRevisionFiles.length === 0 || !documentId) {
      setFileError(t('revision.select_file_error'));
      return;
    }

    setUploading(true);
    setFileError('');

    try {
      const formData = new FormData();
      // Добавляем все файлы под ключом 'files' для множественной загрузки
      newRevisionFiles.forEach((f) => formData.append('files', f));
      formData.append('change_description', changeDescription);

      await documentsApi.uploadRevision(documentId, formData);
      onSuccess();
      handleClose();
    } catch (error: any) {
      let errorMessage = t('revision.upload_error');
      
      // Обрабатываем структурированную ошибку для ревизий
      if (error?.response?.data?.detail?.error_type === 'revision_status_error') {
        const { revision, status } = error.response.data.detail;
        // Используем ручную интерполяцию, если t() не работает
        const template = t('documents.revision_error');
        const interpolatedMessage = template
          .replace('{revision}', revision || 'Unknown')
          .replace('{status}', status || 'Unknown');
        errorMessage = interpolatedMessage;
      } else if (error?.response?.data?.detail) {
        // Если detail - это строка, используем её
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setFileError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setNewRevisionFiles([]);
    setChangeDescription('');
    setFileError('');
    setUploading(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus
      disableRestoreFocus
    >
      <DialogTitle>{t('revision.dialog_title')}</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('revision.change_description')}
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder={t('revision.change_description_placeholder')}
          />
          
          <Box>
            <input
              type="file"
              id="revision-file"
              name="revision-file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dwt"
              multiple
            />
            <label htmlFor="revision-file">
              <Button variant="outlined" component="span" fullWidth>
                {newRevisionFiles.length > 0
                  ? `${t('revision.select_file')}: ${newRevisionFiles.length}`
                  : t('revision.select_file')}
              </Button>
            </label>
          </Box>

          {fileError && (
            <Alert severity="error">{fileError}</Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={newRevisionFiles.length === 0 || uploading}
        >
          {uploading ? <CircularProgress size={20} /> : t('revision.upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentRevisionDialog;
