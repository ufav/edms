import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { transmittalsApi } from '../../../api/client';
import referenceDataStore from '../../../stores/ReferenceDataStore';

export interface TransmittalFiltersProps {
  searchTerm: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSettingsClick: () => void;
}

export const TransmittalFilters: React.FC<TransmittalFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onStatusChange,
  onSettingsClick,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Состояние для статусов
  const [statuses, setStatuses] = useState<any[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(true);

  // Загружаем статусы при монтировании компонента с кешированием
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        // Проверяем, есть ли уже загруженные статусы в referenceDataStore
        if (referenceDataStore.transmittalStatuses && referenceDataStore.transmittalStatuses.length > 0) {
          setStatuses(referenceDataStore.transmittalStatuses);
          setStatusesLoading(false);
          return;
        }
        
        const statusesData = await transmittalsApi.getStatuses();
        setStatuses(statusesData);
        
        // Сохраняем в referenceDataStore для кеширования
        referenceDataStore.setTransmittalStatuses(statusesData);
      } catch (error) {
        console.error('Error loading transmittal statuses:', error);
      } finally {
        setStatusesLoading(false);
      }
    };
    
    loadStatuses();
  }, []);

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
          placeholder={t('transmittals.search_placeholder')}
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
        
        <FormControl sx={{ minWidth: isMobile ? '100%' : 150 }}>
          <InputLabel>{t('common.status')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            label={t('common.status')}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            {statuses.map((status) => (
              <MenuItem key={status.id} value={status.name.toLowerCase()}>
                {status.name}
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
        <Tooltip title={t('transmittals.settings.title')}>
          <IconButton onClick={onSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default TransmittalFilters;
