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
import {
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export interface DocumentFiltersProps {
  // Состояния фильтров
  searchTerm: string;
  filterStatus: string;
  
  // Обработчики
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSettingsClick: () => void;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onStatusChange,
  onSettingsClick,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      alignItems: 'center', 
      flexWrap: 'wrap',
      flexDirection: isMobile ? 'column' : 'row',
      mb: 3
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
      
      <FormControl sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>{t('common.status')}</InputLabel>
        <Select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          label={t('common.status')}
        >
          <MenuItem value="all">{t('filter.all')}</MenuItem>
          <MenuItem value="draft">{t('docStatus.draft')}</MenuItem>
          <MenuItem value="review">{t('docStatus.review')}</MenuItem>
          <MenuItem value="approved">{t('docStatus.approved')}</MenuItem>
          <MenuItem value="rejected">{t('docStatus.rejected')}</MenuItem>
        </Select>
      </FormControl>

      <Tooltip title={t('documents.settings') || 'Настройки'}>
        <IconButton onClick={onSettingsClick}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
