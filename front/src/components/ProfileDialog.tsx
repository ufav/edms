import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { usersApi, authApi } from '../api/client';
import { userStore } from '../stores/UserStore';

function normalizeEmail(e: string): string {
  return (e || '').trim().toLowerCase();
}

function splitFullName(fullName: string): { first: string; last: string } {
  const t = (fullName || '').trim();
  if (!t) return { first: '', last: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function joinFullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim();
}

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = observer(({ open, onClose }) => {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [passwordForEmail, setPasswordForEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    const u = userStore.currentUser;
    if (u) {
      const { first, last } = splitFullName(u.full_name || '');
      setFirstName(first);
      setLastName(last);
      setEmail(u.email || '');
    }
    setPasswordForEmail('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [open]);

  const emailChanging = Boolean(
    userStore.currentUser &&
    normalizeEmail(email) !== normalizeEmail(userStore.currentUser.email || ''),
  );

  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(null);
    const em = email.trim();
    if (!em) {
      setError(t('users.validation.email_required'));
      return;
    }
    const full_name = joinFullName(firstName, lastName);
    if (!full_name) {
      setError(t('profile.validation.name_required'));
      return;
    }
    if (emailChanging && !passwordForEmail) {
      setError(t('profile.validation.password_required_for_email'));
      return;
    }
    try {
      setProfileLoading(true);
      await authApi.patchProfile({
        full_name,
        email: em,
        ...(emailChanging ? { current_password: passwordForEmail } : {}),
      });
      await userStore.refreshCurrentUser();
      setPasswordForEmail('');
      setSuccess(t('profile.saved'));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((x: any) => x.msg || '').join('; ') : (detail || t('profile.save_error')));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError(t('users.validation.password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('users.validation.passwords_not_match'));
      return;
    }
    try {
      setLoading(true);
      const res = await usersApi.changePassword(oldPassword, newPassword);
      setSuccess(res.message || t('profile.password_changed'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(detail || t('profile.password_change_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordForEmail('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('menu.profile')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('profile.section_data')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('profile.first_name')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={profileLoading}
            fullWidth
            autoComplete="given-name"
          />
          <TextField
            label={t('profile.last_name')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={profileLoading}
            fullWidth
            autoComplete="family-name"
          />
          <TextField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={profileLoading}
            fullWidth
            autoComplete="email"
            helperText={t('profile.email_login_hint')}
          />
          {emailChanging ? (
            <TextField
              label={t('profile.password_for_email_change')}
              type="password"
              value={passwordForEmail}
              onChange={(e) => setPasswordForEmail(e.target.value)}
              disabled={profileLoading}
              fullWidth
              autoComplete="current-password"
            />
          ) : null}
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={profileLoading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {profileLoading ? t('profile.saving') : t('profile.save')}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('profile.section_password')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('profile.old_password')}
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            disabled={loading}
            fullWidth
            autoComplete="current-password"
          />
          <TextField
            label={t('auth.password')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            fullWidth
            autoComplete="new-password"
          />
          <TextField
            label={t('users.confirm_password')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            fullWidth
            autoComplete="new-password"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>{t('common.close')}</Button>
        <Button
          onClick={handleSave}
          variant="outlined"
          disabled={loading || !oldPassword || !newPassword || !confirmPassword}
        >
          {t('profile.change_password_action')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default ProfileDialog;
