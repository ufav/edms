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
import { projectsApi, usersApi, rolesApi, type ProjectMember, type User, type ProjectRole } from '../api/client';
import { PROJECT_ROLES } from '../types/roles';

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onMemberAdded: () => void;
  existingMembers?: ProjectMember[];
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onClose,
  projectId,
  projectName,
  onMemberAdded,
  existingMembers = []
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
      loadProjectRoles();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await usersApi.getAll();
      
      // Фильтруем пользователей, которые уже являются участниками проекта
      const existingUserIds = existingMembers.map(member => member.user_id);
      const availableUsers = usersData.filter(user => !existingUserIds.includes(user.id));
      
      setUsers(availableUsers);
    } catch (error) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectRoles = async () => {
    try {
      const rolesData = await rolesApi.getProjectRoles();
      setProjectRoles(rolesData);
    } catch (error) {
      console.error('Ошибка загрузки проектных ролей:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError('Выберите пользователя');
      return;
    }

    if (!selectedRoleId) {
      setError('Выберите роль');
      return;
    }

    // Проверяем, не добавлен ли уже этот пользователь
    const isUserAlreadyAdded = existingMembers.some(member => 
      member.user_id === selectedUserId
    );
    
    if (isUserAlreadyAdded) {
      setError('Этот пользователь уже добавлен в проект');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await projectsApi.members.add(projectId, {
        user_id: selectedUserId as number,
        role: 'member', // Legacy field
        project_role_id: selectedRoleId as number
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
    setSelectedRoleId('');
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
          
          {users.length === 0 ? (
            <Alert severity="info">
              Все пользователи уже добавлены в проект
            </Alert>
          ) : (
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
          )}

          <FormControl fullWidth>
            <InputLabel>Роль в проекте</InputLabel>
            <Select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value as number)}
              label="Роль в проекте"
            >
              {projectRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name_en || role.name} - {role.description}
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
          disabled={isLoading || !selectedUserId || !selectedRoleId || users.length === 0}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog;
