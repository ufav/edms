import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  content,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  loading = false,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || t('common.confirm')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{content || t('common.confirm_action')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelText || t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {confirmText || t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;

