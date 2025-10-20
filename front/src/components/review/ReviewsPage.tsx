import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  InputAdornment
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { reviewsApi } from '../../api/client';
import { projectStore } from '../../stores/ProjectStore';
import { formatFileSize } from '../document/utils/fileTypeUtils';
import AppPagination from '../AppPagination';
import ProjectRequired from '../ProjectRequired';
import ReviewsTableSkeleton from './ReviewsTableSkeleton';
import NotificationSnackbar from '../NotificationSnackbar';

interface PendingApproval {
  document_id: number;
  document_title: string;
  document_number: string;
  project_id: number;
  project_name: string;
  revision_id: number;
  revision_number: string;
  file_name: string;
  file_size: number;
  file_type: string;
  change_description: string;
  created_at: string;
  uploaded_by: number;
  current_step: {
    id: number;
    code: string;
    description: string;
    description_native: string;
  } | null;
  current_description: {
    id: number;
    code: string;
    description: string;
    description_native: string;
  } | null;
  sequence_order: number | null;
  is_final: boolean | null;
  requires_transmittal: boolean | null;
}

// Диалог подтверждения действия
interface ApprovalDialogProps {
  open: boolean;
  document: PendingApproval | null;
  action: 'approve' | 'reject';
  loading: boolean;
  onClose: () => void;
  onConfirm: (comments: string) => void;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  open,
  document,
  action,
  loading,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    onConfirm(comments);
    setComments('');
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setComments('');
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {action === 'approve' ? t('reviews.approve_document') : t('reviews.reject_document')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {action === 'approve' ? t('reviews.approval_comments') : t('reviews.rejection_reason')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={action === 'approve' ? t('reviews.approval_comments') : t('reviews.rejection_reason')}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color={action === 'approve' ? 'success' : 'error'}
          disabled={loading}
        >
          {action === 'approve' ? t('reviews.approve') : t('reviews.reject')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент фильтров для Reviews
interface ReviewFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      alignItems: 'center', 
      flexWrap: 'wrap',
      flexDirection: isMobile ? 'column' : 'row',
      mb: 3
    }}>
      <TextField
        placeholder={t('common.search')}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: isMobile ? '100%' : 300 }}
      />
    </Box>
  );
};

// Компонент таблицы для Reviews
interface ReviewTableProps {
  approvals: PendingApproval[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onApprove: (approval: PendingApproval) => void;
  onReject: (approval: PendingApproval) => void;
}

const ReviewTable: React.FC<ReviewTableProps> = ({
  approvals,
  totalCount,
  isLoading,
  error,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (error) {
      return '-';
    }
  };

  if (isLoading) {
    return <ReviewsTableSkeleton />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (approvals.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: 0,
        marginBottom: 0,
        paddingBottom: 0
      }}>
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
              {t('reviews.no_pending_approvals')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('reviews.no_pending_approvals_description')}
            </Typography>
          </Box>
        </TableContainer>
      </Box>
    );
  }

  return (
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
            <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '20%',
                minWidth: '200px'
              }}>{t('reviews.document')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '15%',
                minWidth: '150px'
              }}>{t('reviews.project')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '10%',
                minWidth: '100px'
              }}>{t('reviews.revision')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '15%',
                minWidth: '150px'
              }}>{t('reviews.current_step')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '20%',
                minWidth: '200px'
              }}>{t('reviews.file_info')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '12%',
                minWidth: '120px'
              }}>{t('reviews.uploaded_at')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '8%',
                minWidth: '100px'
              }} align="center">{t('common.actions')}</TableCell>
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
            {approvals.map((approval) => (
              <TableRow 
                key={approval.document_id}
                sx={{ 
                  '& .MuiTableCell-root': { padding: '8px 16px' },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <TableCell sx={{ width: '20%', minWidth: '200px' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                      {approval.document_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {approval.document_number || t('common.no_number')}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ width: '15%', minWidth: '150px' }}>
                  <Typography variant="body2" noWrap>
                    {approval.project_name || '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '10%', minWidth: '100px' }}>
                  <Chip 
                    label={approval.revision_number || '-'} 
                    size="small" 
                    color="primary" 
                  />
                </TableCell>
                <TableCell sx={{ width: '15%', minWidth: '150px' }}>
                  {approval.current_step ? (
                    <Box>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {approval.current_step.code}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {approval.current_step.description}
                      </Typography>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell sx={{ width: '20%', minWidth: '200px' }}>
                  {approval.file_name ? (
                    <Box>
                      <Typography variant="body2" noWrap>
                        {approval.file_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {formatFileSize(approval.file_size || 0)}
                      </Typography>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell sx={{ width: '12%', minWidth: '120px' }}>
                  <Typography variant="body2" noWrap>
                    {approval.created_at ? formatDate(approval.created_at) : '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '8%', minWidth: '100px' }} align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {approval.requires_transmittal === false && (
                      <>
                        <Tooltip title={t('reviews.approve')}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onApprove(approval)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('reviews.reject')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onReject(approval)}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const ReviewsPage: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Пагинация
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    document: PendingApproval | null;
    action: 'approve' | 'reject';
  }>({
    open: false,
    document: null,
    action: 'approve'
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  
  // Состояние для уведомлений
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Загружаем документы, ожидающие утверждения
  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewsApi.getPendingApprovals(0, 100, projectStore.selectedProject?.id);
      setPendingApprovals(data);
    } catch (err: any) {
      setError(err.message || t('reviews.load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, [projectStore.selectedProject]);

  // Фильтрация документов
  const filteredApprovals = pendingApprovals.filter(approval => {
    const searchMatch = searchTerm === '' || 
      approval.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  // Сбрасываем на первую страницу при изменении фильтров
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredApprovals.length / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedApprovals = filteredApprovals.slice(startIndex, endIndex);

  // Обработчики действий
  const handleApprove = (document: PendingApproval) => {
    setApprovalDialog({
      open: true,
      document,
      action: 'approve'
    });
  };

  const handleReject = (document: PendingApproval) => {
    setApprovalDialog({
      open: true,
      document,
      action: 'reject'
    });
  };

  const handleCloseNotification = () => {
    setNotification({ open: false, message: '', severity: 'success' });
  };

  const handleConfirmAction = async (comments: string) => {
    if (!approvalDialog.document) return;

    try {
      setActionLoading(true);
      
      if (approvalDialog.action === 'approve') {
        await reviewsApi.approveDocument(approvalDialog.document.document_id, comments);
        setNotification({
          open: true,
          message: t('reviews.approved_successfully'),
          severity: 'success'
        });
      } else {
        await reviewsApi.rejectDocument(approvalDialog.document.document_id, comments);
        setNotification({
          open: true,
          message: t('reviews.rejected_successfully'),
          severity: 'success'
        });
      }

      // Обновляем список
      await loadPendingApprovals();
      
      setApprovalDialog({ open: false, document: null, action: 'approve' });
    } catch (err: any) {
      setError(err.message || t('reviews.action_error'));
      setNotification({
        open: true,
        message: err.message || t('reviews.action_error'),
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
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
        gap: isMobile ? 2 : 0,
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          {t('reviews.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadPendingApprovals}
            variant="outlined"
            sx={{ flex: isMobile ? 1 : 'none' }}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      <ReviewFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Контейнер таблицы */}
      <Box sx={{ 
        flex: 1, 
        minHeight: 0,
      }}>
        <ReviewTable
          approvals={displayedApprovals}
          totalCount={filteredApprovals.length}
          isLoading={loading}
          error={error}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </Box>

      {/* Фиксированная пагинация без выбора кол-ва строк */}
      {!loading && (
        <AppPagination
          count={filteredApprovals.length}
          page={Math.min(page, totalPages)}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          insetLeft={isMobile ? 0 : 240}
          align="right"
          leftInfo={`${t('common.total_reviews', { count: filteredApprovals.length }).replace('{count}', filteredApprovals.length.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US'))}`}
        />
      )}

      <ApprovalDialog
        open={approvalDialog.open}
        document={approvalDialog.document}
        action={approvalDialog.action}
        loading={actionLoading}
        onClose={() => setApprovalDialog({ open: false, document: null, action: 'approve' })}
        onConfirm={handleConfirmAction}
      />
      
      {/* Уведомления */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
      </Box>
    </ProjectRequired>
  );
});

export default ReviewsPage;