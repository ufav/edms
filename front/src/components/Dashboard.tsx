import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Paper, CircularProgress, Alert, useTheme, useMediaQuery, Skeleton } from '@mui/material';
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
import ProjectDialog from './project/ProjectDialog';
import { DocumentViewer } from './document';
import TransmittalDialog from './transmittal/components/TransmittalDialog';
import { useDocumentActions } from './document/hooks/useDocumentActions';
import { disciplineStore } from '../stores/DisciplineStore';
import { areaStore } from '../stores/AreaStore';

const Dashboard: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Состояние модалок быстрых действий
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [createTransmittalOpen, setCreateTransmittalOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);

  // Действия с документами (для большого диалога создания документа)
  const { handleCreateDocument } = useDocumentActions({
    t: (key: string) => t(key),
    onCloseDialog: () => setCreateDocumentOpen(false),
  });

  // Загружаем данные дашборда только после выбора проекта и аутентификации
  useEffect(() => {
    if (projectStore.selectedProject) {
      dashboardStore.loadDashboardData(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject]);

  const stats = dashboardStore.getStats();
  const recentActivities = dashboardStore.getRecentActivities(t);
  const disciplineStats = dashboardStore.getDisciplineStats();
  const revisionStepsStats = dashboardStore.getRevisionStepsStats();

  // Загружаем дисциплины для выбранного проекта (для локализации названий)
  useEffect(() => {
    if (projectStore.selectedProject?.id) {
      disciplineStore.loadDisciplines(projectStore.selectedProject.id);
      areaStore.loadAreas(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject]);

  const handleCreateProject = () => {
    setCreateProjectOpen(true);
  };

  const handleUploadDocument = () => {
    setCreateDocumentOpen(true);
  };

  const handleCreateTransmittal = () => {
    setCreateTransmittalOpen(true);
  };

  const handleAddUser = () => {
    setAddUserOpen(true);
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
      <Box sx={{ width: '100%', p: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1.5 }} />
        
        {/* Statistics Cards Skeleton */}
        <Grid container spacing={isMobile ? 1 : 1.5} sx={{ mb: isMobile ? 1 : 1.5 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Grid item xs={12} sm={6} md={2} key={i}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="40%" height={40} />
                    </Box>
                    <Skeleton variant="circular" width={40} height={40} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Progress Sections Skeleton */}
        <Grid container spacing={isMobile ? 2 : 3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
              <Skeleton variant="text" width={200} height={32} sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.75 : 1 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width="100%" 
                      height={32} 
                      sx={{ borderRadius: '999px' }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
              <Skeleton variant="text" width={250} height={32} sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.5 : 0.75 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width="100%" 
                      height={32} 
                      sx={{ borderRadius: '999px' }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
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
      <Grid container spacing={isMobile ? 1 : 1.5} sx={{ mb: isMobile ? 1 : 1.5 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
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

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.reviews_pending')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.reviewsTotal}
                  </Typography>
                </Box>
                <ReviewIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.reviews_internal')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.reviewsInternal}
                  </Typography>
                </Box>
                <ReviewIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.reviews_transmittal')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.reviewsTransmittal}
                  </Typography>
                </Box>
                <TransmittalIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.reviews_overdue')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {stats.reviewsOverdue}
                  </Typography>
                </Box>
                <ReviewIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions — временно скрыто */}
      {/* блок быстрых действий можно вернуть, раскомментировав код ниже */}
      {/* <Grid container spacing={isMobile ? 2 : 3}>...</Grid> */}

      <Grid container spacing={isMobile ? 1 : 1.5}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
              {t('dashboard.discipline_stats_title')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.5 : 0.75 }}>
              {disciplineStats.length > 0 ? (
                disciplineStats.map((item) => {
                  // Пытаемся найти дисциплину в store по id или коду
                  const discipline =
                    (item.disciplineId
                      ? disciplineStore.disciplines.find(d => d.id === item.disciplineId)
                      : null) ||
                    (item.disciplineCode
                      ? disciplineStore.disciplines.find(d => d.code === item.disciplineCode)
                      : null);

                  const code = discipline?.code || item.disciplineCode;
                  const name =
                    i18n.language === 'en'
                      ? (discipline?.name_en || discipline?.name || item.disciplineName)
                      : (discipline?.name || item.disciplineName);

                  const hasName = code || name;
                  const label = hasName
                    ? `${code ? `${code} - ` : ''}${name || ''}`
                    : t('document.not_specified');

                  const total = item.documentsCount;
                  const closed = item.closedDocumentsCount;
                  const ratio = item.closedRatio || 0;
                  const percent = Math.round(ratio * 100);

                  return (
                    <Box
                      key={item.disciplineId ?? code ?? 'none'}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                    >
                      {/* Прогресс-бар с названием дисциплины поверх */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: 32,
                          borderRadius: 999,
                          backgroundColor: 'grey.200',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {/* Заполненная часть прогресс-бара */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${percent}%`,
                            maxWidth: '100%',
                            background: 'linear-gradient(90deg, #81c784, #a5d6a7)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                        {/* Название дисциплины и процент поверх прогресс-бара */}
                        <Box
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mr: 1,
                              fontWeight: 500,
                              color: 'text.primary',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }} 
                            noWrap
                          >
                            {label}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold', 
                              whiteSpace: 'nowrap',
                              color: 'text.primary',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {closed}/{total} ({percent}%)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.no_discipline_stats')}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
              {t('dashboard.revision_steps_stats_title')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.5 : 0.75 }}>
              {revisionStepsStats.length > 0 ? (
                revisionStepsStats.map((item) => {
                  const code = item.stepCode || '';
                  const name = i18n.language === 'en' 
                    ? (item.stepDescription || '') 
                    : (item.stepDescriptionNative || item.stepDescription || '');
                  const label = code && name ? `${code} - ${name}` : (code || name || t('document.not_specified'));
                  const count = item.documentsCount;
                  const total = stats.totalDocuments;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <Box
                      key={item.stepId ?? code ?? 'none'}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                    >
                      {/* Прогресс-бар с названием шага поверх */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: 32,
                          borderRadius: 999,
                          backgroundColor: 'grey.200',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {/* Заполненная часть прогресс-бара */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${percent}%`,
                            maxWidth: '100%',
                            background: 'linear-gradient(90deg, #64b5f6, #90caf9)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                        {/* Название шага и количество поверх прогресс-бара */}
                        <Box
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mr: 1,
                              fontWeight: 500,
                              color: 'text.primary',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }} 
                            noWrap
                          >
                            {label}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold', 
                              whiteSpace: 'nowrap',
                              color: 'text.primary',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {count}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.no_revision_steps_stats')}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Последние активности - скрыто */}
        {/* <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
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
        </Grid> */}
      </Grid>

      {/* Модалки существующих компонентов */}
      {/* Проект: создание */}
      <ProjectDialog
        open={createProjectOpen}
        mode="create"
        onClose={() => setCreateProjectOpen(false)}
        onSuccess={async () => {
          setCreateProjectOpen(false);
          await projectStore.refreshProjects();
        }}
      />

      {/* Документ: большой диалог создания документа */}
      <DocumentViewer
        open={createDocumentOpen}
        document={null}
        documentId={null}
        isCreating
        onClose={() => setCreateDocumentOpen(false)}
        onNewRevision={() => {}}
        onCompareRevisions={() => {}}
        onCreateDocument={handleCreateDocument}
      />

      {/* Трансмиттал: создание */}
      <TransmittalDialog
        open={createTransmittalOpen}
        onClose={() => setCreateTransmittalOpen(false)}
        onCreateTransmittal={async () => {
          // Заглушка: по-хорошему вызвать API создания трансмиттала
          // Диалог сам закроется после resolve, т.к. вызывает onClose()
        }}
        formatFileSize={(bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`}
        formatDate={(date: string) => new Date(date).toLocaleDateString()}
      />

      {/* Добавление пользователя: отдельного универсального диалога нет; оставляем кнопку для будущей интеграции */}
    </Box>
  );
});

export default Dashboard;