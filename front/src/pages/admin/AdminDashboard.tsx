import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { projectsApi, documentsApi, usersApi } from '../../api/client';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalDocuments: number;
  activeProjects: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalDocuments: 0,
    activeProjects: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const [users, projects, documents] = await Promise.all([
          usersApi.getAll(),
          projectsApi.getAll(),
          documentsApi.getAll(),
        ]);

        const activeProjects = projects.filter(p => p.status === 'active').length;

        setStats({
          totalUsers: users.length,
          totalProjects: projects.length,
          totalDocuments: documents.length,
          activeProjects,
        });
      } catch (err) {
        setError('Ошибка загрузки статистики');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Пользователи',
      value: stats.totalUsers,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Проекты',
      value: stats.totalProjects,
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      color: '#388e3c',
    },
    {
      title: 'Документы',
      value: stats.totalDocuments,
      icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
      color: '#f57c00',
    },
    {
      title: 'Активные проекты',
      value: stats.activeProjects,
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Панель администратора
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Обзор системы управления документами
      </Typography>

      {/* Статистические карточки */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: card.color, mr: 2 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h4" component="div">
                    {card.value}
                  </Typography>
                </Box>
                <Typography variant="h6" color="text.secondary">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Быстрые действия */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Быстрые действия
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Часто используемые функции администратора
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">• Создать нового пользователя</Typography>
                <Typography variant="body2">• Добавить проект</Typography>
                <Typography variant="body2">• Настроить дисциплины</Typography>
                <Typography variant="body2">• Просмотреть логи системы</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Системная информация
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Текущее состояние системы
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Статус:</Typography>
                  <Chip label="Активна" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Версия:</Typography>
                  <Typography variant="body2">1.0.0</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Последнее обновление:</Typography>
                  <Typography variant="body2">
                    {new Date().toLocaleDateString('ru-RU')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
