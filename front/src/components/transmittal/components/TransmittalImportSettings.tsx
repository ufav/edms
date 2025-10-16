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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
      
      // Инициализируем настройки с новой структурой, если их нет
      const initializedData = data.map(setting => ({
        ...setting,
        settings_value: {
          sheet_name: setting.settings_value.sheet_name || "",
          metadata_fields: setting.settings_value.metadata_fields || {
            transmittal_number: {
              type: "label_search",
              label: "",
              position: "right"
            }
          },
          table_fields: setting.settings_value.table_fields || {
            document_number_label: "",
            status_label: ""
          }
        }
      }));
      
      setSettings(initializedData);
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
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              [field]: value
            }
          }
        : setting
    ));
  };

  const handleMetadataFieldChange = (companyId: number, fieldKey: string, subField: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              metadata_fields: {
                ...setting.settings_value.metadata_fields,
                [fieldKey]: {
                  ...setting.settings_value.metadata_fields[fieldKey],
                  [subField]: value
                }
              }
            }
          }
        : setting
    ));
  };

  const handleTableFieldChange = (companyId: number, fieldKey: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              table_fields: {
                ...setting.settings_value.table_fields,
                [fieldKey]: value
              }
            }
          }
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
          settings_key: 'field_mapping',
          settings_value: setting.settings_value,
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        {t('transmittals.import_settings.title')}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('transmittals.import_settings.description')}
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
          {t('transmittals.import_settings.no_participants')}
        </Alert>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {settings.map((setting, index) => (
            <Card key={setting.company_id} sx={{ mb: 2 }}>
              <CardHeader
                title={setting.company_name}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  {/* Название листа */}
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label={t('transmittals.import_settings.sheet_name')}
                      value={setting.settings_value.sheet_name}
                      onChange={(e) => handleFieldChange(setting.company_id, 'sheet_name', e.target.value)}
                      variant="standard"
                    />
                  </Grid>
                </Grid>

                {/* Лейбл номера трансмиттала */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    {t('transmittals.import_settings.metadata_title')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.transmittal_number_label')}
                        value={setting.settings_value.metadata_fields?.transmittal_number?.label || ""}
                        onChange={(e) => handleMetadataFieldChange(setting.company_id, 'transmittal_number', 'label', e.target.value)}
                        variant="standard"
                        placeholder="Load Sheet Document ID*"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="standard">
                        <InputLabel>{t('transmittals.import_settings.position')}</InputLabel>
                        <Select
                          value={setting.settings_value.metadata_fields?.transmittal_number?.position || "right"}
                          onChange={(e) => handleMetadataFieldChange(setting.company_id, 'transmittal_number', 'position', e.target.value)}
                          label={t('transmittals.import_settings.position')}
                        >
                          <MenuItem value="right">{t('transmittals.import_settings.position.right')}</MenuItem>
                          <MenuItem value="left">{t('transmittals.import_settings.position.left')}</MenuItem>
                          <MenuItem value="below">{t('transmittals.import_settings.position.below')}</MenuItem>
                          <MenuItem value="above">{t('transmittals.import_settings.position.above')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                {/* Настраиваемые поля таблицы */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    {t('transmittals.import_settings.table_fields_title')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.document_number_label')}
                        value={setting.settings_value.table_fields?.document_number_label || ""}
                        onChange={(e) => handleTableFieldChange(setting.company_id, 'document_number_label', e.target.value)}
                        variant="standard"
                        placeholder="Document ID*"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.status_label')}
                        value={setting.settings_value.table_fields?.status_label || ""}
                        onChange={(e) => handleTableFieldChange(setting.company_id, 'status_label', e.target.value)}
                        variant="standard"
                        placeholder="PO Number"
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 'auto' }}>
        <Button onClick={onClose} disabled={saving}>
          {t('common.close')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || settings.length === 0}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? t('transmittals.import_settings.saving') : t('transmittals.import_settings.save')}
        </Button>
      </Box>
    </Box>
  );
};
