import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Box, Typography } from '@mui/material';
import { usersApi } from '../api/client';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  username?: string;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ open, onClose, username }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError('Минимальная длина нового пароля — 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Подтверждение пароля не совпадает');
      return;
    }
    try {
      setLoading(true);
      const res = await usersApi.changePassword(oldPassword, newPassword);
      setSuccess(res.message || 'Пароль успешно изменен');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Профиль</DialogTitle>
      <DialogContent>
        {username && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Пользователь: <b>{username}</b>
          </Typography>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Старый пароль"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            disabled={loading}
            fullWidth
          />
          <TextField
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            fullWidth
          />
          <TextField
            label="Подтвердите пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Закрыть</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || !oldPassword || !newPassword || !confirmPassword}>
          Сменить пароль
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
