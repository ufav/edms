import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  Tabs,
  Tab,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { transmittalImportSettingsApi, referencesApi, type TransmittalImportSettings as TransmittalImportSettingsType, type WorkflowStatus } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';

interface TransmittalImportSettingsProps {
  onClose: () => void;
}

export interface TransmittalImportSettingsHandle {
  save: () => Promise<void>;
}

export const TransmittalImportSettings = forwardRef<TransmittalImportSettingsHandle, TransmittalImportSettingsProps>((_props, ref) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TransmittalImportSettingsType[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([]);
  const [workflowStatusesLoading, setWorkflowStatusesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  // no local saving state; handled by parent if needed
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'warning' | 'success' | 'info'>('warning');

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
      // Обнуляем активную вкладку при загрузке/смене проекта
      setActiveIndex(0);
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

  // Функция для проверки дублирования incoming_status
  const checkDuplicateIncomingStatus = (companyId: number, currentIndex: number, value: string): boolean => {
    const setting = settings.find(s => s.company_id === companyId);
    if (!setting || !setting.settings_value.status_mapping) return false;
    
    return setting.settings_value.status_mapping.some((mapping: any, index: number) => 
      index !== currentIndex && 
      mapping.incoming_status && 
      mapping.incoming_status.trim().toLowerCase() === value.trim().toLowerCase()
    );
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
    
    setError(null);
    
    try {
      // Валидация настроек перед сохранением
      for (const setting of settings) {
        const companyPrefix = setting.company_name ? `${setting.company_name}: ` : '';
        const sheetName = (setting.settings_value as any)?.sheet_name?.trim?.() || '';
        const metaLabel = (setting.settings_value as any)?.metadata_fields?.transmittal_number?.label?.trim?.() || '';
        const tableTransmittal = (setting.settings_value as any)?.table_fields?.transmittal_number_label?.trim?.() || '';
        const docLabel = (setting.settings_value as any)?.table_fields?.document_number_label?.trim?.() || '';
        const statusLabel = (setting.settings_value as any)?.table_fields?.status_label?.trim?.() || '';
        const statusMapping = (setting.settings_value as any)?.status_mapping || [];

        // 1) Имя листа обязательно
        if (!sheetName) {
          setSnackbarMessage(`${companyPrefix}${t('transmittals.import_missing_sheet_name') || 'Не указано имя листа'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // 2) Источник номера трансмиттала: либо метаданные, либо таблица
        if (!metaLabel && !tableTransmittal) {
          setSnackbarMessage(`${companyPrefix}${t('transmittals.import_no_source_configured') || 'Укажите источник номера трансмиттала (метаданные или таблица)'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
        if (metaLabel && tableTransmittal) {
          setSnackbarMessage(`${companyPrefix}${t('transmittals.import_both_sources_configured') || 'Оставьте только один источник номера трансмиттала'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // 3) Поля таблицы: номер документа и статус обязательны
        if (!docLabel) {
          setSnackbarMessage(`${companyPrefix}Заполните поле: ${t('transmittals.import_settings.document_number_label')}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
        if (!statusLabel) {
          setSnackbarMessage(`${companyPrefix}Заполните поле: ${t('transmittals.import_settings.status_label')}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // 4) Наличие маппинга статусов (минимум одна строка)
        if (!Array.isArray(statusMapping) || statusMapping.length === 0) {
          setSnackbarMessage(`${companyPrefix}${t('transmittals.import_settings.status_mapping_title')} — ${t('common.fill') || 'заполните'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // 5) Проверяем, что все маппинги статусов заполнены
        for (const mapping of statusMapping) {
          if (!mapping.incoming_status?.trim() || !mapping.system_status_id) {
            setSnackbarMessage(`${companyPrefix}Не все маппинги статусов заполнены`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
          }
        }

        // 6) Проверяем дублирование incoming_status
        const incomingStatuses = statusMapping.map((m: any) => m.incoming_status?.trim().toLowerCase()).filter(Boolean);
        const uniqueStatuses = new Set(incomingStatuses);
        if (incomingStatuses.length !== uniqueStatuses.size) {
          setSnackbarMessage(`${companyPrefix}Найдены дублирующиеся статусы в маппинге. Каждый статус должен быть уникальным.`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }

      // Сохраняем настройки для каждой компании
      for (const setting of settings) {
        await transmittalImportSettingsApi.createOrUpdate({
          project_id: projectStore.selectedProject.id,
          company_id: setting.company_id,
          settings_key: 'field_mapping',
          settings_value: setting.settings_value,
        });
      }
      
      setSnackbarMessage(t('transmittals.import_settings.save_success'));
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setError(t('transmittals.import_settings.save_error'));
      console.error('Ошибка сохранения настроек импорта:', err);
    } finally {
      
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

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

  return (<>
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('transmittals.import_settings.description')}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}


      {settings.length === 0 ? (
        <Alert severity="info">
          {t('transmittals.import_settings.no_participants')}
        </Alert>
      ) : (
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Мини-вкладки компаний */}
          <Tabs
            value={Math.min(activeIndex, Math.max(settings.length - 1, 0))}
            onChange={(_, v) => setActiveIndex(v)}
            variant="scrollable"
            scrollButtons={false}
            allowScrollButtonsMobile={false}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 32, height: 32 }}
            aria-label="companies-tabs"
          >
            {settings.map((s) => (
              <Tab
                key={s.company_id}
                label={s.company_name}
                sx={{
                  minHeight: 32,
                  height: 32,
                  px: 1.5,
                  py: 0.25,
                  fontSize: 12,
                  textTransform: 'none',
                  minWidth: 'auto',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  background: 'transparent',
                  '&:before': { display: 'none' },
                  '&:after': { display: 'none' },
                  '&.Mui-selected': {
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    background: 'transparent',
                  },
                  '&.Mui-focusVisible': {
                    outline: 'none',
                  },
                  '&:focus': {
                    outline: 'none',
                  }
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', pt: 2 }}>
            {settings.length > 0 && (
              <React.Fragment key={settings[activeIndex]?.company_id}>
                {(() => { const setting = settings[Math.min(activeIndex, Math.max(settings.length - 1, 0))]; return (
              <Card elevation={0} sx={{ mb: 2, border: 'none', boxShadow: 'none' }}>
                <CardContent sx={{ pt: 3 }}>
                <Grid container spacing={2} columns={{ xs: 12, sm: 24 }}>
                  {/* Название листа */}
                  <Grid item xs={12} sm={8}>
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
                  <Grid container spacing={2} columns={{ xs: 12, sm: 24 }}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label={t('transmittals.import_settings.transmittal_number_label')}
                        value={setting.settings_value.metadata_fields?.transmittal_number?.label || ""}
                        onChange={(e) => handleMetadataFieldChange(setting.company_id, 'transmittal_number', 'label', e.target.value)}
                        variant="standard"
                        placeholder={t('transmittals.import_settings.transmittal_placeholder')}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
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
                              label={t('transmittals.import_settings.incoming_status')}
                              value={mapping.incoming_status || ''}
                              onChange={(e) => handleStatusMappingChange(setting.company_id, index, 'incoming_status', e.target.value)}
                              placeholder="Code 1, Code 2, etc."
                              variant="standard"
                              error={mapping.incoming_status && checkDuplicateIncomingStatus(setting.company_id, index, mapping.incoming_status)}
                              helperText={
                                mapping.incoming_status && checkDuplicateIncomingStatus(setting.company_id, index, mapping.incoming_status)
                                  ? 'Этот статус уже используется в другом маппинге'
                                  : ''
                              }
                            />
                          </Grid>
                          <Grid item xs={5}>
                            <FormControl fullWidth variant="standard">
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
                              color="default"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                  </List>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => handleAddStatusMapping(setting.company_id)}
                      sx={{ mt: 1 }}
                      disabled={workflowStatusesLoading || workflowStatuses.length === 0}
                    >
                      {t('common.add') || t('transmittals.import_settings.add') || 'Добавить'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            ); })()}
              </React.Fragment>
            )}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />
    </Box>
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={7000}
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
        {snackbarMessage}
      </Alert>
    </Snackbar>
  </>);
});
