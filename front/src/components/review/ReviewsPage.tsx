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
  InputAdornment,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { reviewsApi, documentsApi } from '../../api/client';
import { projectStore } from '../../stores/ProjectStore';
import { reviewStore } from '../../stores/ReviewStore';
import { documentRevisionStore } from '../../stores/DocumentRevisionStore';
import { formatFileSize } from '../document/utils/fileTypeUtils';
import AppPagination from '../AppPagination';
import ProjectRequired from '../ProjectRequired';
import ReviewsTableSkeleton from './ReviewsTableSkeleton';
import NotificationSnackbar from '../NotificationSnackbar';
import { DocumentViewer } from '../document';
import type { Document as ApiDocument } from '../../api/client';
import { useReviewExport } from './hooks/useReviewExport';
import { ReviewSettingsDialog } from './components/ReviewSettingsDialog';
import { useDebounce } from '../../hooks/useDebounce';

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
  current_description?: {
    id: number;
    code: string;
    description: string;
    description_native: string;
  } | null;
  sequence_order?: number | null;
  is_final?: boolean | null;
  requires_transmittal?: boolean | null;
  release_date?: string | null;
  due_date?: string | null;
  due_days?: number | null;
  is_overdue?: boolean;
  awaiting_company?: {
    id: number;
    name: string;
    name_native?: string;
  } | null;
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
  selectedCompany: string | null;
  onCompanyChange: (value: string | null) => void;
  companies: string[];
  onlyOverdue: boolean;
  onOnlyOverdueChange: (value: boolean) => void;
  onExportToExcel?: () => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCompany,
  onCompanyChange,
  companies,
  onlyOverdue,
  onOnlyOverdueChange,
  onExportToExcel,
  onSettingsClick,
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

      <FormControl sx={{ minWidth: isMobile ? '100%' : 250 }}>
        <InputLabel id="company-filter-label">{t('reviews.awaiting_company')}</InputLabel>
        <Select
          labelId="company-filter-label"
          value={selectedCompany || ''}
          label={t('reviews.awaiting_company')}
          onChange={(e) => onCompanyChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>{t('filter.all')}</em>
          </MenuItem>
          {companies.map((company) => (
            <MenuItem key={company} value={company}>
              {company === '__internal__' ? t('reviews.internal_review') : company}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={onlyOverdue}
            onChange={(e) => onOnlyOverdueChange(e.target.checked)}
          />
        }
        label={t('reviews.only_overdue')}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto' }}>
        {onExportToExcel && (
          <Tooltip title={t('reviews.export_to_excel') || t('documents.export_to_excel') || 'Экспорт в Excel'}>
            <IconButton onClick={onExportToExcel}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
        )}
        {onSettingsClick && (
          <Tooltip title={t('reviews.settings') || t('documents.settings') || 'Настройки'}>
            <IconButton onClick={onSettingsClick}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
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
  onShowDocument: (documentId: number) => void;
}

const ReviewTable: React.FC<ReviewTableProps> = ({
  approvals,
  totalCount,
  isLoading,
  error,
  onApprove,
  onReject,
  onShowDocument,
}) => {
  const { t, i18n } = useTranslation();

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

  // Функция для вычисления количества дней просрочки
  const getOverdueDays = (dueDate: string | null): number | null => {
    if (!dueDate) return null;
    try {
      const due = new Date(dueDate);
      const now = new Date();
      const diffTime = now.getTime() - due.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : null;
    } catch (error) {
      return null;
    }
  };

  // Функция для правильного склонения слова "день" в русском языке
  const getDaysWord = (days: number): string => {
    if (i18n.language === 'ru') {
      const lastDigit = days % 10;
      const lastTwoDigits = days % 100;

      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return t('reviews.days_plural');
      }
      if (lastDigit === 1) {
        return t('reviews.day_singular');
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return t('reviews.days_few');
      }
      return t('reviews.days_plural');
    }
    // Для английского
    return days === 1 ? t('reviews.day_singular') : t('reviews.days_plural');
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
        <Table stickyHeader sx={{ width: '100%', minWidth: '100%' }}>
          <TableHead>
            <TableRow sx={{
              backgroundColor: '#f5f5f5',
              '& .MuiTableCell-root': { padding: '8px 16px', backgroundColor: '#f5f5f5' }
            }}>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '200px'
              }}>{t('reviews.document')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '100px'
              }}>{t('reviews.revision')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '150px'
              }}>{t('reviews.current_step')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '150px'
              }}>{t('reviews.awaiting_company')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '120px'
              }}>{t('reviews.release_date')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '100px'
              }}>{t('reviews.due_days')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '120px'
              }}>{t('reviews.due_date')}</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                minWidth: '120px',
              }} align="center">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
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
                <TableCell sx={{ minWidth: '200px' }}>
                  <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      noWrap
                      onClick={() => onShowDocument(approval.document_id)}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {approval.document_number || t('common.no_number')}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        display: 'block'
                      }}
                    >
                      {approval.document_title}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                  <Chip
                    label={approval.current_description?.code
                      ? `${approval.current_description.code}${approval.revision_number || ''}`
                      : (approval.revision_number || '-')}
                    variant="outlined"
                    size="small"
                    color="primary"
                    sx={{
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12)
                    }}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: '150px' }}>
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
                <TableCell sx={{ minWidth: '150px' }}>
                  {approval.awaiting_company ? (
                    <Typography variant="body2" noWrap>
                      {approval.awaiting_company.name}
                    </Typography>
                  ) : (
                    approval.requires_transmittal === false ? (
                      <Typography variant="body2" noWrap color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {t('reviews.internal_review')}
                      </Typography>
                    ) : (
                      '-'
                    )
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: '120px' }}>
                  <Typography variant="body2" noWrap>
                    {approval.release_date ? formatDate(approval.release_date) : '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                  {approval.due_days ? (
                    <Typography variant="body2" noWrap>
                      {approval.due_days} {t('reviews.days')}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: '120px' }}>
                  {approval.due_date ? (
                    <Box>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          color: approval.is_overdue ? 'error.main' : 'text.primary',
                          fontWeight: approval.is_overdue ? 'bold' : 'normal'
                        }}
                      >
                        {formatDate(approval.due_date)}
                      </Typography>
                      {approval.is_overdue && (() => {
                        const overdueDays = getOverdueDays(approval.due_date);
                        return overdueDays ? (
                          <Typography variant="caption" color="error" noWrap>
                            {t('reviews.overdue_on')} {overdueDays} {getDaysWord(overdueDays)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="error" noWrap>
                            {t('reviews.overdue')}
                          </Typography>
                        );
                      })()}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: '120px' }} align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {approval.requires_transmittal === false ? (
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
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.2 }}>
                        {t('reviews.transmittal_required_hint')}
                      </Typography>
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

  // Хук для экспорта в Excel
  const { exportToExcel } = useReviewExport();

  // Пагинация
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Фильтры
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);
  // Debounce для поиска - фильтрация будет происходить только через 500ms после окончания ввода
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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

  // Состояние для открытия документа
  const [documentDetailsOpen, setDocumentDetailsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  // Состояние для уведомлений
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Состояние для диалога настроек
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Загрузка данных
  const loadPendingApprovals = async () => {
    if (projectStore.selectedProject) {
      await reviewStore.loadReviews(projectStore.selectedProject.id);
    }
  };

  useEffect(() => {
    // Дополнительная загрузка при изменении проекта
    if (projectStore.selectedProject) {
      reviewStore.loadReviews(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject]);

  // Получение списка компаний для фильтра
  const companies = React.useMemo(() => {
    const uniqueCompanies = new Set<string>();

    reviewStore.reviews.forEach(review => {
      if (review.awaiting_company) {
        uniqueCompanies.add(review.awaiting_company.name);
      } else if (review.requires_transmittal === false) {
        uniqueCompanies.add('__internal__');
      }
    });

    return Array.from(uniqueCompanies).sort();
  }, [reviewStore.reviews]);

  // Фильтрация документов (используем debounced значение для поиска)
  const filteredApprovals = reviewStore.reviews.filter(approval => {
    const searchMatch = debouncedSearchTerm === '' ||
      approval.document_title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      approval.document_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      approval.project_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (onlyOverdue && !approval.is_overdue) {
      return false;
    }

    if (selectedCompany) {
      if (selectedCompany === '__internal__') {
        return approval.requires_transmittal === false;
      }
      return approval.awaiting_company?.name === selectedCompany;
    }

    return true;
  });

  // Сбрасываем на первую страницу при изменении фильтров
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedCompany, onlyOverdue]);

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

        // Обновляем проект после утверждения документа
        if (approvalDialog.document.project_id) {
          await projectStore.updateProject(approvalDialog.document.project_id);
        }
      } else {
        await reviewsApi.rejectDocument(approvalDialog.document.document_id, comments);
        setNotification({
          open: true,
          message: t('reviews.rejected_successfully'),
          severity: 'success'
        });
      }

      // Обновляем список с принудительной перезагрузкой
      await reviewStore.loadReviews(projectStore.selectedProject?.id, true);

      // Отправляем событие для обновления таблицы документов
      window.dispatchEvent(new CustomEvent('documents:refresh'));

      setApprovalDialog({ open: false, document: null, action: 'approve' });
    } catch (err: any) {
      setNotification({
        open: true,
        message: err.message || t('reviews.action_error'),
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Обработчик открытия документа
  const handleShowDocument = async (documentId: number) => {
    try {
      const document = await documentsApi.getById(documentId);
      setSelectedDocument(document);
      setSelectedDocumentId(documentId);
      setDocumentDetailsOpen(true);

      try {
        await documentRevisionStore.loadRevisions(documentId);
      } catch (error: any) {
        // Игнорируем ошибки загрузки ревизий
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || t('documents.load_document_error');
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Обработчик закрытия документа
  const handleCloseDocumentDetails = () => {
    setDocumentDetailsOpen(false);
    setSelectedDocument(null);
    if (selectedDocumentId) {
      documentRevisionStore.clearRevisions(selectedDocumentId);
    }
    setSelectedDocumentId(null);
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
        </Box>

        <ReviewFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          companies={companies}
          onlyOverdue={onlyOverdue}
          onOnlyOverdueChange={setOnlyOverdue}
          onSettingsClick={() => {
            setSettingsDialogOpen(true);
          }}
          onExportToExcel={async () => {
            try {
              await exportToExcel({
                projectId: projectStore.selectedProject?.id,
                search: searchTerm,
                selectedCompany: selectedCompany,
                onlyOverdue: onlyOverdue,
                language: i18n.language,
              });
            } catch (error: any) {
              console.error('Ошибка при экспорте в Excel:', error);
              setNotification({
                open: true,
                message: t('reviews.export_error') || t('documents.export_error') || 'Ошибка при экспорте в Excel',
                severity: 'error'
              });
            }
          }}
        />

        {/* Контейнер таблицы */}
        <Box sx={{
          flex: 1,
          minHeight: 0,
        }}>
          <ReviewTable
            approvals={displayedApprovals}
            totalCount={filteredApprovals.length}
            isLoading={reviewStore.isLoading}
            error={reviewStore.error}
            onApprove={handleApprove}
            onReject={handleReject}
            onShowDocument={handleShowDocument}
          />
        </Box>

        {/* Фиксированная пагинация без выбора кол-ва строк */}
        {!reviewStore.isLoading && (
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

        {/* Просмотр документа */}
        <DocumentViewer
          open={documentDetailsOpen}
          document={selectedDocument}
          documentId={selectedDocumentId}
          isCreating={false}
          onClose={handleCloseDocumentDetails}
          onNewRevision={() => { }}
          onCompareRevisions={() => { }}
        />

        {/* Диалог настроек автоматической отправки */}
        <ReviewSettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          language={i18n.language}
        />
      </Box>
    </ProjectRequired>
  );
});

export default ReviewsPage;