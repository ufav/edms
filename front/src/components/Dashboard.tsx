import React, { useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { 
  Add as AddIcon, 
  Description as DocumentIcon, 
  Folder as ProjectIcon, 
  Send as TransmittalIcon,
  RateReview as ReviewIcon,
  People as UserIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { dashboardStore } from '../stores/DashboardStore';
import { projectStore } from '../stores/ProjectStore';

const Dashboard: React.FC = observer(() => {
  // Загружаем данные дашборда только после выбора проекта и аутентификации
  useEffect(() => {
    if (projectStore.selectedProject) {
      dashboardStore.loadDashboardData(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject]);

  const stats = dashboardStore.getStats();
  const recentActivities = dashboardStore.getRecentActivities();

  const handleCreateProject = () => {
    // TODO: Реализовать создание проекта
    console.log('Create project');
  };

  const handleUploadDocument = () => {
    // TODO: Реализовать загрузку документа
    console.log('Upload document');
  };

  const handleCreateTransmittal = () => {
    // TODO: Реализовать создание трансмиттала
    console.log('Create transmittal');
  };

  const handleAddUser = () => {
    // TODO: Реализовать добавление пользователя
    console.log('Add user');
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'document':
        return <DocumentIcon color="primary" />;
      case 'transmittal':
        return <TransmittalIcon color="success" />;
      case 'review':
        return <ReviewIcon color="warning" />;
      case 'project':
        return <ProjectIcon color="info" />;
      default:
        return <DocumentIcon color="primary" />;
    }
  };

  if (dashboardStore.isLoading) {
    return (
      <Box sx={{ width: '100%', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (dashboardStore.error) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {dashboardStore.error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Dashboard {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Всего проектов
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalProjects}
                  </Typography>
                </Box>
                <ProjectIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Документов
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalDocuments}
                  </Typography>
                </Box>
                <DocumentIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Трансмитталов
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalTransmittals}
                  </Typography>
                </Box>
                <TransmittalIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    На ревью
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.pendingReviews}
                  </Typography>
                </Box>
                <ReviewIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={handleCreateProject}
                  sx={{ mb: 1 }}
                >
                  Новый проект
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<DocumentIcon />}
                  onClick={handleUploadDocument}
                  sx={{ mb: 1 }}
                >
                  Загрузить документ
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TransmittalIcon />}
                  onClick={handleCreateTransmittal}
                  sx={{ mb: 1 }}
                >
                  Новый трансмиттал
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<UserIcon />}
                  onClick={handleAddUser}
                  sx={{ mb: 1 }}
                >
                  Добавить пользователя
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Последние активности
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getActivityIcon(activity.icon)}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {activity.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.description}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Нет недавних активностей
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
});

export default Dashboard;