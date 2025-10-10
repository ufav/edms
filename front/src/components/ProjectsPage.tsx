import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { projectsApi } from '../api/client';
import ProjectDialog from './ProjectDialog';
import ConfirmDialog from './ConfirmDialog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { userStore } from '../stores/UserStore';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import NotificationSnackbar from './NotificationSnackbar';

const ProjectsPage: React.FC = observer(() => {
  const { canEditProject, canDeleteProject, isAdmin, isOperator, isViewer } = useCurrentUser();
  const permissions = usePermissions();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [projectDialogOpen, setProjectDialogOpen] = useState<boolean>(false);
  const [projectDialogMode, setProjectDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [successNotification, setSuccessNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Загружаем проекты при монтировании компонента
  useEffect(() => {
    projectStore.loadProjects();
  }, []);

  // Фильтрация и сортировка проектов
  const filteredProjects = projectStore.projects
    .filter(project => {
      const statusMatch = filterStatus === 'all' || project.status === filterStatus;
      const searchMatch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      // Сортировка по дате создания (новые сверху)
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

  const handleCreate = () => {
    setProjectDialogMode('create');
    setEditProjectId(null);
    setProjectDialogOpen(true);
  };

  const handleCreateSuccess = (newProject: any) => {
    projectStore.loadProjects(true); // Принудительно обновляем список проектов
    projectStore.selectProject(newProject); // Выбираем только что созданный проект
    
    // Показываем уведомление об успешном создании
    setSuccessNotification({
      open: true,
      message: t('projects.created_notification', { name: newProject.name })
    });
  };


  const handleEdit = (projectId: number) => {
    setProjectDialogMode('edit');
    setEditProjectId(projectId);
    setProjectDialogOpen(true);
  };

  const handleProjectDialogClose = () => {
    setProjectDialogOpen(false);
    setEditProjectId(null);
  };

  const handleProjectSaved = () => {
    projectStore.loadProjects(true);
    setSuccessNotification({
      open: true,
      message: t('projects.updated_notification')
    });
  };

  const handleDelete = (projectId: number) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      setDeleteLoading(true);
      await projectsApi.delete(projectToDelete);
      
      // Удаляем проект из стора моментально
      projectStore.removeProject(projectToDelete);
      
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      // TODO: Показать уведомление об ошибке
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  const handleCloseNotification = () => {
    setSuccessNotification({ open: false, message: '' });
  };


  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          {t('menu.projects')}
        </Typography>
        {permissions.canCreateProjects && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
          >
            {t('project.create')}
          </Button>
        )}
      </Box>

      {/* Фильтры и поиск */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row',
        mb: 3
      }}>
        <TextField
          placeholder={t('projects.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
          <InputLabel>{t('common.status')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label={t('common.status')}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="active">{t('status.active')}</MenuItem>
            <MenuItem value="planning">{t('status.planning')}</MenuItem>
            <MenuItem value="completed">{t('status.completed')}</MenuItem>
            <MenuItem value="cancelled">{t('status.cancelled')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Проекты */}
      {isMobile ? (
        // Мобильная версия - карточки
        <Box>
          {projectStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : projectStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {projectStore.error}
            </Alert>
          ) : filteredProjects.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              {t('projects.no_projects')}
            </Alert>
          ) : (
            <Grid container spacing={2} sx={{ p: 2 }}>
              {filteredProjects.map((project) => (
                <Grid item xs={12} key={project.id}>
                  <Card sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
                    <CardContent>
                      <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {project.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip 
                          label={project.project_code || '-'} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={t(`status.${project.status}`)} 
                          size="small" 
                          color={project.status === 'active' ? 'success' : 
                                 project.status === 'completed' ? 'primary' : 
                                 project.status === 'cancelled' ? 'error' : 'default'} 
                        />
                        <Chip 
                          label={formatDate(project.start_date)} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={project.owner_name || '-'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </CardContent>
                    {!isViewer && (
                      <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                        {canEditProject(project) && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => handleEdit(project.id)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDeleteProject(project) && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" onClick={() => handleDelete(project.id)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      ) : (
        // Десктопная версия - таблица
        <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0', width: '100%' }}>
          {projectStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : projectStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {projectStore.error}
            </Alert>
          ) : (
          <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '20%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.name')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '25%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.description')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '12%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.code')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '10%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.status')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '10%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.start_date')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '10%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.end_date')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '11%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('projects.columns.owner')}</TableCell>
                {!isViewer && (
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    width: '12%',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{t('common.actions')}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Tooltip title={project.name} placement="top">
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}>
                        {project.name}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Tooltip title={project.description || '-'} placement="top">
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}>
                        {project.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Tooltip title={project.project_code || '-'} placement="top">
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}>
                        {project.project_code || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Chip
                      label={project.status}
                      color={project.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Typography variant="body2" sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}>
                      {project.start_date ? formatDate(project.start_date) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Typography variant="body2" sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}>
                      {project.end_date ? formatDate(project.end_date) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Tooltip title={project.owner_name || '-'} placement="top">
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}>
                        {project.owner_name || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  {!isViewer && (
                    <TableCell sx={{ 
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {canEditProject(project) && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => handleEdit(project.id)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDeleteProject(project) && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" onClick={() => handleDelete(project.id)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </TableContainer>
      )}

      {!isMobile && !projectStore.isLoading && filteredProjects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {t('projects.no_projects')}
          </Typography>
        </Box>
      )}


      {/* Унифицированный диалог проекта */}
      <ProjectDialog
        open={projectDialogOpen}
        mode={projectDialogMode}
        projectId={editProjectId || undefined}
        onClose={handleProjectDialogClose}
        onSuccess={handleCreateSuccess}
        onSaved={handleProjectSaved}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('projects.delete_confirm_title')}
        content={t('projects.delete_confirm_content')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
        loading={deleteLoading}
      />

      {/* Уведомление об успешном создании проекта */}
      <NotificationSnackbar
        open={successNotification.open}
        message={successNotification.message}
        severity="success"
        onClose={handleCloseNotification}
      />
    </Box>
  );
});

export default ProjectsPage;