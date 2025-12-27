import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import {
  Search as SearchIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { disciplineStore } from '../../../stores/DisciplineStore';
import { projectStore } from '../../../stores/ProjectStore';
import { useEffect, useState, useRef } from 'react';
import { projectsApi, type DocumentType } from '../../../api/client';

export interface DocumentFiltersProps {
  // Состояния фильтров
  searchTerm: string;
  filterStatus: string;
  selectedDisciplineId: number | null;
  selectedDocumentTypeId: number | null;
  selectedRevisionDescriptionId: number | null;
  dateRange: [Date | null, Date | null];
  
  // Обработчики
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDisciplineChange: (id: number | null) => void;
  onDocumentTypeChange: (id: number | null) => void;
  onRevisionDescriptionChange: (id: number | null) => void;
  onDateRangeChange: (range: [Date | null, Date | null]) => void;
  onSettingsClick: () => void;
  onResetFilters: () => void;
  onExportToExcel: () => void;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  filterStatus,
  selectedDisciplineId,
  selectedDocumentTypeId,
  selectedRevisionDescriptionId,
  dateRange,
  onSearchChange,
  onStatusChange,
  onDisciplineChange,
  onDocumentTypeChange,
  onRevisionDescriptionChange,
  onDateRangeChange,
  onSettingsClick,
  onResetFilters,
  onExportToExcel,
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Состояние для типов документов
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(false);
  
  // Состояние для revision descriptions
  const [revisionDescriptions, setRevisionDescriptions] = useState<any[]>([]);
  const [revisionDescriptionsLoading, setRevisionDescriptionsLoading] = useState(false);

  // Загружаем типы документов при изменении дисциплины
  useEffect(() => {
    const loadDocumentTypes = async () => {
      if (!selectedDisciplineId || !projectStore.selectedProject) {
        setDocumentTypes([]);
        return;
      }

      setDocumentTypesLoading(true);
      try {
        const types = await projectsApi.getDocumentTypes(projectStore.selectedProject.id, selectedDisciplineId);
        setDocumentTypes(types);
      } catch (error) {
        console.error('Error loading document types:', error);
        setDocumentTypes([]);
      } finally {
        setDocumentTypesLoading(false);
      }
    };

    loadDocumentTypes();
  }, [selectedDisciplineId, projectStore.selectedProject]);

  // Загружаем revision descriptions при монтировании
  useEffect(() => {
    const loadRevisionDescriptions = async () => {
      if (!projectStore.selectedProject) {
        setRevisionDescriptions([]);
        return;
      }

      try {
        setRevisionDescriptionsLoading(true);
        const descriptions = await projectsApi.getRevisionDescriptions(projectStore.selectedProject.id);
        setRevisionDescriptions(descriptions);
      } catch (error) {
        console.error('Error loading revision descriptions:', error);
        setRevisionDescriptions([]);
      } finally {
        setRevisionDescriptionsLoading(false);
      }
    };

    loadRevisionDescriptions();
  }, [projectStore.selectedProject]);

  // Сбрасываем выбранный тип документа при изменении дисциплины
  const prevDocumentTypesRef = useRef<DocumentType[]>([]);
  useEffect(() => {
    if (selectedDocumentTypeId && documentTypes.length > 0) {
      const typeExists = documentTypes.some(type => type.id === selectedDocumentTypeId);
      if (!typeExists && prevDocumentTypesRef.current.length > 0) {
        // Тип документа больше не существует в новой дисциплине - сбрасываем выбор
        // Используем setTimeout для отложенного вызова, чтобы избежать обновления во время рендеринга
        const timeoutId = setTimeout(() => {
          onDocumentTypeChange(null);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
    prevDocumentTypesRef.current = documentTypes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentTypes, selectedDocumentTypeId]);


  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      alignItems: 'center', 
      flexWrap: 'wrap',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      mb: 3
    }}>
      {/* Фильтры - слева */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        flex: 1
      }}>
        <TextField
          placeholder={t('documents.search_placeholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: isMobile ? '100%' : 300 }}
        />
        
        <LocalizationProvider 
          adapterLocale={i18n.language === 'en' ? enUS : ru} 
          dateAdapter={AdapterDateFns}
        >
          <Box sx={{ display: 'flex', gap: 1, minWidth: isMobile ? '100%' : 340 }}>
            <DatePicker
              label={t('documents.filters.date_from')}
              value={dateRange[0]}
              onChange={(date) => onDateRangeChange([date, dateRange[1]])}
              format="dd.MM.yyyy"
              slotProps={{
                textField: {
                  size: 'medium',
                  sx: { 
                    width: 170
                  }
                }
              }}
            />
            <DatePicker
              label={t('documents.filters.date_to')}
              value={dateRange[1]}
              onChange={(date) => onDateRangeChange([dateRange[0], date])}
              format="dd.MM.yyyy"
              slotProps={{
                textField: {
                  size: 'medium',
                  sx: { 
                    width: 170
                  }
                }
              }}
            />
          </Box>
        </LocalizationProvider>
        
        <FormControl sx={{ minWidth: isMobile ? '100%' : 170 }}>
          <InputLabel>{t('documents.filters.review_status')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            label={t('documents.filters.review_status')}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="draft">{t('docStatus.draft')}</MenuItem>
            <MenuItem value="review">{t('docStatus.review')}</MenuItem>
            <MenuItem value="approved">{t('docStatus.approved')}</MenuItem>
            <MenuItem value="rejected">{t('docStatus.rejected')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: isMobile ? '100%' : 170 }}>
          <InputLabel>{t('documents.filters.discipline')}</InputLabel>
          <Select
            value={selectedDisciplineId || 'all'}
            onChange={(e) => onDisciplineChange(e.target.value === 'all' ? null : Number(e.target.value))}
            label={t('documents.filters.discipline')}
            renderValue={(value) => {
              if (value === 'all') return t('filter.all');
              const discipline = disciplineStore.disciplines.find(d => d.id === value);
              return discipline ? discipline.code : t('filter.all');
            }}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            {disciplineStore.disciplines
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((discipline) => (
              <MenuItem key={discipline.id} value={discipline.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ minWidth: '60px' }}>
                    {discipline.code}
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'left', ml: 1 }}>
                    {i18n.language === 'en' && discipline.name_en && discipline.name_en.trim() ? discipline.name_en : discipline.name}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: isMobile ? '100%' : 170 }}>
          <InputLabel>{t('documents.filters.document_type')}</InputLabel>
          <Select
            value={selectedDocumentTypeId || 'all'}
            onChange={(e) => onDocumentTypeChange(e.target.value === 'all' ? null : Number(e.target.value))}
            label={t('documents.filters.document_type')}
            disabled={!selectedDisciplineId || documentTypesLoading}
            renderValue={(value) => {
              if (value === 'all') return t('filter.all');
              const type = documentTypes.find(t => t.id === value);
              return type ? type.code : t('filter.all');
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 300,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#c1c1c1',
                    borderRadius: '4px',
                    '&:hover': {
                      background: '#a8a8a8',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            {documentTypes
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((type) => (
              <MenuItem key={type.id} value={type.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ minWidth: '60px' }}>
                    {type.code}
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'left', ml: 1 }}>
                    {i18n.language === 'en' && type.name_en && type.name_en.trim() ? type.name_en : type.name}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: isMobile ? '100%' : 170 }}>
          <InputLabel>{t('documents.filters.revision_description')}</InputLabel>
          <Select
            value={selectedRevisionDescriptionId || 'all'}
            onChange={(e) => onRevisionDescriptionChange(e.target.value === 'all' ? null : Number(e.target.value))}
            label={t('documents.filters.revision_description')}
            disabled={revisionDescriptionsLoading}
            renderValue={(value) => {
              if (value === 'all') return t('filter.all');
              const description = revisionDescriptions.find(d => d.id === value);
              return description ? description.code : t('filter.all');
            }}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            {revisionDescriptions
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((description) => (
              <MenuItem key={description.id} value={description.id}>
                {description.code} - {i18n.language === 'en' && description.description && description.description.trim() ? description.description : description.description_native}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Кнопки действий - справа */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'center',
        ml: 'auto'
      }}>
        <Tooltip title={t('documents.reset_filters') || 'Сбросить фильтры'}>
          <IconButton onClick={onResetFilters}>
            <ClearIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('documents.export_to_excel') || 'Экспорт в Excel'}>
          <IconButton onClick={onExportToExcel}>
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('documents.settings') || 'Настройки'}>
          <IconButton onClick={onSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
