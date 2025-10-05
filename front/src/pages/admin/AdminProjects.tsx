import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Autocomplete,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { projectsApi, usersApi, type Project as ApiProject, type User as ApiUser } from '../../api/client';

const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    project_manager_id: null as number | null,
    participants: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsList, usersList] = await Promise.all([
        projectsApi.getAll(),
        usersApi.getAll(),
      ]);
      setProjects(projectsList);
      setUsers(usersList);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      project_manager_id: null,
      participants: [],
    });
    setDialogOpen(true);
  };

  const handleEditProject = (project: ApiProject) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      project_manager_id: project.project_manager_id || null,
      participants: project.participants?.map(p => p.id) || [],
    });
    setDialogOpen(true);
  };

  const handleSaveProject = async () => {
    try {
      const projectData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingProject) {
        await projectsApi.update(editingProject.id, projectData);
      } else {
        await projectsApi.create(projectData);
      }
      
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Ошибка сохранения проекта');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот проект?')) {
      try {
        await projectsApi.delete(projectId);
        loadData();
      } catch (err) {
        setError('Ошибка удаления проекта');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'completed': return 'Завершен';
      case 'on_hold': return 'Приостановлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const getProjectManager = (project: ApiProject) => {
    return users.find(u => u.id === project.project_manager_id);
  };

  const getParticipants = (project: ApiProject) => {
    return users.filter(u => project.participants?.some(p => p.id === u.id));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Управление проектами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateProject}
        >
          Добавить проект
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Руководитель</TableCell>
              <TableCell>Участники</TableCell>
              <TableCell>Даты</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {project.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                    {project.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(project.status)}
                    color={getStatusColor(project.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {getProjectManager(project) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {getProjectManager(project)?.full_name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {getProjectManager(project)?.full_name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                    {getParticipants(project).map((participant) => (
                      <Avatar key={participant.id} sx={{ width: 24, height: 24 }}>
                        {participant.full_name?.charAt(0)}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {project.start_date && new Date(project.start_date).toLocaleDateString('ru-RU')}
                  </Typography>
                  {project.end_date && (
                    <Typography variant="body2" color="text.secondary">
                      — {new Date(project.end_date).toLocaleDateString('ru-RU')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Редактировать">
                      <IconButton
                        size="small"
                        onClick={() => handleEditProject(project)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования проекта */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProject ? 'Редактировать проект' : 'Создать проект'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Название проекта"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Дата начала"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Дата окончания"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Статус"
              >
                <MenuItem value="active">Активный</MenuItem>
                <MenuItem value="completed">Завершен</MenuItem>
                <MenuItem value="on_hold">Приостановлен</MenuItem>
                <MenuItem value="cancelled">Отменен</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Руководитель проекта</InputLabel>
              <Select
                value={formData.project_manager_id || ''}
                onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value ? Number(e.target.value) : null })}
                label="Руководитель проекта"
              >
                <MenuItem value="">Не назначен</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name} ({user.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => `${option.full_name} (${option.username})`}
              value={users.filter(u => formData.participants.includes(u.id))}
              onChange={(_, newValue) => {
                setFormData({ ...formData, participants: newValue.map(u => u.id) });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Участники проекта"
                  placeholder="Выберите участников"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.full_name}
                    avatar={<Avatar>{option.full_name?.charAt(0)}</Avatar>}
                  />
                ))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveProject} variant="contained">
            {editingProject ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProjects;
