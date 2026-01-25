import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Portal,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { settingsStore } from '../../../stores/SettingsStore';
import { projectsApi, projectParticipantsApi, usersApi, type User } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
import { userStore } from '../../../stores/UserStore';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import NotificationSnackbar from '../../NotificationSnackbar';

export interface EmailScheduleItem {
  id: string;
  recipientType: 'self' | 'company' | 'user';
  companyName?: string;
  companyId?: number; // ID компании для фильтрации
  contactEmail?: string; // Email контактного лица участника проекта
  userEmail?: string; // Email текущего пользователя (для recipientType === 'self')
  userId?: number;
  userName?: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 (воскресенье-суббота)
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm
  timezone?: string; // UTC offset (например, 'UTC+3', 'UTC+5')
  onlyOverdue?: boolean; // Только просроченные ревью
  projectId?: number; // ID проекта для фильтрации
  language?: string; // Язык для экспорта
}

export interface ReviewEmailScheduleSettings {
  schedules: EmailScheduleItem[];
}

interface ReviewSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  language: string;
}

export const ReviewSettingsDialog: React.FC<ReviewSettingsDialogProps> = ({
  open,
  onClose,
  language,
}) => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<EmailScheduleItem[]>([]);
  const [originalSchedules, setOriginalSchedules] = useState<EmailScheduleItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [projectParticipants, setProjectParticipants] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Получаем часовой пояс пользователя по умолчанию
  const getUserTimezone = (): string => {
    const offset = -new Date().getTimezoneOffset() / 60;
    return `UTC${offset >= 0 ? '+' : ''}${offset}`;
  };

  // Форма для новой/редактируемой настройки
  const [formData, setFormData] = useState<Omit<EmailScheduleItem, 'id'>>({
    recipientType: 'self',
    schedule: 'daily',
    time: '09:00',
    contactEmail: undefined,
    onlyOverdue: false,
  });

  const [timeValue, setTimeValue] = useState<Date | null>(null);

  // Загружаем настройки, пользователей и компании проекта при открытии диалога
  useEffect(() => {
    if (open) {
      // Сбрасываем состояние сразу при открытии, чтобы избежать показа старых несохраненных данных
      setSchedules([]);
      setOriginalSchedules([]);
      resetForm();
      
      const loadData = async () => {
        const projectId = projectStore.selectedProject?.id;
        
        if (projectId) {
          // Загружаем пользователей проекта
          try {
            // Получаем участников проекта
            const projectMembers = await projectsApi.members.getAll(projectId);
            const memberUserIds = projectMembers.map(m => m.user_id);
            
            // Получаем информацию о пользователях
            const allUsers = await usersApi.getAll();
            const projectUsers = allUsers.filter(u => 
              u.is_active && memberUserIds.includes(u.id)
            );
            setUsers(projectUsers);
          } catch (error) {
            console.error('Failed to load project users:', error);
            setUsers([]);
          }

          // Загружаем компании проекта (участников)
          try {
            const participants = await projectParticipantsApi.getAll(projectId);
            setProjectParticipants(participants);
            // Извлекаем уникальные названия компаний
            const uniqueCompanies = Array.from(
              new Set(participants.map(p => p.company_name).filter(Boolean))
            ).sort();
            setCompanies(uniqueCompanies);
          } catch (error) {
            console.error('Failed to load project companies:', error);
            setCompanies([]);
            setProjectParticipants([]);
          }
        } else {
          setUsers([]);
          setCompanies([]);
          setProjectParticipants([]);
        }

        // Загружаем настройки
        await settingsStore.loadSettings('reviews_email_schedule');
        const savedSettings = settingsStore.getSettings('reviews_email_schedule');
        if (savedSettings?.schedules && Array.isArray(savedSettings.schedules)) {
          setSchedules(savedSettings.schedules);
          setOriginalSchedules(JSON.parse(JSON.stringify(savedSettings.schedules))); // Глубокая копия для сравнения
        } else {
          setSchedules([]);
          setOriginalSchedules([]);
        }
        resetForm();
      };
      loadData();
    } else {
      // Сбрасываем состояние при закрытии диалога
      setSchedules([]);
      setOriginalSchedules([]);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      recipientType: 'self',
      schedule: 'daily',
      time: '09:00',
      contactEmail: undefined,
      onlyOverdue: false,
    });
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setTimeValue(defaultTime);
    setEditingId(null);
  };

  const handleAddOrUpdate = () => {
    // Форматируем время
    const formatTime = (date: Date | null): string => {
      if (!date) return '09:00';
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Автоматически определяем часовой пояс пользователя
    const userTimezone = getUserTimezone();

    // Получаем email текущего пользователя для "Себе"
    const currentUserEmail = formData.recipientType === 'self' 
      ? (userStore.currentUser?.email || '') 
      : undefined;

    // Устанавливаем значения по умолчанию для dayOfWeek и dayOfMonth
    const dayOfWeek = formData.schedule === 'weekly' ? (formData.dayOfWeek ?? 1) : undefined;
    const dayOfMonth = formData.schedule === 'monthly' ? (formData.dayOfMonth ?? 1) : undefined;

    // Получаем projectId и companyId
    const projectId = projectStore.selectedProject?.id;
    const companyId = formData.recipientType === 'company' && formData.companyName
      ? projectParticipants.find(p => p.company_name === formData.companyName)?.company_id
      : undefined;

    const newItem: EmailScheduleItem = {
      id: editingId || `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientType: formData.recipientType,
      companyName: formData.companyName,
      companyId: companyId,
      contactEmail: formData.contactEmail,
      userEmail: currentUserEmail,
      userId: formData.userId,
      userName: formData.userName,
      schedule: formData.schedule,
      dayOfWeek: dayOfWeek,
      dayOfMonth: dayOfMonth,
      time: formatTime(timeValue),
      timezone: userTimezone,
      onlyOverdue: formData.onlyOverdue || false,
      projectId: projectId,
      language: language,
    };

    if (editingId) {
      // Обновляем существующую запись
      setSchedules(prev => prev.map(item => item.id === editingId ? newItem : item));
    } else {
      // Добавляем новую запись
      setSchedules(prev => [...prev, newItem]);
    }

    resetForm();
  };


  const handleDelete = (id: string) => {
    setSchedules(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Проверяем, что все необходимые поля присутствуют в каждом элементе
      const validatedSchedules = schedules.map(item => {
        // Убеждаемся, что dayOfWeek и dayOfMonth установлены для соответствующих типов расписания
        const dayOfWeek = item.schedule === 'weekly' ? (item.dayOfWeek ?? 1) : item.dayOfWeek;
        const dayOfMonth = item.schedule === 'monthly' ? (item.dayOfMonth ?? 1) : item.dayOfMonth;
        
        return {
          id: item.id,
          recipientType: item.recipientType,
          companyName: item.companyName,
          companyId: item.companyId,
          contactEmail: item.contactEmail,
          userEmail: item.userEmail,
          userId: item.userId,
          userName: item.userName,
          schedule: item.schedule,
          dayOfWeek: dayOfWeek,
          dayOfMonth: dayOfMonth,
          time: item.time,
          timezone: item.timezone,
          onlyOverdue: item.onlyOverdue || false,
          projectId: item.projectId,
          language: item.language || language,
        };
      });
      
      const settingsToSave: ReviewEmailScheduleSettings = {
        schedules: validatedSchedules,
      };
      
      const success = await settingsStore.saveSettings('reviews_email_schedule', settingsToSave);
      
      if (success) {
        setOriginalSchedules(JSON.parse(JSON.stringify(schedules))); // Обновляем исходное состояние после успешного сохранения
        setNotification({
          open: true,
          message: t('reviews.settings.saved_successfully') || 'Настройки успешно сохранены',
          severity: 'success'
        });
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setNotification({
          open: true,
          message: t('reviews.settings.save_error') || 'Ошибка при сохранении настроек',
          severity: 'error'
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: t('reviews.settings.save_error') || 'Ошибка при сохранении настроек',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleTimeChange = (newValue: Date | null) => {
    setTimeValue(newValue);
  };

  const getScheduleDescription = (item: EmailScheduleItem): string => {
    const { schedule, dayOfWeek, dayOfMonth } = item;
    if (schedule === 'daily') {
      return t('reviews.settings.daily_display') || 'Ежедневно';
    } else if (schedule === 'weekly') {
      const days = [
        t('reviews.settings.sunday'),
        t('reviews.settings.monday'),
        t('reviews.settings.tuesday'),
        t('reviews.settings.wednesday'),
        t('reviews.settings.thursday'),
        t('reviews.settings.friday'),
        t('reviews.settings.saturday'),
      ];
      const dayName = days[dayOfWeek ?? 1];
      // Для русского языка нужно склонение дня недели
      if (language === 'ru') {
        return t('reviews.settings.weekly_display', { day: dayName.toLowerCase() }) || `Каждый ${dayName.toLowerCase()}`;
      }
      return t('reviews.settings.weekly_display', { day: dayName }) || `Every ${dayName}`;
    } else if (schedule === 'monthly') {
      const day = dayOfMonth || 1;
      // Формируем порядковое числительное для английского языка
      const getOrdinalSuffix = (n: number): string => {
        const j = n % 10;
        const k = n % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
      };
      
      if (language === 'ru') {
        return t('reviews.settings.monthly_display', { day }) || `Ежемесячно: ${day} день`;
      } else {
        const dayOrdinal = `${day}${getOrdinalSuffix(day)}`;
        return t('reviews.settings.monthly_display', { dayOrdinal }) || `Monthly: ${dayOrdinal} day`;
      }
    }
    return '';
  };

  const getRecipientDescription = (item: EmailScheduleItem): string => {
    if (item.recipientType === 'self') {
      return t('reviews.settings.send_to_self') || 'Себе';
    } else if (item.recipientType === 'user') {
      // Убираем email из userName (формат "Имя (email)" -> "Имя")
      const userName = item.userName || '';
      return userName.replace(/\s*\([^)]+\)$/, '');
    } else {
      return item.companyName || '';
    }
  };

  const getRecipientEmail = (item: EmailScheduleItem): string => {
    if (item.recipientType === 'self') {
      return item.userEmail || userStore.currentUser?.email || '';
    } else if (item.recipientType === 'user') {
      // Извлекаем email из userName, который имеет формат "Имя (email)"
      const match = item.userName?.match(/\(([^)]+)\)/);
      return match ? match[1] : '';
    } else {
      return item.contactEmail || '';
    }
  };

  const dateFnsLocale = language === 'ru' ? ru : enUS;
  const isFormValid = formData.recipientType === 'self' || 
    (formData.recipientType === 'company' && formData.companyName) ||
    (formData.recipientType === 'user' && formData.userId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateFnsLocale}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: '90vh', maxHeight: '900px' } }}>
        <DialogTitle>{t('reviews.settings') || 'Настройки автоматической отправки'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0, pb: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2, flex: 1, minHeight: 0, overflow: 'hidden', pb: 0 }}>
            {/* Форма для добавления/редактирования */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {editingId ? (t('reviews.settings.edit_schedule') || 'Редактировать расписание') : (t('reviews.settings.add_schedule') || 'Добавить в расписание')}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FormControl sx={{ flex: '0 0 calc(50% - 8px)' }} variant="standard">
                    <InputLabel>{t('reviews.settings.recipient') || 'Получатель'}</InputLabel>
                    <Select
                      value={formData.recipientType}
                      label={t('reviews.settings.recipient') || 'Получатель'}
                      variant="standard"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        recipientType: e.target.value as 'self' | 'company' | 'user',
                        companyName: e.target.value === 'company' ? prev.companyName : undefined,
                        userId: e.target.value === 'user' ? prev.userId : undefined,
                        userName: e.target.value === 'user' ? prev.userName : undefined
                      }))}
                    >
                      <MenuItem value="self">{t('reviews.settings.send_to_self') || 'Себе'}</MenuItem>
                      <MenuItem value="company">{t('reviews.settings.send_to_company') || 'Участнику проекта'}</MenuItem>
                      <MenuItem value="user">{t('reviews.settings.send_to_user') || 'Пользователю'}</MenuItem>
                    </Select>
                  </FormControl>

                  {formData.recipientType === 'self' ? (
                    <Box sx={{ flex: '0 0 calc(50% - 8px)' }} />
                  ) : (
                    <FormControl sx={{ flex: '0 0 calc(50% - 8px)' }} variant="standard">
                      <InputLabel>
                        {formData.recipientType === 'company' 
                          ? (t('reviews.settings.company') || 'Компания')
                          : (t('reviews.settings.user') || 'Пользователь')
                        }
                      </InputLabel>
                      {formData.recipientType === 'company' ? (
                        <Select
                          value={formData.companyName || ''}
                          label={t('reviews.settings.company') || 'Компания'}
                          variant="standard"
                          onChange={(e) => {
                            const companyName = e.target.value;
                            // Находим участника проекта с этой компанией и сохраняем email контактного лица
                            const participant = projectParticipants.find(p => p.company_name === companyName);
                            setFormData(prev => ({ 
                              ...prev, 
                              companyName,
                              contactEmail: participant?.contact_email || undefined
                            }));
                          }}
                        >
                          {(companies || []).map((company) => (
                            <MenuItem key={company} value={company}>
                              {company}
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <Select
                          value={formData.userId || ''}
                          label={t('reviews.settings.user') || 'Пользователь'}
                          variant="standard"
                          onChange={(e) => {
                            const userId = e.target.value as number;
                            const user = users.find(u => u.id === userId);
                            setFormData(prev => ({ 
                              ...prev, 
                              userId,
                              userName: user ? `${user.full_name} (${user.email})` : undefined
                            }));
                          }}
                        >
                          {users.map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              {user.full_name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FormControl sx={{ width: '33.33%' }} variant="standard">
                    <InputLabel>{t('reviews.settings.schedule') || 'График отправки'}</InputLabel>
                    <Select
                      value={formData.schedule}
                      label={t('reviews.settings.schedule') || 'График отправки'}
                      variant="standard"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        schedule: e.target.value as 'daily' | 'weekly' | 'monthly',
                        dayOfWeek: e.target.value !== 'weekly' ? undefined : prev.dayOfWeek,
                        dayOfMonth: e.target.value !== 'monthly' ? undefined : prev.dayOfMonth
                      }))}
                    >
                      <MenuItem value="daily">{t('reviews.settings.daily') || 'Каждый день'}</MenuItem>
                      <MenuItem value="weekly">{t('reviews.settings.weekly') || 'В определенный день недели'}</MenuItem>
                      <MenuItem value="monthly">{t('reviews.settings.monthly') || 'Раз в месяц'}</MenuItem>
                    </Select>
                  </FormControl>

                  {formData.schedule === 'weekly' && (
                    <FormControl sx={{ width: '33.33%' }} variant="standard">
                      <InputLabel>{t('reviews.settings.day_of_week') || 'День недели'}</InputLabel>
                      <Select
                        value={formData.dayOfWeek ?? 1}
                        label={t('reviews.settings.day_of_week') || 'День недели'}
                        variant="standard"
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          dayOfWeek: e.target.value as number 
                        }))}
                      >
                      <MenuItem value={1}>{t('reviews.settings.monday') || 'Понедельник'}</MenuItem>
                      <MenuItem value={2}>{t('reviews.settings.tuesday') || 'Вторник'}</MenuItem>
                      <MenuItem value={3}>{t('reviews.settings.wednesday') || 'Среда'}</MenuItem>
                      <MenuItem value={4}>{t('reviews.settings.thursday') || 'Четверг'}</MenuItem>
                      <MenuItem value={5}>{t('reviews.settings.friday') || 'Пятница'}</MenuItem>
                      <MenuItem value={6}>{t('reviews.settings.saturday') || 'Суббота'}</MenuItem>
                      <MenuItem value={0}>{t('reviews.settings.sunday') || 'Воскресенье'}</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {formData.schedule === 'monthly' && (
                    <TextField
                      type="number"
                      label={t('reviews.settings.day_of_month') || 'День месяца'}
                      value={formData.dayOfMonth ?? 1}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        dayOfMonth: parseInt(e.target.value) || 1 
                      }))}
                      inputProps={{ min: 1, max: 31 }}
                      variant="standard"
                      sx={{ width: '33.33%' }}
                    />
                  )}

                  {formData.schedule === 'daily' && (
                    <Box sx={{ width: '33.33%' }} />
                  )}

                  <Box sx={{ width: '16.665%' }}>
                    <TimePicker
                      label={t('reviews.settings.time') || 'Время отправки'}
                      value={timeValue}
                      onChange={handleTimeChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: 'standard',
                        },
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.onlyOverdue || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, onlyOverdue: e.target.checked }))}
                      />
                    }
                    label={t('reviews.settings.only_overdue') || 'Только просроченные'}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {editingId && (
                      <Button onClick={resetForm}>
                        {t('common.cancel')}
                      </Button>
                    )}
                    <Button
                      onClick={handleAddOrUpdate}
                      variant="contained"
                      startIcon={<AddIcon />}
                      disabled={!isFormValid}
                    >
                      {editingId ? (t('common.update') || 'Обновить') : (t('reviews.settings.add') || 'Добавить')}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Таблица сохраненных расписаний */}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, mb: 0, gap: 0, pb: 0 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {t('reviews.settings.saved_schedules') || 'Сохраненные расписания'}
              </Typography>
              <TableContainer 
                component={Paper} 
                variant="outlined"
                sx={{ 
                  flex: 1,
                  minHeight: 0,
                  mt: 0,
                  mb: 0,
                  pt: 0,
                  pb: 0,
                  alignSelf: 'stretch',
                  display: 'flex',
                  flexDirection: 'column',
                  ...(schedules.length === 0 ? {
                    alignItems: 'center',
                    justifyContent: 'center',
                  } : {
                    overflow: 'auto',
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
                  }),
                }}
              >
                {schedules.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('reviews.settings.no_schedules') || 'Нет сохраненных расписаний'}
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('reviews.settings.recipient') || 'Получатель'}</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>{t('reviews.settings.schedule') || 'График'}</TableCell>
                        <TableCell>{t('reviews.settings.time') || 'Время'}</TableCell>
                        <TableCell align="center">{t('reviews.settings.only_overdue') || 'Просроченные'}</TableCell>
                        <TableCell align="center" sx={{ width: 100 }}>{t('common.actions') || 'Действия'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedules.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{getRecipientDescription(item)}</TableCell>
                          <TableCell>{getRecipientEmail(item)}</TableCell>
                          <TableCell>{getScheduleDescription(item)}</TableCell>
                          <TableCell>{item.time} {item.timezone ? `(${item.timezone})` : ''}</TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={item.onlyOverdue || false}
                              disabled
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title={t('common.delete')}>
                                <IconButton size="small" onClick={() => handleDelete(item.id)}>
                                  <DeleteIcon fontSize="small" />
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
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ mt: 0, pt: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={JSON.stringify(schedules) === JSON.stringify(originalSchedules) || isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Portal>
        <NotificationSnackbar
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={handleCloseNotification}
        />
      </Portal>
    </LocalizationProvider>
  );
};
