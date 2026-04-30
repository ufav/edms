import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
import { observer } from 'mobx-react-lite';

interface WorkflowStatusData {
  status: string;
  status_id: number;
  count: number;
}

const WorkflowStatusChart: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [data, setData] = useState<WorkflowStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Цвета для статусов
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'Draft': theme.palette.grey[400],
      'In Review': theme.palette.warning.main,
      'Approved': theme.palette.success.main,
      'Approved with Comments': theme.palette.info.main,
      'Not Reviewed': theme.palette.info.light,
      'Rejected': theme.palette.error.main,
    };
    return statusColors[status] || theme.palette.grey[500];
  };

  // Локализованное название статуса
  const getStatusLabel = (status: string): string => {
    // Маппинг статусов на ключи локализации
    const statusMapping: Record<string, string> = {
      'Draft': 'docStatus.draft',
      'In Review': 'docStatus.in_review',
      'Approved': 'docStatus.approved',
      'Approved with Comments': 'docStatus.approved_with_comments',
      'Not Reviewed': 'docStatus.not_reviewed',
      'Rejected': 'docStatus.rejected',
    };
    
    const statusKey = statusMapping[status] || `docStatus.${status.toLowerCase().replace(/\s+/g, '_')}`;
    const translated = t(statusKey);
    // Если перевод не найден, возвращаем оригинальное название
    return translated !== statusKey ? translated : status;
  };

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
        const distribution = await dashboardApi.getWorkflowStatusDistribution(projectId);
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
          {t('dashboard.charts.workflow_status.title') || 'Распределение документов по статусам'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('dashboard.charts.workflow_status.no_data') || 'Нет данных для отображения'}
        </Typography>
      </Paper>
    );
  }

  // Подготовка данных для графика
  const chartData = data.map(item => ({
    name: getStatusLabel(item.status),
    value: item.count,
    status: item.status,
  }));

  // Общее количество документов
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Форматирование tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
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
            {t('dashboard.charts.workflow_status.count', { count: data.value }) || `Количество: ${data.value}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.charts.workflow_status.percent', { percent }) || `${percent}%`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Кастомная легенда
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 2 }}>
        {payload.map((entry: any, index: number) => {
          const dataItem = chartData.find(d => d.name === entry.value);
          const percent = total > 0 ? ((dataItem?.value || 0) / total * 100).toFixed(1) : '0';
          return (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                }}
              />
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                {entry.value} ({percent}%)
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {t('dashboard.charts.workflow_status.title') || 'Распределение документов по статусам'}
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                const radius = Number(innerRadius || 0) + (Number(outerRadius || 0) - Number(innerRadius || 0)) * 0.5;
                const x = Number(cx) + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = Number(cy) + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text
                    x={x}
                    y={y}
                    fill={theme.palette.text.primary}
                    textAnchor={x > Number(cx) ? 'start' : 'end'}
                    dominantBaseline="central"
                    style={{ fontSize: '10px' }}
                  >
                    {`${name}: ${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
        {t('dashboard.charts.workflow_status.total', { total }) || `Всего документов: ${total}`}
      </Typography>
    </Paper>
  );
});

export default WorkflowStatusChart;
