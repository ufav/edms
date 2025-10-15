import React from 'react';
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
          <MenuItem value="draft">{t('transmittals.status.draft')}</MenuItem>
          <MenuItem value="sent">{t('transmittals.status.sent')}</MenuItem>
          <MenuItem value="received">{t('transmittals.status.received')}</MenuItem>
          <MenuItem value="acknowledged">{t('transmittals.status.acknowledged')}</MenuItem>
          <MenuItem value="rejected">{t('transmittals.status.rejected')}</MenuItem>
        </Select>
      </FormControl>

      <Tooltip title={t('transmittals.settings.title')}>
        <IconButton onClick={onSettingsClick}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
