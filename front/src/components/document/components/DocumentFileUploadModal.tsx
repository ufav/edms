import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DocumentFileUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, comment: string) => void;
  loading?: boolean;
}

const DocumentFileUploadModal: React.FC<DocumentFileUploadModalProps> = ({
  open,
  onClose,
  onUpload,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile && comment.trim()) {
      onUpload(selectedFile, comment.trim());
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setComment('');
    onClose();
  };

  const isUploadDisabled = !selectedFile || !comment.trim() || loading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('document.upload_file_with_comment')}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Поле для комментария */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('document.upload_comment_label')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('document.upload_comment_placeholder')}
            variant="standard"
          />

          {/* Выбор файла */}
          <Box>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="document-file-input"
            />
            <label htmlFor="document-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                sx={{ justifyContent: 'center' }}
                disabled={loading}
              >
                {selectedFile ? selectedFile.name : t('document.upload_file_select')}
              </Button>
            </label>
          </Box>

          {/* Информация */}
          <Alert severity="info">
            <Typography variant="body2">
              {t('document.upload_info')}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={isUploadDisabled}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('document.uploading') : t('document.upload_button')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentFileUploadModal;
