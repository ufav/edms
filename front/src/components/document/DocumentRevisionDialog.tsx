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
import { documentsApi } from '../../api/client';

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
  const [newRevisionFile, setNewRevisionFile] = useState<File | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  const [fileError, setFileError] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewRevisionFile(file);
      setFileError('');
    }
  };

  const handleSubmit = async () => {
    if (!newRevisionFile || !documentId) {
      setFileError(t('revision.select_file_error'));
      return;
    }

    setUploading(true);
    setFileError('');

    try {
      const formData = new FormData();
      formData.append('file', newRevisionFile);
      formData.append('change_description', changeDescription);

      await documentsApi.uploadRevision(documentId, formData);
      onSuccess();
      handleClose();
    } catch (error: any) {
      setFileError(error.response?.data?.detail || t('revision.upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setNewRevisionFile(null);
    setChangeDescription('');
    setFileError('');
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
            />
            <label htmlFor="revision-file">
              <Button variant="outlined" component="span" fullWidth>
                {newRevisionFile ? newRevisionFile.name : t('revision.select_file')}
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
          disabled={!newRevisionFile || uploading}
        >
          {uploading ? <CircularProgress size={20} /> : t('revision.upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentRevisionDialog;
