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
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
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
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await usersApi.create({
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password || 'ChangeMe123!',
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
                          size="small"
                          sx={{ fontSize: '0.75rem', height: '24px' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? t('users.active') : t('users.inactive')}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: '24px' }}
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
                          <Tooltip title={t('project.edit')}>
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
          showRowsPerPage={false}
          fixedBottom
          insetLeft={isMobile ? 0 : 240}
          align="right"
          size="small"
        />
      )}

      {/* Диалог создания/редактирования пользователя */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogMode === 'create' ? t('users.add_user') : t('project.edit')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {saveError && (
            <Alert severity="error">{saveError}</Alert>
          )}
          <TextField
            label={t('users.columns.username')}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={saving || dialogMode === 'edit'}
            fullWidth
          />
          <TextField
            label={t('users.columns.full_name')}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            disabled={saving}
            fullWidth
          />
          <TextField
            label={t('users.columns.email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={saving}
            fullWidth
          />
          <FormControl fullWidth>
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
          <FormControl fullWidth>
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
            <TextField
              label={t('common.password') || 'Пароль'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={saving}
              fullWidth
              placeholder="Минимум 6 символов"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving} startIcon={dialogMode === 'create' ? <AddIcon /> : <EditIcon />}>
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