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
  Tooltip
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

const UsersPage: React.FC = observer(() => {
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const handleCreate = () => {
    // TODO: Реализовать создание пользователя
    console.log('Create user');
  };

  const handleEdit = (userId: number) => {
    // TODO: Реализовать редактирование пользователя
    console.log('Edit user:', userId);
  };

  const handleDelete = (userId: number) => {
    // TODO: Реализовать удаление пользователя
    console.log('Delete user:', userId);
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Пользователи
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleCreate}
          sx={{ backgroundColor: '#1976d2' }}
        >
          Добавить пользователя
        </Button>
      </Box>

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Поиск пользователей..."
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
            <InputLabel>Роль</InputLabel>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              label="Роль"
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="operator">Оператор</MenuItem>
              <MenuItem value="viewer">Читатель</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Статус"
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="inactive">Неактивные</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Таблица пользователей */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
        {userStore.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : userStore.error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {userStore.error}
          </Alert>
        ) : (
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>Имя пользователя</TableCell>
                <TableCell sx={{ width: '20%', fontWeight: 'bold' }}>Полное имя</TableCell>
                <TableCell sx={{ width: '20%', fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Роль</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Статус</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Дата создания</TableCell>
                <TableCell sx={{ width: '13%', fontWeight: 'bold' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={userStore.getUserRoleLabel(user.role)}
                      color={userStore.getUserRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Активный' : 'Неактивный'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {userStore.formatDate(user.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => handleEdit(user.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" onClick={() => handleDelete(user.id)} color="error">
                          <DeleteIcon />
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

      {!userStore.isLoading && filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Пользователи не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Попробуйте изменить фильтры или добавить новых пользователей
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default UsersPage;