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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { workflowApi, documentsApi, type Document as ApiDocument } from '../api/client';
import { useTranslation } from 'react-i18next';

interface ApprovalItem {
  approval_id: number;
  document_id: number;
  document_title: string;
  step_name: string;
  created_at: string;
  escalation_hours: number;
}

const MyApprovalsPage = observer(() => {
  const { t } = useTranslation();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [document, setDocument] = useState<ApiDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view'>('view');
  const [comments, setComments] = useState('');

  // Загружаем согласования при монтировании
  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getMyApprovals();
      setApprovals(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (approval: ApprovalItem) => {
    try {
      const doc = await documentsApi.getById(approval.document_id);
      setDocument(doc);
      setSelectedApproval(approval);
      setActionType('view');
      setDialogOpen(true);
    } catch (error) {
      alert('Ошибка загрузки документа');
    }
  };

  const handleApprove = (approval: ApprovalItem) => {
    setSelectedApproval(approval);
    setActionType('approve');
    setComments('');
    setDialogOpen(true);
  };

  const handleReject = (approval: ApprovalItem) => {
    setSelectedApproval(approval);
    setActionType('reject');
    setComments('');
    setDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    try {
      if (actionType === 'approve') {
        await workflowApi.approveDocument(selectedApproval.approval_id, comments);
        alert('Документ согласован');
      } else if (actionType === 'reject') {
        if (!comments.trim()) {
          alert('Необходимо указать причину отклонения');
          return;
        }
        await workflowApi.rejectDocument(selectedApproval.approval_id, comments);
        alert('Документ отклонен');
      }
      
      setDialogOpen(false);
      loadApprovals(); // Обновляем список
    } catch (error) {
      alert('Ошибка обработки согласования');
    }
  };

  const getUrgencyColor = (createdAt: string, escalationHours: number) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const escalationProgress = hoursPassed / escalationHours;
    
    if (escalationProgress >= 1) return 'error';
    if (escalationProgress >= 0.8) return 'warning';
    return 'success';
  };

  const getUrgencyText = (createdAt: string, escalationHours: number) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const hoursLeft = escalationHours - hoursPassed;
    
    if (hoursLeft <= 0) return 'Просрочено';
    if (hoursLeft <= 24) return `Осталось ${Math.round(hoursLeft)}ч`;
    return `Осталось ${Math.round(hoursLeft / 24)}д`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Мои согласования</Typography>
        <Button onClick={loadApprovals} variant="outlined">
          Обновить
        </Button>
      </Box>

      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : approvals.length === 0 ? (
        <Alert severity="info">
          У вас нет документов, ожидающих согласования
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Документ</TableCell>
                <TableCell>Шаг согласования</TableCell>
                <TableCell>Дата создания</TableCell>
                <TableCell>Срочность</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.map((approval) => (
                <TableRow key={approval.approval_id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {approval.document_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {approval.document_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant="body2">
                        {approval.step_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(approval.created_at).toLocaleString('ru-RU')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getUrgencyText(approval.created_at, approval.escalation_hours)}
                      color={getUrgencyColor(approval.created_at, approval.escalation_hours)}
                      size="small"
                      icon={<ScheduleIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Просмотр документа">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDocument(approval)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Согласовать">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => handleApprove(approval)}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Отклонить">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleReject(approval)}
                        >
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог для просмотра документа и действий */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {actionType === 'view' ? 'Просмотр документа' : 
           actionType === 'approve' ? 'Согласование документа' : 
           'Отклонение документа'}
        </DialogTitle>
        <DialogContent>
          {actionType === 'view' && document ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Typography variant="h6">Информация о документе</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Название:</strong> {document.title}</Typography>
                <Typography><strong>Описание:</strong> {document.description || '-'}</Typography>
                <Typography><strong>Файл:</strong> {document.file_name}</Typography>
                <Typography><strong>Версия:</strong> {document.version}</Typography>
                <Typography><strong>Статус:</strong> {document.status}</Typography>
                <Typography><strong>Создан:</strong> {new Date(document.created_at).toLocaleString('ru-RU')}</Typography>
              </Box>
              
              <Divider />
              
              <Typography variant="h6">Информация о согласовании</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Шаг:</strong> {selectedApproval?.step_name}</Typography>
                <Typography><strong>Создано:</strong> {selectedApproval ? new Date(selectedApproval.created_at).toLocaleString('ru-RU') : '-'}</Typography>
                <Typography><strong>Эскалация через:</strong> {selectedApproval?.escalation_hours} часов</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Typography variant="h6">
                {actionType === 'approve' ? 'Согласование документа' : 'Отклонение документа'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Документ: <strong>{selectedApproval?.document_title}</strong>
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Шаг согласования: <strong>{selectedApproval?.step_name}</strong>
              </Typography>
              
              <TextField
                label={actionType === 'approve' ? 'Комментарий (опционально)' : 'Причина отклонения (обязательно)'}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                fullWidth
                multiline
                rows={4}
                required={actionType === 'reject'}
                placeholder={
                  actionType === 'approve' 
                    ? 'Добавьте комментарий к согласованию...'
                    : 'Укажите причину отклонения документа...'
                }
              />
              
              {actionType === 'reject' && (
                <Alert severity="warning">
                  Отклонение документа остановит процесс согласования и вернет его в статус "Черновик"
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          {actionType !== 'view' && (
            <Button 
              onClick={handleSubmitAction}
              variant="contained"
              color={actionType === 'approve' ? 'success' : 'error'}
              disabled={actionType === 'reject' && !comments.trim()}
            >
              {actionType === 'approve' ? 'Согласовать' : 'Отклонить'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default MyApprovalsPage;
