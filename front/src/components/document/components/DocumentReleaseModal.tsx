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

interface DocumentReleaseModalProps {
  open: boolean;
  onClose: () => void;
  onRelease: (comment: string) => void;
  loading?: boolean;
}

const DocumentReleaseModal: React.FC<DocumentReleaseModalProps> = ({
  open,
  onClose,
  onRelease,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');

  const handleRelease = () => {
    if (comment.trim()) {
      onRelease(comment.trim());
    }
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const isReleaseDisabled = !comment.trim() || loading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('document.release_revision')}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Поле для комментария */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('document.release_comment_label')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('document.release_comment_placeholder')}
            variant="standard"
            required
          />

          {/* Информация */}
          <Alert severity="info">
            <Typography variant="body2">
              {t('document.release_info')}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleRelease}
          variant="contained"
          disabled={isReleaseDisabled}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('document.releasing') : t('document.release')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentReleaseModal;