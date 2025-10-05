import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface SystemSettings {
  site_name: string;
  site_description: string;
  max_file_size: number;
  allowed_file_types: string[];
  email_notifications: boolean;
  auto_backup: boolean;
  session_timeout: number;
  password_min_length: number;
  require_password_change: boolean;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'EDMS',
    site_description: 'Система управления документами',
    max_file_size: 10485760, // 10MB
    allowed_file_types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
    email_notifications: true,
    auto_backup: false,
    session_timeout: 3600, // 1 час
    password_min_length: 8,
    require_password_change: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [fileTypeDialogOpen, setFileTypeDialogOpen] = useState(false);
  const [newFileType, setNewFileType] = useState('');

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Здесь будет API вызов для сохранения настроек
      // await settingsApi.update(settings);
      
      // Имитация сохранения
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Настройки успешно сохранены');
    } catch (err) {
      setError('Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFileType = () => {
    if (newFileType && !settings.allowed_file_types.includes(newFileType.toLowerCase())) {
      setSettings({
        ...settings,
        allowed_file_types: [...settings.allowed_file_types, newFileType.toLowerCase()]
      });
      setNewFileType('');
      setFileTypeDialogOpen(false);
    }
  };

  const handleRemoveFileType = (fileType: string) => {
    setSettings({
      ...settings,
      allowed_file_types: settings.allowed_file_types.filter(type => type !== fileType)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Настройки системы</Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Сохранить'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Основные настройки */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Основные настройки" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Название сайта"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Описание сайта"
                  value={settings.site_description}
                  onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Максимальный размер файла (байты)"
                  type="number"
                  value={settings.max_file_size}
                  onChange={(e) => setSettings({ ...settings, max_file_size: Number(e.target.value) })}
                  fullWidth
                  helperText={`Текущий размер: ${formatFileSize(settings.max_file_size)}`}
                />
                <TextField
                  label="Таймаут сессии (секунды)"
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({ ...settings, session_timeout: Number(e.target.value) })}
                  fullWidth
                  helperText={`Текущий таймаут: ${Math.floor(settings.session_timeout / 60)} минут`}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Настройки безопасности */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Настройки безопасности" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Минимальная длина пароля"
                  type="number"
                  value={settings.password_min_length}
                  onChange={(e) => setSettings({ ...settings, password_min_length: Number(e.target.value) })}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.require_password_change}
                      onChange={(e) => setSettings({ ...settings, require_password_change: e.target.checked })}
                    />
                  }
                  label="Требовать смену пароля при первом входе"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_notifications}
                      onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                    />
                  }
                  label="Email уведомления"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.auto_backup}
                      onChange={(e) => setSettings({ ...settings, auto_backup: e.target.checked })}
                    />
                  }
                  label="Автоматическое резервное копирование"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Поддерживаемые типы файлов */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Поддерживаемые типы файлов"
              action={
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setFileTypeDialogOpen(true)}
                >
                  Добавить тип
                </Button>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {settings.allowed_file_types.map((fileType) => (
                  <Chip
                    key={fileType}
                    label={fileType}
                    onDelete={() => handleRemoveFileType(fileType)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Системная информация */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Системная информация" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Версия системы
                  </Typography>
                  <Typography variant="h6">
                    1.0.0
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Дата установки
                  </Typography>
                  <Typography variant="h6">
                    {new Date().toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Статус системы
                  </Typography>
                  <Chip label="Активна" color="success" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Последнее обновление
                  </Typography>
                  <Typography variant="h6">
                    {new Date().toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог добавления типа файла */}
      <Dialog open={fileTypeDialogOpen} onClose={() => setFileTypeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить тип файла</DialogTitle>
        <DialogContent>
          <TextField
            label="Расширение файла"
            value={newFileType}
            onChange={(e) => setNewFileType(e.target.value)}
            fullWidth
            placeholder="например: pdf, docx, jpg"
            sx={{ mt: 1 }}
            helperText="Введите расширение файла без точки"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileTypeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddFileType} variant="contained">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSettings;
