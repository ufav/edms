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
  Tooltip
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
import { useCurrentUser } from '../hooks/useCurrentUser';

const ProjectsPage: React.FC = observer(() => {
  const { canManageProject } = useCurrentUser();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [membersDialogOpen, setMembersDialogOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');

  // Загружаем проекты при монтировании компонента
  useEffect(() => {
    projectStore.loadProjects();
  }, []);

  // Фильтрация проектов
  const filteredProjects = projectStore.projects.filter(project => {
    const statusMatch = filterStatus === 'all' || project.status === filterStatus;
    const searchMatch = searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  const handleCreate = async () => {
    try {
      // Простое создание проекта с минимальными полями
      const today = new Date();
      const defaultName = `Новый проект ${today.toLocaleDateString('ru-RU')}`;
      const newProjectData: any = {
        name: defaultName,
        description: '',
        status: 'active',
      };
      // Создаем проект через API
      const created = await projectsApi.create(newProjectData);
      // Перезагружаем список проектов, чтобы он сразу появился
      await projectStore.loadProjects();
      // Выбираем созданный проект
      if (created?.id) {
        const justCreated = projectStore.getProjectById(created.id);
        if (justCreated) {
          projectStore.selectProject(justCreated);
        }
      }
    } catch (e) {
      console.error('Ошибка создания проекта:', e);
    }
  };

  const handleView = (projectId: number) => {
    // TODO: Реализовать просмотр проекта
    console.log('View project:', projectId);
  };

  const handleEdit = (projectId: number) => {
    // TODO: Реализовать редактирование проекта
    console.log('Edit project:', projectId);
  };

  const handleDelete = (projectId: number) => {
    // TODO: Реализовать удаление проекта
    console.log('Delete project:', projectId);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Проекты
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ backgroundColor: '#1976d2' }}
        >
          Создать проект
        </Button>
      </Box>

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Поиск проектов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Статус"
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="planning">Планирование</MenuItem>
              <MenuItem value="completed">Завершенные</MenuItem>
              <MenuItem value="cancelled">Отмененные</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Таблица проектов */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
        {projectStore.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : projectStore.error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {projectStore.error}
          </Alert>
        ) : (
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ width: '25%', fontWeight: 'bold' }}>Название</TableCell>
                <TableCell sx={{ width: '20%', fontWeight: 'bold' }}>Описание</TableCell>
                <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Код проекта</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Статус</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Дата начала</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Дата окончания</TableCell>
                <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Владелец</TableCell>
                <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.project_code || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={project.status}
                      color={project.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {project.start_date ? formatDate(project.start_date) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {project.end_date ? formatDate(project.end_date) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.owner_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
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

      {!projectStore.isLoading && filteredProjects.length === 0 && (
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
    </Box>
  );
});

export default ProjectsPage;