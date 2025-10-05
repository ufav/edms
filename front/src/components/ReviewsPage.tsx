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
import { useTranslation } from 'react-i18next';

const ReviewsPage: React.FC = observer(() => {
  const { t } = useTranslation();
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
  };

  const handleView = (reviewId: number) => {
    // TODO: Реализовать просмотр ревью
  };

  const handleEdit = (reviewId: number) => {
    // TODO: Реализовать редактирование ревью
  };

  const handleComplete = (reviewId: number) => {
    // TODO: Реализовать завершение ревью
  };

  const handleDelete = (reviewId: number) => {
    // TODO: Реализовать удаление ревью
  };

  return (
    <ProjectRequired>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            {t('menu.reviews')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2' }}
          >
            {t('reviews.create')}
          </Button>
        </Box>

        {/* Фильтры и поиск */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          mb: 3
        }}>
          <TextField
            placeholder={t('reviews.search_placeholder')}
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
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label={t('common.status')}
            >
              <MenuItem value="all">{t('filter.all')}</MenuItem>
              <MenuItem value="pending">{t('reviewStatus.pending')}</MenuItem>
              <MenuItem value="in_progress">{t('reviewStatus.in_progress')}</MenuItem>
              <MenuItem value="completed">{t('reviewStatus.completed')}</MenuItem>
              <MenuItem value="rejected">{t('reviewStatus.rejected')}</MenuItem>
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
                  <TableCell sx={{ width: '22%', fontWeight: 'bold' }}>{t('reviews.columns.document')}</TableCell>
                  <TableCell sx={{ width: '13%', fontWeight: 'bold' }}>{t('reviews.columns.reviewer')}</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>{t('reviews.columns.status')}</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>{t('reviews.columns.rating')}</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>{t('reviews.columns.date')}</TableCell>
                  <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>{t('common.actions')}</TableCell>
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
                        <Tooltip title={t('common.view')}>
                          <IconButton size="small" onClick={() => handleView(review.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('project.edit')}>
                          <IconButton size="small" onClick={() => handleEdit(review.id)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {review.status === 'pending' && (
                          <Tooltip title={t('reviews.complete')}>
                            <IconButton size="small" onClick={() => handleComplete(review.id)} color="success">
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t('common.delete')}>
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