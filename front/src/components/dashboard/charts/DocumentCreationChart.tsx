import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, useTheme, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
import { observer } from 'mobx-react-lite';

interface TimelineData {
  date: string;
  count: number;
}

const DocumentCreationChart: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [data, setData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('30d');

  useEffect(() => {
    const loadData = async () => {
      const projectId = projectStore.selectedProject?.id;
      if (!projectId) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const timeline = await dashboardApi.getDocumentCreationTimeline(projectId, period);
        setData(timeline);
      } catch (err: any) {
        setError(err?.response?.data?.detail || t('dashboard.charts.error_loading') || 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectStore.selectedProject?.id, period, t]);

  const handlePeriodChange = (event: any) => {
    setPeriod(event.target.value);
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.charts.document_creation.title') || 'Динамика создания документов'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('dashboard.charts.document_creation.no_data') || 'Нет данных для отображения'}
        </Typography>
      </Paper>
    );
  }

  // Форматирование даты для отображения
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ru-RU', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Форматирование tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {formatDate(data.date)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.charts.document_creation.count', { count: data.count }) || `Документов: ${data.count}`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('dashboard.charts.document_creation.title') || 'Динамика создания документов'}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('dashboard.charts.period') || 'Период'}</InputLabel>
          <Select value={period} onChange={handlePeriodChange} label={t('dashboard.charts.period') || 'Период'}>
            <MenuItem value="7d">{t('dashboard.charts.period_7d') || '7 дней'}</MenuItem>
            <MenuItem value="30d">{t('dashboard.charts.period_30d') || '30 дней'}</MenuItem>
            <MenuItem value="90d">{t('dashboard.charts.period_90d') || '90 дней'}</MenuItem>
            <MenuItem value="all">{t('dashboard.charts.period_all') || 'Все время'}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={theme.palette.primary.main} 
              strokeWidth={2}
              dot={{ fill: theme.palette.primary.main, r: 4 }}
              activeDot={{ r: 6 }}
              name={t('dashboard.charts.document_creation.documents') || 'Документы'}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
});

export default DocumentCreationChart;
