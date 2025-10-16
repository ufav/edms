import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { transmittalImportSettingsApi, type TransmittalImportSettings } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';

interface TransmittalImportSettingsProps {
  onClose: () => void;
}

export const TransmittalImportSettings: React.FC<TransmittalImportSettingsProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TransmittalImportSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загружаем настройки при монтировании
  useEffect(() => {
    if (projectStore.selectedProject) {
      loadSettings();
    }
  }, [projectStore.selectedProject]);

  const loadSettings = async () => {
    if (!projectStore.selectedProject) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await transmittalImportSettingsApi.getByProject(projectStore.selectedProject.id);
      setSettings(data);
    } catch (err) {
      setError('Ошибка загрузки настроек импорта');
      console.error('Ошибка загрузки настроек импорта:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (companyId: number, field: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { ...setting, [field]: value }
        : setting
    ));
  };

  const handleSave = async () => {
    if (!projectStore.selectedProject) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Сохраняем настройки для каждой компании
      for (const setting of settings) {
        await transmittalImportSettingsApi.createOrUpdate({
          project_id: projectStore.selectedProject.id,
          company_id: setting.company_id,
          transmittal_number_label: setting.transmittal_number_label,
          document_number_label: setting.document_number_label,
          status_label: setting.status_label,
        });
      }
      
      setSuccess('Настройки импорта сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Ошибка сохранения настроек импорта');
      console.error('Ошибка сохранения настроек импорта:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!projectStore.selectedProject) {
    return (
        <Alert severity="warning">
          Выберите проект для настройки импорта трансмитталов
        </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Настройки импорта трансмитталов
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Настройте сопоставление полей из Excel файлов от сторонних компаний с полями в системе.
        Эти настройки будут использоваться при импорте трансмитталов от конкретной компании.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {settings.length === 0 ? (
        <Alert severity="info">
          В проекте нет участников для настройки импорта
        </Alert>
      ) : (
        <Box>
          {settings.map((setting, index) => (
            <Card key={setting.company_id} sx={{ mb: 2 }}>
              <CardHeader
                title={setting.company_name}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Номер трансмиттала"
                      value={setting.transmittal_number_label}
                      onChange={(e) => handleFieldChange(setting.company_id, 'transmittal_number_label', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Номер документа"
                      value={setting.document_number_label}
                      onChange={(e) => handleFieldChange(setting.company_id, 'document_number_label', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Статус"
                      value={setting.status_label}
                      onChange={(e) => handleFieldChange(setting.company_id, 'status_label', e.target.value)}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose} disabled={saving}>
          Закрыть
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || settings.length === 0}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </Box>
    </Box>
  );
};
