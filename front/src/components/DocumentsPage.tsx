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
  FilterList as FilterIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { documentStore } from '../stores/DocumentStore';
import ProjectRequired from './ProjectRequired';

const DocumentsPage: React.FC = observer(() => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Загружаем документы при монтировании компонента
  useEffect(() => {
    if (projectStore.hasSelectedProject) {
      documentStore.loadDocuments(projectStore.selectedProject!.id);
    }
  }, [projectStore.selectedProject]);

  // Фильтрация документов
  const filteredDocuments = documentStore.documents.filter(doc => {
    const statusMatch = filterStatus === 'all' || doc.status === filterStatus;
    const projectMatch = filterProject === 'all' || doc.project_id.toString() === filterProject;
    const selectedProjectMatch = !projectStore.hasSelectedProject || doc.project_id === projectStore.selectedProject?.id;
    const searchMatch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && projectMatch && selectedProjectMatch && searchMatch;
  });

  const handleUpload = () => {
    // TODO: Реализовать загрузку документа
    console.log('Upload document');
  };

  const handleView = (documentId: number) => {
    // TODO: Реализовать просмотр документа
    console.log('View document:', documentId);
  };

  const handleDownload = (documentId: number) => {
    // TODO: Реализовать скачивание документа
    console.log('Download document:', documentId);
  };

  const handleDelete = (documentId: number) => {
    // TODO: Реализовать удаление документа
    console.log('Delete document:', documentId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    <ProjectRequired>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Документы {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleUpload}
            sx={{ backgroundColor: '#1976d2' }}
          >
            Загрузить документ
          </Button>
        </Box>

        {/* Фильтры и поиск */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Поиск документов..."
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
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="review">На ревью</MenuItem>
                <MenuItem value="approved">Утвержден</MenuItem>
                <MenuItem value="rejected">Отклонен</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Проект</InputLabel>
              <Select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                label="Проект"
              >
                <MenuItem value="all">Все</MenuItem>
                {projectStore.projects.map((project) => (
                  <MenuItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Таблица документов */}
        <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
          {documentStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : documentStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {documentStore.error}
            </Alert>
          ) : (
            <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ width: '25%', fontWeight: 'bold' }}>Название</TableCell>
                  <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>Файл</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Размер</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Версия</TableCell>
                  <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Статус</TableCell>
                  <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Дата</TableCell>
                  <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {document.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {document.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {document.file_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFileSize(document.file_size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.version}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={documentStore.getDocumentStatusLabel(document.status)}
                        color={documentStore.getDocumentStatusColor(document.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(document.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Просмотр">
                          <IconButton size="small" onClick={() => handleView(document.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Скачать">
                          <IconButton size="small" onClick={() => handleDownload(document.id)}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton size="small" onClick={() => handleDelete(document.id)} color="error">
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

        {!documentStore.isLoading && filteredDocuments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Документы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтры или загрузить новые документы
            </Typography>
          </Box>
        )}
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;