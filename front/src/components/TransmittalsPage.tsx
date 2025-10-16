import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  Description as DetailsIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { transmittalStore } from '../stores/TransmittalStore';
import referenceDataStore from '../stores/ReferenceDataStore';
import ProjectRequired from './ProjectRequired';
import TransmittalViewDialog from './transmittal/components/TransmittalViewDialog';
import { TransmittalSettingsDialog } from './transmittal/components/TransmittalSettingsDialog';
import { TransmittalFilters } from './transmittal/components/TransmittalFilters';
import { TransmittalTable } from './transmittal/components/TransmittalTable';
import TransmittalImportDialog from './transmittal/components/TransmittalImportDialog';
import { useTransmittalSettings } from './transmittal/hooks/useTransmittalSettings';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ConfirmDialog from './ConfirmDialog';
import AppPagination from './AppPagination';
import NotificationSnackbar from './NotificationSnackbar';
import { useDeleteDialog } from '../hooks/useDeleteDialog';
import { transmittalsApi } from '../api/client';

const TransmittalsPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const { isViewer } = useCurrentUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedTransmittalId, setSelectedTransmittalId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteDialog = useDeleteDialog();
  const [page, setPage] = useState<number>(1); // 1-based for MUI Pagination
  const rowsPerPage = 13; // фиксированное количество на страницу
  
  // Хук для настроек трансмитталов
  const transmittalSettings = useTransmittalSettings();

  // Загружаем трансмитталы при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      // Загружаем справочные данные для отображения названий компаний
      await referenceDataStore.loadAllReferenceData();
      
      if (projectStore.hasSelectedProject) {
        transmittalStore.loadTransmittals(projectStore.selectedProject!.id);
      }
    };
    
    loadData();
  }, [projectStore.selectedProject]);

  // Фильтрация трансмитталов
  const filteredTransmittals = transmittalStore.transmittals.filter(t => {
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    const projectMatch = filterProject === 'all' || t.project_id.toString() === filterProject;
    const selectedProjectMatch = !projectStore.hasSelectedProject || t.project_id === projectStore.selectedProject?.id;
    const searchMatch = searchTerm === '' || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transmittal_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && projectMatch && selectedProjectMatch && searchMatch;
  });

  // Сбрасываем на первую страницу при изменении фильтров/проекта/поиска
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterProject, searchTerm, projectStore.selectedProject]);

  const totalPages = Math.max(1, Math.ceil(filteredTransmittals.length / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedTransmittals = filteredTransmittals.slice(startIndex, endIndex);


  const handleCreate = () => {
    // TODO: Реализовать создание трансмиттала
  };

  const handleView = (transmittalId: number) => {
    setSelectedTransmittalId(transmittalId);
    setViewerOpen(true);
  };

  const handleSend = (transmittalId: number) => {
    // TODO: Реализовать отправку трансмиттала
  };

  const handleReceive = (transmittalId: number) => {
    // TODO: Реализовать подтверждение получения
  };

  const handleDelete = (transmittalId: number) => {
    deleteDialog.openDeleteDialog({ id: transmittalId });
  };

  const handleConfirmDelete = async (item: { id: number }) => {
    try {
      setDeletingId(item.id);
      await transmittalsApi.delete(item.id);
      if (projectStore.hasSelectedProject) {
        await transmittalStore.loadTransmittals(projectStore.selectedProject!.id, true);
      } else {
        await transmittalStore.loadTransmittals(undefined, true);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleImportSuccess = async (result: any) => {
    // Обновляем список трансмитталов после успешного импорта
    if (projectStore.hasSelectedProject) {
      await transmittalStore.loadTransmittals(projectStore.selectedProject!.id, true);
    } else {
      await transmittalStore.loadTransmittals(undefined, true);
    }
    
    // Формируем сообщение об успешном импорте
    let message = t('transmittals.import_success', { number: result.transmittal_number });
    
    // Если есть несуществующие документы, добавляем информацию о них
    if (result.missing_documents && result.missing_documents.length > 0) {
      const missingDocs = result.missing_documents.join(', ');
      message += `\n\n${t('transmittals.import_missing_documents', { documents: missingDocs })}`;
    }
    
    // Показываем уведомление об успешном импорте
    setNotification({
      open: true,
      message: message,
      severity: result.missing_documents && result.missing_documents.length > 0 ? 'warning' : 'success'
    });
    
    console.log('Трансмиттал успешно импортирован:', result);
  };

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleImportError = (error: string) => {
    console.log('Import error received:', error); // Для отладки
    console.log('Error starts with WORKSHEET_NOT_FOUND:', error.startsWith('WORKSHEET_NOT_FOUND:')); // Для отладки
    
    // Обрабатываем коды ошибок от бэкенда
    if (error.startsWith('IMPORT_DUPLICATE:')) {
      const transmittalNumber = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_duplicate', { number: transmittalNumber }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_SETTINGS_NOT_FOUND:')) {
      const companyName = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_settings_not_found', { company: companyName }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_METADATA_NOT_FOUND:')) {
      const fields = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_metadata_not_found', { fields: fields }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_TABLE_NOT_FOUND:')) {
      const columns = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_table_not_found', { columns: columns }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_GENERAL_ERROR:')) {
      const details = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_general_error', { details: details }),
        severity: 'error'
      });
    }
    else if (error.startsWith('WORKSHEET_NOT_FOUND:')) {
      const sheet = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_worksheet_not_found', { sheet: sheet }),
        severity: 'error'
      });
    }
    else if (error.startsWith('EXCEL_READ_ERROR:')) {
      const details = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_excel_read_error', { details: details }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_MISSING_DOCUMENTS:')) {
      const documents = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_missing_documents', { documents: documents }),
        severity: 'error'
      });
    }
    else if (error.startsWith('IMPORT_TABLE_FIELDS_NOT_FOUND:')) {
      const fields = error.split(':')[1];
      setNotification({
        open: true,
        message: t('transmittals.import_table_fields_not_found', { fields: fields }),
        severity: 'error'
      });
    }
    else if (error === 'INVALID_SETTINGS_FORMAT') {
      setNotification({
        open: true,
        message: t('transmittals.import_invalid_settings_format'),
        severity: 'error'
      });
    }
    else if (error === 'MISSING_SHEET_NAME') {
      setNotification({
        open: true,
        message: t('transmittals.import_missing_sheet_name'),
        severity: 'error'
      });
    }
    else if (error === 'MISSING_METADATA_FIELDS') {
      setNotification({
        open: true,
        message: t('transmittals.import_missing_metadata_fields'),
        severity: 'error'
      });
    }
    else if (error === 'MISSING_TABLE_FIELDS') {
      setNotification({
        open: true,
        message: t('transmittals.import_missing_table_fields'),
        severity: 'error'
      });
    }
    else {
      // Для других ошибок показываем оригинальное сообщение или общее
      const displayMessage = error && error.trim() !== '' ? error : t('transmittals.import_error');
      setNotification({
        open: true,
        message: displayMessage,
        severity: 'error'
      });
    }
  };

  return (
    <ProjectRequired>
      <Box sx={{ 
        width: '100%', 
        minWidth: 0, 
        pt: 3, // padding только сверху
        px: 3, // padding только по бокам
        pb: 0, // убираем padding снизу
        height: !isMobile ? 'calc(100vh - 117px)' : '100vh', // Всегда вычитаем высоту пагинации для десктопа
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', // Убираем прокрутку страницы
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1">
            {t('menu.transmittals')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          {!isViewer && (
            <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreate}
                sx={{ backgroundColor: '#1976d2', flex: isMobile ? 1 : 'none' }}
              >
                {t('transmittals.create')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ flex: isMobile ? 1 : 'none' }}
              >
                {t('transmittals.import_incoming')}
              </Button>
            </Box>
          )}
        </Box>


        <TransmittalFilters
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          onSearchChange={setSearchTerm}
          onStatusChange={setFilterStatus}
          onSettingsClick={() => transmittalSettings.setSettingsOpen(true)}
        />

        {/* Контейнер таблицы */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <TransmittalTable
            transmittals={displayedTransmittals}
            totalCount={filteredTransmittals.length}
            isLoading={transmittalStore.isLoading}
            error={transmittalStore.error}
            visibleCols={transmittalSettings.visibleCols}
            columnOrder={transmittalSettings.columnOrder}
            onShowDetails={handleView}
            onDelete={(transmittal) => handleDelete(transmittal.id)}
            formatDate={transmittalStore.formatDate}
          />
        </Box>

        {/* Фиксированная пагинация без выбора кол-ва строк */}
        {!transmittalStore.isLoading && (
          <AppPagination
              count={filteredTransmittals.length}
            page={Math.min(page, totalPages)}
            onPageChange={(_, value) => setPage(value)}
            simple
            rowsPerPage={rowsPerPage}
            insetLeft={isMobile ? 0 : 240}
            align="right"
          />
        )}
      </Box>
      <TransmittalViewDialog
        open={viewerOpen}
        transmittalId={selectedTransmittalId}
        onClose={() => {
          setViewerOpen(false);
          setSelectedTransmittalId(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        title={t('transmittals.delete_confirm_title') || 'Подтверждение удаления'}
        content={t('transmittals.delete_confirm_content') || 'Удалить трансмиттал? Это действие можно отменить позже, так как используется мягкое удаление.'}
        confirmText={t('transmittals.delete_confirm') || 'Удалить'}
        cancelText={t('common.cancel')}
        onConfirm={() => deleteDialog.confirmDelete(handleConfirmDelete)}
        onClose={deleteDialog.closeDeleteDialog}
        loading={deleteDialog.isLoading}
      />

      <TransmittalSettingsDialog
        open={transmittalSettings.settingsOpen}
        visibleCols={transmittalSettings.visibleCols}
        columnOrder={transmittalSettings.columnOrder}
        onClose={() => transmittalSettings.setSettingsOpen(false)}
        onColumnVisibilityChange={transmittalSettings.onColumnVisibilityChange}
        onColumnOrderChange={transmittalSettings.onColumnOrderChange}
      />

      <TransmittalImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
        onError={handleImportError}
      />

      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleNotificationClose}
      />
    </ProjectRequired>
  );
});

export default TransmittalsPage;