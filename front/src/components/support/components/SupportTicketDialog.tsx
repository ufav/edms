import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supportApi } from '../../../api/client';
import NotificationSnackbar from '../../../components/NotificationSnackbar';

interface SupportTicketDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

const SupportTicketDialog: React.FC<SupportTicketDialogProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: FilePreview[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Проверка типа файла (только изображения)
      if (!file.type.startsWith('image/')) {
        setError(t('support.invalid_file_type') || 'Можно загружать только изображения');
        continue;
      }
      
      // Проверка размера (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(t('support.file_too_large') || 'Файл слишком большой (максимум 5MB)');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newFiles.push({
          file,
          preview,
          id: `${Date.now()}-${i}`,
        });
        if (newFiles.length === selectedFiles.length) {
          setFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError(t('support.fill_all_fields') || 'Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('message', message);
      
      files.forEach((filePreview) => {
        formData.append('files', filePreview.file);
      });

      await supportApi.createTicket(formData);

      // Очистка формы
      setSubject('');
      setMessage('');
      setFiles([]);
      onSuccess();
    } catch (err: any) {
      let errorMessage = t('support.create_error');
      
      // Обрабатываем ошибки от API
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Локализация ошибок хранилища
        if (detail.includes('Хранилище файлов недоступно') || detail.includes('File storage is unavailable')) {
          errorMessage = t('support.errors.storage_unavailable');
        } else if (detail.includes('слишком большой') || detail.includes('too large')) {
          const filename = detail.match(/Файл (.+?) слишком/)?.[1] || detail.match(/File (.+?) is/)?.[1] || '';
          errorMessage = t('support.errors.file_too_large', { filename });
        } else if (detail.includes('должен быть изображением') || detail.includes('must be an image')) {
          const filename = detail.match(/Файл (.+?) должен/)?.[1] || detail.match(/File (.+?) must/)?.[1] || '';
          errorMessage = t('support.errors.invalid_file_type', { filename });
        } else {
          // Используем оригинальное сообщение, если нет специальной локализации
          errorMessage = detail;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSubject('');
      setMessage('');
      setFiles([]);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{t('support.create_ticket') || 'Создать обращение'}</Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label={t('support.subject') || 'Тема'}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          margin="normal"
          variant="standard"
          required
          disabled={loading}
        />

        <TextField
          fullWidth
          label={t('support.message') || 'Сообщение'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          margin="normal"
          variant="standard"
          multiline
          rows={6}
          required
          disabled={loading}
        />

        <Box sx={{ mt: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="support-file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={loading}
          />
          <label htmlFor="support-file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {t('support.attach_files') || 'Прикрепить файлы'}
            </Button>
          </label>

          {files.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              {files.map((filePreview) => (
                <Box
                  key={filePreview.id}
                  sx={{
                    position: 'relative',
                    width: 150,
                    height: 150,
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={filePreview.preview}
                    alt={filePreview.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(filePreview.id)}
                    disabled={loading}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      p: 0.5,
                      fontSize: '0.7rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {filePreview.file.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !subject.trim() || !message.trim()}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? (t('common.sending') || t('support.sending') || 'Отправка...') : (t('support.send') || 'Отправить')}
        </Button>
      </DialogActions>

      <NotificationSnackbar
        open={successNotification.open}
        message={successNotification.message}
        severity="success"
        onClose={() => setSuccessNotification({ open: false, message: '' })}
      />
    </Dialog>
  );
};

export default SupportTicketDialog;

