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
  IconButton,
  List,
  ListItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { transmittalImportSettingsApi, referencesApi, type TransmittalImportSettings as TransmittalImportSettingsType, type WorkflowStatus } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';

interface TransmittalImportSettingsProps {
  onClose: () => void;
}

export const TransmittalImportSettings: React.FC<TransmittalImportSettingsProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TransmittalImportSettingsType[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([]);
  const [workflowStatusesLoading, setWorkflowStatusesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загружаем настройки при монтировании
  useEffect(() => {
    if (projectStore.selectedProject) {
      loadSettings();
      loadWorkflowStatuses();
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
          },
          status_mapping: setting.settings_value.status_mapping || []
        }
      }));
      
      setSettings(initializedData);
    } catch (err) {
      setError(t('transmittals.import_settings.loading_error'));
      console.error('Ошибка загрузки настроек импорта:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowStatuses = async () => {
    setWorkflowStatusesLoading(true);
    try {
      const data = await referencesApi.getWorkflowStatuses();
      setWorkflowStatuses(data);
    } catch (err) {
      console.error('Ошибка загрузки workflow статусов:', err);
    } finally {
      setWorkflowStatusesLoading(false);
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

  const handleStatusMappingChange = (companyId: number, index: number, field: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              status_mapping: (setting.settings_value.status_mapping || []).map((mapping: any, i: number) => 
                i === index ? { ...mapping, [field]: value } : mapping
              )
            }
          }
        : setting
    ));
  };

  const handleAddStatusMapping = (companyId: number) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              status_mapping: [...(setting.settings_value.status_mapping || []), { incoming_status: '', system_status_id: '' }]
            }
          }
        : setting
    ));
  };

  const handleRemoveStatusMapping = (companyId: number, index: number) => {
    setSettings(prev => prev.map(setting => 
      setting.company_id === companyId 
        ? { 
            ...setting, 
            settings_value: {
              ...setting.settings_value,
              status_mapping: (setting.settings_value.status_mapping || []).filter((_: any, i: number) => i !== index)
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
      
      setSuccess(t('transmittals.import_settings.save_success'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('transmittals.import_settings.save_error'));
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
          {t('transmittals.import_settings.select_project')}
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
            <React.Fragment key={setting.company_id}>
              <Card sx={{ 
                mb: 3, 
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: '#1976d2',
                        flexShrink: 0
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {setting.company_name}
                      </Typography>
                    </Box>
                  }
                  sx={{ 
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                    '& .MuiCardHeader-title': {
                      color: '#1976d2'
                    }
                  }}
                />
                <CardContent sx={{ pt: 3 }}>
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
                    {t('transmittals.import_settings.metadata_title')} <Typography component="span" variant="caption" color="text.secondary">{t('transmittals.import_settings.optional')}</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {t('transmittals.import_settings.metadata_hint')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.transmittal_number_label')}
                        value={setting.settings_value.metadata_fields?.transmittal_number?.label || ""}
                        onChange={(e) => handleMetadataFieldChange(setting.company_id, 'transmittal_number', 'label', e.target.value)}
                        variant="standard"
                        placeholder={t('transmittals.import_settings.transmittal_placeholder')}
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
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.transmittal_number_label')}
                        value={setting.settings_value.table_fields?.transmittal_number_label || ""}
                        onChange={(e) => handleTableFieldChange(setting.company_id, 'transmittal_number_label', e.target.value)}
                        variant="standard"
                        placeholder={t('transmittals.import_settings.table_transmittal_placeholder')}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.document_number_label')}
                        value={setting.settings_value.table_fields?.document_number_label || ""}
                        onChange={(e) => handleTableFieldChange(setting.company_id, 'document_number_label', e.target.value)}
                        variant="standard"
                        placeholder={t('transmittals.import_settings.document_placeholder')}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.status_label')}
                        value={setting.settings_value.table_fields?.status_label || ""}
                        onChange={(e) => handleTableFieldChange(setting.company_id, 'status_label', e.target.value)}
                        variant="standard"
                        placeholder={t('transmittals.import_settings.status_placeholder')}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Сопоставление статусов */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    {t('transmittals.import_settings.status_mapping_title')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {t('transmittals.import_settings.status_mapping_description')}
                  </Typography>
                  
                  {workflowStatusesLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="caption">Загрузка статусов...</Typography>
                    </Box>
                  )}
                  
                  <List>
                    {(setting.settings_value.status_mapping || []).map((mapping: any, index: number) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={5}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('transmittals.import_settings.incoming_status')}
                              value={mapping.incoming_status || ''}
                              onChange={(e) => handleStatusMappingChange(setting.company_id, index, 'incoming_status', e.target.value)}
                              placeholder="Code 1, Code 2, etc."
                            />
                          </Grid>
                          <Grid item xs={5}>
                            <FormControl fullWidth size="small">
                              <InputLabel>{t('transmittals.import_settings.system_status')}</InputLabel>
                              <Select
                                value={workflowStatuses.length > 0 ? (mapping.system_status_id || '') : ''}
                                onChange={(e) => handleStatusMappingChange(setting.company_id, index, 'system_status_id', e.target.value)}
                                label={t('transmittals.import_settings.system_status')}
                                disabled={workflowStatusesLoading || workflowStatuses.length === 0}
                              >
                                {workflowStatusesLoading ? (
                                  <MenuItem disabled>
                                    <CircularProgress size={20} />
                                    Загрузка статусов...
                                  </MenuItem>
                                ) : (
                                  workflowStatuses.map((status) => (
                                    <MenuItem key={status.id} value={status.id}>
                                      {status.name}
                                    </MenuItem>
                                  ))
                                )}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={2}>
                            <IconButton
                              onClick={() => handleRemoveStatusMapping(setting.company_id, index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                  </List>
                  
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => handleAddStatusMapping(setting.company_id)}
                    size="small"
                    sx={{ mt: 1 }}
                    disabled={workflowStatusesLoading || workflowStatuses.length === 0}
                  >
                    {t('transmittals.import_settings.add_status_mapping')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            {/* Разделитель между компаниями (кроме последней) */}
            {index < settings.length - 1 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                my: 2,
                '&::before, &::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#e0e0e0'
                }
              }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mx: 2, 
                    color: 'text.secondary',
                    backgroundColor: 'background.paper',
                    px: 1
                  }}
                >
                  {t('transmittals.import_settings.company_separator')}
                </Typography>
              </Box>
            )}
          </React.Fragment>
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
