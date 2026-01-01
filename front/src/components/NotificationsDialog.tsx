import React, { useState, useEffect } from 'react';
import {
  Popover,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Badge,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Support as SupportIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { notificationsApi } from '../api/client';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  document_id: number | null;
  document_title: string | null;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: number;
}

interface NotificationsDialogProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({
  open,
  anchorEl,
  onClose,
  onNotificationClick,
}) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAll, setShowAll] = useState(false); // По умолчанию показываем только непрочитанные

  useEffect(() => {
    if (open) {
      // Сбрасываем showAll при открытии
      setShowAll(false);
      loadUnreadCount();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      // Загружаем уведомления при открытии или изменении showAll
      loadNotifications();
    }
  }, [showAll, open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // По умолчанию показываем только непрочитанные (до 20)
      // Если showAll=true, показываем все (до 50)
      const unreadOnly = !showAll; // true = только непрочитанные, false = все
      const limit = showAll ? 50 : 20;
      
      console.log('[NotificationsDialog] Loading:', { unreadOnly, limit, showAll });
      
      const data = await notificationsApi.getNotifications(unreadOnly, limit);
      
      console.log('[NotificationsDialog] Received:', data.length, 'notifications');
      console.log('[NotificationsDialog] Read status:', data.map(n => ({ id: n.id, is_read: n.is_read, title: n.title })));
      
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'support_reply':
        return <SupportIcon />;
      default:
        return <InfoIcon />;
    }
  };


  const formatDate = (dateString: string) => {
    // Парсим дату - isoformat() возвращает строку в формате ISO 8601 с timezone
    const date = new Date(dateString);
    const now = new Date();
    
    const diff = now.getTime() - date.getTime();
    
    // Временная отладка для диагностики проблемы
    if (Math.abs(diff) > 1000 * 60 * 60) { // Если разница больше часа
      console.log('⚠️ Большая разница во времени:', {
        dateString,
        parsedDate: date.toISOString(),
        now: now.toISOString(),
        diffMs: diff,
        diffHours: (diff / (1000 * 60 * 60)).toFixed(2),
        dateTimezone: date.getTimezoneOffset(),
        nowTimezone: now.getTimezoneOffset()
      });
    }
    const totalMinutes = Math.floor(diff / 60000);
    const totalHours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (totalMinutes < 1) return 'только что';
    if (totalMinutes < 60) {
      // Правильное склонение для минут
      const lastDigit = totalMinutes % 10;
      const lastTwoDigits = totalMinutes % 100;
      let minuteWord = 'минут';
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        minuteWord = 'минут';
      } else if (lastDigit === 1) {
        minuteWord = 'минуту';
      } else if (lastDigit >= 2 && lastDigit <= 4) {
        minuteWord = 'минуты';
      }
      return `${totalMinutes} ${minuteWord} назад`;
    }
    if (totalHours < 24) {
      // Показываем часы и минуты
      const hours = totalHours;
      const minutes = totalMinutes % 60;
      
      let hourWord = 'часов';
      const lastHourDigit = hours % 10;
      const lastHourTwoDigits = hours % 100;
      if (lastHourTwoDigits >= 11 && lastHourTwoDigits <= 14) {
        hourWord = 'часов';
      } else if (lastHourDigit === 1) {
        hourWord = 'час';
      } else if (lastHourDigit >= 2 && lastHourDigit <= 4) {
        hourWord = 'часа';
      }
      
      if (minutes === 0) {
        return `${hours} ${hourWord} назад`;
      } else {
        let minuteWord = 'минут';
        const lastMinuteDigit = minutes % 10;
        const lastMinuteTwoDigits = minutes % 100;
        if (lastMinuteTwoDigits >= 11 && lastMinuteTwoDigits <= 14) {
          minuteWord = 'минут';
        } else if (lastMinuteDigit === 1) {
          minuteWord = 'минуту';
        } else if (lastMinuteDigit >= 2 && lastMinuteDigit <= 4) {
          minuteWord = 'минуты';
        }
        return `${hours} ${hourWord} ${minutes} ${minuteWord} назад`;
      }
    }
    if (days < 7) {
      const lastDigit = days % 10;
      const lastTwoDigits = days % 100;
      let dayWord = 'дней';
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        dayWord = 'дней';
      } else if (lastDigit === 1) {
        dayWord = 'день';
      } else if (lastDigit >= 2 && lastDigit <= 4) {
        dayWord = 'дня';
      }
      return `${days} ${dayWord} назад`;
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '90vw',
          maxHeight: '80vh',
          mt: 1,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon />
            <Typography variant="h6">
              {t('notifications.title') || 'Уведомления'}
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                color="error"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ overflow: 'auto', flex: 1 }}>
        {/* Кнопки управления - всегда видимы */}
        {!loading && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                startIcon={<CheckCircleIcon />}
              >
                {t('notifications.mark_all_read') || 'Отметить все как прочитанные'}
              </Button>
            )}
            <Button
              size="small"
              onClick={() => setShowAll(!showAll)}
              sx={{ ml: 'auto' }}
            >
              {showAll 
                ? (t('notifications.show_unread_only') || 'Только непрочитанные')
                : (t('notifications.show_all') || 'Показать все')}
            </Button>
          </Box>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {showAll 
              ? (t('notifications.no_notifications') || 'Нет уведомлений')
              : (t('notifications.no_unread') || 'Нет непрочитанных уведомлений')}
          </Alert>
        ) : (
          <>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.is_read
                        ? 'transparent'
                        : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Badge
                        color="error"
                        variant="dot"
                        invisible={notification.is_read}
                      >
                        {getNotificationIcon(notification.type)}
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" component="span">
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {formatDate(notification.created_at)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
        </Box>
    </Popover>
  );
};

export default NotificationsDialog;

