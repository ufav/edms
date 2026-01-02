import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Autocomplete,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../api/client';
import { projectDialogStore } from '../../stores/ProjectDialogStore';

interface MainTabProps {
  formData: {
    name: string;
    project_code: string;
    description: string;
    status: string;
    start_date: Date | null;
    end_date: Date | null;
    budget: string;
  };
  setFormData: (data: any) => void;
  codeValidation: {
    isChecking: boolean;
    exists: boolean;
    message: string;
    owner?: string;
    project_name?: string;
    is_deleted?: boolean;
  };
  setCodeValidation: (validation: {
    isChecking: boolean;
    exists: boolean;
    message: string;
    owner?: string;
    project_name?: string;
    is_deleted?: boolean;
  }) => void;
  // Новые пропы для режима просмотра
  mode?: 'create' | 'edit';
  selectedAreaIds?: number[];
  onAreaIdsChange?: (areaIds: number[]) => void;
}

const MainTab: React.FC<MainTabProps> = ({ 
  formData, 
  setFormData, 
  codeValidation, 
  setCodeValidation,
  mode = 'create',
  selectedAreaIds = [],
  onAreaIdsChange
}) => {
  const { t, i18n } = useTranslation();
  const [isMobile] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем валидацию кода только если поле полностью очищено
    if (field === 'project_code' && (!value || value.trim() === '')) {
      setCodeValidation({
        isChecking: false,
        exists: false,
        message: '',
        is_deleted: false
      });
    }
  };

  const checkProjectCode = async (code: string) => {
    if (!code || code.trim().length < 3) {
      setCodeValidation({
        isChecking: false,
        exists: false,
        message: '',
        is_deleted: false
      });
      return;
    }

    setCodeValidation({ ...codeValidation, isChecking: true });

    try {
      const result = await projectsApi.checkCode(code.trim());
      setCodeValidation({
        isChecking: false,
        exists: result.exists,
        message: result.exists ? result.message : '', // Показываем сообщение только если код существует
        owner: result.owner,
        project_name: result.project_name,
        is_deleted: result.is_deleted || false
      });
    } catch (error) {
      console.error('Error checking project code:', error);
      setCodeValidation({
        isChecking: false,
        exists: false,
        message: '',
        is_deleted: false
      });
    }
  };

  // Валидация кода проекта только при потере фокуса
  const handleProjectCodeBlur = () => {
    if (formData.project_code && formData.project_code.trim().length >= 3) {
      checkProjectCode(formData.project_code);
    } else {
      setCodeValidation({ isChecking: false, exists: false, message: '', is_deleted: false });
    }
  };

  // Получаем выбранные areas для отображения
  const selectedAreas = projectDialogStore.areas.filter(area => selectedAreaIds.includes(area.id));

  const handleAreasChange = (_: any, newValue: Array<{ id: number; code: string; name: string }>) => {
    if (onAreaIdsChange) {
      onAreaIdsChange(newValue.map(area => area.id));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3, mt: 1 }}>
      <Grid container spacing={isMobile ? 1 : 2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label={t('createProject.fields.name')}
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            variant="standard"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label={t('createProject.fields.project_code')}
            value={formData.project_code || ''}
            onChange={(e) => handleInputChange('project_code', e.target.value)}
            onBlur={handleProjectCodeBlur}
            placeholder="PRJ-001"
            error={codeValidation.exists}
            helperText=""
            variant="standard"
            InputProps={{
              endAdornment: codeValidation.isChecking ? (
                <CircularProgress size={20} />
              ) : null
            }}
          />
          {codeValidation.exists && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Box>
                <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {codeValidation.message === 'project_deleted'
                    ? t('createProject.messages.project_deleted')
                    : t('createProject.messages.project_exists')
                  }
                </Box>
                {codeValidation.project_name && (
                  <Box sx={{ fontSize: '0.875rem', mb: 0.5 }}>
                    <strong>{t('createProject.messages.project_name')}:</strong> {codeValidation.project_name}
                  </Box>
                )}
                {codeValidation.owner && (
                  <Box sx={{ fontSize: '0.875rem' }}>
                    <strong>{t('createProject.messages.project_owner')}:</strong> {codeValidation.owner}
                  </Box>
                )}
              </Box>
            </Alert>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth variant="standard">
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={formData.status || 'PLANNING'}
              onChange={(e) => handleInputChange('status', e.target.value)}
              label={t('common.status')}
              MenuProps={{
                disablePortal: true
              }}
            >
              <MenuItem value="PLANNING">{t('status.planning')}</MenuItem>
              <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
              <MenuItem value="ON_HOLD">{t('status.on_hold')}</MenuItem>
              <MenuItem value="COMPLETED">{t('status.completed')}</MenuItem>
              <MenuItem value="CANCELLED">{t('status.cancelled')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('createProject.fields.description')}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            variant="standard"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <DatePicker
            label={t('createProject.fields.start_date')}
            value={formData.start_date ?? null}
            onChange={(date) => handleInputChange('start_date', date ?? null)}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "standard"
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DatePicker
            label={t('createProject.fields.end_date')}
            value={formData.end_date ?? null}
            onChange={(date) => handleInputChange('end_date', date ?? null)}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "standard"
              }
            }}
          />
        </Grid>
      </Grid>

      {/* Секция для участков тех процесса (Areas) */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          options={projectDialogStore.areas}
          value={selectedAreas}
          onChange={handleAreasChange}
          getOptionLabel={(option) => {
            const areaLabel = i18n.language === 'en' ? option.name : (option.description || option.name);
            return `${option.code} - ${areaLabel}`;
          }}
          loading={projectDialogStore.isLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('createProject.areas.title') || 'Участки тех процесса'}
              variant="standard"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {projectDialogStore.isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const areaLabel = i18n.language === 'en' ? option.name : (option.description || option.name);
              return (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={`${option.code} - ${areaLabel}`}
                  size="small"
                />
              );
            })
          }
        />
      </Grid>
    </Box>
  );
};

export default MainTab;
