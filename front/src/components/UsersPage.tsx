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

const UsersPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1); // 1-based
  const rowsPerPage = 25;

  // Загружаем пользователей при монтировании компонента
  useEffect(() => {
    userStore.loadUsers();
  }, []);

  // Фильтрация пользователей
  const filteredUsers = userStore.users.filter(user => {
    const roleMatch = filterRole === 'all' || user.role === filterRole;
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
    // TODO: Реализовать создание пользователя
  };

  const handleEdit = (userId: number) => {
    // TODO: Реализовать редактирование пользователя
  };

  const handleDelete = (userId: number) => {
    // TODO: Реализовать удаление пользователя
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
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 0,
          }}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Пользователи не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Попробуйте изменить фильтры или добавить новых пользователей
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
                            <IconButton size="small" onClick={() => handleDelete(user.id)} color="error" sx={{ padding: '4px' }}>
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
    </Box>
  );
});

export default UsersPage;