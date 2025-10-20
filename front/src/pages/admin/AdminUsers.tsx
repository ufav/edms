import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../../api/client';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  company_id?: number;
  company_name?: string;
  phone?: string;
  position?: string;
}

interface UserActivity {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  ip_address?: string;
}

const AdminUsers: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<UserActivity[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      
      // Enrich with mock data
      const enrichedData = data.map(user => ({
        ...user,
        company_name: user.company_id ? `Company #${user.company_id}` : 'N/A',
        phone: '+7 (999) 123-45-67', // Mock data
        position: 'Инженер', // Mock data
      }));
      
      setUsers(enrichedData);
    } catch (err) {
      setError('Ошибка загрузки пользователей');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async (userId: number) => {
    try {
      setLoadingActivity(true);
      // Mock data - replace with actual API call
      const mockActivity: UserActivity[] = [
        {
          id: 1,
          action: 'login',
          description: 'Вход в систему',
          timestamp: '2024-01-20T09:00:00Z',
          ip_address: '192.168.1.100',
        },
        {
          id: 2,
          action: 'document_created',
          description: 'Создан документ "Техническое задание"',
          timestamp: '2024-01-20T10:30:00Z',
        },
        {
          id: 3,
          action: 'document_approved',
          description: 'Утвержден документ #12345',
          timestamp: '2024-01-20T14:15:00Z',
        },
        {
          id: 4,
          action: 'transmittal_sent',
          description: 'Отправлен трансмиттал #T-2024-001',
          timestamp: '2024-01-20T16:45:00Z',
        },
      ];
      setSelectedActivity(mockActivity);
    } catch (err) {
      console.error('Error loading user activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'engineer': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
    setCurrentTab(0);
  };

  const handleViewActivity = (user: User) => {
    setSelectedUser(user);
    loadUserActivity(user.id);
    setActivityDialogOpen(true);
  };

  const handleToggleActive = (userId: number) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: !u.is_active } : u
    ));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    if (newValue === 1 && selectedUser) {
      loadUserActivity(selectedUser.id);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('admin.users.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.users.subtitle')}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Поиск по имени, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Роль</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                  <MenuItem value="manager">Менеджер</MenuItem>
                  <MenuItem value="engineer">Инженер</MenuItem>
                  <MenuItem value="viewer">Наблюдатель</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="active">Активные</MenuItem>
                  <MenuItem value="inactive">Неактивные</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadUsers}
                >
                  Обновить
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Пользователь</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Компания</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Последний вход</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.company_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Активен' : 'Неактивен'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Никогда'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Просмотр">
                        <IconButton
                          size="small"
                          onClick={() => handleViewUser(user)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Активность">
                        <IconButton
                          size="small"
                          onClick={() => handleViewActivity(user)}
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* User Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            {selectedUser?.full_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab label="Основная информация" />
                <Tab label="Активность" />
              </Tabs>

              {currentTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                        {selectedUser.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {selectedUser.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{selectedUser.username}
                        </Typography>
                        <Chip
                          label={selectedUser.role}
                          color={getRoleColor(selectedUser.role)}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedUser.email}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Телефон
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedUser.phone}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Должность
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedUser.position}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Компания
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedUser.company_name}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Статус
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedUser.is_active}
                            onChange={() => handleToggleActive(selectedUser.id)}
                          />
                        }
                        label={selectedUser.is_active ? 'Активен' : 'Неактивен'}
                      />
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Дата регистрации
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Последний вход
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Никогда'}
                    </Typography>
                  </Grid>
                </Grid>
              )}

              {currentTab === 1 && (
                <Box>
                  {loadingActivity ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <List>
                      {selectedActivity.map((activity, index) => (
                        <React.Fragment key={activity.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {activity.action}
                                  </Typography>
                                  {activity.ip_address && (
                                    <Chip
                                      label={activity.ip_address}
                                      size="small"
                                      color="default"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Box component="span" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {activity.description}
                                  </Box>
                                  <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {new Date(activity.timestamp).toLocaleString()}
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < selectedActivity.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;