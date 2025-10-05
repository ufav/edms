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
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { projectsApi } from '../api/client';
import ProjectMembersDialog from './ProjectMembersDialog';
import EditProjectDialog from './EditProjectDialog';
import CreateProjectDialog from './CreateProjectDialog';
import ConfirmDialog from './ConfirmDialog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTranslation } from 'react-i18next';

const ProjectsPage: React.FC = observer(() => {
  const { canManageProject } = useCurrentUser();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [membersDialogOpen, setMembersDialogOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
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
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = (newProject: any) => {
    projectStore.loadProjects(true); // Принудительно обновляем список проектов
    projectStore.selectProject(newProject); // Выбираем только что созданный проект
    
    // Показываем уведомление об успешном создании
    setSuccessNotification({
      open: true,
      message: `Создан проект "${newProject.name}"`
    });
  };

  const handleView = (_projectId: number) => {
    // TODO: Реализовать просмотр проекта
  };

  const handleEdit = (projectId: number) => {
    setEditProjectId(projectId);
    setEditDialogOpen(true);
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

  const handleManageMembers = (projectId: number, projectName: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setMembersDialogOpen(true);
  };

  const handleCloseMembersDialog = () => {
    setMembersDialogOpen(false);
    setSelectedProjectId(null);
    setSelectedProjectName('');
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
        >
          {t('project.create')}
        </Button>
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
                    <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title={t('common.view')}>
                        <IconButton size="small" onClick={() => handleView(project.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => handleEdit(project.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {canManageProject(project.id) && (
                        <Tooltip title={t('projects.manage_members')}>
                          <IconButton size="small" onClick={() => handleManageMembers(project.id, project.name)}>
                            <PeopleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => handleDelete(project.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
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
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  width: '12%',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{t('common.actions')}</TableCell>
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
                  <TableCell sx={{ 
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Просмотр">
                        <IconButton size="small" onClick={() => handleView(project.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => handleEdit(project.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {canManageProject(project) && (
                        <Tooltip title="Управление участниками">
                          <IconButton size="small" onClick={() => handleManageMembers(project.id, project.name)}>
                            <PeopleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Удалить">
                        <IconButton size="small" onClick={() => handleDelete(project.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
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
            Проекты не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Попробуйте изменить фильтры или создать новые проекты
          </Typography>
        </Box>
      )}

      {/* Диалог управления участниками */}
      {selectedProjectId && (
        <ProjectMembersDialog
          open={membersDialogOpen}
          onClose={handleCloseMembersDialog}
          projectId={selectedProjectId}
          projectName={selectedProjectName}
        />
      )}

      {/* Диалог редактирования проекта */}
      {editProjectId && (
        <EditProjectDialog
          open={editDialogOpen}
          projectId={editProjectId}
          onClose={() => setEditDialogOpen(false)}
          onSaved={() => {
            setEditDialogOpen(false);
            projectStore.loadProjects(true);
          }}
        />
      )}

      {/* Диалог создания проекта */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Удалить проект?"
        content="Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
        loading={deleteLoading}
      />

      {/* Уведомление об успешном создании проекта */}
      <Snackbar
        open={successNotification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successNotification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default ProjectsPage;