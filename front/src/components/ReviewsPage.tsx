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
  TablePagination,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      <Box sx={{ 
        width: '100%', 
        minWidth: 0, 
        pt: 3, // padding только сверху
        px: 3, // padding только по бокам
        pb: 0, // убираем padding снизу
        height: !isMobile ? 'calc(100vh - 117px)' : '100vh', // Всегда вычитаем высоту пагинации для десктопа
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', // Убираем прокрутку страницы
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1">
            {t('menu.reviews')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
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

        {/* Контейнер таблицы */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {reviewStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reviewStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {reviewStore.error}
            </Alert>
          ) : filteredReviews.length === 0 ? (
            <TableContainer component={Paper} sx={{ 
              boxShadow: 2, 
              width: '100%', 
              minWidth: '100%', 
              flex: 1,
              minHeight: 0,
              height: '100%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 0,
            }}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  {t('reviews.no_reviews')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('reviews.no_reviews_hint')}
                </Typography>
              </Box>
            </TableContainer>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: 0,
              marginBottom: 0,
              paddingBottom: 0
            }}>
              {/* Заголовок таблицы - зафиксирован */}
              <Box sx={{ 
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#f5f5f5',
                boxShadow: 2,
              }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '22%',
                        minWidth: '220px'
                      }}>{t('reviews.columns.document')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '13%',
                        minWidth: '130px'
                      }}>{t('reviews.columns.reviewer')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '10%',
                        minWidth: '100px'
                      }}>{t('reviews.columns.status')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '8%',
                        minWidth: '80px'
                      }}>{t('reviews.columns.rating')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '10%',
                        minWidth: '100px'
                      }}>{t('reviews.columns.date')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '18%',
                        minWidth: '180px'
                      }}>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                </Table>
              </Box>
              
              {/* Тело таблицы - скроллируемое */}
              <TableContainer component={Paper} sx={{ 
                flex: 1,
                minHeight: 0,
                maxHeight: 'calc(48px + 13 * 48px)', // Ограничиваем высоту 13 строками (заголовок + 13 строк)
                overflow: 'auto',
                borderRadius: 0,
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
                <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                  <TableBody>
                    {filteredReviews.map((review, index) => (
                      <TableRow 
                        key={review.id} 
                        sx={{ 
                          '& .MuiTableCell-root': { padding: '8px 16px' },
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                          },
                        }}
                      >
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '22%',
                          minWidth: '220px'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {review.document_title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '13%',
                          minWidth: '130px'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {review.reviewer_name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          width: '10%',
                          minWidth: '100px'
                        }}>
                          <Chip
                            label={reviewStore.getReviewStatusLabel(review.status)}
                            color={reviewStore.getReviewStatusColor(review.status) as any}
                            size="small"
                            sx={{ fontSize: '0.75rem', height: '24px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '8%',
                          minWidth: '80px'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {review.rating > 0 ? `${review.rating}/5` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '10%',
                          minWidth: '100px'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {reviewStore.formatDate(review.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          width: '18%',
                          minWidth: '180px'
                        }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={t('common.view')}>
                              <IconButton size="small" onClick={() => handleView(review.id)} sx={{ padding: '4px' }}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('project.edit')}>
                              <IconButton size="small" onClick={() => handleEdit(review.id)} sx={{ padding: '4px' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {review.status === 'pending' && (
                              <Tooltip title={t('reviews.complete')}>
                                <IconButton size="small" onClick={() => handleComplete(review.id)} color="success" sx={{ padding: '4px' }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('common.delete')}>
                              <IconButton size="small" onClick={() => handleDelete(review.id)} color="error" sx={{ padding: '4px' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>

        {/* Фиксированная пагинация внизу экрана */}
        {!isMobile && !reviewStore.isLoading && (
          <Box sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: '1px solid #e0e0e0',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            paddingLeft: '240px', // Отступ для бокового меню
            '@media (max-width: 900px)': {
              paddingLeft: 0, // На мобильных устройствах без отступа
            },
            backgroundColor: 'white',
          }}>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredReviews.length}
              rowsPerPage={25}
              page={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              labelRowsPerPage={t('common.rows_per_page')}
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.more_than')} ${to}`}`
              }
              sx={{
                '& .MuiTablePagination-toolbar': {
                  paddingLeft: 2,
                  paddingRight: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end', // Выравниваем пагинацию справа
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </ProjectRequired>
  );
});

export default ReviewsPage;