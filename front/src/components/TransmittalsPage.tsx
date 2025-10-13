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
  Send as SendIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { transmittalStore } from '../stores/TransmittalStore';
import referenceDataStore from '../stores/ReferenceDataStore';
import ProjectRequired from './ProjectRequired';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../hooks/useCurrentUser';

const TransmittalsPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const { isViewer } = useCurrentUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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


  const handleCreate = () => {
    // TODO: Реализовать создание трансмиттала
  };

  const handleView = (transmittalId: number) => {
    // TODO: Реализовать просмотр трансмиттала
  };

  const handleSend = (transmittalId: number) => {
    // TODO: Реализовать отправку трансмиттала
  };

  const handleReceive = (transmittalId: number) => {
    // TODO: Реализовать подтверждение получения
  };

  const handleDelete = (transmittalId: number) => {
    // TODO: Реализовать удаление трансмиттала
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
                <Table sx={{ 
                  tableLayout: 'fixed', 
                  width: '100%', 
                  minWidth: '100%',
                  '& .MuiTableCell-root[data-sticky="true"]': {
                    width: '130px !important',
                    minWidth: '130px !important',
                    maxWidth: '130px !important',
                  }
                }}>
                  <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f5f5f5' }}>
                    <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root:not([data-sticky="true"])': { padding: '8px 16px' } }}>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.number')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.title')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.sender')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.recipient')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.status')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.sent')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.received')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12.5%'
                      }}>{t('transmittals.columns.created_by')}</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '130px',
                        minWidth: '130px',
                        maxWidth: '130px',
                        position: 'sticky',
                        right: 0,
                        backgroundColor: '#f5f5f5',
                        zIndex: 3,
                        borderRight: 'none',
                        padding: '8px 4px'
                      }}>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransmittals.map((transmittal, index) => (
                      <TableRow 
                        key={transmittal.id} 
                        sx={{ 
                          '& .MuiTableCell-root:not([data-sticky="true"])': { padding: '8px 16px' },
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                            '& .MuiTableCell-root[data-sticky="true"]': {
                              backgroundColor: '#f5f5f5',
                            },
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
                        <TableCell 
                          data-sticky="true"
                          sx={{ 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            width: '130px',
                            minWidth: '130px',
                            maxWidth: '130px',
                            position: 'sticky',
                            right: 0,
                            backgroundColor: 'white',
                            zIndex: 3,
                            borderRight: 'none',
                            padding: '8px 4px'
                          }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title={t('common.view')}>
                              <IconButton size="small" onClick={() => handleView(transmittal.id)} sx={{ padding: '2px', minWidth: 'auto', color: 'grey' }}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {transmittal.status === 'draft' && (
                              <Tooltip title={t('transmittals.send')}>
                                <IconButton size="small" onClick={() => handleSend(transmittal.id)} sx={{ padding: '2px', minWidth: 'auto', color: 'grey' }}>
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {transmittal.status === 'sent' && (
                              <Tooltip title={t('transmittals.acknowledge')}>
                                <IconButton size="small" onClick={() => handleReceive(transmittal.id)} sx={{ padding: '2px', minWidth: 'auto', color: 'grey' }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('common.delete')}>
                              <IconButton size="small" onClick={() => handleDelete(transmittal.id)} sx={{ padding: '2px', minWidth: 'auto', color: 'grey' }}>
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
        {!isMobile && !transmittalStore.isLoading && (
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
              count={filteredTransmittals.length}
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

export default TransmittalsPage;