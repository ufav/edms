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
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Send as SendIcon,
  Description as DetailsIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { transmittalStore } from '../stores/TransmittalStore';
import referenceDataStore from '../stores/ReferenceDataStore';
import ProjectRequired from './ProjectRequired';
import TransmittalViewDialog from './transmittal/components/TransmittalViewDialog';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ConfirmDialog from './ConfirmDialog';
import AppPagination from './AppPagination';
import { useDeleteDialog } from '../hooks/useDeleteDialog';
import { transmittalsApi } from '../api/client';

const TransmittalsPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const { isViewer } = useCurrentUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedTransmittalId, setSelectedTransmittalId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteDialog = useDeleteDialog();
  const [page, setPage] = useState<number>(1); // 1-based for MUI Pagination
  const rowsPerPage = 25; // фиксированное количество на страницу

  // Загружаем трансмитталы при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      // Загружаем справочные данные для отображения названий компаний
      await referenceDataStore.loadAllReferenceData();
      
      if (projectStore.hasSelectedProject) {
        transmittalStore.loadTransmittals(projectStore.selectedProject!.id);
      }
    };
    
    loadData();
  }, [projectStore.selectedProject]);

  // Фильтрация трансмитталов
  const filteredTransmittals = transmittalStore.transmittals.filter(t => {
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    const projectMatch = filterProject === 'all' || t.project_id.toString() === filterProject;
    const selectedProjectMatch = !projectStore.hasSelectedProject || t.project_id === projectStore.selectedProject?.id;
    const searchMatch = searchTerm === '' || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transmittal_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && projectMatch && selectedProjectMatch && searchMatch;
  });

  // Сбрасываем на первую страницу при изменении фильтров/проекта/поиска
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterProject, searchTerm, projectStore.selectedProject]);

  const totalPages = Math.max(1, Math.ceil(filteredTransmittals.length / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedTransmittals = filteredTransmittals.slice(startIndex, endIndex);


  const handleCreate = () => {
    // TODO: Реализовать создание трансмиттала
  };

  const handleView = (transmittalId: number) => {
    setSelectedTransmittalId(transmittalId);
    setViewerOpen(true);
  };

  const handleSend = (transmittalId: number) => {
    // TODO: Реализовать отправку трансмиттала
  };

  const handleReceive = (transmittalId: number) => {
    // TODO: Реализовать подтверждение получения
  };

  const handleDelete = (transmittalId: number) => {
    deleteDialog.openDeleteDialog({ id: transmittalId });
  };

  const handleConfirmDelete = async (item: { id: number }) => {
    try {
      setDeletingId(item.id);
      await transmittalsApi.delete(item.id);
      if (projectStore.hasSelectedProject) {
        await transmittalStore.loadTransmittals(projectStore.selectedProject!.id, true);
      } else {
        await transmittalStore.loadTransmittals(undefined, true);
      }
    } finally {
      setDeletingId(null);
    }
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
            {t('menu.transmittals')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          {!isViewer && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
            >
              {t('transmittals.create')}
            </Button>
          )}
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
            placeholder={t('transmittals.search_placeholder')}
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
              <MenuItem value="draft">{t('transStatus.draft')}</MenuItem>
              <MenuItem value="sent">{t('transStatus.sent')}</MenuItem>
              <MenuItem value="received">{t('transStatus.received')}</MenuItem>
              <MenuItem value="acknowledged">{t('transStatus.acknowledged')}</MenuItem>
              <MenuItem value="rejected">{t('transStatus.rejected')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>{t('transmittals.project')}</InputLabel>
            <Select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              label={t('transmittals.project')}
            >
              <MenuItem value="all">{t('filter.all')}</MenuItem>
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
          {transmittalStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : transmittalStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {transmittalStore.error}
            </Alert>
          ) : filteredTransmittals.length === 0 ? (
            <TableContainer component={Paper} sx={{ 
              boxShadow: 2, 
              width: '100%', 
              minWidth: '100%', 
              flex: 1,
              minHeight: 0,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 0,
            }}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  {t('transmittals.no_transmittals')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('transmittals.no_transmittals_hint')}
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
              {/* Единая таблица с фиксированным заголовком */}
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
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('transmittals.columns.number')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('transmittals.columns.title')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('transmittals.columns.sender')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('transmittals.columns.recipient')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '100px'
                      }}>{t('transmittals.columns.status')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '100px'
                      }}>{t('transmittals.columns.sent')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '100px'
                      }}>{t('transmittals.columns.received')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('transmittals.columns.created_by')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '12.5%',
                        minWidth: '120px'
                      }}>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedTransmittals.map((transmittal, index) => (
                      <TableRow 
                        key={transmittal.id} 
                        sx={{ 
                          '& .MuiTableCell-root': { padding: '8px 16px' },
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                            '& .MuiTableCell-root': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04) !important'
                            }
                          },
                        }}
                      >
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {transmittal.transmittal_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Tooltip title={transmittal.title} placement="top">
                            <Typography variant="body2" sx={{ 
                              fontSize: '0.875rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {transmittal.title}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            ...(transmittal.status === 'draft' && {
                              fontSize: '0.75rem',
                              fontStyle: 'italic',
                              color: 'text.secondary'
                            })
                          }}>
                            {transmittal.status === 'draft' ? t('transmittals.not_sent') : referenceDataStore.getUserName(transmittal.sender_id!)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {transmittal.recipient_id ? referenceDataStore.getCompanyName(transmittal.recipient_id) : 'Не указан'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          width: '12.5%'
                        }}>
                          <Chip
                            label={transmittalStore.getTransmittalStatusLabel(transmittal.status, t)}
                            color={transmittalStore.getTransmittalStatusColor(transmittal.status) as any}
                            size="small"
                            sx={{ fontSize: '0.75rem', height: '24px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {transmittalStore.formatDate(transmittal.sent_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {transmittalStore.formatDate(transmittal.received_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '12.5%'
                        }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {referenceDataStore.getUserName(transmittal.created_by)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Transmittal Details">
                              <IconButton size="small" onClick={() => handleView(transmittal.id)} sx={{ padding: '4px' }}>
                                <DetailsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {transmittal.status === 'draft' && (
                              <Tooltip title={t('transmittals.send')}>
                                <IconButton size="small" onClick={() => handleSend(transmittal.id)} sx={{ padding: '4px' }}>
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {transmittal.status === 'sent' && (
                              <Tooltip title={t('transmittals.acknowledge')}>
                                <IconButton size="small" onClick={() => handleReceive(transmittal.id)} sx={{ padding: '4px' }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('common.delete')}>
                              <IconButton size="small" onClick={() => handleDelete(transmittal.id)} disabled={deletingId === transmittal.id} sx={{ padding: '4px' }}>
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

        {/* Фиксированная пагинация без выбора кол-ва строк */}
        {!transmittalStore.isLoading && (
          <AppPagination
            count={filteredTransmittals.length}
            page={Math.min(page, totalPages)}
            onPageChange={(_, value) => setPage(value)}
            simple
            rowsPerPage={rowsPerPage}
            insetLeft={isMobile ? 0 : 240}
            align="right"
          />
        )}
      </Box>
      <TransmittalViewDialog
        open={viewerOpen}
        transmittalId={selectedTransmittalId}
        onClose={() => {
          setViewerOpen(false);
          setSelectedTransmittalId(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        title={t('transmittals.delete_confirm_title') || 'Подтверждение удаления'}
        content={t('transmittals.delete_confirm_content') || 'Удалить трансмиттал? Это действие можно отменить позже, так как используется мягкое удаление.'}
        confirmText={t('transmittals.delete_confirm') || 'Удалить'}
        cancelText={t('common.cancel')}
        onConfirm={() => deleteDialog.confirmDelete(handleConfirmDelete)}
        onClose={deleteDialog.closeDeleteDialog}
        loading={deleteDialog.isLoading}
      />
    </ProjectRequired>
  );
});

export default TransmittalsPage;