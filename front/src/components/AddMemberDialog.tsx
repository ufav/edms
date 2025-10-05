import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { projectsApi, usersApi, type ProjectMember, type User } from '../api/client';

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onMemberAdded: () => void;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onClose,
  projectId,
  projectName,
  onMemberAdded
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    { value: 'admin', label: 'Администратор' },
    { value: 'operator', label: 'Оператор' },
    { value: 'viewer', label: 'Читатель' }
  ];

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await usersApi.getAll();
      setUsers(usersData);
    } catch (error) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError('Выберите пользователя');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await projectsApi.members.add(projectId, {
        user_id: selectedUserId as number,
        role: selectedRole
      });

      onMemberAdded();
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка добавления участника');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSelectedRole('member');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Добавить участника в проект "{projectName}"
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <FormControl fullWidth>
            <InputLabel>Пользователь</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value as number)}
              label="Пользователь"
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username} ({user.full_name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Роль</InputLabel>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Роль"
            >
              {roles.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleAddMember}
          variant="contained"
          disabled={isLoading || !selectedUserId}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog;
