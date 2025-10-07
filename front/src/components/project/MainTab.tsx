import React, { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../api/client';

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
}

const MainTab: React.FC<MainTabProps> = ({ 
  formData, 
  setFormData, 
  codeValidation, 
  setCodeValidation,
  mode = 'create'
}) => {
  const { t } = useTranslation();
  const [isMobile] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    if (mode === 'view' && isFieldEditing?.(field)) {
      updateFieldEditData?.(field, value);
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [field]: value
      }));
    }
    
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

  // Функция для рендеринга поля с возможностью редактирования
  const renderEditableField = (
    fieldName: string,
    label: string,
    children: React.ReactNode,
    value: any
  ) => {
    const isEditing = isFieldEditing?.(fieldName) || false;
    const currentValue = isEditing ? (fieldEditData?.[fieldName] ?? value) : value;

    if (mode === 'view') {
      return (
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              {isEditing ? (
                <Box>
                  {children}
                </Box>
              ) : (
                <Box sx={{ 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  backgroundColor: '#f5f5f5',
                  minHeight: '56px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Typography variant="body1">
                    {currentValue || t('common.no_data')}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {isEditing ? (
                <>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => saveFieldEdit?.(fieldName)}
                    disabled={!currentValue}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="secondary"
                    onClick={() => cancelFieldEdit?.(fieldName)}
                  >
                    <CancelIcon />
                  </IconButton>
                </>
              ) : (
                <IconButton 
                  size="small" 
                  color="primary"
                  onClick={() => startFieldEdit?.(fieldName)}
                >
                  <EditIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>
      );
    }

    return children;
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3, mt: 1 }}>
      <Grid container spacing={isMobile ? 1 : 2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label={t('createProject.fields.name')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label={t('createProject.fields.project_code')}
            value={formData.project_code}
            onChange={(e) => handleInputChange('project_code', e.target.value)}
            onBlur={handleProjectCodeBlur}
            placeholder="PRJ-001"
            error={codeValidation.exists}
            helperText=""
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
          <FormControl fullWidth>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              label={t('common.status')}
              MenuProps={{
                disablePortal: true
              }}
            >
              <MenuItem value="planning">{t('status.planning')}</MenuItem>
              <MenuItem value="active">{t('status.active')}</MenuItem>
              <MenuItem value="on_hold">{t('status.on_hold')}</MenuItem>
              <MenuItem value="completed">{t('status.completed')}</MenuItem>
              <MenuItem value="cancelled">{t('status.cancelled')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('createProject.fields.description')}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <DatePicker
            label={t('createProject.fields.start_date')}
            value={formData.start_date}
            onChange={(date) => handleInputChange('start_date', date)}
            slotProps={{
              textField: {
                fullWidth: true
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DatePicker
            label={t('createProject.fields.end_date')}
            value={formData.end_date}
            onChange={(date) => handleInputChange('end_date', date)}
            slotProps={{
              textField: {
                fullWidth: true
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainTab;
