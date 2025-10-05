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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { workflowApi, documentsApi, type Document as ApiDocument } from '../api/client';
import { useTranslation } from 'react-i18next';

interface NotificationItem {
  id: number;
  type: 'approval' | 'escalation' | 'completed' | 'rejected';
  title: string;
  message: string;
  document_id?: number;
  document_title?: string;
  created_at: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const NotificationsPage = observer(() => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [document, setDocument] = useState<ApiDocument | null>(null);

  // Загружаем уведомления при монтировании
  useEffect(() => {
    loadNotifications();
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Получаем согласования как уведомления
      const approvals = await workflowApi.getMyApprovals();
      const notificationItems: NotificationItem[] = approvals.map(approval => ({
        id: approval.approval_id,
        type: 'approval' as const,
        title: 'Требуется согласование',
        message: `Документ "${approval.document_title}" ожидает вашего согласования на шаге "${approval.step_name}"`,
        document_id: approval.document_id,
        document_title: approval.document_title,
        created_at: approval.created_at,
        is_read: false,
        priority: getPriorityFromEscalation(approval.created_at, approval.escalation_hours),
      }));
      
      setNotifications(notificationItems);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getPriorityFromEscalation = (createdAt: string, escalationHours: number): 'low' | 'medium' | 'high' | 'urgent' => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const escalationProgress = hoursPassed / escalationHours;
    
    if (escalationProgress >= 1) return 'urgent';
    if (escalationProgress >= 0.8) return 'high';
    if (escalationProgress >= 0.5) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Срочно';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval': return <AssignmentIcon />;
      case 'escalation': return <ScheduleIcon />;
      case 'completed': return <CheckIcon />;
      case 'rejected': return <CloseIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'approval': return 'Согласование';
      case 'escalation': return 'Эскалация';
      case 'completed': return 'Завершено';
      case 'rejected': return 'Отклонено';
      default: return 'Уведомление';
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.document_id) {
      try {
        const doc = await documentsApi.getById(notification.document_id);
        setDocument(doc);
        setSelectedNotification(notification);
        setDialogOpen(true);
      } catch (error) {
        alert('Ошибка загрузки документа');
      }
    }
  };

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Уведомления</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={loadNotifications} variant="outlined">
            Обновить
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="contained">
              Отметить все как прочитанные
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : notifications.length === 0 ? (
        <Alert severity="info">
          У вас нет новых уведомлений
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Тип</TableCell>
                <TableCell>Заголовок</TableCell>
                <TableCell>Сообщение</TableCell>
                <TableCell>Приоритет</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow 
                  key={notification.id}
                  sx={{ 
                    backgroundColor: notification.is_read ? 'inherit' : 'action.hover',
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(notification.type)}
                      <Typography variant="body2">
                        {getTypeText(notification.type)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                      {notification.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontWeight: notification.is_read ? 'normal' : 'bold',
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {notification.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPriorityText(notification.priority)}
                      color={getPriorityColor(notification.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(notification.created_at).toLocaleString('ru-RU')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={notification.is_read ? 'Прочитано' : 'Новое'}
                      color={notification.is_read ? 'default' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Просмотр">
                        <IconButton 
                          size="small" 
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {!notification.is_read && (
                        <Tooltip title="Отметить как прочитанное">
                          <IconButton 
                            size="small" 
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог просмотра уведомления */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedNotification?.title}
        </DialogTitle>
        <DialogContent>
          {document && selectedNotification ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Alert severity="info">
                {selectedNotification.message}
              </Alert>
              
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
              
              <Typography variant="h6">Информация об уведомлении</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Тип:</strong> {getTypeText(selectedNotification.type)}</Typography>
                <Typography><strong>Приоритет:</strong> {getPriorityText(selectedNotification.priority)}</Typography>
                <Typography><strong>Создано:</strong> {new Date(selectedNotification.created_at).toLocaleString('ru-RU')}</Typography>
                <Typography><strong>Статус:</strong> {selectedNotification.is_read ? 'Прочитано' : 'Новое'}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography>Загрузка...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>
          {selectedNotification && !selectedNotification.is_read && (
            <Button 
              onClick={() => {
                handleMarkAsRead(selectedNotification.id);
                setDialogOpen(false);
              }}
              variant="contained"
            >
              Отметить как прочитанное
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default NotificationsPage;
