import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ProjectFiltersProps {
  searchTerm: string;
  filterStatus: string;
  onSearchChange: (term: string) => void;
  onStatusChange: (status: string) => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onStatusChange,
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
        placeholder={t('projects.search_placeholder')}
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
          <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
          <MenuItem value="PLANNING">{t('status.planning')}</MenuItem>
          <MenuItem value="COMPLETED">{t('status.completed')}</MenuItem>
          <MenuItem value="CANCELLED">{t('status.cancelled')}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
