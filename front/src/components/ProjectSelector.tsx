import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import type { Project } from '../stores/ProjectStore';
import { useTranslation } from 'react-i18next';

interface ProjectSelectorProps {
  onProjectSelect: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = observer(({ onProjectSelect }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const handleProjectClick = (project: Project) => {
    projectStore.selectProject(project);
    onProjectSelect(project);
    setOpen(false);
  };

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const getStatusLabel = (status: string) => {
    // Преобразуем статус в нижний регистр для ключа локализации
    if (!status || typeof status !== 'string') {
      return '';
    }
    const statusKey = status.toLowerCase();
    return t(`projects.status.${statusKey}`) || status || '';
  };

  const getStatusColor = (status: string) => {
    // Нормализуем статус к верхнему регистру для сравнения
    if (!status || typeof status !== 'string') {
      return { bg: '#e9ecef', text: '#495057' }; // Серый по умолчанию
    }
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'PLANNING':
        return { bg: '#fff3cd', text: '#856404' }; // Пастельный желтый
      case 'ACTIVE':
        return { bg: '#d1e7dd', text: '#0f5132' }; // Пастельный зеленый
      case 'ON_HOLD':
        return { bg: '#cfe2ff', text: '#084298' }; // Пастельный синий
      case 'COMPLETED':
        return { bg: '#d1ecf1', text: '#055160' }; // Пастельный голубой
      case 'CANCELLED':
        return { bg: '#f8d7da', text: '#842029' }; // Пастельный красный
      default:
        return { bg: '#e9ecef', text: '#495057' }; // Серый по умолчанию
    }
  };

  // Фильтрация проектов по статусу
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') {
      return projectStore.projects;
    }
    return projectStore.projects.filter(project => 
      project.status.toUpperCase() === statusFilter.toUpperCase()
    );
  }, [projectStore.projects, statusFilter]);

  // Явно переводим фокус внутрь Dialog при открытии
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogContentRef.current?.focus();
      }, 0);
    }
  }, [open]);

  return (
    <>
      {/* Кнопка выбора проекта */}
      <Button
        variant="outlined"
        onClick={() => {
          handleOpenDialog();
        }}
        data-project-selector
        sx={{
          minWidth: isMobile ? 150 : 200,
          justifyContent: 'center',
          textTransform: 'none',
          backgroundColor: '#ffffff',
          borderColor: '#1976d2',
          color: '#1976d2',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          '&:hover': {
            borderColor: '#1565c0',
            backgroundColor: '#f5f5f5',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
          }
        }}
      >
        {projectStore.selectedProject ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {projectStore.selectedProject.project_code}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {t('projects.select_project')}
            </Typography>
          </Box>
        )}
      </Button>

      {/* Диалог выбора проекта */}
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 2 }
        }}
      >
        <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'background.paper' }}>
          {t('projects.selection.title')}
        </DialogTitle>
        <DialogContent 
          ref={dialogContentRef}
          tabIndex={-1}
          sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden' }}
        >
          {projectStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : projectStore.error ? (
            <Alert severity="error" sx={{ mb: 2, mx: 3, mt: 2 }}>
              {projectStore.error}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Фильтр по статусу - зафиксирован */}
              <Box sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper', px: 3, pt: 2, mb: 1.5 }}>
                <FormControl sx={{ width: '20%', minWidth: 200 }}>
                  <InputLabel>{t('common.status')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t('common.status')}
                    sx={{ minWidth: 200 }}
                  >
                    <MenuItem value="all">{t('filter.all')}</MenuItem>
                    <MenuItem value="PLANNING">{t('projects.status.planning')}</MenuItem>
                    <MenuItem value="ACTIVE">{t('projects.status.active')}</MenuItem>
                    <MenuItem value="ON_HOLD">{t('projects.status.on_hold')}</MenuItem>
                    <MenuItem value="COMPLETED">{t('projects.status.completed')}</MenuItem>
                    <MenuItem value="CANCELLED">{t('projects.status.cancelled')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Сетка с карточками проектов - скроллируемая */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                px: 3, 
                pt: 0, 
                pb: 1.5,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#a8a8a8',
                  },
                },
              }}>
                <Grid container spacing={1.5}>
                {filteredProjects.map((project) => {
                  const isSelected = projectStore.selectedProject?.id === project.id;
                  const statusColor = getStatusColor(project.status);
                  return (
                  <Grid item xs={10} sm={5} md={3} key={project.id}>
                    <Card
                      onClick={() => handleProjectClick(project)}
                      sx={{
                        aspectRatio: '1',
                        width: '100%',
                        cursor: 'pointer',
                        border: isSelected ? `3px solid ${statusColor.bg}` : '1px solid #e0e0e0',
                        backgroundColor: isSelected ? `${statusColor.bg}40` : 'transparent',
                        boxShadow: 'none',
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: isSelected ? `${statusColor.bg}60` : 'rgba(25, 118, 210, 0.04)',
                          borderColor: isSelected ? statusColor.bg : '#1976d2',
                        },
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1,
                            color: statusColor.text,
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircleIcon sx={{ fontSize: 24 }} />
                        </Box>
                      )}
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {project.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          {project.project_code}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 1,
                            flex: 1
                          }}
                        >
                          {i18n.language === 'ru' ? 'Период' : 'Period'}: {new Date(project.start_date).toLocaleDateString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })} - {new Date(project.end_date).toLocaleDateString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </Typography>
                        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            {project.status && (
                              <Chip
                                label={getStatusLabel(project.status) || String(project.status || '')}
                                size="small"
                                sx={{
                                  backgroundColor: getStatusColor(project.status).bg,
                                  color: getStatusColor(project.status).text,
                                  border: 'none',
                                  '& .MuiChip-label': {
                                    paddingLeft: '8px',
                                    paddingRight: '8px',
                                  }
                                }}
                              />
                            )}
                          </Box>
                          {/* Прогресс завершения */}
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {Math.round(project.completion_progress || 0)}%
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                position: 'relative',
                                width: '100%',
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: 'grey.200',
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${project.completion_progress || 0}%`,
                                  maxWidth: '100%',
                                  background: 'linear-gradient(90deg, #4caf50, #81c784)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                    </Grid>
                  );
                })}
                </Grid>
                
                {filteredProjects.length === 0 && (
                  <Box textAlign="center" p={3}>
                    <Typography variant="body2" color="text.secondary">
                      {t('projects.no_projects')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

export default ProjectSelector;
