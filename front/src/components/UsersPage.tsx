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
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { userStore } from '../stores/UserStore';
import { useTranslation } from 'react-i18next';
import { getRoleLabel, getRoleColor } from '../utils/roleLocalization';
import AppPagination from './AppPagination';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { usersApi } from '../api/client';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

const UsersPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1); // 1-based
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'viewer',
    is_active: true,
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const rowsPerPage = 13;

  // Загружаем пользователей при монтировании компонента
  useEffect(() => {
    userStore.loadUsers();
  }, []);

  // Нормализация роли для корректной фильтрации
  const normalizeRole = (role: string): string => {
    const r = (role || '').toLowerCase();
    if (r === 'administrator' || r === 'superadmin' || r === 'admin') return 'admin';
    if (r === 'operator') return 'operator';
    if (r === 'viewer') return 'viewer';
    return r;
  };

  // Фильтрация пользователей
  const filteredUsers = userStore.users.filter(user => {
    const roleMatch = filterRole === 'all' || normalizeRole(user.role) === filterRole;
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    const searchMatch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return roleMatch && statusMatch && searchMatch;
  });

  // Reset page on filters change
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterStatus, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const displayedUsers = filteredUsers.slice((page - 1) * rowsPerPage, (page - 1) * rowsPerPage + rowsPerPage);

  const handleCreate = () => {
    setDialogMode('create');
    setEditingUserId(null);
    setFormData({ username: '', full_name: '', email: '', role: 'viewer', is_active: true, password: '' });
    setConfirmPassword('');
    setErrors({});
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleEdit = (userId: number) => {
    const u = userStore.getUserById(userId);
    if (!u) return;
    setDialogMode('edit');
    setEditingUserId(userId);
    setFormData({
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      password: '',
    });
    setConfirmPassword('');
    setErrors({});
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleDelete = (userId: number) => {
    const u = userStore.getUserById(userId);
    if (!u) return;
    setDeleteTarget({ id: u.id, name: u.full_name || u.username });
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await usersApi.delete(deleteTarget.id);
      userStore.clearUsers();
      await userStore.loadUsers();
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (_e) {
      alert('Не удалось удалить пользователя');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (saving) return;
    setDialogOpen(false);
    setErrors({});
    setConfirmPassword('');
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (dialogMode === 'create') {
      if (!formData.username.trim()) {
        newErrors.username = t('users.validation.username_required') || 'Имя пользователя обязательно';
      } else if (formData.username.length < 3) {
        newErrors.username = t('users.validation.username_min_length') || 'Имя пользователя должно быть не менее 3 символов';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = t('users.validation.username_invalid') || 'Имя пользователя может содержать только буквы, цифры и подчеркивание';
      }

      if (!formData.password) {
        newErrors.password = t('users.validation.password_required') || 'Пароль обязателен';
      } else if (formData.password.length < 6) {
        newErrors.password = t('users.validation.password_min_length') || 'Пароль должен быть не менее 6 символов';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = t('users.validation.confirm_password_required') || 'Подтверждение пароля обязательно';
      } else if (formData.password !== confirmPassword) {
        newErrors.confirmPassword = t('users.validation.passwords_not_match') || 'Пароли не совпадают';
      }
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = t('users.validation.full_name_required') || 'Полное имя обязательно';
    }

    if (!formData.email.trim()) {
      newErrors.email = t('users.validation.email_required') || 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('users.validation.email_invalid') || 'Некорректный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Валидация отдельного поля
  const validateField = (fieldName: string, value: string) => {
    const newErrors = { ...errors };
    delete newErrors[fieldName];

    if (fieldName === 'username' && dialogMode === 'create') {
      if (!value.trim()) {
        newErrors.username = t('users.validation.username_required') || 'Имя пользователя обязательно';
      } else if (value.length < 3) {
        newErrors.username = t('users.validation.username_min_length') || 'Имя пользователя должно быть не менее 3 символов';
      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        newErrors.username = t('users.validation.username_invalid') || 'Имя пользователя может содержать только буквы, цифры и подчеркивание';
      }
    }

    if (fieldName === 'full_name') {
      if (!value.trim()) {
        newErrors.full_name = t('users.validation.full_name_required') || 'Полное имя обязательно';
      }
    }

    if (fieldName === 'email') {
      if (!value.trim()) {
        newErrors.email = t('users.validation.email_required') || 'Email обязателен';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = t('users.validation.email_invalid') || 'Некорректный формат email';
      }
    }

    if (fieldName === 'password' && dialogMode === 'create') {
      if (!value) {
        newErrors.password = t('users.validation.password_required') || 'Пароль обязателен';
      } else if (value.length < 6) {
        newErrors.password = t('users.validation.password_min_length') || 'Пароль должен быть не менее 6 символов';
      }
      // Проверка совпадения паролей при изменении поля пароля
      if (confirmPassword && value !== confirmPassword) {
        newErrors.confirmPassword = t('users.validation.passwords_not_match') || 'Пароли не совпадают';
      } else if (confirmPassword && value === confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (fieldName === 'confirmPassword') {
      if (!value) {
        newErrors.confirmPassword = t('users.validation.confirm_password_required') || 'Подтверждение пароля обязательно';
      } else if (formData.password !== value) {
        newErrors.confirmPassword = t('users.validation.passwords_not_match') || 'Пароли не совпадают';
      }
    }

    setErrors(newErrors);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await usersApi.create({
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        });
      } else if (dialogMode === 'edit' && editingUserId != null) {
        await usersApi.update(editingUserId, {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        } as any);
      }
      userStore.clearUsers();
      await userStore.loadUsers();
      setDialogOpen(false);
      setConfirmPassword('');
      setErrors({});
    } catch (e: any) {
      setSaveError(e?.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

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
          {t('menu.users')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleCreate}
          sx={{ backgroundColor: '#1976d2' }}
        >
          {t('users.add_user')}
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
          placeholder={t('users.search_placeholder')}
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
          <InputLabel>{t('users.role')}</InputLabel>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            label={t('users.role')}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="admin">{t('roles.admin')}</MenuItem>
            <MenuItem value="operator">{t('roles.operator')}</MenuItem>
            <MenuItem value="viewer">{t('roles.viewer')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>{t('common.status')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label={t('common.status')}
          >
            <MenuItem value="all">{t('filter.all')}</MenuItem>
            <MenuItem value="active">{t('users.active')}</MenuItem>
            <MenuItem value="inactive">{t('users.inactive')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Контейнер таблицы */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {userStore.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : userStore.error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {userStore.error}
          </Alert>
        ) : filteredUsers.length === 0 ? (
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
                {t('users.no_users')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('users.no_users_hint')}
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
                      width: '15%',
                      minWidth: '120px'
                    }}>{t('users.columns.username')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '150px'
                    }}>{t('users.columns.full_name')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '200px'
                    }}>{t('users.columns.email')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '12%',
                      minWidth: '100px'
                    }}>{t('users.columns.role')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '10%',
                      minWidth: '80px'
                    }}>{t('users.columns.status')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '10%',
                      minWidth: '100px'
                    }}>{t('users.columns.created_at')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '13%',
                      minWidth: '120px'
                    }}>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      sx={{ 
                        '& .MuiTableCell-root': { padding: '8px 16px' },
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {user.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {user.full_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role, t)}
                          color={getRoleColor(user.role) as any}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem', 
                            height: '24px',
                            backgroundColor: (theme) => {
                              const roleColor = getRoleColor(user.role);
                              const colorMap: { [key: string]: string } = {
                                'error': alpha(theme.palette.error.main, 0.12),
                                'warning': alpha(theme.palette.warning.main, 0.12),
                                'info': alpha(theme.palette.info.main, 0.12),
                                'success': alpha(theme.palette.success.main, 0.12),
                                'primary': alpha(theme.palette.primary.main, 0.12),
                                'default': theme.palette.grey[100]
                              };
                              return colorMap[roleColor] || theme.palette.grey[100];
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? t('users.active') : t('users.inactive')}
                          color={user.is_active ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem', 
                            height: '24px',
                            backgroundColor: (theme) => {
                              return user.is_active 
                                ? alpha(theme.palette.success.main, 0.12)
                                : theme.palette.grey[100];
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {userStore.formatDate(user.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => handleEdit(user.id)} sx={{ padding: '4px' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" onClick={() => handleDelete(user.id)} sx={{ padding: '4px', color: 'text.secondary' }}>
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


      {/* Единая пагинация */}
      {!userStore.isLoading && filteredUsers.length > 0 && (
        <AppPagination
          count={totalPages}
          page={Math.min(page, totalPages)}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          fixedBottom
          insetLeft={isMobile ? 0 : 240}
          align="right"
          size="small"
        />
      )}

      {/* Диалог создания/редактирования пользователя */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogMode === 'create' ? t('users.add_user') : t('common.edit')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {saveError && (
            <Alert severity="error">{saveError}</Alert>
          )}
          <TextField
            label={t('users.columns.username')}
            sx={{ mt: 2 }}
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value });
              if (dialogMode === 'create') {
                validateField('username', e.target.value);
              }
            }}
            onBlur={() => {
              if (dialogMode === 'create') {
                validateField('username', formData.username);
              }
            }}
            disabled={saving || dialogMode === 'edit'}
            fullWidth
            required
            error={!!errors.username}
            helperText={errors.username}
            autoComplete="username"
          />
          <TextField
            label={t('users.columns.full_name')}
            value={formData.full_name}
            onChange={(e) => {
              setFormData({ ...formData, full_name: e.target.value });
              validateField('full_name', e.target.value);
            }}
            onBlur={() => validateField('full_name', formData.full_name)}
            disabled={saving}
            fullWidth
            required
            error={!!errors.full_name}
            helperText={errors.full_name}
            autoComplete="name"
          />
          <TextField
            label={t('users.columns.email')}
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              validateField('email', e.target.value);
            }}
            onBlur={() => validateField('email', formData.email)}
            disabled={saving}
            fullWidth
            required
            error={!!errors.email}
            helperText={errors.email}
            autoComplete="email"
          />
          <FormControl fullWidth required>
            <InputLabel>{t('users.role')}</InputLabel>
            <Select
              label={t('users.role')}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as string })}
              disabled={saving}
            >
              <MenuItem value="admin">{t('roles.admin')}</MenuItem>
              <MenuItem value="operator">{t('roles.operator')}</MenuItem>
              <MenuItem value="viewer">{t('roles.viewer')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              label={t('common.status')}
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              disabled={saving}
            >
              <MenuItem value="active">{t('users.active')}</MenuItem>
              <MenuItem value="inactive">{t('users.inactive')}</MenuItem>
            </Select>
          </FormControl>
          {dialogMode === 'create' && (
            <>
              <TextField
                label={t('auth.password')}
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  validateField('password', e.target.value);
                }}
                onBlur={() => validateField('password', formData.password)}
                disabled={saving}
                fullWidth
                required
                error={!!errors.password}
                helperText={errors.password || (t('users.validation.password_hint') || 'Минимум 6 символов')}
                autoComplete="new-password"
              />
              <TextField
                label={t('users.confirm_password') || 'Подтверждение пароля'}
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateField('confirmPassword', e.target.value);
                }}
                onBlur={() => validateField('confirmPassword', confirmPassword)}
                disabled={saving}
                fullWidth
                required
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                autoComplete="new-password"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving || (Object.keys(errors).filter(key => {
              // В режиме редактирования не учитываем ошибки username и password полей
              if (dialogMode === 'edit') {
                return key !== 'username' && key !== 'password' && key !== 'confirmPassword';
              }
              return true;
            }).length > 0)} 
            startIcon={dialogMode === 'create' ? <AddIcon /> : <EditIcon />}
          >
            {dialogMode === 'create' ? t('common.create') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={() => { if (!deleteLoading) setDeleteOpen(false); }}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        message={t('users.delete_confirm') || t('common.confirm_action')}
        itemName={deleteTarget?.name}
        loading={deleteLoading}
      />
    </Box>
  );
});

export default UsersPage;