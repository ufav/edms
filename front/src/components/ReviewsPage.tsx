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
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { reviewStore } from '../stores/ReviewStore';
import ProjectRequired from './ProjectRequired';

const ReviewsPage: React.FC = observer(() => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Загружаем ревью при монтировании компонента
  useEffect(() => {
    if (projectStore.hasSelectedProject) {
      reviewStore.loadReviews(projectStore.selectedProject!.id);
    }
  }, [projectStore.selectedProject]);

  // Фильтрация ревью
  const filteredReviews = reviewStore.reviews.filter(review => {
    const statusMatch = filterStatus === 'all' || review.status === filterStatus;
    const projectMatch = filterProject === 'all' || review.document_id.toString() === filterProject;
    const selectedProjectMatch = !projectStore.hasSelectedProject || review.document_id === projectStore.selectedProject?.id;
    const searchMatch = searchTerm === '' || 
      review.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && projectMatch && selectedProjectMatch && searchMatch;
  });

  const handleCreate = () => {
    // TODO: Реализовать создание ревью
    console.log('Create review');
  };

  const handleView = (reviewId: number) => {
    // TODO: Реализовать просмотр ревью
    console.log('View review:', reviewId);
  };

  const handleEdit = (reviewId: number) => {
    // TODO: Реализовать редактирование ревью
    console.log('Edit review:', reviewId);
  };

  const handleComplete = (reviewId: number) => {
    // TODO: Реализовать завершение ревью
    console.log('Complete review:', reviewId);
  };

  const handleDelete = (reviewId: number) => {
    // TODO: Реализовать удаление ревью
    console.log('Delete review:', reviewId);
  };

  return (
    <ProjectRequired>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Ревью {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2' }}
          >
            Создать ревью
          </Button>
        </Box>

        {/* Фильтры и поиск */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Поиск ревью..."
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
                <MenuItem value="pending">Ожидает</MenuItem>
                <MenuItem value="in_progress">В процессе</MenuItem>
                <MenuItem value="completed">Завершено</MenuItem>
                <MenuItem value="rejected">Отклонено</MenuItem>
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

        {/* Таблица ревью */}
        <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
          {reviewStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reviewStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {reviewStore.error}
            </Alert>
          ) : (
            <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ width: '22%', fontWeight: 'bold' }}>Документ</TableCell>
                  <TableCell sx={{ width: '13%', fontWeight: 'bold' }}>Рецензент</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Статус</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Оценка</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Дата</TableCell>
                  <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.map((review, index) => (
                  <TableRow key={review.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.document_title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.reviewer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reviewStore.getReviewStatusLabel(review.status)}
                        color={reviewStore.getReviewStatusColor(review.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {review.rating > 0 ? `${review.rating}/5` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {reviewStore.formatDate(review.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Просмотр">
                          <IconButton size="small" onClick={() => handleView(review.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Редактировать">
                          <IconButton size="small" onClick={() => handleEdit(review.id)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {review.status === 'pending' && (
                          <Tooltip title="Завершить">
                            <IconButton size="small" onClick={() => handleComplete(review.id)} color="success">
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Удалить">
                          <IconButton size="small" onClick={() => handleDelete(review.id)} color="error">
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

        {!reviewStore.isLoading && filteredReviews.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Ревью не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтры или создать новые ревью
            </Typography>
          </Box>
        )}
      </Box>
    </ProjectRequired>
  );
});

export default ReviewsPage;