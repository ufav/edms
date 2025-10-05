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
  CircularProgress,
  Alert,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { documentsApi, projectsApi, usersApi, type Document as ApiDocument, type Project as ApiProject, type User as ApiUser } from '../../api/client';

const AdminDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ApiDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: undefined as number | undefined,
    discipline_id: undefined as number | undefined,
    document_type_id: undefined as number | undefined,
    status: 'draft',
    assigned_to: undefined as number | undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [documentsList, projectsList, usersList] = await Promise.all([
        documentsApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll(),
      ]);
      setDocuments(documentsList);
      setProjects(projectsList);
      setUsers(usersList);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setFormData({
      title: '',
      description: '',
      project_id: undefined,
      discipline_id: undefined,
      document_type_id: undefined,
      status: 'draft',
      assigned_to: undefined,
    });
    setDialogOpen(true);
  };

  const handleEditDocument = (document: ApiDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      description: document.description || '',
      project_id: document.project_id || undefined,
      discipline_id: document.discipline_id || undefined,
      document_type_id: document.document_type_id || undefined,
      status: document.status,
      assigned_to: document.assigned_to || undefined,
    });
    setDialogOpen(true);
  };

  const handleSaveDocument = async () => {
    try {
      if (editingDocument) {
        await documentsApi.update(editingDocument.id, formData);
      } else {
        await documentsApi.create(formData);
      }
      
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Ошибка сохранения документа');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      try {
        await documentsApi.delete(documentId);
        loadData();
      } catch (err) {
        setError('Ошибка удаления документа');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'archived': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'review': return 'На рассмотрении';
      case 'approved': return 'Утвержден';
      case 'rejected': return 'Отклонен';
      case 'archived': return 'Архив';
      default: return status;
    }
  };

  const getProject = (document: ApiDocument) => {
    return projects.find(p => p.id === document.project_id);
  };

  const getAssignedUser = (document: ApiDocument) => {
    return users.find(u => u.id === document.assigned_to);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <Typography variant="h4">Управление документами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateDocument}
        >
          Добавить документ
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
              <TableCell>Проект</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Ответственный</TableCell>
              <TableCell>Файл</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {document.title}
                  </Typography>
                  {document.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                      {document.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getProject(document)?.name || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(document.status)}
                    color={getStatusColor(document.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {getAssignedUser(document) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {getAssignedUser(document)?.full_name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {getAssignedUser(document)?.full_name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {document.file_name ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {document.file_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(document.file_size || 0)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(document.created_at).toLocaleDateString('ru-RU')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Редактировать">
                      <IconButton
                        size="small"
                        onClick={() => handleEditDocument(document)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Версии">
                      <IconButton
                        size="small"
                        onClick={() => {
                          // TODO: Открыть диалог с версиями
                        }}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Скачать">
                      <IconButton
                        size="small"
                        disabled={!document.file_name}
                        onClick={() => {
                          // TODO: Скачать файл
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDocument(document.id)}
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

      {/* Диалог создания/редактирования документа */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDocument ? 'Редактировать документ' : 'Создать документ'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Название документа"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Проект</InputLabel>
                <Select
                  value={formData.project_id || ''}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? Number(e.target.value) : undefined })}
                  label="Проект"
                >
                  <MenuItem value="">Выберите проект</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Статус"
                >
                  <MenuItem value="draft">Черновик</MenuItem>
                  <MenuItem value="review">На рассмотрении</MenuItem>
                  <MenuItem value="approved">Утвержден</MenuItem>
                  <MenuItem value="rejected">Отклонен</MenuItem>
                  <MenuItem value="archived">Архив</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Ответственный</InputLabel>
                <Select
                  value={formData.assigned_to || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value ? Number(e.target.value) : undefined })}
                  label="Ответственный"
                >
                <MenuItem value="">Не назначен</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name} ({user.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveDocument} variant="contained">
            {editingDocument ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocuments;
