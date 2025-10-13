import React, { useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Paper, CircularProgress, Alert, useTheme, useMediaQuery } from '@mui/material';
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
import { useTranslation } from 'react-i18next';

const Dashboard: React.FC = observer(() => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Загружаем данные дашборда только после выбора проекта и аутентификации
  useEffect(() => {
    if (projectStore.selectedProject) {
      dashboardStore.loadDashboardData(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject]);

  const stats = dashboardStore.getStats();
  const recentActivities = dashboardStore.getRecentActivities(t);

  const handleCreateProject = () => {
    // TODO: Реализовать создание проекта
  };

  const handleUploadDocument = () => {
    // TODO: Реализовать загрузку документа
  };

  const handleCreateTransmittal = () => {
    // TODO: Реализовать создание трансмиттала
  };

  const handleAddUser = () => {
    // TODO: Реализовать добавление пользователя
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'document':
        return <DocumentIcon color="success" />; // Зеленый - как в карточке
      case 'transmittal':
        return <TransmittalIcon color="warning" />; // Оранжевый - как в карточке
      case 'review':
        return <ReviewIcon color="error" />; // Красный - как в карточке
      case 'project':
        return <ProjectIcon color="primary" />; // Синий - как в карточке
      default:
        return <DocumentIcon color="success" />;
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
      <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom sx={{ mb: 3 }}>
        {t('menu.dashboard')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.total_projects')}
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
                    {t('dashboard.total_documents')}
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
                    {t('dashboard.total_transmittals')}
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
                    {t('dashboard.pending_reviews')}
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
      <Grid container spacing={isMobile ? 2 : 3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.quick_actions')}
            </Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={handleCreateProject}
                  sx={{ mb: 1 }}
                >
                  {t('dashboard.new_project')}
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
                  {t('documents.upload')}
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
                  {t('dashboard.new_transmittal')}
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
                  {t('dashboard.add_user')}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.recent_activities')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 2 }}>
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
                  {t('dashboard.no_recent_activities')}
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