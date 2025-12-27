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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { auditLogsApi } from '../api/client';
import type { AuditLog } from '../api/client';
import AppPagination from './AppPagination';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const rowsPerPage = 13;
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  
  // Загрузка логов
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditLogsApi.getAll({
        skip: (page - 1) * rowsPerPage,
        limit: rowsPerPage,
        action: filterAction !== 'all' ? filterAction : undefined,
        entity_type: filterEntityType !== 'all' ? filterEntityType : undefined,
      });
      
      setLogs(response.items);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('audit.load_error'));
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterEntityType]);
  
  // Фильтрация по поисковому запросу (клиентская)
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.user_username?.toLowerCase().includes(searchLower) ||
      log.user_full_name?.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower)
    );
  });
  
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'create': t('audit.actions.create'),
      'update': t('audit.actions.update'),
      'delete': t('audit.actions.delete'),
      'login': t('audit.actions.login'),
      'logout': t('audit.actions.logout'),
      'approve': t('audit.actions.approve'),
      'reject': t('audit.actions.reject'),
      'change_password': t('audit.actions.change_password'),
      'create_revision': t('audit.actions.create_revision'),
      'cancel_revision': t('audit.actions.cancel_revision'),
      'restore_revision': t('audit.actions.restore_revision'),
      'release_revision': t('audit.actions.release_revision'),
      'upload_support_file': t('audit.actions.upload_support_file'),
      'delete_support_file': t('audit.actions.delete_support_file'),
      'add_member': t('audit.actions.add_member'),
      'update_member': t('audit.actions.update_member'),
      'remove_member': t('audit.actions.remove_member'),
      'send': t('audit.actions.send'),
      'receive': t('audit.actions.receive'),
      'download': t('audit.actions.download'),
      'import': t('audit.actions.import'),
    };
    return labels[action] || action;
  };
  
  const getActionColor = (action: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const colors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
      'create': 'success',
      'update': 'info',
      'delete': 'error',
      'login': 'primary',
      'logout': 'default',
      'approve': 'success',
      'reject': 'error',
      'change_password': 'warning',
      'create_revision': 'success',
      'cancel_revision': 'error',
      'restore_revision': 'info',
      'release_revision': 'success',
      'upload_support_file': 'success',
      'delete_support_file': 'error',
      'add_member': 'success',
      'update_member': 'info',
      'remove_member': 'error',
      'send': 'success',
      'receive': 'info',
      'download': 'info',
      'import': 'success',
    };
    return colors[action] || 'default';
  };
  
  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      'user': t('audit.entities.user'),
      'document': t('audit.entities.document'),
      'project': t('audit.entities.project'),
      'transmittal': t('audit.entities.transmittal'),
      'workflow_preset': t('audit.entities.workflow_preset'),
      'document_revision': t('audit.entities.document_revision'),
      'project_support_file': t('audit.entities.project_support_file'),
      'project_member': t('audit.entities.project_member'),
    };
    return labels[entityType] || entityType;
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm:ss', { locale: ru });
    } catch {
      return dateString;
    }
  };
  
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  
  return (
    <Box sx={{ 
      width: '100%', 
      minWidth: 0, 
      pt: 3,
      px: 3,
      pb: 0,
      height: !isMobile ? 'calc(100vh - 117px)' : '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('audit.title')}
        </Typography>
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={loadLogs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
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
          placeholder={t('common.search')}
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
          <InputLabel>{t('audit.filters.action')}</InputLabel>
          <Select
            value={filterAction}
            label={t('audit.filters.action')}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="create">{t('audit.actions.create')}</MenuItem>
            <MenuItem value="update">{t('audit.actions.update')}</MenuItem>
            <MenuItem value="delete">{t('audit.actions.delete')}</MenuItem>
            <MenuItem value="approve">{t('audit.actions.approve')}</MenuItem>
            <MenuItem value="reject">{t('audit.actions.reject')}</MenuItem>
            <MenuItem value="login">{t('audit.actions.login')}</MenuItem>
            <MenuItem value="logout">{t('audit.actions.logout')}</MenuItem>
            <MenuItem value="change_password">{t('audit.actions.change_password')}</MenuItem>
            <MenuItem value="create_revision">{t('audit.actions.create_revision')}</MenuItem>
            <MenuItem value="cancel_revision">{t('audit.actions.cancel_revision')}</MenuItem>
            <MenuItem value="restore_revision">{t('audit.actions.restore_revision')}</MenuItem>
            <MenuItem value="release_revision">{t('audit.actions.release_revision')}</MenuItem>
            <MenuItem value="upload_support_file">{t('audit.actions.upload_support_file')}</MenuItem>
            <MenuItem value="delete_support_file">{t('audit.actions.delete_support_file')}</MenuItem>
            <MenuItem value="add_member">{t('audit.actions.add_member')}</MenuItem>
            <MenuItem value="update_member">{t('audit.actions.update_member')}</MenuItem>
            <MenuItem value="remove_member">{t('audit.actions.remove_member')}</MenuItem>
            <MenuItem value="send">{t('audit.actions.send')}</MenuItem>
            <MenuItem value="receive">{t('audit.actions.receive')}</MenuItem>
            <MenuItem value="download">{t('audit.actions.download')}</MenuItem>
            <MenuItem value="import">{t('audit.actions.import')}</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>{t('audit.filters.entity_type')}</InputLabel>
          <Select
            value={filterEntityType}
            label={t('audit.filters.entity_type')}
            onChange={(e) => {
              setFilterEntityType(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="user">{t('audit.entities.user')}</MenuItem>
            <MenuItem value="document">{t('audit.entities.document')}</MenuItem>
            <MenuItem value="project">{t('audit.entities.project')}</MenuItem>
            <MenuItem value="transmittal">{t('audit.entities.transmittal')}</MenuItem>
            <MenuItem value="workflow_preset">{t('audit.entities.workflow_preset')}</MenuItem>
            <MenuItem value="document_revision">{t('audit.entities.document_revision')}</MenuItem>
            <MenuItem value="project_support_file">{t('audit.entities.project_support_file')}</MenuItem>
            <MenuItem value="project_member">{t('audit.entities.project_member')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Контейнер таблицы */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : filteredLogs.length === 0 ? (
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
                {t('audit.no_logs')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('audit.no_logs_hint')}
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
            paddingBottom: 0,
          }}>
            {/* Заголовок таблицы - зафиксирован */}
            <Box sx={{ 
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f5f5f5',
              boxShadow: 2,
            }}>
              <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px', textAlign: 'left' } }}>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '18%',
                      minWidth: '180px'
                    }}>{t('audit.columns.date')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '18%',
                      minWidth: '150px'
                    }}>{t('audit.columns.user')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '15%',
                      minWidth: '120px'
                    }}>{t('audit.columns.action')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '150px'
                    }}>{t('audit.columns.entity_type')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '150px'
                    }}>{t('audit.columns.ip_address')}</TableCell>
                  </TableRow>
                </TableHead>
              </Table>
            </Box>
            
            {/* Тело таблицы - скроллируемое */}
            <TableContainer component={Paper} sx={{ 
              flex: 1,
              minHeight: 0,
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
                  {filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      sx={{ 
                        '& .MuiTableCell-root': { padding: '8px 16px' },
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell sx={{ 
                        width: '18%',
                        minWidth: '180px'
                      }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {formatDate(log.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        width: '18%',
                        minWidth: '150px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {log.user_full_name || log.user_username || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        width: '15%',
                        minWidth: '120px'
                      }}>
                        <Chip
                          label={getActionLabel(log.action)}
                          color={getActionColor(log.action)}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem', 
                            height: '24px',
                            backgroundColor: (theme) => {
                              const chipColor = getActionColor(log.action);
                              const colorMap: { [key: string]: string } = {
                                'error': alpha(theme.palette.error.main, 0.12),
                                'warning': alpha(theme.palette.warning.main, 0.12),
                                'info': alpha(theme.palette.info.main, 0.12),
                                'success': alpha(theme.palette.success.main, 0.12),
                                'primary': alpha(theme.palette.primary.main, 0.12),
                                'default': theme.palette.grey[100]
                              };
                              return colorMap[chipColor] || theme.palette.grey[100];
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        width: '20%',
                        minWidth: '150px'
                      }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {getEntityTypeLabel(log.entity_type)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        width: '20%',
                        minWidth: '150px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {log.ip_address || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      
      {/* Пагинация */}
      {!loading && filteredLogs.length > 0 && (
        <AppPagination
          count={totalCount}
          page={Math.min(page, totalPages)}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          fixedBottom
          insetLeft={isMobile ? 0 : 240}
          align="right"
          size="small"
        />
      )}
      </Box>
    </Box>
  );
};

export default AuditLogsPage;
