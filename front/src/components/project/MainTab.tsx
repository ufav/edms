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
  CircularProgress
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
}

const MainTab: React.FC<MainTabProps> = ({ formData, setFormData, codeValidation, setCodeValidation }) => {
  const { t } = useTranslation();
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

  // Debounced check for project code
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.project_code) {
        checkProjectCode(formData.project_code);
      } else {
        setCodeValidation({ isChecking: false, exists: false, message: '', is_deleted: false }); // Clear validation if code is empty
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.project_code]);

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
