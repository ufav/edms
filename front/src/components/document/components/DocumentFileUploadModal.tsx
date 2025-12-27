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
  onUploadMultiple?: (files: File[], comment: string) => void;
  loading?: boolean;
}

const DocumentFileUploadModal: React.FC<DocumentFileUploadModalProps> = ({
  open,
  onClose,
  onUpload,
  onUploadMultiple,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setSelectedFiles(files);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0 && comment.trim() && onUploadMultiple) {
      onUploadMultiple(selectedFiles, comment.trim());
      return;
    }
    if (selectedFile && comment.trim()) {
      onUpload(selectedFile, comment.trim());
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
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
              multiple
            />
            <label htmlFor="document-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                sx={{ justifyContent: 'center' }}
                disabled={loading}
              >
                {selectedFiles.length > 0 ? selectedFiles.map(f => f.name).join(', ') : t('document.upload_file_select')}
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
