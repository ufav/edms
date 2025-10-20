import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Send as SendIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  AccountTree as WorkflowIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { projectsApi, documentsApi, usersApi, transmittalsApi } from '../../api/client';
import { projectStore } from '../../stores/ProjectStore';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalDocuments: number;
  totalTransmittals: number;
  activeProjects: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
  };
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subtitle?: string;
}> = ({ title, value, icon, color, trend, subtitle }) => (
  <Card
    sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 25px ${color}20`,
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend > 0 ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : (
              <TrendingDownIcon color="error" fontSize="small" />
            )}
            <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
              {Math.abs(trend)}%
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {value.toLocaleString()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const HealthIndicator: React.FC<{
  label: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
}> = ({ label, status, value }) => {
  const getColor = () => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <CheckCircleIcon />;
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      {getIcon()}
      <Typography variant="body2" sx={{ flex: 1 }}>
        {label}
      </Typography>
      <Chip
        label={value}
        color={getColor()}
        size="small"
        variant="outlined"
      />
    </Box>
  );
};

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalDocuments: 0,
    totalTransmittals: 0,
    activeProjects: 0,
    recentActivity: [],
    systemHealth: {
      database: 'healthy',
      api: 'healthy',
      storage: 'healthy',
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [users, projects, documents, transmittals] = await Promise.all([
        usersApi.getAll(),
        projectsApi.getAll(),
        documentsApi.getAll(),
        transmittalsApi.getAll(),
      ]);

      const activeProjects = projects.filter(p => p.status === 'active').length;
      
      // Generate mock recent activity
      const recentActivity = [
        {
          id: '1',
          type: 'user',
          message: 'Новый пользователь зарегистрирован',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'success' as const,
        },
        {
          id: '2',
          type: 'project',
          message: 'Проект "Нефтеперерабатывающий завод" создан',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          status: 'success' as const,
        },
        {
          id: '3',
          type: 'document',
          message: 'Ошибка загрузки документа #12345',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          status: 'error' as const,
        },
        {
          id: '4',
          type: 'transmittal',
          message: 'Трансмиттал #T-2024-001 отправлен',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          status: 'success' as const,
        },
      ];

      setStats({
        totalUsers: users.length,
        totalProjects: projects.length,
        totalDocuments: documents.length,
        totalTransmittals: transmittals.length,
        activeProjects,
        recentActivity,
        systemHealth: {
          database: 'healthy',
          api: 'healthy',
          storage: 'healthy',
        },
      });
    } catch (err) {
      setError('Ошибка загрузки статистики');
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <IconButton color="inherit" size="small" onClick={loadStats}>
            <RefreshIcon />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('admin.dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.dashboard.subtitle')}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.total_users')}
            value={stats.totalUsers}
            icon={<PeopleIcon />}
            color="#1976d2"
            trend={12}
            subtitle="+5 за неделю"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.total_projects')}
            value={stats.totalProjects}
            icon={<BusinessIcon />}
            color="#2e7d32"
            trend={8}
            subtitle={`${stats.activeProjects} активных`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.total_documents')}
            value={stats.totalDocuments}
            icon={<DescriptionIcon />}
            color="#9c27b0"
            trend={-2}
            subtitle="+23 за день"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.total_transmittals')}
            value={stats.totalTransmittals}
            icon={<SendIcon />}
            color="#d32f2f"
            trend={15}
            subtitle="+3 за день"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="primary" />
                {t('admin.dashboard.system_health')}
              </Typography>
              <HealthIndicator
                label={t('admin.dashboard.database')}
                status={stats.systemHealth.database}
                value={t('admin.dashboard.healthy')}
              />
              <HealthIndicator
                label={t('admin.dashboard.api')}
                status={stats.systemHealth.api}
                value={t('admin.dashboard.healthy')}
              />
              <HealthIndicator
                label={t('admin.dashboard.storage')}
                status={stats.systemHealth.storage}
                value={t('admin.dashboard.healthy')}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                {t('admin.dashboard.recent_activity')}
              </Typography>
              <List>
                {stats.recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: activity.status === 'success' ? 'success.main' : 
                                    activity.status === 'warning' ? 'warning.main' : 'error.main',
                            width: 32,
                            height: 32,
                          }}
                        >
                          {activity.type === 'user' && <PeopleIcon fontSize="small" />}
                          {activity.type === 'project' && <BusinessIcon fontSize="small" />}
                          {activity.type === 'document' && <DescriptionIcon fontSize="small" />}
                          {activity.type === 'transmittal' && <SendIcon fontSize="small" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.message}
                        secondary={new Date(activity.timestamp).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;