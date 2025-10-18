import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../../../stores/ProjectStore';
import { transmittalImportApi, transmittalImportSettingsApi, type TransmittalImportResult, type TransmittalImportSettings } from '../../../api/client';

interface TransmittalImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: TransmittalImportResult) => void;
  onError?: (error: string) => void;
}

const TransmittalImportDialog: React.FC<TransmittalImportDialogProps> = observer(({
  open,
  onClose,
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [importSettings, setImportSettings] = useState<TransmittalImportSettings[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Получаем участников проекта
  const projectParticipants = projectStore.selectedProject?.participants || [];

  // Загружаем настройки импорта при открытии диалога
  useEffect(() => {
    if (open && projectStore.selectedProject) {
      loadImportSettings();
    }
  }, [open, projectStore.selectedProject]);

  const loadImportSettings = async () => {
    if (!projectStore.selectedProject) return;
    
    setSettingsLoading(true);
    try {
      const settings = await transmittalImportSettingsApi.getByProject(projectStore.selectedProject.id);
      setImportSettings(settings);
    } catch (err) {
      console.error('Ошибка загрузки настроек импорта:', err);
      setImportSettings([]);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Проверяем есть ли настройки для выбранной компании
  const hasSettingsForCompany = (companyId: number): boolean => {
    return importSettings.some(setting => setting.company_id === companyId);
  };

  // Получаем название компании по ID
  const getCompanyName = (companyId: number): string => {
    const participant = projectParticipants.find(p => p.company_id === companyId);
    return participant?.company?.name || 'Неизвестная компания';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedCounterpartyId || !projectStore.selectedProject) {
      if (onError) {
        onError(t('transmittals.import_file_required'));
      }
      return;
    }

    // Проверяем наличие настроек для выбранной компании
    if (!hasSettingsForCompany(selectedCounterpartyId as number)) {
      const companyName = getCompanyName(selectedCounterpartyId as number);
      if (onError) {
        onError(t('transmittals.import_settings_not_found', { company: companyName }));
      }
      return;
    }

    setLoading(true);

    try {
      const result = await transmittalImportApi.importIncoming(
        selectedFile,
        projectStore.selectedProject.id,
        selectedCounterpartyId as number
      );

      onSuccess(result);
      handleClose();
    } catch (err: any) {
      console.log('Import error in dialog:', err); // Для отладки
      const errorMessage = err.response?.data?.detail || err.message || t('transmittals.import_error');
      // Не показываем ошибку в модалке, только передаем в родительский компонент
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedCounterpartyId('');
    setLoading(false);
    setImportSettings([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('transmittals.import_incoming')}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

                 {/* Выбор компании */}
                 <FormControl fullWidth variant="standard">
                   <InputLabel>{t('transmittals.import_company_label')}</InputLabel>
                   <Select
                     value={selectedCounterpartyId}
                     onChange={(e) => setSelectedCounterpartyId(e.target.value as number)}
                     label={t('transmittals.import_company_label')}
                   >
                     {projectParticipants.map((participant) => (
                       <MenuItem key={participant.id} value={participant.company_id}>
                         {participant.company?.name || 'Неизвестная компания'}
                       </MenuItem>
                     ))}
                   </Select>
                 </FormControl>

                 {/* Выбор файла */}
                 <Box>
                   <input
                     type="file"
                     accept=".xlsx,.xls"
                     onChange={handleFileSelect}
                     style={{ display: 'none' }}
                     id="transmittal-file-input"
                   />
                   <label htmlFor="transmittal-file-input">
                     <Button
                       variant="outlined"
                       component="span"
                       fullWidth
                       sx={{ justifyContent: 'center' }}
                     >
                       {selectedFile ? selectedFile.name : t('transmittals.import_file_select')}
                     </Button>
                   </label>
                 </Box>

          {/* Предупреждение о отсутствии настроек */}
          {selectedCounterpartyId && !hasSettingsForCompany(selectedCounterpartyId as number) && (
            <Alert severity="warning">
              <Typography variant="body2">
                {t('transmittals.import_settings_not_found', { company: getCompanyName(selectedCounterpartyId as number) })}
              </Typography>
            </Alert>
          )}

          {/* Информация */}
          <Alert severity="info">
            <Typography variant="body2">
              {t('transmittals.import_info')}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={loading || !selectedFile || !selectedCounterpartyId || (selectedCounterpartyId && !hasSettingsForCompany(selectedCounterpartyId as number))}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('transmittals.import_loading') : t('transmittals.import_button')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default TransmittalImportDialog;
