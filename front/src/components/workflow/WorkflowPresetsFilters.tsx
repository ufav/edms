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

interface WorkflowPresetsFiltersProps {
  searchTerm: string;
  filterType: string;
  onSearchChange: (term: string) => void;
  onTypeChange: (type: string) => void;
}

export const WorkflowPresetsFilters: React.FC<WorkflowPresetsFiltersProps> = ({
  searchTerm,
  filterType,
  onSearchChange,
  onTypeChange,
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
        placeholder={t('workflows.search_placeholder')}
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
        <InputLabel>{t('workflows.filter.type')}</InputLabel>
        <Select
          value={filterType}
          onChange={(e) => onTypeChange(e.target.value)}
          label={t('workflows.filter.type')}
        >
          <MenuItem value="all">{t('filter.all')}</MenuItem>
          <MenuItem value="global">{t('workflows.types.global')}</MenuItem>
          <MenuItem value="project">{t('workflows.types.project')}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
