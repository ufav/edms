import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
import { observer } from 'mobx-react-lite';

interface DocumentTypeData {
  type_id: number | null;
  type_name: string;
  type_name_en: string;
  count: number;
}

const DocumentTypeChart: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [data, setData] = useState<DocumentTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const distribution = await dashboardApi.getDocumentTypeDistribution(projectId);
        setData(distribution);
      } catch (err: any) {
        setError(err?.response?.data?.detail || t('dashboard.charts.error_loading') || 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectStore.selectedProject?.id, t]);

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
          {t('dashboard.charts.document_type.title') || 'Распределение документов по типам'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('dashboard.charts.document_type.no_data') || 'Нет данных для отображения'}
        </Typography>
      </Paper>
    );
  }

  // Ограничиваем до топ-10 для лучшей читаемости
  const topData = data.slice(0, 10);

  // Подготовка данных для графика
  const chartData = topData.map(item => ({
    name: i18n.language === 'en' ? (item.type_name_en || item.type_name) : item.type_name,
    count: item.count,
  }));

  // Форматирование tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
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
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.charts.document_type.count', { count: data.value }) || `Количество: ${data.value}`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {t('dashboard.charts.document_type.title') || 'Распределение документов по типам'}
      </Typography>
      
      {data.length > 10 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('dashboard.charts.document_type.showing_top', { count: 10 }) || `Показаны топ-10 из ${data.length}`}
        </Typography>
      )}
      
      <Box sx={{ mt: 2 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis 
              type="number"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              type="category" 
              dataKey="name"
              width={120}
              tickFormatter={(value: string) =>
                value.length > 24 ? `${value.slice(0, 24)}...` : value
              }
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '12px' }}
              tick={{ 
                style: { 
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="count" 
              fill={theme.palette.primary.main}
              name={t('dashboard.charts.document_type.documents') || 'Документы'}
            >
              <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fill: theme.palette.text.secondary }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
});

export default DocumentTypeChart;
